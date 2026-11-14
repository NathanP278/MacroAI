import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../macroai-db';
import {
  flushPendingMutationsForTests,
  setCloudSyncEnabledForTests,
  syncWithCentralDb,
} from '../cloud-sync';
import {
  applyTableMutation,
  ensureServerSchema,
  getAllCentralTables,
  getServerDbStatus,
  resetServerDbForTests,
  syncCentralTables,
} from '../server-db';
import { GET as syncGetRoute, POST as syncPostRoute } from '@/app/api/db/sync/route';
import type { FoodLogEntry, UserGoals } from '@/types/nutrition';

const makeLog = (id: string, name = 'Chicken Breast'): FoodLogEntry => ({
  id,
  date: '2026-11-15',
  mealSlot: 'lunch',
  foodId: 'staple:chicken',
  name,
  source: 'staple',
  amount: 150,
  unit: 'g',
  nutritionSnapshot: {
    calories: 248,
    protein: 46.5,
    carbs: 0,
    fat: 5.4,
    fiber: 0,
    micros: { sodiumMg: 111 },
  },
  createdAt: 1700000000000,
});

const makeGoals = (dailyCalories: number, updatedAt: number): UserGoals => ({
  id: 'active',
  dailyCalories,
  proteinG: 160,
  carbsG: 200,
  fatG: 65,
  fiberG: 30,
  micronutrientTargets: { sodiumMg: 2300 },
  mealSlots: [
    { id: 'breakfast', name: 'Breakfast', weightPct: 25 },
    { id: 'lunch', name: 'Lunch', weightPct: 35 },
    { id: 'dinner', name: 'Dinner', weightPct: 40 },
  ],
  updatedAt,
});

