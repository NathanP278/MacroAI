import { db } from '@/lib/db/macroai-db';
import type { MealSlotConfig, UserGoals } from '@/types/nutrition';

export const DEFAULT_MEAL_SLOTS: MealSlotConfig[] = [
  { id: 'breakfast', name: 'Breakfast', weightPct: 25 },
  { id: 'lunch', name: 'Lunch', weightPct: 30 },
  { id: 'dinner', name: 'Dinner', weightPct: 35 },
  { id: 'snacks', name: 'Snacks', weightPct: 10 },
];

export const DEFAULT_RDA_MICROS: Record<string, number> = {
  sodiumMg: 2300,
  potassiumMg: 3400,
  calciumMg: 1000,
  ironMg: 18,
  magnesiumMg: 400,
  zincMg: 11,
  vitaminAMcg: 900,
  vitaminCMg: 90,
  vitaminDMcg: 15,
  vitaminB6Mg: 1.7,
  vitaminB12Mcg: 2.4,
  folateMcg: 400,
};

export interface MifflinStJeorInput {
  sex: 'male' | 'female';
  age: number;
  weightKg: number;
  heightCm: number;
  activityMultiplier: number;
  goalDeltaKcal: number;
  proteinPerKg: number;
}

export const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Sedentary (desk job, minimal exercise)' },
  { value: 1.375, label: 'Lightly Active (1-3 days/week)' },
  { value: 1.55, label: 'Moderately Active (3-5 days/week)' },
  { value: 1.725, label: 'Very Active (6-7 days/week hard exercise)' },
  { value: 1.9, label: 'Extremely Active (endurance / heavy physical work)' },
];

export const GOAL_DELTAS = [
  { value: -500, label: 'Moderate Deficit (-500 kcal/day)' },
  { value: -300, label: 'Mild Deficit (-300 kcal/day)' },
  { value: 0, label: 'Maintenance (0 kcal/day)' },
  { value: 250, label: 'Lean Gain (+250 kcal/day)' },
  { value: 500, label: 'Surplus (+500 kcal/day)' },
];

/**
 * Calculates Mifflin-St Jeor BMR, TDEE, and macro split targets.
 */
export function calculateMifflinStJeorTargets(
  input: MifflinStJeorInput,
): Pick<UserGoals, 'dailyCalories' | 'proteinG' | 'carbsG' | 'fatG' | 'fiberG'> {
  const safeWeight =
    typeof input.weightKg === 'number' && Number.isFinite(input.weightKg) && input.weightKg > 0
      ? input.weightKg
      : 70;
  const safeHeight =
    typeof input.heightCm === 'number' && Number.isFinite(input.heightCm) && input.heightCm > 0
      ? input.heightCm
      : 170;
  const safeAge =
    typeof input.age === 'number' && Number.isFinite(input.age) && input.age > 0
      ? input.age
      : 30;
  const safeActivity =
    typeof input.activityMultiplier === 'number' &&
    Number.isFinite(input.activityMultiplier) &&
    input.activityMultiplier > 0
      ? input.activityMultiplier
      : 1.55;
  const safeDelta =
    typeof input.goalDeltaKcal === 'number' && Number.isFinite(input.goalDeltaKcal)
      ? input.goalDeltaKcal
      : 0;
  const safeProteinPerKg =
    typeof input.proteinPerKg === 'number' &&
    Number.isFinite(input.proteinPerKg) &&
    input.proteinPerKg > 0
      ? input.proteinPerKg
      : 2.0;

  // Mifflin-St Jeor BMR formula
  const sexOffset = input.sex === 'male' ? 5 : -161;
  const bmr = 10 * safeWeight + 6.25 * safeHeight - 5 * safeAge + sexOffset;
  const tdee = Math.max(0, bmr) * safeActivity;

  // Target calories (bounded by at least 500 kcal for safety)
  const dailyCalories = Math.round(Math.max(500, tdee + safeDelta));

  // Protein targets
  const proteinG = Math.round(Math.max(0, safeWeight * safeProteinPerKg));
  const proteinKcal = proteinG * 4;

  // Fat targets: 25% of total calories
  const fatKcal = Math.max(0, dailyCalories * 0.25);
  const fatG = Math.round(fatKcal / 9);

  // Carbs targets: remaining calories
  const remainingKcal = Math.max(0, dailyCalories - proteinKcal - fatG * 9);
  const carbsG = Math.round(remainingKcal / 4);

  // Fiber targets: ~14g per 1000 kcal
  const fiberG = Math.max(0, Math.round((dailyCalories / 1000) * 14));

  return {
    dailyCalories,
    proteinG,
    carbsG,
    fatG,
    fiberG,
  };
}

/**
 * Idempotently seeds default user goals into Dexie DB when missing.
 */
export async function ensureDefaultUserGoals(): Promise<UserGoals> {
  const existing = await db.userGoals.get('active');
  if (existing) {
    return existing;
  }

  const defaultGoals: UserGoals = {
    id: 'active',
    dailyCalories: 2000,
    proteinG: 150,
    carbsG: 200,
    fatG: 65,
    fiberG: 30,
    micronutrientTargets: { ...DEFAULT_RDA_MICROS },
    mealSlots: [...DEFAULT_MEAL_SLOTS],
    updatedAt: Date.now(),
  };

  await db.userGoals.put(defaultGoals);
  return defaultGoals;
}
