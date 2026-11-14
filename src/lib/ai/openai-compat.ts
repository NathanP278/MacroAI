import { createHash } from 'crypto';

export interface ServerAiConfig {
  isConfigured: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
  customHeaders: Record<string, string>;
}

const AI_CACHE_MAX_ENTRIES = 64;
const AI_CACHE_TTL_MS = 5 * 60 * 1000;

const unsupportedJsonFormatModels = new Set<string>();
const inFlightRequests = new Map<string, Promise<string>>();
const responseCache = new Map<string, { value: string; expiresAt: number }>();

let cachedCustomHeadersRaw: string | undefined;
let cachedCustomHeadersParsed: Record<string, string> = {};

/**
 * Clears runtime AI caches (unsupported response_format registry, in-flight map, and LRU cache).
 * Primarily intended for deterministic unit testing.
 */
export function clearAiRuntimeCaches(): void {
  unsupportedJsonFormatModels.clear();
  inFlightRequests.clear();
  responseCache.clear();
}

export class AiServiceError extends Error {
  public readonly status: number;

  constructor(message: string, status: number = 500) {
    super(message);
    this.name = 'AiServiceError';
    this.status = status;
  }
}

/**
 * Strips secret API keys and sensitive custom headers from error messages or logs
 * to prevent credential leakage.
 */
export function sanitizeError(
  message: string,
  apiKey?: string,
  customHeaders?: Record<string, string>
): string {
  if (!message) return '';
  let sanitized = message;

  if (apiKey && apiKey.trim()) {
    sanitized = sanitized.replaceAll(apiKey, '[REDACTED]');
  }

  if (customHeaders) {
    for (const val of Object.values(customHeaders)) {
      if (typeof val === 'string' && val.trim().length >= 6) {
        sanitized = sanitized.replaceAll(val.trim(), '[REDACTED]');
      }
    }
  }

  return sanitized;
}

/**
 * Normalizes OpenAI-compatible chat completions URL.
 * Handles trailing slashes and ensures /chat/completions is not duplicated.
 */
export function normalizeChatEndpoint(baseUrl: string): string {
  const clean = baseUrl.trim().replace(/\/+$/, '');
  if (clean.endsWith('/chat/completions')) {
    return clean;
  }
  return `${clean}/chat/completions`;
}

/**
 * Reads server-side AI configuration strictly from environment variables.
 * Never exposes these variables to client code.
 */
export function getServerAiConfig(): ServerAiConfig {
  const baseUrl = process.env.AI_BASE_URL?.trim() || '';
  const apiKey = process.env.AI_API_KEY?.trim() || '';
  const model = process.env.AI_MODEL?.trim() || '';

  const rawCustomHeaders = process.env.AI_CUSTOM_HEADERS;
  if (rawCustomHeaders !== cachedCustomHeadersRaw) {
    cachedCustomHeadersRaw = rawCustomHeaders;
    let parsedHeaders: Record<string, string> = {};
    if (rawCustomHeaders) {
      try {
        const parsed = JSON.parse(rawCustomHeaders);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          parsedHeaders = parsed as Record<string, string>;
        }
      } catch {
        // Gracefully ignore malformed custom headers JSON
      }
    }
    cachedCustomHeadersParsed = parsedHeaders;
  }

  const isConfigured = Boolean(baseUrl && apiKey && model);
  return {
    isConfigured,
    baseUrl,
    apiKey,
    model,
    customHeaders: { ...cachedCustomHeadersParsed },
  };
}

export interface CallVisionOptions {
  timeoutMs?: number;
  responseFormat?: boolean;
  enableCache?: boolean;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

function buildAbortSignal(timeoutMs: number, externalSignal?: AbortSignal): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  if (!externalSignal) {
    return timeoutSignal;
  }
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([timeoutSignal, externalSignal]);
  }
  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  if (externalSignal.aborted || timeoutSignal.aborted) {
    controller.abort();
    return controller.signal;
  }
  externalSignal.addEventListener('abort', forwardAbort, { once: true });
  timeoutSignal.addEventListener('abort', forwardAbort, { once: true });
  return controller.signal;
}

function buildCacheKey(
  endpoint: string,
  model: string,
  messages: unknown[],
  responseFormat: boolean | undefined,
  temperature: number | undefined,
  maxTokens: number | undefined
): string {
  const hash = createHash('sha256');
  hash.update(
    JSON.stringify({
      endpoint,
      model,
      messages,
      responseFormat: responseFormat !== false,
      temperature,
      maxTokens,
    })
  );
  return hash.digest('hex');
}

