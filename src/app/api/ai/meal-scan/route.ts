import { NextResponse } from 'next/server';
import { getServerAiConfig, callVisionChatCompletion, AiServiceError } from '@/lib/ai/openai-compat';
import { parseAiJsonResponse, AiMealScanResponseSchema } from '@/lib/ai/schemas';
import { enrichMealItemsWithStaples } from '@/lib/foods/staples-search';
import { NO_STORE_HEADERS, requireSyncAuth } from '@/lib/auth/sync-auth';

export async function POST(request: Request) {
  const authError = requireSyncAuth(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request body' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json(
      { error: 'Request body must be a JSON object' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const { imageDataUrl, contextPrompt } = body as {
    imageDataUrl?: string;
    contextPrompt?: string;
  };

  if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:')) {
    return NextResponse.json(
      { error: 'Missing or invalid imageDataUrl: must be a valid base64 data URL' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const config = getServerAiConfig();
  if (!config.isConfigured) {
    return NextResponse.json(
      { error: 'AI service is not configured. Please set server environment variables.' },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  const trimmedContext = typeof contextPrompt === 'string' ? contextPrompt.trim() : '';

  const promptText = [
    'Output JSON immediately without extended thinking.',
    'Decompose this meal image into non-overlapping whole-food/ingredient components (do NOT double-count composite dishes; split bun, patty, cheese, sauce, oils).',
    trimmedContext
      ? `USER-PROVIDED MEAL DESCRIPTION (ground truth): "${trimmedContext}". Use this with the image for exact cuts, brands, hidden oils/sauces, prep methods, and stated weights.`
      : '',
    'Per component provide: name, grams (>0), per100g (calories, protein, carbs, fat, fiber in g), and optional microsPer100g (sodiumMg, potassiumMg, calciumMg, ironMg, magnesiumMg, zincMg, vitaminAMcg, vitaminCMg, vitaminDMcg, vitaminB6Mg, vitaminB12Mcg, folateMcg per 100g).',
    'To minimize latency, omit microsPer100g for standard whole foods (server backfills USDA micronutrients) and omit any nutrient key equal to 0.',
    'Return ONLY compact JSON matching this schema:',
    '{"items":[{"name":"Ingredient Name","grams":150,"per100g":{"calories":165,"protein":31,"carbs":0,"fat":3.6,"fiber":0}}]}',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const rawAiOutput = await callVisionChatCompletion(
      [
        {
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl,
              },
            },
          ],
        },
      ],
      {
        temperature: 0,
        maxTokens: 2500,
        signal: request.signal,
      }
    );

    const parsed = parseAiJsonResponse(rawAiOutput, AiMealScanResponseSchema);
    const enrichedItems = await enrichMealItemsWithStaples(parsed.items);
    return NextResponse.json({ items: enrichedItems }, { status: 200, headers: NO_STORE_HEADERS });
  } catch (err: unknown) {
    if (err instanceof AiServiceError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status, headers: NO_STORE_HEADERS }
      );
    }
    const message = err instanceof Error ? err.message : 'Failed to scan meal';
    return NextResponse.json(
      { error: message },
      { status: 422, headers: NO_STORE_HEADERS }
    );
  }
}
