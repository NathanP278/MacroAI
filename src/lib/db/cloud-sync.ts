import type {
  DBCore,
  DBCoreMutateRequest,
  DBCoreMutateResponse,
  DBCoreTable,
  Middleware,
} from 'dexie';
import type { MacroAIDB } from './macroai-db';
import type {
  CustomRecipe,
  FoodItem,
  FoodLogEntry,
  UserGoals,
} from '@/types/nutrition';
import type {
  CentralTableCounts,
  CentralTableName,
  ServerDbMode,
} from './server-db';

const SYNC_TABLES = new Set<CentralTableName>([
  'foodLogs',
  'foodsCache',
  'customRecipes',
  'userGoals',
]);

const MIGRATED_KEY = 'macroai_central_migrated_v1';
const DIRTY_SYNC_KEY = 'macroai_dirty_sync';

let forceEnableInTests = false;
let isHydratingFromServer = false;
let mutationQueue: Promise<void> = Promise.resolve();
let inFlightSync: Promise<CentralSyncResult> | null = null;

export interface CentralSyncResult {
  ok: boolean;
  configured: boolean;
  mode: ServerDbMode;
  label: string;
  counts: CentralTableCounts;
  syncedAt: number;
}

interface SyncApiResponse {
  ok: boolean;
  configured?: boolean;
  mode?: ServerDbMode;
  label?: string;
  tables?: {
    foodLogs?: FoodLogEntry[];
    foodsCache?: FoodItem[];
    customRecipes?: CustomRecipe[];
    userGoals?: UserGoals[];
  };
  counts?: CentralTableCounts;
  error?: string;
}

function safeGetLocalStorage(key: string): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLocalStorage(key: string, value: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors (private mode / quota)
  }
}

function safeRemoveLocalStorage(key: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
}

export function setCloudSyncEnabledForTests(enabled: boolean): void {
  forceEnableInTests = enabled;
}

export function isCloudSyncEnabled(): boolean {
  return (
    forceEnableInTests ||
    (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test')
  );
}

export function isHydratingCentralDb(): boolean {
  return isHydratingFromServer;
}

export function pushMutationToCentralDb(payload: {
  table: CentralTableName;
  op: 'put' | 'delete' | 'clear';
  values?: unknown[];
  keys?: string[];
}): Promise<void> {
  const run = async () => {
    try {
      const res = await fetch('/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mutate',
          ...payload,
        }),
      });
      if (!res.ok) {
        safeSetLocalStorage(DIRTY_SYNC_KEY, '1');
      }
    } catch {
      safeSetLocalStorage(DIRTY_SYNC_KEY, '1');
    }
  };

  const next = mutationQueue.then(run, run);
  mutationQueue = next;
  return next;
}

export function flushPendingMutationsForTests(): Promise<void> {
  return mutationQueue;
}

export function createCentralSyncMiddleware(
  getDb: () => MacroAIDB
): Middleware<DBCore> {
  return {
    stack: 'dbcore',
    name: 'CentralSyncMiddleware',
    create(downlevelCore: DBCore): Partial<DBCore> {
      return {
        table(tableName: string): DBCoreTable {
          const downlevelTable = downlevelCore.table(tableName);

          if (!SYNC_TABLES.has(tableName as CentralTableName)) {
            return downlevelTable;
          }

          const typedTableName = tableName as CentralTableName;

          return {
            ...downlevelTable,
            async mutate(req: DBCoreMutateRequest): Promise<DBCoreMutateResponse> {
              const res = await downlevelTable.mutate(req);

              if (!isCloudSyncEnabled() || isHydratingFromServer) {
                return res;
              }

              if (req.type === 'add' || req.type === 'put') {
                const values = Array.isArray(req.values)
                  ? req.values.filter((_, idx) => !res.failures?.[idx])
                  : [];

                if (values.length > 0) {
                  void pushMutationToCentralDb({
                    table: typedTableName,
                    op: 'put',
                    values,
                  });
                } else if (
                  req.type === 'put' &&
                  req.updates?.keys &&
                  req.updates.keys.length > 0
                ) {
                  const updateKeys = [...req.updates.keys];
                  void Promise.resolve().then(async () => {
                    try {
                      const updatedRows = await getDb()
                        .table(typedTableName)
                        .bulkGet(updateKeys);
                      const validRows = updatedRows.filter(Boolean);
                      if (validRows.length > 0) {
                        await pushMutationToCentralDb({
                          table: typedTableName,
                          op: 'put',
                          values: validRows,
                        });
                      }
                    } catch {
                      safeSetLocalStorage(DIRTY_SYNC_KEY, '1');
                    }
                  });
                }
              } else if (req.type === 'delete') {
                const keys = (req.keys ?? [])
                  .map((k) => String(k))
                  .filter((k) => k.length > 0);
                if (keys.length > 0) {
                  void pushMutationToCentralDb({
                    table: typedTableName,
                    op: 'delete',
                    keys,
                  });
                }
              } else if (req.type === 'deleteRange') {
                void pushMutationToCentralDb({
                  table: typedTableName,
                  op: 'clear',
                });
              }

              return res;
            },
          };
        },
      };
    },
  };
}