function getCachedCompletion(key: string): string | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  // Refresh LRU order
  responseCache.delete(key);
  responseCache.set(key, entry);
  return entry.value;
}

function setCachedCompletion(key: string, value: string): void {
  if (responseCache.has(key)) {
    responseCache.delete(key);
  } else if (responseCache.size >= AI_CACHE_MAX_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey !== undefined) {
      responseCache.delete(oldestKey);
    }
  }
  responseCache.set(key, {
    value,
    expiresAt: Date.now() + AI_CACHE_TTL_MS,
  });
}

/**
 * Calls an OpenAI-compatible vision/chat completion endpoint.
 * Handles Bearer auth, custom headers, timeout, response_format with cached fallback,
 * in-flight deduplication, bounded LRU caching, and extracts text from string or multipart content arrays.
 */
export async function callVisionChatCompletion(
  messages: unknown[],
  options?: CallVisionOptions
): Promise<string> {
  const config = getServerAiConfig();
  if (!config.isConfigured) {
    throw new AiServiceError(
      'AI service is not configured. Missing AI_BASE_URL, AI_API_KEY, or AI_MODEL in server environment.',
      503
    );
  }

  const endpoint = normalizeChatEndpoint(config.baseUrl);
  const timeoutMs = options?.timeoutMs ?? 45000;
  const useCache = options?.enableCache ?? process.env.NODE_ENV !== 'test';
  const cacheKey = useCache
    ? buildCacheKey(
        endpoint,
        config.model,
        messages,
        options?.responseFormat,
        options?.temperature,
        options?.maxTokens
      )
    : null;

  if (cacheKey) {
    const cached = getCachedCompletion(cacheKey);
    if (cached !== null) {
      return cached;
    }
    const existingInFlight = inFlightRequests.get(cacheKey);
    if (existingInFlight) {
      return existingInFlight;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
    ...config.customHeaders,
  };

  const modelFormatKey = `${endpoint}|${config.model}`;

  const executeFetch = async (useJsonFormat: boolean) => {
    const payload: Record<string, unknown> = {
      model: config.model,
      messages,
    };
    if (options?.temperature !== undefined) {
      payload.temperature = options.temperature;
    }
    if (options?.maxTokens !== undefined) {
      payload.max_tokens = options.maxTokens;
    }
    if (useJsonFormat) {
      payload.response_format = { type: 'json_object' };
    }

    return fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: buildAbortSignal(timeoutMs, options?.signal),
    });
  };

  const runCompletion = async (): Promise<string> => {
    try {
      const wantsJsonFormat =
        options?.responseFormat !== false && !unsupportedJsonFormatModels.has(modelFormatKey);
      let res = await executeFetch(wantsJsonFormat);

      // Some providers reject response_format with a 400 Bad Request.
      // Fall back to calling without response_format and cache model incompatibility.
      if (!res.ok && res.status === 400 && wantsJsonFormat) {
        const fallbackRes = await executeFetch(false);
        if (fallbackRes.ok) {
          unsupportedJsonFormatModels.add(modelFormatKey);
          res = fallbackRes;
        }
      }

      if (!res.ok) {
        const errorText = await res.text().catch(() => res.statusText);
        const safeMsg = sanitizeError(errorText, config.apiKey, config.customHeaders);
        throw new AiServiceError(
          `Upstream AI service error (${res.status}): ${safeMsg}`,
          res.status >= 500 ? 502 : res.status
        );
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;

      let textResult: string | null = null;
      if (typeof content === 'string') {
        textResult = content;
      } else if (Array.isArray(content)) {
        textResult = content
          .map((part) => (typeof part === 'string' ? part : part?.text || ''))
          .join('\n');
      }

      if (textResult !== null) {
        if (cacheKey) {
          setCachedCompletion(cacheKey, textResult);
        }
        return textResult;
      }

      throw new AiServiceError('AI returned empty message content', 502);
    } catch (err: unknown) {
      if (err instanceof AiServiceError) {
        throw err;
      }
      const rawMsg = err instanceof Error ? err.message : String(err);
      const safeMsg = sanitizeError(rawMsg, config.apiKey, config.customHeaders);
      throw new AiServiceError(`AI completion request failed: ${safeMsg}`, 502);
    }
  };

  if (!cacheKey) {
    return runCompletion();
  }

  const promise = runCompletion().finally(() => {
    inFlightRequests.delete(cacheKey);
  });
  inFlightRequests.set(cacheKey, promise);
  return promise;
}
