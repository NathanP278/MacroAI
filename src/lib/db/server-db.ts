import { createClient, type Client, type InStatement } from '@libsql/client';
import {
  CustomRecipeSchema,
  FoodItemSchema,
  FoodLogEntrySchema,
  MacroAIBackupSchema,
  UserGoalsSchema,
} from './backup';
import type {
  CustomRecipe,
  FoodItem,
  FoodLogEntry,
  UserGoals,
} from '@/types/nutrition';

export type CentralTableName = 'foodLogs' | 'foodsCache' | 'customRecipes' | 'userGoals';
export type ServerDbMode = 'turso-cloud' | 'local-sqlite' | 'vercel-ephemeral';

export interface ServerDbStatus {
  configured: boolean;
  mode: ServerDbMode;
  label: string;
}

export interface CentralTablesPayload {
  foodLogs: FoodLogEntry[];
  foodsCache: FoodItem[];
  customRecipes: CustomRecipe[];
  userGoals: UserGoals[];
}

export interface CentralTableCounts {
  foodLogs: number;
  foodsCache: number;
  customRecipes: number;
  userGoals: number;
}

export interface AllCentralTablesResult {
  tables: CentralTablesPayload;
  counts: CentralTableCounts;
}

export interface TableMutationInput {
  table: CentralTableName;
  op: 'put' | 'delete' | 'clear';
  values?: unknown[];
  keys?: string[];
}

const SQL_TABLE_MAP: Record<CentralTableName, string> = {
  foodLogs: 'food_logs',
  foodsCache: 'foods_cache',
  customRecipes: 'custom_recipes',
  userGoals: 'user_goals',
};

let cachedClient: Client | null = null;
let cachedConfigKey: string | null = null;
let schemaReadyPromise: Promise<void> | null = null;

function resolveConnectionConfig(): {
  url: string;
  authToken?: string;
  status: ServerDbStatus;
} {
  const rawUrl =
    process.env.TURSO_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
  const authToken =
    process.env.TURSO_AUTH_TOKEN?.trim() || process.env.DATABASE_AUTH_TOKEN?.trim();

  if (rawUrl) {
    const isLocal = rawUrl.startsWith('file:') || rawUrl === ':memory:';
    return {
      url: rawUrl,
      authToken: authToken || undefined,
      status: isLocal
        ? {
            configured: true,
            mode: 'local-sqlite',
            label: 'Local SQLite',
          }
        : {
            configured: true,
            mode: 'turso-cloud',
            label: 'Turso Cloud (libSQL)',
          },
    };
  }

  if (process.env.NODE_ENV === 'test') {
    return {
      url: ':memory:',
      status: {
        configured: true,
        mode: 'local-sqlite',
        label: 'Local SQLite (Test Memory)',
      },
    };
  }

  if (process.env.VERCEL === '1') {
    return {
      url: 'file:/tmp/macroai.db',
      status: {
        configured: false,
        mode: 'vercel-ephemeral',
        label: 'Ephemeral (/tmp) — Set TURSO_DATABASE_URL',
      },
    };
  }

  return {
    url: 'file:./macroai.db',
    status: {
      configured: true,
      mode: 'local-sqlite',
      label: 'Local SQLite (macroai.db)',
    },
  };
}

export function getLibsqlClient(): Client {
  const config = resolveConnectionConfig();
  const configKey = `${config.url}|${config.authToken ?? ''}`;

  if (!cachedClient || cachedConfigKey !== configKey) {
    if (cachedClient) {
      cachedClient.close();
    }
    cachedClient = createClient({
      url: config.url,
      authToken: config.authToken,
    });
    cachedConfigKey = configKey;
    schemaReadyPromise = null;
  }

  return cachedClient;
}

export function resetServerDbForTests(): void {
  if (cachedClient) {
    cachedClient.close();
  }
  cachedClient = null;
  cachedConfigKey = null;
  schemaReadyPromise = null;
}

export function getServerDbStatus(): ServerDbStatus {
  return resolveConnectionConfig().status;
}

