import type {
  FoodItem,
  FoodServingOption,
  MacroNutrients,
  Micronutrients,
  NutritionBasis,
} from '@/types/nutrition';

const COUNTABLE_UNIT_FORMS: Record<string, [string, string]> = {
  pc: ['pc', 'pcs'],
  pcs: ['pc', 'pcs'],
  piece: ['piece', 'pieces'],
  pieces: ['piece', 'pieces'],
  slice: ['slice', 'slices'],
  slices: ['slice', 'slices'],
  cup: ['cup', 'cups'],
  cups: ['cup', 'cups'],
  pack: ['pack', 'packs'],
  packs: ['pack', 'packs'],
  sachet: ['sachet', 'sachets'],
  sachets: ['sachet', 'sachets'],
  serving: ['serving', 'servings'],
  servings: ['serving', 'servings'],
  stick: ['stick', 'sticks'],
  sticks: ['stick', 'sticks'],
  bottle: ['bottle', 'bottles'],
  bottles: ['bottle', 'bottles'],
  can: ['can', 'cans'],
  cans: ['can', 'cans'],
  bowl: ['bowl', 'bowls'],
  bowls: ['bowl', 'bowls'],
  scoop: ['scoop', 'scoops'],
  scoops: ['scoop', 'scoops'],
  bar: ['bar', 'bars'],
  bars: ['bar', 'bars'],
  order: ['order', 'orders'],
  orders: ['order', 'orders'],
};

/**
 * Formats a portion unit with singular/plural agreement (e.g., 1 pc vs 2 pcs).
 * Keeps metric units (g, ml, tbsp, tsp) invariant.
 */
export function formatPortionUnit(amount: number, unit: string): string {
  const trimmed = (unit || '').trim() || 'g';
  const lower = trimmed.toLowerCase();
  if (lower === 'g' || lower === 'ml' || lower === 'tbsp' || lower === 'tsp') {
    return lower;
  }

  const pair = COUNTABLE_UNIT_FORMS[lower];
  if (pair) {
    return amount > 0 && amount <= 1 ? pair[0] : pair[1];
  }

  return trimmed;
}

const HOUSEHOLD_UNIT_ALIASES: Record<string, string> = {
  pc: 'pc',
  pcs: 'pc',
  piece: 'piece',
  pieces: 'piece',
  slice: 'slice',
  slices: 'slice',
  cup: 'cup',
  cups: 'cup',
  pack: 'pack',
  packs: 'pack',
  packet: 'pack',
  packets: 'pack',
  pkg: 'pack',
  sachet: 'sachet',
  sachets: 'sachet',
  pouch: 'sachet',
  serving: 'serving',
  servings: 'serving',
  srv: 'serving',
  stick: 'stick',
  sticks: 'stick',
  bottle: 'bottle',
  bottles: 'bottle',
  btl: 'bottle',
  can: 'can',
  cans: 'can',
  bowl: 'bowl',
  bowls: 'bowl',
  scoop: 'scoop',
  scoops: 'scoop',
  bar: 'bar',
  bars: 'bar',
  order: 'order',
  orders: 'order',
  sandwich: 'pc',
  sandwiches: 'pc',
  burger: 'pc',
  burgers: 'pc',
  patty: 'pc',
  patties: 'pc',
  muffin: 'pc',
  muffins: 'pc',
  egg: 'pc',
  eggs: 'pc',
  donut: 'pc',
  donuts: 'pc',
  pie: 'pc',
  pies: 'pc',
  bun: 'pc',
  buns: 'pc',
  roll: 'pc',
  rolls: 'pc',
  cookie: 'pc',
  cookies: 'pc',
  cracker: 'pc',
  crackers: 'pc',
  taco: 'pc',
  tacos: 'pc',
  item: 'pc',
  items: 'pc',
  each: 'pc',
  tbsp: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  tsp: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
};

/**
 * Parses a household serving string (e.g., "1 SANDWICH", "2 slices (50g)", "1 pack")
 * into a positive count and canonical unit string, or returns null when uncountable/metric.
 */
