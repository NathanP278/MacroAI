import { z } from 'zod';
import { db } from './macroai-db';
import type {
  FoodLogEntry,
  FoodItem,
  CustomRecipe,
  UserGoals,
} from '@/types/nutrition';

export const MacroNutrientsSchema = z.object({
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  fiber: z.number(),
});

export const MicronutrientsSchema = z
  .record(z.string(), z.number().optional())
  .default({});

export const FoodSourceSchema = z.enum([
  'staple',
  'usda',
  'off',
  'custom_barcode',
  'ai_scan',
  'quick_add',
  'recipe',
]);

export const FoodLogEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  mealSlot: z.string(),
  foodId: z.string(),
  name: z.string(),
  source: FoodSourceSchema,
  amount: z.number(),
  unit: z.string(),
  nutritionSnapshot: MacroNutrientsSchema.extend({
    micros: MicronutrientsSchema,
  }),
  note: z.string().optional(),
  createdAt: z.number(),
});

export const FoodItemSchema = z.object({
  id: z.string(),
  barcode: z.string().nullable().optional(),
  source: z.enum(['staple', 'usda', 'off', 'custom_barcode']),
  name: z.string(),
  brand: z.string().optional(),
  basis: z.enum(['per100g', 'per100ml', 'perServing']),
  servingSize: z.number(),
  servingUnit: z.string(),
  nutrientsPerBasis: MacroNutrientsSchema,
  micronutrientsPerBasis: MicronutrientsSchema,
  updatedAt: z.number(),
});

export const CustomRecipeIngredientSchema = z.object({
  foodId: z.string(),
  name: z.string(),
  amount: z.number(),
  unit: z.string(),
  nutritionSnapshot: MacroNutrientsSchema.extend({
    micros: MicronutrientsSchema,
  }),
});

export const CustomRecipeSchema = z.object({
  id: z.string(),
  name: z.string(),
  ingredients: z.array(CustomRecipeIngredientSchema),
  basis: z.enum(['per100g', 'perServing']),
  totalGrams: z.number(),
  nutrientsPerBasis: MacroNutrientsSchema,
  micronutrientsPerBasis: MicronutrientsSchema,
  defaultServings: z.number(),
  createdAt: z.number(),
});

export const MealSlotConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  weightPct: z.number(),
});

export const UserProfileSchema = z.object({
  sex: z.enum(['male', 'female']),
  age: z.number(),
  weightKg: z.number(),
  heightCm: z.number(),
  activityMultiplier: z.number(),
  goalDeltaKcal: z.number(),
  proteinPerKg: z.number(),
});

export const UserGoalsSchema = z.object({
  id: z.string(),
  dailyCalories: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  fiberG: z.number(),
  micronutrientTargets: z.record(z.string(), z.number().optional()).default({}),
  mealSlots: z.array(MealSlotConfigSchema).default([]),
  profile: UserProfileSchema.optional(),
  updatedAt: z.number(),
});

export const MacroAIBackupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.number(),
  tables: z.object({
    foodLogs: z.array(FoodLogEntrySchema).default([]),
    foodsCache: z.array(FoodItemSchema).default([]),
    customRecipes: z.array(CustomRecipeSchema).default([]),
    userGoals: z.array(UserGoalsSchema).default([]),
  }),
});

export type MacroAIBackup = z.infer<typeof MacroAIBackupSchema>;

export interface ImportBackupResult {
  importedCounts: {
    foodLogs: number;
    foodsCache: number;
    customRecipes: number;
    userGoals: number;
    [key: string]: number;
  };
}

/**
 * Exports all IndexedDB tables (foodLogs, foodsCache, customRecipes, userGoals)
 * into a formatted JSON string following the version 1 backup schema.
 */
