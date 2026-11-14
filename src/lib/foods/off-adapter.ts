import type { FoodItem, Micronutrients, MacroNutrients, NutritionBasis } from '@/types/nutrition';

export interface OffNutriments {
  energy?: number;
  'energy-kcal'?: number;
  'energy-kcal_100g'?: number;
  'energy-kcal_100ml'?: number;
  'energy-kcal_serving'?: number;
  proteins_100g?: number;
  proteins_100ml?: number;
  proteins_serving?: number;
  carbohydrates_100g?: number;
  carbohydrates_100ml?: number;
  carbohydrates_serving?: number;
  fat_100g?: number;
  fat_100ml?: number;
  fat_serving?: number;
  fiber_100g?: number;
  fiber_100ml?: number;
  fiber_serving?: number;
  sodium_100g?: number;
  sodium_100ml?: number;
  sodium_serving?: number;
  salt_100g?: number;
  salt_100ml?: number;
  salt_serving?: number;
  [key: string]: unknown;
}

export interface OffProduct {
  product_name?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string;
  brand_owner?: string;
  nutriments?: OffNutriments;
  product_quantity_unit?: string;
  serving_quantity_unit?: string;
  serving_quantity?: number | string;
  serving_size?: string;
  [key: string]: unknown;
}

export interface OffApiResponse {
  status?: number;
  status_verbose?: string;
  product?: OffProduct;
  code?: string;
  [key: string]: unknown;
}

const round2 = (val: number): number => Math.round((val + Number.EPSILON) * 100) / 100;

