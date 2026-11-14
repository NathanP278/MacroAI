import { db, generateId } from '@/lib/db/macroai-db';
import { scaleNutrition } from '@/lib/nutrition/scaling';
import type {
  CustomRecipe,
  CustomRecipeIngredient,
  FoodLogEntry,
  MacroNutrients,
  Micronutrients,
} from '@/types/nutrition';

/**
 * Pure local calendar date offset helper without UTC drift.
 * Format: YYYY-MM-DD.
 */
export function offsetIsoDate(isoDate: string, days: number): string {
  const parts = (isoDate || '').split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const [y, m, d] = parts;
  const dateObj = new Date(y, m - 1, d + days);
  const outY = dateObj.getFullYear();
  const outM = String(dateObj.getMonth() + 1).padStart(2, '0');
  const outD = String(dateObj.getDate()).padStart(2, '0');
  return `${outY}-${outM}-${outD}`;
}

export interface RecipeTotals {
  totalGrams: number;
  macros: MacroNutrients;
  micros: Micronutrients;
}

/**
 * Computes raw cumulative totals across ingredients.
 * Respects explicit gramWeights, (ing as any).gramWeight, (ing as any).gramsPerUnit,
 * or (ing as any).servingSize for perServing ingredients so that per100g recipes
 * do not count 1 serving as 1 gram.
 */
export function calculateRecipeTotals(
  ingredients: CustomRecipeIngredient[],
  gramWeights?: number[]
): RecipeTotals {
  let totalGrams = 0;
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let fiber = 0;
  const micros: Micronutrients = {};

  for (let i = 0; i < (ingredients || []).length; i++) {
    const ing = ingredients[i];
    if (!ing) continue;

    let weight = 0;
    if (gramWeights && typeof gramWeights[i] === 'number' && Number.isFinite(gramWeights[i])) {
      weight = gramWeights[i];
    } else if (typeof ing.gramWeight === 'number' && Number.isFinite(ing.gramWeight)) {
      weight = ing.gramWeight;
    } else if (typeof ing.gramsPerUnit === 'number' && Number.isFinite(ing.gramsPerUnit)) {
      weight = ing.gramsPerUnit * (Number(ing.amount) || 0);
    } else if (
      typeof ing.servingSize === 'number' &&
      ing.servingSize > 0 &&
      (ing.unit === 'serving' || ing.unit === 'servings' || ing.unit === 'srv')
    ) {
      weight = ing.servingSize * (Number(ing.amount) || 0);
    } else {
      weight = Number(ing.amount) || 0;
    }

    totalGrams += weight;
    const snap = ing.nutritionSnapshot;
    if (snap) {
      calories += Number(snap.calories) || 0;
      protein += Number(snap.protein) || 0;
      carbs += Number(snap.carbs) || 0;
      fat += Number(snap.fat) || 0;
      fiber += Number(snap.fiber) || 0;

      if (snap.micros && typeof snap.micros === 'object') {
        for (const [k, v] of Object.entries(snap.micros)) {
          if (typeof v === 'number' && Number.isFinite(v)) {
            micros[k] = (micros[k] || 0) + v;
          }
        }
      }
    }
  }

  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  for (const k of Object.keys(micros)) {
    micros[k] = round2(micros[k]!);
  }

  return {
    totalGrams: Math.round(totalGrams),
    macros: {
      calories: Math.round(calories),
      protein: Math.round((protein + Number.EPSILON) * 10) / 10,
      carbs: Math.round((carbs + Number.EPSILON) * 10) / 10,
      fat: Math.round((fat + Number.EPSILON) * 10) / 10,
      fiber: Math.round((fiber + Number.EPSILON) * 10) / 10,
    },
    micros,
  };
}

export interface SaveCustomRecipeInput {
  id?: string;
  name: string;
  ingredients: CustomRecipeIngredient[];
  basis?: 'per100g' | 'perServing';
  defaultServings?: number;
  gramWeights?: number[];
}

/**
 * Normalizes and saves a custom recipe to Dexie db.customRecipes.
 */
