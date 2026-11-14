import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import {
  AiMacroNutrientsSchema,
  AiMealItemSchema,
  AiMealScanResponseSchema,
  AiLabelOcrResponseSchema,
  parseAiJsonResponse,
} from '../schemas';
import {
  getServerAiConfig,
  normalizeChatEndpoint,
  callVisionChatCompletion,
  AiServiceError,
} from '../openai-compat';
import { GET as getHealth } from '@/app/api/ai/health/route';
import { POST as postMealScan } from '@/app/api/ai/meal-scan/route';
import { POST as postRefine } from '@/app/api/ai/refine/route';
import { POST as postLabelOcr } from '@/app/api/ai/label-ocr/route';
import { AiHealthStatusCard } from '@/components/settings/ai-health-status-card';

describe('Task 9: AI Schemas & JSON Parser', () => {
  it('strips markdown code fences and validates non-overlapping meal items', () => {
    const raw =
      '```json\n{"items":[{"name":"Grilled Chicken Breast","grams":180,"per100g":{"calories":165,"protein":31,"carbs":0,"fat":3.6,"fiber":0}}]}\n```';
    const parsed = parseAiJsonResponse(raw, AiMealScanResponseSchema);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].name).toBe('Grilled Chicken Breast');
    expect(parsed.items[0].grams).toBe(180);
    expect(parsed.items[0].per100g.protein).toBe(31);
  });

  it('strips generic markdown code fences without language tag and handles surrounding text', () => {
    const raw =
      'Here is the extracted meal info:\n```\n{"items":[{"name":"White Rice","grams":150,"per100g":{"calories":130,"protein":2.7,"carbs":28.2,"fat":0.3}}]}\n```\nEnjoy your meal!';
    const parsed = parseAiJsonResponse(raw, AiMealScanResponseSchema);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].name).toBe('White Rice');
    expect(parsed.items[0].grams).toBe(150);
  });

  it('parses raw JSON strings without code fences', () => {
    const raw =
      '{"items":[{"name":"Olive Oil","grams":10,"per100g":{"calories":884,"protein":0,"carbs":0,"fat":100}}]}';
    const parsed = parseAiJsonResponse(raw, AiMealScanResponseSchema);
    expect(parsed.items[0].name).toBe('Olive Oil');
    expect(parsed.items[0].grams).toBe(10);
  });

  it('rejects zero-gram or missing-macro malformed AI payloads', () => {
    expect(() =>
      parseAiJsonResponse('{"items":[{"name":"Plate","grams":0}]}', AiMealScanResponseSchema)
    ).toThrow();
    expect(() =>
      parseAiJsonResponse('{"items":[{"name":"Empty","grams":-50,"per100g":{"calories":100,"protein":1,"carbs":1,"fat":1}}]}', AiMealScanResponseSchema)
    ).toThrow();
    expect(() =>
      parseAiJsonResponse('{"items":[{"name":"","grams":100,"per100g":{"calories":100,"protein":1,"carbs":1,"fat":1}}]}', AiMealScanResponseSchema)
    ).toThrow();
    expect(() =>
      parseAiJsonResponse('{"items":[]}', AiMealScanResponseSchema)
    ).toThrow();
    expect(() => parseAiJsonResponse('not json', AiLabelOcrResponseSchema)).toThrow();
  });

  it('validates AiLabelOcrResponseSchema matching Task 8 -> Task 9 contract', () => {
    const validOcr = JSON.stringify({
      name: 'Greek Yogurt 0%',
      brand: 'Chobani',
      servingSize: 170,
      servingUnit: 'g',
      calories: 100,
      protein: 18,
      carbs: 6,
      fat: 0,
      fiber: 0,
      sodiumMg: 65,
    });
    const parsed = parseAiJsonResponse(validOcr, AiLabelOcrResponseSchema);
    expect(parsed.servingSize).toBe(170);
    expect(parsed.servingUnit).toBe('g');
    expect(parsed.protein).toBe(18);

    // Rejects invalid servingUnit
    const invalidUnit = JSON.stringify({
      servingSize: 100,
      servingUnit: 'oz',
      calories: 100,
      protein: 10,
      carbs: 10,
      fat: 2,
    });
    expect(() => parseAiJsonResponse(invalidUnit, AiLabelOcrResponseSchema)).toThrow();

    // Rejects zero servingSize
    const zeroServing = JSON.stringify({
      servingSize: 0,
      servingUnit: 'g',
      calories: 100,
      protein: 10,
      carbs: 10,
      fat: 2,
    });
    expect(() => parseAiJsonResponse(zeroServing, AiLabelOcrResponseSchema)).toThrow();
  });
});

