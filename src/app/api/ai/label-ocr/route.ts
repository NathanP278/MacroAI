import { NextResponse } from 'next/server';
import { getServerAiConfig, callVisionChatCompletion, AiServiceError } from '@/lib/ai/openai-compat';
import { parseAiJsonResponse, AiLabelOcrResponseSchema } from '@/lib/ai/schemas';

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

  const { imageDataUrl } = body as { imageDataUrl?: string };

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
    'Analyze this nutrition facts label image and extract the key nutritional information.',
    'Extract:',
    '- name: Product name if clearly visible (optional string)',
    '- brand: Brand name if clearly visible (optional string)',
    '- servingSize: Serving size number (must be > 0, e.g. 30 for 30g, 240 for 240ml, 1 for 1 serving)',
    "- servingUnit: One of 'g', 'ml', or 'serving'",
    '- calories: Calories per serving (non-negative number)',
    '- protein: Protein in grams per serving (non-negative number)',
    '- carbs: Total carbohydrates in grams per serving (non-negative number)',
    '- fat: Total fat in grams per serving (non-negative number)',
    '- fiber: Dietary fiber in grams per serving (optional non-negative number)',
    '- sodiumMg: Sodium in milligrams per serving (optional non-negative number)',
    'Return ONLY valid JSON matching this schema:',
    '{',
    '  "name": "Product Name",',
    '  "brand": "Brand",',
    '  "servingSize": 30,',
    '  "servingUnit": "g",',
    '  "calories": 150,',
    '  "protein": 5,',
    '  "carbs": 25,',
    '  "fat": 3,',
    '  "fiber": 2,',
    '  "sodiumMg": 140',
    '}',
  ].join('\n');

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

    const parsed = parseAiJsonResponse(rawAiOutput, AiLabelOcrResponseSchema);
    return NextResponse.json(parsed, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof AiServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to scan nutrition label';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
