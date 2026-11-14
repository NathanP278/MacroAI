export type NutritionBasis = 'per100g' | 'per100ml' | 'perServing';

export interface MacroNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface Micronutrients {
  sodiumMg?: number;
  potassiumMg?: number;
  calciumMg?: number;
  ironMg?: number;
  magnesiumMg?: number;
  zincMg?: number;
  vitaminAMcg?: number;
  vitaminCMg?: number;
  vitaminDMcg?: number;
  vitaminB6Mg?: number;
  vitaminB12Mcg?: number;
  folateMcg?: number;
  [key: string]: number | undefined;
}

export type FoodSource =
  | 'staple'
  | 'usda'
  | 'off'
  | 'custom_barcode'
  | 'ai_scan'
  | 'quick_add'
  | 'recipe';

export interface FoodLogEntry {
  id: string;
  date: string;
  mealSlot: string;
  foodId: string;
  name: string;
  source: FoodSource;
  amount: number;
  unit: string;
  nutritionSnapshot: MacroNutrients & { micros: Micronutrients };
  note?: string;
  createdAt: number;
}

export interface FoodServingOption {
  id: string;
  label: string;          // e.g. "pc (136g)", "pack (80g)", "cup (158g)", "g"
  unit: string;           // e.g. "pc", "pack", "cup", "slice", "serving", "g", "ml"
  grams: number;          // gram weight of 1 unit (or 1 for 'g'/'ml')
  defaultAmount?: number; // e.g. 1 for 'pc', 100 for 'g'
}

export interface FoodItem {
  id: string;
  barcode?: string | null;
  source: 'staple' | 'usda' | 'off' | 'custom_barcode';
  name: string;
  brand?: string;
  region?: 'PH' | 'GLOBAL';
  basis: NutritionBasis;
  servingSize: number;
  servingUnit: string;
  servingWeightGrams?: number;
  servingOptions?: FoodServingOption[];
  nutrientsPerBasis: MacroNutrients;
  micronutrientsPerBasis: Micronutrients;
  updatedAt: number;
}

export interface CustomRecipeIngredient {
  foodId: string;
  name: string;
  amount: number;
  unit: string;
  nutritionSnapshot: MacroNutrients & { micros: Micronutrients };
  gramWeight?: number;
  gramsPerUnit?: number;
  servingSize?: number;
  baseBasis?: NutritionBasis;
  baseNutrients?: MacroNutrients;
  baseMicros?: Micronutrients;
}

export interface CustomRecipe {
  id: string;
  name: string;
  ingredients: CustomRecipeIngredient[];
  basis: 'per100g' | 'perServing';
  totalGrams: number;
  nutrientsPerBasis: MacroNutrients;
  micronutrientsPerBasis: Micronutrients;
  defaultServings: number;
  createdAt: number;
}

export interface MealSlotConfig {
  id: string;
  name: string;
  weightPct: number;
}

export interface UserProfile {
  sex: 'male' | 'female';
  age: number;
  weightKg: number;
  heightCm: number;
  activityMultiplier: number;
  goalDeltaKcal: number;
  proteinPerKg: number;
}

export interface UserGoals {
  id: 'active';
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  micronutrientTargets: Record<string, number>;
  mealSlots: MealSlotConfig[];
  profile?: UserProfile;
  updatedAt: number;
}