describe('Task 9: OpenAI-Compatible Client Helper', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('correctly reads and normalizes server-side env vars', () => {
    delete process.env.AI_BASE_URL;
    delete process.env.AI_API_KEY;
    delete process.env.AI_MODEL;
    delete process.env.AI_CUSTOM_HEADERS;

    const unconfigured = getServerAiConfig();
    expect(unconfigured.isConfigured).toBe(false);

    process.env.AI_BASE_URL = 'https://api.openai.com/v1/';
    process.env.AI_API_KEY = 'sk-test-secret-key-12345';
    process.env.AI_MODEL = 'gpt-4o-mini';
    process.env.AI_CUSTOM_HEADERS = '{"HTTP-Referer":"https://macroai.app"}';

    const configured = getServerAiConfig();
    expect(configured.isConfigured).toBe(true);
    expect(configured.baseUrl).toBe('https://api.openai.com/v1/');
    expect(configured.model).toBe('gpt-4o-mini');
    expect(configured.customHeaders['HTTP-Referer']).toBe('https://macroai.app');
  });

  it('safely handles invalid AI_CUSTOM_HEADERS JSON', () => {
    process.env.AI_BASE_URL = 'https://api.openai.com/v1';
    process.env.AI_API_KEY = 'sk-test';
    process.env.AI_MODEL = 'gpt-4o';
    process.env.AI_CUSTOM_HEADERS = 'invalid-json';

    const config = getServerAiConfig();
    expect(config.customHeaders).toEqual({});
  });

  it('normalizes chat completions endpoints without duplicating /chat/completions', () => {
    expect(normalizeChatEndpoint('https://api.openai.com/v1')).toBe('https://api.openai.com/v1/chat/completions');
    expect(normalizeChatEndpoint('https://api.openai.com/v1/')).toBe('https://api.openai.com/v1/chat/completions');
    expect(normalizeChatEndpoint('https://api.openai.com/v1/chat/completions')).toBe('https://api.openai.com/v1/chat/completions');
    expect(normalizeChatEndpoint('https://api.openai.com/v1/chat/completions/')).toBe('https://api.openai.com/v1/chat/completions');
  });

  it('throws 503 AiServiceError when unconfigured', async () => {
    delete process.env.AI_BASE_URL;
    delete process.env.AI_API_KEY;
    delete process.env.AI_MODEL;

    await expect(callVisionChatCompletion([{ role: 'user', content: 'hello' }]))
      .rejects.toThrow(/not configured/i);
  });

  it('sends vision messages with Bearer auth and parses string content', async () => {
    process.env.AI_BASE_URL = 'https://api.openai.com/v1';
    process.env.AI_API_KEY = 'sk-test-secret';
    process.env.AI_MODEL = 'gpt-4o';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"items":[{"name":"Oatmeal","grams":60,"per100g":{"calories":389,"protein":16.9,"carbs":66.3,"fat":6.9}}]}',
            },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await callVisionChatCompletion([{ role: 'user', content: 'test' }]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer sk-test-secret');
    expect(result).toContain('Oatmeal');
  });

  it('supports message.content returned as array of text parts', async () => {
    process.env.AI_BASE_URL = 'https://api.openai.com/v1';
    process.env.AI_API_KEY = 'sk-test-secret';
    process.env.AI_MODEL = 'gpt-4o';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: [
                { type: 'text', text: '{"items":[{"name":"Apple","grams":150,' },
                { type: 'text', text: '"per100g":{"calories":52,"protein":0.3,"carbs":13.8,"fat":0.2}}]}' },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await callVisionChatCompletion([{ role: 'user', content: 'test' }]);
    expect(result).toContain('Apple');
  });

  it('falls back seamlessly if provider returns 400 rejecting response_format', async () => {
    process.env.AI_BASE_URL = 'https://ollama.local/v1';
    process.env.AI_API_KEY = 'ollama';
    process.env.AI_MODEL = 'llava';

    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async (_url, init) => {
      callCount++;
      const body = JSON.parse(init.body);
      if (body.response_format) {
        // Provider rejects response_format
        return {
          ok: false,
          status: 400,
          text: async () => 'Provider error: response_format is not supported',
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: '{"items":[{"name":"Banana","grams":118,"per100g":{"calories":89,"protein":1.1,"carbs":22.8,"fat":0.3}}]}',
              },
            },
          ],
        }),
      };
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await callVisionChatCompletion([{ role: 'user', content: 'test' }]);
    expect(callCount).toBe(2);
    expect(result).toContain('Banana');
  });

  it('NEVER leaks AI_API_KEY in error messages', async () => {
    const SECRET = 'sk-super-secret-high-entropy-token-xyz987';
    process.env.AI_BASE_URL = 'https://broken-proxy.local/v1';
    process.env.AI_API_KEY = SECRET;
    process.env.AI_MODEL = 'test-model';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => `Upstream error with Authorization token ${SECRET} failed`,
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(callVisionChatCompletion([{ role: 'user', content: 'ping' }]))
      .rejects.toThrowError(expect.not.stringContaining(SECRET));
  });
});