export async function saveCustomRecipe(input: SaveCustomRecipeInput): Promise<CustomRecipe> {
  const basis = input.basis || 'perServing';
  const defaultServings = Math.max(1, Number(input.defaultServings) || 1);
  const totals = calculateRecipeTotals(input.ingredients || [], input.gramWeights);
  const totalGrams = totals.totalGrams;

  let nutrientsPerBasis: MacroNutrients;
  const micronutrientsPerBasis: Micronutrients = {};

  const roundMacro = (val: number) => Math.round(val);
  const roundMicro = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;

  if (basis === 'perServing') {
    nutrientsPerBasis = {
      calories: roundMacro(totals.macros.calories / defaultServings),
      protein: roundMacro(totals.macros.protein / defaultServings),
      carbs: roundMacro(totals.macros.carbs / defaultServings),
      fat: roundMacro(totals.macros.fat / defaultServings),
      fiber: roundMacro(totals.macros.fiber / defaultServings),
    };
    for (const [k, v] of Object.entries(totals.micros)) {
      if (typeof v === 'number') {
        micronutrientsPerBasis[k] = roundMicro(v / defaultServings);
      }
    }
  } else {
    // basis === 'per100g'
    const scale = totalGrams > 0 ? 100 / totalGrams : 1;
    nutrientsPerBasis = {
      calories: roundMacro(totals.macros.calories * scale),
      protein: roundMacro(totals.macros.protein * scale),
      carbs: roundMacro(totals.macros.carbs * scale),
      fat: roundMacro(totals.macros.fat * scale),
      fiber: roundMacro(totals.macros.fiber * scale),
    };
    for (const [k, v] of Object.entries(totals.micros)) {
      if (typeof v === 'number') {
        micronutrientsPerBasis[k] = roundMicro(v * scale);
      }
    }
  }

  const recipe: CustomRecipe = {
    id: input.id || generateId(),
    name: input.name.trim(),
    ingredients: input.ingredients,
    basis,
    totalGrams,
    nutrientsPerBasis,
    micronutrientsPerBasis,
    defaultServings,
    createdAt: Date.now(),
  };

  await db.customRecipes.put(recipe);
  return recipe;
}

export interface LogCustomRecipeParams {
  date: string;
  mealSlot: string;
  servings?: number;
  grams?: number;
  note?: string;
}

/**
 * Logs a custom recipe into db.foodLogs with scaled macronutrients and micronutrients.
 */
export async function logCustomRecipe(
  recipe: CustomRecipe,
  params: LogCustomRecipeParams
): Promise<FoodLogEntry> {
  let amount: number;
  let unit: string;

  if (recipe.basis === 'perServing') {
    amount = typeof params.servings === 'number' && params.servings > 0 ? params.servings : 1;
    unit = amount === 1 ? 'serving' : 'servings';
  } else {
    // per100g
    if (typeof params.grams === 'number' && params.grams > 0) {
      amount = params.grams;
    } else if (recipe.totalGrams > 0) {
      amount = Math.round(recipe.totalGrams / Math.max(1, recipe.defaultServings));
    } else {
      amount = 100;
    }
    unit = 'g';
  }

  const { macros, micros } = scaleNutrition(
    recipe.nutrientsPerBasis,
    recipe.micronutrientsPerBasis,
    recipe.basis,
    amount
  );

  const entry: FoodLogEntry = {
    id: generateId(),
    date: params.date,
    mealSlot: params.mealSlot,
    foodId: `recipe:${recipe.id}`,
    name: recipe.name,
    source: 'recipe',
    amount,
    unit,
    nutritionSnapshot: {
      ...macros,
      micros,
    },
    note: params.note,
    createdAt: Date.now(),
  };

  await db.foodLogs.put(entry);
  return entry;
}

/**
 * Clones all entries from yesterday's specified mealSlot into targetDate with fresh UUIDs.
 * Returns the count of entries copied (0 if none found).
 */
export async function copyYesterdayMeal(targetDate: string, mealSlot: string): Promise<number> {
  const yesterday = offsetIsoDate(targetDate, -1);
  const entries = await db.foodLogs
    .where('date')
    .equals(yesterday)
    .filter((e) => e.mealSlot === mealSlot)
    .toArray();

  if (entries.length === 0) {
    return 0;
  }

  const now = Date.now();
  const clones: FoodLogEntry[] = entries.map((entry, index) => ({
    id: generateId(),
    date: targetDate,
    mealSlot: entry.mealSlot,
    foodId: entry.foodId,
    name: entry.name,
    source: entry.source,
    amount: entry.amount,
    unit: entry.unit,
    nutritionSnapshot: JSON.parse(JSON.stringify(entry.nutritionSnapshot)),
    note: entry.note,
    createdAt: now + index,
  }));

  await db.transaction('rw', db.foodLogs, async () => {
    await db.foodLogs.bulkAdd(clones);
  });

  return clones.length;
}
