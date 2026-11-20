import { NextResponse } from 'next/server';
import {
  NO_STORE_HEADERS,
  SYNC_SESSION_COOKIE,
  SYNC_SESSION_MAX_AGE_SECONDS,
  createSyncSessionToken,
  isSyncAuthConfigured,
  isSyncRequestAuthenticated,
  verifyPassphrase,
} from '@/lib/auth/sync-auth';

export const dynamic = 'force-dynamic';

export async function GET(request?: Request) {
  const authRequired = isSyncAuthConfigured();
  const authenticated = isSyncRequestAuthenticated(request);

  return NextResponse.json(
    { authRequired, authenticated },
    { status: 200, headers: NO_STORE_HEADERS }
  );
}

export async function POST(request: Request) {
  if (!isSyncAuthConfigured()) {
    return NextResponse.json(
      { ok: true, authRequired: false, authenticated: true },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON request body' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json(
      { ok: false, error: 'Request body must be a JSON object' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const { passphrase } = body as { passphrase?: unknown };
  if (typeof passphrase !== 'string' || !verifyPassphrase(passphrase)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Invalid passphrase',
        authRequired: true,
        authenticated: false,
      },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const token = createSyncSessionToken();
  const response = NextResponse.json(
    { ok: true, authRequired: true, authenticated: true },
    { status: 200, headers: NO_STORE_HEADERS }
  );
  response.cookies.set(SYNC_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SYNC_SESSION_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}

export async function DELETE() {
  const authRequired = isSyncAuthConfigured();
  const response = NextResponse.json(
    { ok: true, authRequired, authenticated: !authRequired },
    { status: 200, headers: NO_STORE_HEADERS }
  );
  response.cookies.set(SYNC_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}
