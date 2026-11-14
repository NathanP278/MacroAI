export interface ServerAiConfig {
  isConfigured: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
  customHeaders: Record<string, string>;
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
 * Strips secret API keys from error messages or logs to prevent credential leakage.
 */
export function sanitizeError(message: string, apiKey?: string): string {
  if (!apiKey || !apiKey.trim()) return message;
  return message.replaceAll(apiKey, '[REDACTED]');
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

  let customHeaders: Record<string, string> = {};
  if (process.env.AI_CUSTOM_HEADERS) {
    try {
      const parsed = JSON.parse(process.env.AI_CUSTOM_HEADERS);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        customHeaders = parsed as Record<string, string>;
      }
    } catch {
      // Gracefully ignore malformed custom headers JSON
    }
  }

  const isConfigured = Boolean(baseUrl && apiKey && model);
  return {
    isConfigured,
    baseUrl,
    apiKey,
    model,
    customHeaders,
  };
}

export interface CallVisionOptions {
  timeoutMs?: number;
  responseFormat?: boolean;
}

/**
 * Calls an OpenAI-compatible vision/chat completion endpoint.
 * Handles Bearer auth, custom headers, timeout, response_format with fallback,
 * and extracts text from string or multipart content arrays.
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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
    ...config.customHeaders,
  };

  const executeFetch = async (useJsonFormat: boolean) => {
    const payload: Record<string, unknown> = {
      model: config.model,
      messages,
    };
    if (useJsonFormat) {
      payload.response_format = { type: 'json_object' };
    }

    return fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
  };

  try {
    const wantsJsonFormat = options?.responseFormat !== false;
    let res = await executeFetch(wantsJsonFormat);

    // Some providers reject response_format with a 400 Bad Request.
    // Fall back to calling without response_format if initial request failed with 400.
    if (!res.ok && res.status === 400 && wantsJsonFormat) {
      const fallbackRes = await executeFetch(false);
      if (fallbackRes.ok) {
        res = fallbackRes;
      }
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      const safeMsg = sanitizeError(errorText, config.apiKey);
      throw new AiServiceError(
        `Upstream AI service error (${res.status}): ${safeMsg}`,
        res.status >= 500 ? 502 : res.status
      );
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;

    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((part) => (typeof part === 'string' ? part : part?.text || ''))
        .join('\n');
    }

    throw new AiServiceError('AI returned empty message content', 502);
  } catch (err: unknown) {
    if (err instanceof AiServiceError) {
      throw err;
    }
    const rawMsg = err instanceof Error ? err.message : String(err);
    const safeMsg = sanitizeError(rawMsg, config.apiKey);
    throw new AiServiceError(`AI completion request failed: ${safeMsg}`, 502);
  }
}
