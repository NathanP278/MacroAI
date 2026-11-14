import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
  applyTableMutation,
  getAllCentralTables,
  getServerDbStatus,
  syncCentralTables,
  type CentralTableName,
} from '@/lib/db/server-db';

export const dynamic = 'force-dynamic';

const VALID_TABLES = new Set<CentralTableName>([
  'foodLogs',
  'foodsCache',
  'customRecipes',
  'userGoals',
]);
const VALID_OPS = new Set(['put', 'delete', 'clear']);

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
};

export async function GET() {
  try {
    const status = getServerDbStatus();
    const data = await getAllCentralTables();
    return NextResponse.json(
      { ok: true, ...status, ...data },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (body?.action === 'mutate') {
      const table = body.table as CentralTableName;
      const op = body.op as 'put' | 'delete' | 'clear';

      if (!VALID_TABLES.has(table) || !VALID_OPS.has(op)) {
        return NextResponse.json(
          { ok: false, error: 'Invalid table or operation' },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }

      await applyTableMutation({
        table,
        op,
        values: Array.isArray(body.values) ? body.values : undefined,
        keys: Array.isArray(body.keys) ? body.keys.map(String) : undefined,
      });

      return NextResponse.json(
        { ok: true },
        { status: 200, headers: NO_STORE_HEADERS }
      );
    }

    if (body?.action === 'sync') {
      const mode = body.mode === 'replace' ? 'replace' : 'merge';
      const tables = body.tables ?? {};
      const result = await syncCentralTables(tables, mode);
      const status = getServerDbStatus();

      return NextResponse.json(
        { ok: true, ...status, ...result },
        { status: 200, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      { ok: false, error: 'Invalid sync action' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  } catch (err: unknown) {
    const statusCode =
      err instanceof ZodError || err instanceof SyntaxError ? 400 : 500;
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message },
      { status: statusCode, headers: NO_STORE_HEADERS }
    );
  }
}
