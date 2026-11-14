import { NextRequest, NextResponse } from 'next/server';

const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
): Promise<NextResponse> {
  const resolvedParams =
    context.params instanceof Promise ? await context.params : context.params;
  const pathSegments = resolvedParams?.path || [];

  // Validation: Allow ONLY 'foods/search' and 'food/<numericId>'
  const isSearchPath =
    pathSegments.length === 2 &&
    pathSegments[0] === 'foods' &&
    pathSegments[1] === 'search';

  const isFoodDetailPath =
    pathSegments.length === 2 &&
    pathSegments[0] === 'food' &&
    /^\d+$/.test(pathSegments[1]);

  if (!isSearchPath && !isFoodDetailPath) {
    return NextResponse.json(
      { error: 'Invalid USDA API path. Allowed paths: foods/search, food/<numericId>' },
      { status: 400 }
    );
  }

  const apiKey = process.env.USDA_API_KEY || 'DEMO_KEY';

  let targetUrl: string;

  if (isSearchPath) {
    const url = new URL(request.url);
    const searchParams = new URLSearchParams(url.searchParams);

    // Preserve allowed dataType filter if requested, else default to Foundation,SR Legacy
    const ALLOWED_DATA_TYPES = new Set([
      'Foundation',
      'SR Legacy',
      'Survey (FNDDS)',
      'Branded',
    ]);
    const requestedTypes = (searchParams.get('dataType') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => ALLOWED_DATA_TYPES.has(s));
    searchParams.set(
      'dataType',
      requestedTypes.length > 0 ? requestedTypes.join(',') : 'Foundation,SR Legacy'
    );
    searchParams.set('api_key', apiKey);

    targetUrl = `${USDA_BASE_URL}/foods/search?${searchParams.toString()}`;
  } else {
    const fdcId = pathSegments[1];
    targetUrl = `${USDA_BASE_URL}/food/${fdcId}?api_key=${encodeURIComponent(apiKey)}`;
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      signal: AbortSignal.timeout(8000),
    });
    if (!upstreamRes.ok) {
      const errorText = await upstreamRes.text().catch(() => '');
      return NextResponse.json(
        {
          error: `USDA API upstream returned error status ${upstreamRes.status}`,
          details: errorText,
        },
        {
          status: upstreamRes.status,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    const data = await upstreamRes.json();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err: unknown) {
    const isTimeout =
      err instanceof Error &&
      (err.name === 'TimeoutError' || err.name === 'AbortError');
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: isTimeout
          ? 'Upstream USDA request timed out'
          : 'Failed to communicate with USDA API',
        message,
      },
      {
        status: isTimeout ? 504 : 502,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }
}
