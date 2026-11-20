import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  applyTableMutation,
  resetServerDbForTests,
} from '@/lib/db/server-db';
import { GET } from '../latest/route';
import { GET as getStatus } from '../status/route';

describe('GET /api/weight/latest and GET /api/weight/status', () => {
  const originalShortcutKey = process.env.SHORTCUT_API_KEY;

  beforeEach(async () => {
    resetServerDbForTests();
    await applyTableMutation({ table: 'weightLogs', op: 'clear' });
  });

  afterEach(() => {
    if (originalShortcutKey === undefined) {
      delete process.env.SHORTCUT_API_KEY;
    } else {
      process.env.SHORTCUT_API_KEY = originalShortcutKey;
    }
    resetServerDbForTests();
  });

  it('enforces SHORTCUT_API_KEY, returns 404 when empty, and returns flat Apple Shortcuts JSON when present', async () => {
    delete process.env.SHORTCUT_API_KEY;
    const unconfiguredRes = await GET(
      new Request('http://localhost/api/weight/latest')
    );
    expect(unconfiguredRes.status).toBe(503);
    expect(unconfiguredRes.headers.get('cache-control')).toMatch(/no-store/i);

    const statusUnconfigured = await getStatus();
    expect(statusUnconfigured.status).toBe(200);
    expect(await statusUnconfigured.json()).toEqual({ configured: false });

    process.env.SHORTCUT_API_KEY = 'shortcut-secret';

    const statusConfigured = await getStatus();
    expect(statusConfigured.status).toBe(200);
    expect(statusConfigured.headers.get('cache-control')).toMatch(/no-store/i);
    expect(await statusConfigured.json()).toEqual({ configured: true });

    const missingAuthRes = await GET(
      new Request('http://localhost/api/weight/latest')
    );
    expect(missingAuthRes.status).toBe(401);

    const wrongAuthRes = await GET(
      new Request('http://localhost/api/weight/latest', {
        headers: { Authorization: 'Bearer wrong' },
      })
    );
    expect(wrongAuthRes.status).toBe(401);
    expect(wrongAuthRes.headers.get('cache-control')).toMatch(/no-store/i);

    const emptyRes = await GET(
      new Request('http://localhost/api/weight/latest', {
        headers: { Authorization: 'Bearer shortcut-secret' },
      })
    );
    expect(emptyRes.status).toBe(404);
    expect(emptyRes.headers.get('cache-control')).toMatch(/no-store/i);

    await applyTableMutation({
      table: 'weightLogs',
      op: 'put',
      values: [
        {
          id: 'w_103',
          date: '2026-11-19',
          weightKg: 77.0,
          source: 'manual',
          recordedAt: '2026-11-19T08:00:00.000Z',
          createdAt: 900,
          updatedAt: 900,
        },
        {
          id: 'w_104',
          date: '2026-11-20',
          weightKg: 76.5,
          source: 'manual',
          recordedAt: '2026-11-20T08:00:00.000Z',
          createdAt: 1000,
          updatedAt: 1000,
        },
      ],
    });

    const okRes = await GET(
      new Request('http://localhost/api/weight/latest', {
        headers: { Authorization: 'Bearer shortcut-secret' },
      })
    );
    expect(okRes.status).toBe(200);
    expect(okRes.headers.get('cache-control')).toMatch(/no-store/i);
    expect(await okRes.json()).toEqual({
      id: 'w_104',
      date: '2026-11-20',
      weight_kg: 76.5,
      weight_lb: 168.65,
      recorded_at: '2026-11-20T08:00:00.000Z',
    });
  });
});
