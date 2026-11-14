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
    'Output JSON immediately without extended thinking.',
    'Extract nutrition facts from this label image: optional name, optional brand, servingSize (>0), servingUnit ("g"|"ml"|"serving"), calories, protein, carbs, fat, optional fiber, optional sodiumMg per serving.',
    'Return ONLY compact JSON:',
    '{"name":"Product Name","brand":"Brand","servingSize":30,"servingUnit":"g","calories":150,"protein":5,"carbs":25,"fat":3,"fiber":2,"sodiumMg":140}',
  ].join('\n');

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
        maxTokens: 400,
        signal: request.signal,
      }
    );

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