async function runSyncWithCentralDb(
  dbInstance: MacroAIDB,
  options?: { forcePushMode?: 'merge' | 'replace' }
): Promise<CentralSyncResult> {
  await mutationQueue;

  const needsPush =
    Boolean(options?.forcePushMode) ||
    safeGetLocalStorage(MIGRATED_KEY) !== '1' ||
    safeGetLocalStorage(DIRTY_SYNC_KEY) === '1';

  let data: SyncApiResponse;

  if (needsPush) {
    const [foodLogs, foodsCache, customRecipes, userGoals] = await Promise.all([
      dbInstance.foodLogs.toArray(),
      dbInstance.foodsCache.toArray(),
      dbInstance.customRecipes.toArray(),
      dbInstance.userGoals.toArray(),
    ]);

    const res = await fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sync',
        mode: options?.forcePushMode ?? 'merge',
        tables: {
          foodLogs,
          foodsCache,
          customRecipes,
          userGoals,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Central DB sync failed (${res.status})`);
    }

    data = (await res.json()) as SyncApiResponse;
    if (!data.ok) {
      throw new Error(data.error || 'Central DB sync returned an error');
    }

    safeSetLocalStorage(MIGRATED_KEY, '1');
    safeRemoveLocalStorage(DIRTY_SYNC_KEY);
  } else {
    const res = await fetch('/api/db/sync', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (!res.ok) {
      throw new Error(`Central DB fetch failed (${res.status})`);
    }

    data = (await res.json()) as SyncApiResponse;
    if (!data.ok) {
      throw new Error(data.error || 'Central DB fetch returned an error');
    }
  }

  const incoming = data.tables ?? {};
  const foodLogs = incoming.foodLogs ?? [];
  const foodsCache = incoming.foodsCache ?? [];
  const customRecipes = incoming.customRecipes ?? [];
  const userGoals = incoming.userGoals ?? [];

  isHydratingFromServer = true;
  try {
    await dbInstance.transaction(
      'rw',
      [
        dbInstance.foodLogs,
        dbInstance.foodsCache,
        dbInstance.customRecipes,
        dbInstance.userGoals,
      ],
      async () => {
        await Promise.all([
          dbInstance.foodLogs.clear(),
          dbInstance.foodsCache.clear(),
          dbInstance.customRecipes.clear(),
          dbInstance.userGoals.clear(),
        ]);

        if (foodLogs.length > 0) {
          await dbInstance.foodLogs.bulkPut(foodLogs);
        }
        if (foodsCache.length > 0) {
          await dbInstance.foodsCache.bulkPut(foodsCache);
        }
        if (customRecipes.length > 0) {
          await dbInstance.customRecipes.bulkPut(customRecipes);
        }
        if (userGoals.length > 0) {
          await dbInstance.userGoals.bulkPut(userGoals);
        }
      }
    );
  } finally {
    isHydratingFromServer = false;
  }

  return {
    ok: true,
    configured: Boolean(data.configured),
    mode: data.mode ?? 'local-sqlite',
    label: data.label ?? 'Central Database',
    counts: data.counts ?? {
      foodLogs: foodLogs.length,
      foodsCache: foodsCache.length,
      customRecipes: customRecipes.length,
      userGoals: userGoals.length,
    },
    syncedAt: Date.now(),
  };
}

export async function syncWithCentralDb(
  dbInstance: MacroAIDB,
  options?: { forcePushMode?: 'merge' | 'replace' }
): Promise<CentralSyncResult> {
  if (inFlightSync && !options?.forcePushMode) {
    return inFlightSync;
  }

  if (inFlightSync && options?.forcePushMode) {
    await inFlightSync.catch(() => {});
  }

  const promise = runSyncWithCentralDb(dbInstance, options).finally(() => {
    if (inFlightSync === promise) {
      inFlightSync = null;
    }
  });

  inFlightSync = promise;
  return promise;
}