describe('Task 9: Route Handlers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('GET /api/ai/health', () => {
    it('returns 200 { configured: false, model: "", reachable: false } when unconfigured', async () => {
      delete process.env.AI_BASE_URL;
      delete process.env.AI_API_KEY;
      delete process.env.AI_MODEL;

      const res = await getHealth();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ configured: false, model: '', reachable: false });
      expect(res.headers.get('Cache-Control')).toContain('no-store');
      expect(JSON.stringify(data)).not.toContain('API_KEY');
    });

    it('returns reachable: true when upstream responds ok', async () => {
      process.env.AI_BASE_URL = 'https://api.openai.com/v1';
      process.env.AI_API_KEY = 'sk-secret';
      process.env.AI_MODEL = 'gpt-4o';

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'OK' } }],
        }),
      }));

      const res = await getHealth();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.configured).toBe(true);
      expect(data.model).toBe('gpt-4o');
      expect(data.reachable).toBe(true);
    });

    it('returns reachable: false without leaking secret when upstream fails', async () => {
      const SECRET = 'sk-super-secret-key-456';
      process.env.AI_BASE_URL = 'https://api.openai.com/v1';
      process.env.AI_API_KEY = SECRET;
      process.env.AI_MODEL = 'gpt-4o';

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => `Invalid key ${SECRET}`,
      }));

      const res = await getHealth();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.configured).toBe(true);
      expect(data.reachable).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error).not.toContain(SECRET);
    });
  });

  describe('POST /api/ai/meal-scan', () => {
    it('returns 400 when imageDataUrl is missing', async () => {
      const req = new Request('http://localhost/api/ai/meal-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const res = await postMealScan(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it('returns 503 when server AI is unconfigured', async () => {
      delete process.env.AI_BASE_URL;
      delete process.env.AI_API_KEY;
      delete process.env.AI_MODEL;

      const req = new Request('http://localhost/api/ai/meal-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: 'data:image/jpeg;base64,abc123' }),
      });
      const res = await postMealScan(req);
      expect(res.status).toBe(503);
    });

    it('decomposes composite meal into non-overlapping items with per100g density and grams', async () => {
      process.env.AI_BASE_URL = 'https://api.openai.com/v1';
      process.env.AI_API_KEY = 'sk-key';
      process.env.AI_MODEL = 'gpt-4o';

      const mockResponse = {
        items: [
          {
            name: 'Grilled Salmon Fillet',
            grams: 200,
            per100g: { calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0 },
          },
          {
            name: 'Steamed Asparagus',
            grams: 100,
            per100g: { calories: 20, protein: 2.2, carbs: 3.9, fat: 0.1, fiber: 2.1 },
          },
        ],
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      }));

      const req = new Request('http://localhost/api/ai/meal-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: 'data:image/jpeg;base64,salmon-asparagus',
          contextPrompt: 'cooked in 1 tsp olive oil',
        }),
      });

      const res = await postMealScan(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.items).toHaveLength(2);
      expect(data.items[0].name).toBe('Grilled Salmon Fillet');
      expect(data.items[0].grams).toBe(200);
      expect(data.items[1].name).toBe('Steamed Asparagus');
    });
  });

  describe('POST /api/ai/refine', () => {
    it('returns 400 when items or instruction is missing', async () => {
      const req = new Request('http://localhost/api/ai/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [] }),
      });
      const res = await postRefine(req);
      expect(res.status).toBe(400);
    });

    it('refines meal draft items based on user instruction', async () => {
      process.env.AI_BASE_URL = 'https://api.openai.com/v1';
      process.env.AI_API_KEY = 'sk-key';
      process.env.AI_MODEL = 'gpt-4o';

      const updatedDraft = {
        items: [
          {
            name: 'Grilled Salmon Fillet',
            grams: 250, // updated from 200
            per100g: { calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0 },
          },
        ],
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(updatedDraft) } }],
        }),
      }));

      const req = new Request('http://localhost/api/ai/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            {
              name: 'Grilled Salmon Fillet',
              grams: 200,
              per100g: { calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0 },
            },
          ],
          instruction: 'Increase salmon portion to 250g',
        }),
      });

      const res = await postRefine(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.items[0].grams).toBe(250);
    });
  });

  describe('POST /api/ai/label-ocr', () => {
    it('returns 400 on missing imageDataUrl', async () => {
      const req = new Request('http://localhost/api/ai/label-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const res = await postLabelOcr(req);
      expect(res.status).toBe(400);
    });

    it('extracts nutrition label facts matching Task 8 consumer contract', async () => {
      process.env.AI_BASE_URL = 'https://api.openai.com/v1';
      process.env.AI_API_KEY = 'sk-key';
      process.env.AI_MODEL = 'gpt-4o';

      const labelData = {
        name: 'Whey Protein Isolate',
        brand: 'Optimum Nutrition',
        servingSize: 30.4,
        servingUnit: 'g',
        calories: 120,
        protein: 24,
        carbs: 3,
        fat: 1,
        fiber: 0,
        sodiumMg: 130,
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(labelData) } }],
        }),
      }));

      const req = new Request('http://localhost/api/ai/label-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: 'data:image/jpeg;base64,nutrition-label',
        }),
      });

      const res = await postLabelOcr(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.name).toBe('Whey Protein Isolate');
      expect(data.servingSize).toBe(30.4);
      expect(data.servingUnit).toBe('g');
      expect(data.protein).toBe(24);
      expect(data.sodiumMg).toBe(130);
    });
  });
});

describe('Task 9: AiHealthStatusCard Component', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders card, displays status, and allows testing connection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        configured: true,
        model: 'gpt-4o',
        reachable: true,
      }),
    }));

    render(React.createElement(AiHealthStatusCard));

    expect(screen.getByText(/ai vision & ocr service/i)).toBeInTheDocument();
    expect(screen.getByText(/\.env\.local/i)).toBeInTheDocument();

    // Wait for initial health check to complete
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /test ai connection/i })).toBeInTheDocument();
      expect(screen.getByText(/gpt-4o/i)).toBeInTheDocument();
      expect(screen.getByText(/reachable/i)).toBeInTheDocument();
    });

    // Verify NO client BYOK API key input field exists
    expect(screen.queryByPlaceholderText(/api key/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/api key/i)).not.toBeInTheDocument();

    const testBtn = screen.getByRole('button', { name: /test ai connection/i });
    fireEvent.click(testBtn);

    await waitFor(() => {
      expect(screen.getByText(/gpt-4o/i)).toBeInTheDocument();
    });
  });
});