describe('Central Database (Turso / libSQL) & Hybrid Dexie Sync', () => {
  beforeEach(async () => {
    resetServerDbForTests();
    await ensureServerSchema();
    await db.delete();
    await db.open();
    localStorage.clear();
    setCloudSyncEnabledForTests(false);
  });

  afterEach(() => {
    setCloudSyncEnabledForTests(false);
    vi.restoreAllMocks();
    resetServerDbForTests();
  });

  describe('server-db (libSQL)', () => {
    it('initializes schema and reports status cleanly', () => {
      const status = getServerDbStatus();
      expect(status.configured).toBe(true);
      expect(status.mode).toBe('local-sqlite');
    });

    it('supports put, delete, and clear mutations', async () => {
      const log1 = makeLog('log-1', 'Oats');
      const log2 = makeLog('log-2', 'Eggs');

      await applyTableMutation({
        table: 'foodLogs',
        op: 'put',
        values: [log1, log2],
      });

      let state = await getAllCentralTables();
      expect(state.counts.foodLogs).toBe(2);

      await applyTableMutation({
        table: 'foodLogs',
        op: 'delete',
        keys: ['log-1'],
      });

      state = await getAllCentralTables();
      expect(state.counts.foodLogs).toBe(1);
      expect(state.tables.foodLogs[0].id).toBe('log-2');

      await applyTableMutation({
        table: 'foodLogs',
        op: 'clear',
      });

      state = await getAllCentralTables();
      expect(state.counts.foodLogs).toBe(0);
    });

    it('prevents unconfigured seed goals (updatedAt: 0) from overwriting customized goals', async () => {
      await applyTableMutation({
        table: 'userGoals',
        op: 'put',
        values: [makeGoals(2600, 1700005000000)],
      });

      await applyTableMutation({
        table: 'userGoals',
        op: 'put',
        values: [makeGoals(2000, 0)],
      });

      const state = await getAllCentralTables();
      expect(state.tables.userGoals).toHaveLength(1);
      expect(state.tables.userGoals[0].dailyCalories).toBe(2600);
    });

    it('supports merge (with updatedAt resolution) and replace sync modes', async () => {
      await syncCentralTables(
        {
          foodLogs: [makeLog('log-a', 'Rice')],
          foodsCache: [],
          customRecipes: [],
          userGoals: [makeGoals(2400, 5000)],
        },
        'replace'
      );

      // Merge with stale userGoals (updatedAt: 0) and a new log
      const merged = await syncCentralTables(
        {
          foodLogs: [makeLog('log-b', 'Salmon')],
          foodsCache: [],
          customRecipes: [],
          userGoals: [makeGoals(2000, 0)],
        },
        'merge'
      );

      expect(merged.counts.foodLogs).toBe(2);
      expect(merged.tables.userGoals[0].dailyCalories).toBe(2400);

      // Replace wipes existing logs and replaces userGoals
      const replaced = await syncCentralTables(
        {
          foodLogs: [makeLog('log-c', 'Greek Yogurt')],
          foodsCache: [],
          customRecipes: [],
          userGoals: [makeGoals(1900, 9000)],
        },
        'replace'
      );

      expect(replaced.counts.foodLogs).toBe(1);
      expect(replaced.tables.foodLogs[0].id).toBe('log-c');
      expect(replaced.tables.userGoals[0].dailyCalories).toBe(1900);
    });
  });

  describe('/api/db/sync route', () => {
    it('handles GET, POST mutate, POST sync, and rejects invalid requests', async () => {
      const mutateReq = new Request('http://localhost/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mutate',
          table: 'foodLogs',
          op: 'put',
          values: [makeLog('route-log-1', 'Steak')],
        }),
      });
      const mutateRes = await syncPostRoute(mutateReq);
      expect(mutateRes.status).toBe(200);
      expect(await mutateRes.json()).toEqual({ ok: true });

      const getRes = await syncGetRoute();
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.ok).toBe(true);
      expect(getData.counts.foodLogs).toBe(1);
      expect(getData.tables.foodLogs[0].name).toBe('Steak');

      const syncReq = new Request('http://localhost/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          mode: 'merge',
          tables: {
            foodLogs: [makeLog('route-log-2', 'Banana')],
            foodsCache: [],
            customRecipes: [],
            userGoals: [],
          },
        }),
      });
      const syncRes = await syncPostRoute(syncReq);
      expect(syncRes.status).toBe(200);
      const syncData = await syncRes.json();
      expect(syncData.counts.foodLogs).toBe(2);

      const badActionReq = new Request('http://localhost/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unknown' }),
      });
      expect((await syncPostRoute(badActionReq)).status).toBe(400);

      const badTableReq = new Request('http://localhost/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mutate',
          table: 'invalidTable',
          op: 'put',
        }),
      });
      expect((await syncPostRoute(badTableReq)).status).toBe(400);
    });
  });

  describe('Dexie DBCore middleware & client hydration', () => {
    it('replicates local put/delete to central DB and hydrates without echo loops', async () => {
      const fetchCalls: Array<{ method: string; body?: string }> = [];

      vi.spyOn(globalThis, 'fetch').mockImplementation(
        async (_input: RequestInfo | URL, init?: RequestInit) => {
          const method = init?.method ?? 'GET';
          const body = typeof init?.body === 'string' ? init.body : undefined;
          fetchCalls.push({ method, body });

          if (method === 'GET') {
            return syncGetRoute();
          }

          return syncPostRoute(
            new Request('http://localhost/api/db/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body,
            })
          );
        }
      );

      setCloudSyncEnabledForTests(true);

      // Initial startup sync marks browser migrated
      await syncWithCentralDb(db);
      expect(localStorage.getItem('macroai_central_migrated_v1')).toBe('1');

      // Local write replicates automatically via DBCore middleware
      await db.foodLogs.put(makeLog('sync-log-1', 'Whey Protein'));
      await db.foodLogs.put(makeLog('sync-log-2', 'Blueberries'));
      await flushPendingMutationsForTests();

      let serverSnapshot = await getAllCentralTables();
      expect(serverSnapshot.counts.foodLogs).toBe(2);

      // Local delete replicates automatically
      await db.foodLogs.delete('sync-log-1');
      await flushPendingMutationsForTests();

      serverSnapshot = await getAllCentralTables();
      expect(serverSnapshot.counts.foodLogs).toBe(1);
      expect(serverSnapshot.tables.foodLogs[0].id).toBe('sync-log-2');

      // Simulate another browser adding a log directly on the central server
      await applyTableMutation({
        table: 'foodLogs',
        op: 'put',
        values: [makeLog('remote-log-3', 'Avocado')],
      });

      const callCountBeforeHydrate = fetchCalls.length;
      const syncResult = await syncWithCentralDb(db);
      await flushPendingMutationsForTests();

      expect(syncResult.counts.foodLogs).toBe(2);
      const localLogs = await db.foodLogs.toArray();
      expect(localLogs.map((l) => l.id).sort()).toEqual([
        'remote-log-3',
        'sync-log-2',
      ]);

      // Hydration must issue ONLY the single GET /api/db/sync and NO echo POST mutations
      const newCalls = fetchCalls.slice(callCountBeforeHydrate);
      expect(newCalls).toHaveLength(1);
      expect(newCalls[0].method).toBe('GET');
    });
  });
});