function parseNumeric(val: unknown): number | undefined {
  if (typeof val === 'number' && Number.isFinite(val)) {
    return val;
  }
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

/**
 * Parses Open Food Facts API product payload into MacroAI's FoodItem model.
 * - Returns null when product not found (status === 0) or payload/product is invalid.
 * - NEVER reads nutriments.energy (which is in kJ); strictly reads energy-kcal_* fields.
 * - Determines basis: 'per100g', 'per100ml', or 'perServing'.
 * - Converts sodium (in g) to sodiumMg (* 1000) or falls back to salt * 400.
 */
export function parseOffProduct(barcode: string, payload: unknown): FoodItem | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const data = payload as OffApiResponse;
  if (data.status === 0 || !data.product || typeof data.product !== 'object') {
    return null;
  }

  const product = data.product;
  const cleanBarcode = barcode.trim();
  const nutriments = (product.nutriments && typeof product.nutriments === 'object' ? product.nutriments : {}) as OffNutriments;

  const rawName = product.product_name || product.product_name_en || product.generic_name;
  const name = typeof rawName === 'string' && rawName.trim() ? rawName.trim() : 'Unknown Food';

  const rawBrand = product.brands || product.brand_owner;
  const brand = typeof rawBrand === 'string' && rawBrand.trim() ? rawBrand.trim() : undefined;

  const has100g =
    parseNumeric(nutriments['energy-kcal_100g']) !== undefined ||
    parseNumeric(nutriments.proteins_100g) !== undefined ||
    parseNumeric(nutriments.carbohydrates_100g) !== undefined ||
    parseNumeric(nutriments.fat_100g) !== undefined ||
    parseNumeric(nutriments.fiber_100g) !== undefined;

  const has100ml =
    parseNumeric(nutriments['energy-kcal_100ml']) !== undefined ||
    parseNumeric(nutriments.proteins_100ml) !== undefined ||
    parseNumeric(nutriments.carbohydrates_100ml) !== undefined ||
    parseNumeric(nutriments.fat_100ml) !== undefined ||
    parseNumeric(nutriments.fiber_100ml) !== undefined;

  const hasServing =
    parseNumeric(nutriments['energy-kcal_serving']) !== undefined ||
    parseNumeric(nutriments.proteins_serving) !== undefined ||
    parseNumeric(nutriments.carbohydrates_serving) !== undefined ||
    parseNumeric(nutriments.fat_serving) !== undefined ||
    parseNumeric(nutriments.fiber_serving) !== undefined;

  const productUnit =
    typeof product.product_quantity_unit === 'string'
      ? product.product_quantity_unit.toLowerCase().trim()
      : '';
  const servingUnitStr =
    typeof product.serving_quantity_unit === 'string'
      ? product.serving_quantity_unit.toLowerCase().trim()
      : '';

  const isLiquid = productUnit === 'ml' || servingUnitStr === 'ml';

  let basis: NutritionBasis;
  if (isLiquid && (has100ml || has100g)) {
    basis = 'per100ml';
  } else if (has100g) {
    basis = 'per100g';
  } else if (has100ml) {
    basis = 'per100ml';
  } else if (hasServing) {
    basis = 'perServing';
  } else {
    basis = 'per100g';
  }

  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let fiber = 0;
  let servingSize = 100;
  let servingUnit = 'g';

  if (basis === 'per100ml') {
    calories =
      parseNumeric(nutriments['energy-kcal_100ml']) ??
      parseNumeric(nutriments['energy-kcal_100g']) ??
      0;
    protein =
      parseNumeric(nutriments.proteins_100ml) ??
      parseNumeric(nutriments.proteins_100g) ??
      0;
    carbs =
      parseNumeric(nutriments.carbohydrates_100ml) ??
      parseNumeric(nutriments.carbohydrates_100g) ??
      0;
    fat =
      parseNumeric(nutriments.fat_100ml) ??
      parseNumeric(nutriments.fat_100g) ??
      0;
    fiber =
      parseNumeric(nutriments.fiber_100ml) ??
      parseNumeric(nutriments.fiber_100g) ??
      0;
    servingSize = 100;
    servingUnit = 'ml';
  } else if (basis === 'perServing') {
    calories = parseNumeric(nutriments['energy-kcal_serving']) ?? 0;
    protein = parseNumeric(nutriments.proteins_serving) ?? 0;
    carbs = parseNumeric(nutriments.carbohydrates_serving) ?? 0;
    fat = parseNumeric(nutriments.fat_serving) ?? 0;
    fiber = parseNumeric(nutriments.fiber_serving) ?? 0;
    servingSize = parseNumeric(product.serving_quantity) ?? 1;
    servingUnit =
      typeof product.serving_quantity_unit === 'string' && product.serving_quantity_unit.trim()
        ? product.serving_quantity_unit.trim()
        : typeof product.serving_size === 'string' && product.serving_size.trim()
          ? product.serving_size.trim()
          : 'serving';
  } else {
    // 'per100g'
    calories = parseNumeric(nutriments['energy-kcal_100g']) ?? 0;
    protein = parseNumeric(nutriments.proteins_100g) ?? 0;
    carbs = parseNumeric(nutriments.carbohydrates_100g) ?? 0;
    fat = parseNumeric(nutriments.fat_100g) ?? 0;
    fiber = parseNumeric(nutriments.fiber_100g) ?? 0;
    servingSize = 100;
    servingUnit = 'g';
  }

  const micros: Micronutrients = {};
  let rawSodium: number | undefined;
  let rawSalt: number | undefined;

  if (basis === 'perServing') {
    rawSodium = parseNumeric(nutriments.sodium_serving);
    rawSalt = parseNumeric(nutriments.salt_serving);
  } else if (basis === 'per100ml') {
    rawSodium = parseNumeric(nutriments.sodium_100ml) ?? parseNumeric(nutriments.sodium_100g);
    rawSalt = parseNumeric(nutriments.salt_100ml) ?? parseNumeric(nutriments.salt_100g);
  } else {
    rawSodium = parseNumeric(nutriments.sodium_100g);
    rawSalt = parseNumeric(nutriments.salt_100g);
  }

  if (rawSodium !== undefined) {
    micros.sodiumMg = round2(rawSodium * 1000);
  } else if (rawSalt !== undefined) {
    micros.sodiumMg = round2(rawSalt * 400);
  }

  const nutrientsPerBasis: MacroNutrients = {
    calories: round2(Math.max(0, calories)),
    protein: round2(Math.max(0, protein)),
    carbs: round2(Math.max(0, carbs)),
    fat: round2(Math.max(0, fat)),
    fiber: round2(Math.max(0, fiber)),
  };

  return {
    id: `off:${cleanBarcode}`,
    barcode: cleanBarcode,
    source: 'off',
    name,
    brand,
    basis,
    servingSize,
    servingUnit,
    nutrientsPerBasis,
    micronutrientsPerBasis: micros,
    updatedAt: Date.now(),
  };
}
