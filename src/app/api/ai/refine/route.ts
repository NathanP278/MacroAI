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

  const { items, instruction, contextPrompt } = body as {
    items?: unknown[];
    instruction?: string;
    contextPrompt?: string;
  };

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: 'Missing or invalid items: must be a non-empty array of meal items' },
      { status: 400 }
    );
  }

  if (!instruction || typeof instruction !== 'string' || !instruction.trim()) {
    return NextResponse.json(
      { error: 'Missing or empty refinement instruction' },
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
    'You are refining an existing nutrition draft for a meal based on user feedback.',
    'Current meal items draft:',
    JSON.stringify(items, null, 2),
    `User refinement instruction: "${instruction.trim()}"`,
    contextPrompt ? `Additional cooking / prep context: "${contextPrompt.trim()}"` : '',
    'Apply the requested changes to the draft. You may modify portions in grams, add or delete ingredients, or refine per100g densities.',
    'Ensure all items are non-overlapping individual ingredients with positive gram weights.',
    'Return ONLY valid JSON matching this schema:',
    '{ "items": [ { "name": "Ingredient Name", "grams": 150, "per100g": { "calories": 165, "protein": 31, "carbs": 0, "fat": 3.6, "fiber": 0 } } ] }',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const rawAiOutput = await callVisionChatCompletion([
      {
        role: 'user',
        content: promptText,
      },
    ]);

    const parsed = parseAiJsonResponse(rawAiOutput, AiMealScanResponseSchema);
    return NextResponse.json({ items: parsed.items }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof AiServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to refine meal draft';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
