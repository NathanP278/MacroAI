import { NextResponse } from 'next/server';
import { NO_STORE_HEADERS } from '@/lib/auth/sync-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const configured = Boolean(process.env.SHORTCUT_API_KEY?.trim());
  return NextResponse.json(
    { configured },
    { status: 200, headers: NO_STORE_HEADERS }
  );
}
