import type { MacroNutrients, Micronutrients, NutritionBasis } from '@/types/nutrition';

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