export function parseHouseholdServingText(
  text: string
): { count: number; unit: string } | null {
  if (typeof text !== 'string') return null;
  const cleaned = text
    .replace(/\([^)]*\)/g, ' ')
    .replace(/(\d+(?:\.\d+)?)\s*(g|gr|grams|ml|kg|l)\b/gi, ' ')
    .split(',')[0]
    .trim();
  if (!cleaned) return null;

  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/);
  if (match) {
    const count = Number(match[1]);
    const unitKey = match[2].toLowerCase();
    const mapped = HOUSEHOLD_UNIT_ALIASES[unitKey];
    if (mapped && Number.isFinite(count) && count > 0) {
      return { count, unit: mapped };
    }
    return null;
  }

  const singleWord = cleaned.toLowerCase().split(/\s+/)[0];
  const mappedSingle = HOUSEHOLD_UNIT_ALIASES[singleWord];
  return mappedSingle ? { count: 1, unit: mappedSingle } : null;
}

/**
 * Returns serving unit options for a FoodItem ONLY when countable/household servings apply.
 * Generic per100g/per100ml items without explicit servingOptions return only a single gram/ml option.
 */
export function getServingOptionsForFood(food: FoodItem): FoodServingOption[] {
  const baseUnit =
    food.basis === 'per100ml' || food.servingUnit === 'ml' ? 'ml' : 'g';

  if (Array.isArray(food.servingOptions) && food.servingOptions.length > 0) {
    const deduped: FoodServingOption[] = [];
    const seen = new Set<string>();
    for (const opt of food.servingOptions) {
      if (!opt || !opt.unit || seen.has(opt.id)) continue;
      seen.add(opt.id);
      deduped.push({ ...opt });
    }

    const hasMetric = deduped.some((o) => o.unit === 'g' || o.unit === 'ml');
    const canConvertToMetric =
      food.basis === 'per100g' ||
      food.basis === 'per100ml' ||
      (typeof food.servingWeightGrams === 'number' && food.servingWeightGrams > 0);

    if (!hasMetric && canConvertToMetric && !seen.has(baseUnit)) {
      deduped.push({
        id: baseUnit,
        label: baseUnit,
        unit: baseUnit,
        grams: 1,
        defaultAmount: 100,
      });
    }
    return deduped;
  }

  if (food.basis === 'perServing') {
    const unit = (food.servingUnit || 'serving').trim() || 'serving';
    const weight =
      typeof food.servingWeightGrams === 'number' && food.servingWeightGrams > 0
        ? food.servingWeightGrams
        : 0;
    const primary: FoodServingOption = {
      id: unit,
      label: weight > 0 ? `${unit} (${weight}g)` : unit,
      unit,
      grams: weight,
      defaultAmount: food.servingSize > 0 ? food.servingSize : 1,
    };
    const options: FoodServingOption[] = [primary];
    if (weight > 0 && unit !== 'g' && unit !== 'ml') {
      options.push({
        id: 'g',
        label: 'g',
        unit: 'g',
        grams: 1,
        defaultAmount: 100,
      });
    }
    return options;
  }

  return [
    {
      id: baseUnit,
      label: baseUnit,
      unit: baseUnit,
      grams: 1,
      defaultAmount: food.servingSize > 0 ? food.servingSize : 100,
    },
  ];
}

/**
 * Scales food nutrients based on the selected FoodServingOption and entered amount.
 * Handles conversions between piece/household servings and grams/ml cleanly.
 */