export async function exportBackupJson(): Promise<string> {
  const [foodLogs, foodsCache, customRecipes, userGoals] = await Promise.all([
    db.foodLogs.toArray(),
    db.foodsCache.toArray(),
    db.customRecipes.toArray(),
    db.userGoals.toArray(),
  ]);

  const backupData: MacroAIBackup = {
    version: 1,
    exportedAt: Date.now(),
    tables: {
      foodLogs,
      foodsCache,
      customRecipes,
      userGoals,
    },
  };

  return JSON.stringify(backupData, null, 2);
}

/**
 * Validates and imports a JSON backup string into MacroAIDB.
 *
 * Pre-validation:
 * Strictly parses and validates with Zod (version === 1, tables schema) BEFORE
 * opening any IndexedDB transaction. Any corrupt data throws immediately, leaving
 * existing tables completely untouched.
 *
 * Modes:
 * - 'replace': Clears all 4 tables and puts the backup records in a single Dexie transaction.
 * - 'merge': Upserts foodLogs, foodsCache, customRecipes by UUID, and resolves userGoals
 *   via updatedAt-wins (overwrites only if incoming.updatedAt > existing.updatedAt or if absent).
 */
export async function importBackupJson(
  rawJson: string,
  mode: 'replace' | 'merge'
): Promise<ImportBackupResult> {
  // 1. Parse JSON string
  let parsed: unknown;
  try {
    parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
  } catch (err) {
    throw new Error(`Failed to parse backup JSON: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 2. Validate strictly with Zod before touching IndexedDB
  const validated = MacroAIBackupSchema.parse(parsed);

  const importedCounts = {
    foodLogs: 0,
    foodsCache: 0,
    customRecipes: 0,
    userGoals: 0,
  };

  // 3. Execute inside an atomic Dexie read-write transaction across all 4 tables
  await db.transaction('rw', [db.foodLogs, db.foodsCache, db.customRecipes, db.userGoals], async () => {
    if (mode === 'replace') {
      await Promise.all([
        db.foodLogs.clear(),
        db.foodsCache.clear(),
        db.customRecipes.clear(),
        db.userGoals.clear(),
      ]);

      if (validated.tables.foodLogs.length > 0) {
        await db.foodLogs.bulkPut(validated.tables.foodLogs as FoodLogEntry[]);
      }
      if (validated.tables.foodsCache.length > 0) {
        await db.foodsCache.bulkPut(validated.tables.foodsCache as FoodItem[]);
      }
      if (validated.tables.customRecipes.length > 0) {
        await db.customRecipes.bulkPut(validated.tables.customRecipes as CustomRecipe[]);
      }
      if (validated.tables.userGoals.length > 0) {
        await db.userGoals.bulkPut(validated.tables.userGoals as UserGoals[]);
      }

      importedCounts.foodLogs = validated.tables.foodLogs.length;
      importedCounts.foodsCache = validated.tables.foodsCache.length;
      importedCounts.customRecipes = validated.tables.customRecipes.length;
      importedCounts.userGoals = validated.tables.userGoals.length;
    } else {
      // mode === 'merge'
      if (validated.tables.foodLogs.length > 0) {
        await db.foodLogs.bulkPut(validated.tables.foodLogs as FoodLogEntry[]);
      }
      if (validated.tables.foodsCache.length > 0) {
        await db.foodsCache.bulkPut(validated.tables.foodsCache as FoodItem[]);
      }
      if (validated.tables.customRecipes.length > 0) {
        await db.customRecipes.bulkPut(validated.tables.customRecipes as CustomRecipe[]);
      }

      importedCounts.foodLogs = validated.tables.foodLogs.length;
      importedCounts.foodsCache = validated.tables.foodsCache.length;
      importedCounts.customRecipes = validated.tables.customRecipes.length;

      let goalsUpdated = 0;
      for (const incomingGoal of validated.tables.userGoals) {
        const existing = await db.userGoals.get(incomingGoal.id);
        if (!existing || incomingGoal.updatedAt > existing.updatedAt) {
          await db.userGoals.put(incomingGoal as UserGoals);
          goalsUpdated++;
        }
      }
      importedCounts.userGoals = goalsUpdated;
    }
  });

  return { importedCounts };
}
