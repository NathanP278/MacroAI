import type { FoodItem, Micronutrients, MacroNutrients } from '@/types/nutrition';
import { db } from '@/lib/db/macroai-db';

export interface UsdaNutrientEntry {
  nutrientId?: number;
  nutrientNumber?: string;
  nutrientName?: string;
  unitName?: string;
  value?: number;
  amount?: number;
  nutrient?: {
    id?: number;
    number?: string;
    name?: string;
    unitName?: string;
  };
}

export interface UsdaFoodPayload {
  fdcId?: number;
  id?: number;
  description?: string;
  name?: string;
  dataType?: string;
  brandOwner?: string;
  brandName?: string;
  foodNutrients?: UsdaNutrientEntry[];
  [key: string]: unknown;
}

const round2 = (val: number): number => Math.round((val + Number.EPSILON) * 100) / 100;

function extractNutrient(entry: UsdaNutrientEntry): {
  id?: number;
  name: string;
  unit: string;
  value: number;
} {
  const id =
    typeof entry.nutrient?.id === 'number'
      ? entry.nutrient.id
      : typeof entry.nutrientId === 'number'
        ? entry.nutrientId
        : entry.nutrientNumber
          ? parseInt(entry.nutrientNumber, 10)
          : undefined;

  const name = entry.nutrient?.name || entry.nutrientName || '';
  const unit = entry.nutrient?.unitName || entry.unitName || '';
  const rawValue =
    typeof entry.amount === 'number'
      ? entry.amount
      : typeof entry.value === 'number'
        ? entry.value
        : 0;

  const value = Number.isFinite(rawValue) && rawValue > 0 ? rawValue : 0;
  return { id, name, unit, value };
}

/**
 * Normalizes USDA FoodData Central item (both /foods/search and /food/{id} shapes)
 * into MacroAI's canonical FoodItem model with basis 'per100g'.
 */
export function mapUsdaFoodToFoodItem(
  raw: UsdaFoodPayload,
  sourceOverride?: 'staple' | 'usda'
): FoodItem {
  const fdcId = raw.fdcId ?? raw.id ?? 0;
  const source = sourceOverride ?? 'usda';
  const id = `${source}:${fdcId}`;
  const name = (raw.description || raw.name || 'Unknown Food').trim();
  const brand = raw.brandOwner || raw.brandName || undefined;

  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let fiber = 0;

  const micros: Micronutrients = {};
  const nutrientsList = Array.isArray(raw.foodNutrients) ? raw.foodNutrients : [];

  for (const entry of nutrientsList) {
    const { id: nutId, unit, value } = extractNutrient(entry);
    if (!nutId) continue;

    // Reject Energy in kJ (1062) to prevent energy corruption
    if (nutId === 1062 || unit.toLowerCase() === 'kj') {
      continue;
    }

    if (nutId === 1008) {
      calories = value;
    } else if (nutId === 1003) {
      protein = value;
    } else if (nutId === 1004) {
      fat = value;
    } else if (nutId === 1005) {
      carbs = value;
    } else if (nutId === 1079) {
      fiber = value;
    } else if (nutId === 1093) {
      micros.sodiumMg = round2(value);
    } else if (nutId === 1092) {
      micros.potassiumMg = round2(value);
    } else if (nutId === 1087) {
      micros.calciumMg = round2(value);
    } else if (nutId === 1089) {
      micros.ironMg = round2(value);
    } else if (nutId === 1090) {
      micros.magnesiumMg = round2(value);
    } else if (nutId === 1095) {
      micros.zincMg = round2(value);
    } else if (nutId === 1106) {
      micros.vitaminAMcg = round2(value);
    } else if (nutId === 1162) {
      micros.vitaminCMg = round2(value);
    } else if (nutId === 1114) {
      micros.vitaminDMcg = round2(value);
    } else if (nutId === 1175) {
      micros.vitaminB6Mg = round2(value);
    } else if (nutId === 1178) {
      micros.vitaminB12Mcg = round2(value);
    } else if (nutId === 1177) {
      micros.folateMcg = round2(value);
    }
  }

  const nutrientsPerBasis: MacroNutrients = {
    calories: round2(calories),
    protein: round2(protein),
    carbs: round2(carbs),
    fat: round2(fat),
    fiber: round2(fiber),
  };

  return {
    id,
    source,
    name,
    brand,
    basis: 'per100g',
    servingSize: 100,
    servingUnit: 'g',
    nutrientsPerBasis,
    micronutrientsPerBasis: micros,
    updatedAt: Date.now(),
  };
}

/**
 * Searches USDA FoodData Central via the Next.js API proxy route.
 */
export async function searchUsdaFoods(
  query: string,
  options?: { signal?: AbortSignal }
): Promise<FoodItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = `/api/usda/foods/search?query=${encodeURIComponent(trimmed)}`;
  const res = await fetch(url, { signal: options?.signal });
  if (!res.ok) {
    throw new Error(`USDA search request failed with status ${res.status}`);
  }

  const data = await res.json();
  const rawFoods: UsdaFoodPayload[] = Array.isArray(data.foods) ? data.foods : [];
  return rawFoods.map((f) => mapUsdaFoodToFoodItem(f, 'usda'));
}

/**
 * Fetches food details by fdcId via the Next.js API proxy route and caches it into Dexie db.foodsCache.
 */
export async function fetchAndCacheUsdaFood(fdcId: number): Promise<FoodItem> {
  const cached = await db.foodsCache.get(`usda:${fdcId}`);
  if (cached) {
    return cached;
  }

  const res = await fetch(`/api/usda/food/${fdcId}`);
  if (!res.ok) {
    throw new Error(`USDA food fetch failed with status ${res.status}`);
  }

  const data: UsdaFoodPayload = await res.json();
  const item = mapUsdaFoodToFoodItem(data, 'usda');
  await db.foodsCache.put(item);
  return item;
}
