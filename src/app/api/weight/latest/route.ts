import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { NO_STORE_HEADERS } from '@/lib/auth/sync-auth';
import { getLatestWeightLog } from '@/lib/db/server-db';

export const dynamic = 'force-dynamic';

const KG_TO_LB = 2.20462;

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  return match ? match[1].trim() : null;
}

function verifyShortcutApiKey(candidate: string, secret: string): boolean {
  if (!secret || !candidate) return false;
  const digestA = crypto.createHmac('sha256', secret).update(candidate, 'utf8').digest();
  const digestB = crypto.createHmac('sha256', secret).update(secret, 'utf8').digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

export async function GET(request: Request) {
  const configuredSecret = process.env.SHORTCUT_API_KEY?.trim() ?? '';

  if (!configuredSecret) {
    return NextResponse.json(
      { error: 'SHORTCUT_API_KEY is not configured on the server.' },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  const token = extractBearerToken(request.headers.get('authorization'));
  if (!token || !verifyShortcutApiKey(token, configuredSecret)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const latest = await getLatestWeightLog();
    if (!latest) {
      return NextResponse.json(
        { error: 'No weigh-in entries found.' },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        id: latest.id,
        date: latest.date,
        weight_kg: Number(latest.weightKg.toFixed(2)),
        weight_lb: Number((latest.weightKg * KG_TO_LB).toFixed(2)),
        recorded_at: latest.recordedAt,
      },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  } catch (err: unknown) {
    console.error('Failed to query latest weigh-in:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve latest weigh-in.' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
