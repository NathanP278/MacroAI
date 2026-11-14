import { NextRequest, NextResponse } from 'next/server';

const OFF_BASE_URL = 'https://world.openfoodfacts.org/api/v2/product';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ barcode: string }> | { barcode: string } }
): Promise<NextResponse> {
  const resolvedParams =
    context.params instanceof Promise ? await context.params : context.params;
  const rawBarcode = resolvedParams?.barcode || '';
  const barcode = rawBarcode.trim();

  // Validate barcode: 4 to 18 numeric digits
  if (!/^\d{4,18}$/.test(barcode)) {
    return NextResponse.json(
      { error: 'Invalid barcode format. Expected 4 to 18 numeric digits.' },
      {
        status: 400,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }

  const targetUrl = `${OFF_BASE_URL}/${encodeURIComponent(barcode)}.json`;

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'MacroAI/1.0',
      },
    });

    if (!upstreamRes.ok) {
      const errorText = await upstreamRes.text().catch(() => '');
      return NextResponse.json(
        {
          error: `Open Food Facts API returned error status ${upstreamRes.status}`,
          details: errorText,
        },
        {
          status: upstreamRes.status,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    const data = await upstreamRes.json();

    if (data && typeof data === 'object' && (data as any).status === 1) {
      return NextResponse.json(data, {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Status === 0 (product not found) or missing status
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'Failed to communicate with Open Food Facts API', message },
      {
        status: 502,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }
}