export function scaleFoodByOption(
  food: FoodItem,
  amount: number,
  option?: FoodServingOption
): { macros: MacroNutrients; micros: Micronutrients; effectiveGrams?: number } {
  const safeAmount =
    typeof amount === 'number' && Number.isFinite(amount) && amount > 0 ? amount : 0;

  if (!option) {
    const res = scaleNutrition(
      food.nutrientsPerBasis,
      food.micronutrientsPerBasis,
      food.basis,
      safeAmount,
      food.servingSize
    );
    const effectiveGrams =
      food.basis === 'perServing'
        ? food.servingWeightGrams && food.servingWeightGrams > 0
          ? Math.round(
              ((safeAmount / (food.servingSize > 0 ? food.servingSize : 1)) *
                food.servingWeightGrams +
                Number.EPSILON) *
                100
            ) / 100
          : undefined
        : safeAmount;
    return { ...res, effectiveGrams };
  }

  if (food.basis === 'per100g' || food.basis === 'per100ml') {
    const isMetric = option.unit === 'g' || option.unit === 'ml';
    const gramsPerUnit = isMetric ? 1 : option.grams > 0 ? option.grams : 100;
    const effectiveGrams =
      Math.round((safeAmount * gramsPerUnit + Number.EPSILON) * 100) / 100;
    const res = scaleNutrition(
      food.nutrientsPerBasis,
      food.micronutrientsPerBasis,
      food.basis,
      effectiveGrams,
      100
    );
    return { ...res, effectiveGrams };
  }

  // food.basis === 'perServing'
  const baseServingSize = food.servingSize > 0 ? food.servingSize : 1;
  const baseWeightGrams =
    typeof food.servingWeightGrams === 'number' && food.servingWeightGrams > 0
      ? food.servingWeightGrams
      : food.servingOptions?.find((o) => o.unit === food.servingUnit && o.grams > 0)
          ?.grams ?? 0;

  if ((option.unit === 'g' || option.unit === 'ml') && baseWeightGrams > 0) {
    const servingMultiplier = safeAmount / baseWeightGrams;
    const res = scaleNutrition(
      food.nutrientsPerBasis,
      food.micronutrientsPerBasis,
      'perServing',
      servingMultiplier,
      baseServingSize
    );
    return { ...res, effectiveGrams: safeAmount };
  }

  if (option.grams > 0 && baseWeightGrams > 0 && option.unit !== food.servingUnit) {
    const effectiveGrams =
      Math.round((safeAmount * option.grams + Number.EPSILON) * 100) / 100;
    const servingMultiplier = effectiveGrams / baseWeightGrams;
    const res = scaleNutrition(
      food.nutrientsPerBasis,
      food.micronutrientsPerBasis,
      'perServing',
      servingMultiplier,
      baseServingSize
    );
    return { ...res, effectiveGrams };
  }

  const servingMultiplier = safeAmount / baseServingSize;
  const res = scaleNutrition(
    food.nutrientsPerBasis,
    food.micronutrientsPerBasis,
    'perServing',
    servingMultiplier,
    baseServingSize
  );
  const unitGrams = option.grams > 0 ? option.grams : baseWeightGrams;
  const effectiveGrams =
    unitGrams > 0
      ? Math.round((servingMultiplier * unitGrams + Number.EPSILON) * 100) / 100
      : undefined;
  return { ...res, effectiveGrams };
}

/**
 * Calculates total calories from macronutrients using Atwater factors (4-4-9).
 * Clamps negative or non-finite inputs to 0.
 */
export function computeMacroCalories(proteinG: number, carbsG: number, fatG: number): number {
  const safeP = typeof proteinG === 'number' && Number.isFinite(proteinG) && proteinG > 0 ? proteinG : 0;
  const safeC = typeof carbsG === 'number' && Number.isFinite(carbsG) && carbsG > 0 ? carbsG : 0;
  const safeF = typeof fatG === 'number' && Number.isFinite(fatG) && fatG > 0 ? fatG : 0;
  return Math.round((4 * safeP + 4 * safeC + 9 * safeF + Number.EPSILON) * 100) / 100;
}

/**
 * Pure helper scaling macronutrients and micronutrients based on the specified NutritionBasis and amount.
 * - For 'per100g' or 'per100ml': scales by (amount / 100).
 * - For 'perServing': scales directly by amount (multiplier).
 * - Clamps negative or NaN amounts and nutrient values to 0.
 * - Safely accepts optional servingSize parameter.
 */
export function scaleNutrition(
  nutrientsPerBasis: MacroNutrients,
  microsPerBasis: Micronutrients,
  basis: NutritionBasis,
  amount: number,
  servingSize?: number,
): { macros: MacroNutrients; micros: Micronutrients } {
  void servingSize;
  const safeAmount =
    typeof amount === 'number' && Number.isFinite(amount) && amount > 0 ? amount : 0;

  const factor =
    basis === 'perServing' ? safeAmount : safeAmount / 100;

  const scaleValue = (val: number | undefined): number => {
    if (typeof val !== 'number' || !Number.isFinite(val) || val <= 0 || factor === 0) {
      return 0;
    }
    return Math.round((val * factor + Number.EPSILON) * 100) / 100;
  };

  const macros: MacroNutrients = {
    calories: scaleValue(nutrientsPerBasis?.calories),
    protein: scaleValue(nutrientsPerBasis?.protein),
    carbs: scaleValue(nutrientsPerBasis?.carbs),
    fat: scaleValue(nutrientsPerBasis?.fat),
    fiber: scaleValue(nutrientsPerBasis?.fiber),
  };

  const micros: Micronutrients = {};
  if (microsPerBasis && typeof microsPerBasis === 'object') {
    for (const [key, value] of Object.entries(microsPerBasis)) {
      if (typeof value === 'number') {
        micros[key] = scaleValue(value);
      }
    }
  }

  return { macros, micros };
}