export async function ensureServerSchema(): Promise<void> {
  const client = getLibsqlClient();
  if (!schemaReadyPromise) {
    schemaReadyPromise = client
      .executeMultiple(`
        CREATE TABLE IF NOT EXISTS food_logs (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          meal_slot TEXT NOT NULL,
          food_id TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          data TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_food_logs_date ON food_logs(date);

        CREATE TABLE IF NOT EXISTS foods_cache (
          id TEXT PRIMARY KEY,
          barcode TEXT,
          source TEXT NOT NULL,
          name TEXT NOT NULL,
          updated_at INTEGER NOT NULL,
          data TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_foods_cache_barcode ON foods_cache(barcode);

        CREATE TABLE IF NOT EXISTS custom_recipes (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          data TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS user_goals (
          id TEXT PRIMARY KEY,
          updated_at INTEGER NOT NULL,
          data TEXT NOT NULL
        );
      `)
      .catch((err) => {
        schemaReadyPromise = null;
        throw err;
      });
  }
  await schemaReadyPromise;
}

function buildPutStatement(table: CentralTableName, rawItem: unknown): InStatement {
  switch (table) {
    case 'foodLogs': {
      const item = FoodLogEntrySchema.parse(rawItem);
      return {
        sql: `INSERT OR REPLACE INTO food_logs (id, date, meal_slot, food_id, created_at, data)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          item.id,
          item.date,
          item.mealSlot,
          item.foodId,
          item.createdAt,
          JSON.stringify(item),
        ],
      };
    }
    case 'foodsCache': {
      const item = FoodItemSchema.parse(rawItem);
      return {
        sql: `INSERT OR REPLACE INTO foods_cache (id, barcode, source, name, updated_at, data)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          item.id,
          item.barcode ?? null,
          item.source,
          item.name,
          item.updatedAt,
          JSON.stringify(item),
        ],
      };
    }
    case 'customRecipes': {
      const item = CustomRecipeSchema.parse(rawItem);
      return {
        sql: `INSERT OR REPLACE INTO custom_recipes (id, name, created_at, data)
              VALUES (?, ?, ?, ?)`,
        args: [item.id, item.name, item.createdAt, JSON.stringify(item)],
      };
    }
    case 'userGoals': {
      const item = UserGoalsSchema.parse(rawItem);
      return {
        sql: `INSERT OR REPLACE INTO user_goals (id, updated_at, data)
              VALUES (?, ?, ?)`,
        args: [item.id, item.updatedAt, JSON.stringify(item)],
      };
    }
  }
}

function parseJsonRows<T>(
  rows: Array<Record<string, unknown>>,
  schema: { parse: (v: unknown) => T }
): T[] {
  const results: T[] = [];
  for (const row of rows) {
    const rawData = row.data;
    if (typeof rawData !== 'string') continue;
    const parsedJson = JSON.parse(rawData);
    results.push(schema.parse(parsedJson));
  }
  return results;
}

export async function getAllCentralTables(): Promise<AllCentralTablesResult> {
  await ensureServerSchema();
  const client = getLibsqlClient();

  const [foodLogsRes, foodsCacheRes, customRecipesRes, userGoalsRes] =
    await Promise.all([
      client.execute('SELECT data FROM food_logs ORDER BY created_at ASC'),
      client.execute('SELECT data FROM foods_cache ORDER BY updated_at DESC'),
      client.execute('SELECT data FROM custom_recipes ORDER BY created_at ASC'),
      client.execute('SELECT data FROM user_goals ORDER BY updated_at DESC'),
    ]);

  const foodLogs = parseJsonRows(
    foodLogsRes.rows as Array<Record<string, unknown>>,
    FoodLogEntrySchema
  ) as FoodLogEntry[];
  const foodsCache = parseJsonRows(
    foodsCacheRes.rows as Array<Record<string, unknown>>,
    FoodItemSchema
  ) as FoodItem[];
  const customRecipes = parseJsonRows(
    customRecipesRes.rows as Array<Record<string, unknown>>,
    CustomRecipeSchema
  ) as CustomRecipe[];
  const userGoals = parseJsonRows(
    userGoalsRes.rows as Array<Record<string, unknown>>,
    UserGoalsSchema
  ) as UserGoals[];

  return {
    tables: {
      foodLogs,
      foodsCache,
      customRecipes,
      userGoals,
    },
    counts: {
      foodLogs: foodLogs.length,
      foodsCache: foodsCache.length,
      customRecipes: customRecipes.length,
      userGoals: userGoals.length,
    },
  };
}

