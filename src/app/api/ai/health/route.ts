import { NextResponse } from 'next/server';
import {
  getServerAiConfig,
  callVisionChatCompletionWithMeta,
  sanitizeError,
} from '@/lib/ai/openai-compat';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  const config = getServerAiConfig();

  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  };

  if (!config.isConfigured) {
    return NextResponse.json(
      {
        configured: false,
        model: '',
        reachable: false,
      },
      { status: 200, headers }
    );
  }

  try {
    // Perform a lightweight probe (with parallel ping across fallback candidates if configured)
    const result = await callVisionChatCompletionWithMeta(
      [{ role: 'user', content: 'Respond with OK' }],
      { timeoutMs: 45000, responseFormat: false }
    );

    return NextResponse.json(
      {
        configured: true,
        model: result.model,
        reachable: true,
      },
      { status: 200, headers }
    );
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const safeError = sanitizeError(rawMsg, config.apiKeys, config.customHeaders);

    return NextResponse.json(
      {
        configured: true,
        model: config.model,
        reachable: false,
        error: safeError,
      },
      { status: 200, headers }
    );
  }
}
