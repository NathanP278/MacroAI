import { NextResponse } from 'next/server';
import { getServerAiConfig, callVisionChatCompletion, AiServiceError } from '@/lib/ai/openai-compat';
import { parseAiJsonResponse, AiMealScanResponseSchema } from '@/lib/ai/schemas';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
  }

  const { imageDataUrl, contextPrompt } = body as {
    imageDataUrl?: string;
    contextPrompt?: string;
  };

  if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:')) {
    return NextResponse.json(
      { error: 'Missing or invalid imageDataUrl: must be a valid base64 data URL' },
      { status: 400 }
    );
  }

  const config = getServerAiConfig();
  if (!config.isConfigured) {
    return NextResponse.json(
      { error: 'AI service is not configured. Please set server environment variables.' },
      { status: 503 }
    );
  }

  const promptText = [
    'Analyze this meal image carefully and decompose it into non-overlapping, individual whole food/ingredient components.',
    'For each component:',
    '1. Provide a clear descriptive name.',
    '2. Estimate total portion weight in grams (must be > 0).',
    '3. Provide nutritional density per 100g (calories, protein, carbs, fat, fiber).',
    'CRITICAL: Do NOT double-count composite dishes. Decompose composite items into distinct sub-ingredients (e.g., bun, patty, cheese, and sauce separately).',
    contextPrompt ? `User prep / hidden cooking context: "${contextPrompt}". Account for these preparation details in the ingredients and gram amounts.` : '',
    'Return ONLY valid JSON matching this schema:',
    '{ "items": [ { "name": "Ingredient Name", "grams": 150, "per100g": { "calories": 165, "protein": 31, "carbs": 0, "fat": 3.6, "fiber": 0 } } ] }',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const rawAiOutput = await callVisionChatCompletion([
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
    ]);

    const parsed = parseAiJsonResponse(rawAiOutput, AiMealScanResponseSchema);
    return NextResponse.json({ items: parsed.items }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof AiServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to scan meal';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