export async function applyTableMutation(
  input: TableMutationInput
): Promise<void> {
  await ensureServerSchema();
  const client = getLibsqlClient();
  const sqlTable = SQL_TABLE_MAP[input.table];

  if (!sqlTable) {
    throw new Error(`Unsupported table: ${String(input.table)}`);
  }

  if (input.op === 'clear') {
    await client.execute(`DELETE FROM ${sqlTable}`);
    return;
  }

  if (input.op === 'delete') {
    const keys = (input.keys ?? []).filter((k) => typeof k === 'string' && k.length > 0);
    if (keys.length === 0) return;

    const stmts: InStatement[] = keys.map((key) => ({
      sql: `DELETE FROM ${sqlTable} WHERE id = ?`,
      args: [key],
    }));
    await client.batch(stmts, 'write');
    return;
  }

  if (input.op === 'put') {
    const values = input.values ?? [];
    if (values.length === 0) return;

    const stmts: InStatement[] = [];

    if (input.table === 'userGoals') {
      const existingRes = await client.execute(
        'SELECT id, updated_at FROM user_goals'
      );
      const existingMap = new Map<string, number>();
      for (const row of existingRes.rows as Array<Record<string, unknown>>) {
        if (typeof row.id === 'string') {
          existingMap.set(row.id, Number(row.updated_at ?? 0));
        }
      }

      for (const rawItem of values) {
        const parsedGoal = UserGoalsSchema.parse(rawItem);
        const existingUpdatedAt = existingMap.get(parsedGoal.id);
        if (
          existingUpdatedAt !== undefined &&
          existingUpdatedAt > parsedGoal.updatedAt &&
          parsedGoal.updatedAt === 0
        ) {
          continue;
        }
        stmts.push(buildPutStatement('userGoals', parsedGoal));
      }
    } else {
      for (const rawItem of values) {
        stmts.push(buildPutStatement(input.table, rawItem));
      }
    }

    if (stmts.length > 0) {
      await client.batch(stmts, 'write');
    }
    return;
  }

  throw new Error(`Unsupported operation: ${String(input.op)}`);
}

export async function syncCentralTables(
  incomingTables: unknown,
  mode: 'merge' | 'replace'
): Promise<AllCentralTablesResult> {
  await ensureServerSchema();
  const client = getLibsqlClient();
  const tables = MacroAIBackupSchema.shape.tables.parse(incomingTables ?? {});

  const stmts: InStatement[] = [];

  if (mode === 'replace') {
    stmts.push(
      'DELETE FROM food_logs',
      'DELETE FROM foods_cache',
      'DELETE FROM custom_recipes',
      'DELETE FROM user_goals'
    );
    for (const item of tables.foodLogs) {
      stmts.push(buildPutStatement('foodLogs', item));
    }
    for (const item of tables.foodsCache) {
      stmts.push(buildPutStatement('foodsCache', item));
    }
    for (const item of tables.customRecipes) {
      stmts.push(buildPutStatement('customRecipes', item));
    }
    for (const item of tables.userGoals) {
      stmts.push(buildPutStatement('userGoals', item));
    }
  } else {
    for (const item of tables.foodLogs) {
      stmts.push(buildPutStatement('foodLogs', item));
    }
    for (const item of tables.foodsCache) {
      stmts.push(buildPutStatement('foodsCache', item));
    }
    for (const item of tables.customRecipes) {
      stmts.push(buildPutStatement('customRecipes', item));
    }

    if (tables.userGoals.length > 0) {
      const existingRes = await client.execute(
        'SELECT id, updated_at FROM user_goals'
      );
      const existingMap = new Map<string, number>();
      for (const row of existingRes.rows as Array<Record<string, unknown>>) {
        if (typeof row.id === 'string') {
          existingMap.set(row.id, Number(row.updated_at ?? 0));
        }
      }

      for (const goal of tables.userGoals) {
        const existingUpdatedAt = existingMap.get(goal.id);
        if (
          existingUpdatedAt === undefined ||
          goal.updatedAt > existingUpdatedAt
        ) {
          stmts.push(buildPutStatement('userGoals', goal));
        }
      }
    }
  }

  if (stmts.length > 0) {
    await client.batch(stmts, 'write');
  }

  return getAllCentralTables();
}
