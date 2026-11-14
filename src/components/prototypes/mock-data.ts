export interface NutrientSummary {
  consumed: number;
  target: number;
  unit: string;
}

export interface DayNutritionData {
  calories: NutrientSummary;
  protein: NutrientSummary;
  carbs: NutrientSummary;
  fat: NutrientSummary;
  fiber: NutrientSummary;
}

export const normalDayData: DayNutritionData = {
  calories: { consumed: 1680, target: 2200, unit: "kcal" },
  protein: { consumed: 128, target: 160, unit: "g" },
  carbs: { consumed: 172, target: 230, unit: "g" },
  fat: { consumed: 52, target: 70, unit: "g" },
  fiber: { consumed: 24, target: 32, unit: "g" },
};

export const overTargetDayData: DayNutritionData = {
  calories: { consumed: 2380, target: 2200, unit: "kcal" },
  protein: { consumed: 175, target: 160, unit: "g" },
  carbs: { consumed: 250, target: 230, unit: "g" },
  fat: { consumed: 76, target: 70, unit: "g" },
  fiber: { consumed: 35, target: 32, unit: "g" },
};

export interface MealItem {
  id: string;
  name: string;
  amount: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealSlotData {
  id: string;
  name: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  items: MealItem[];
}

export const mockMealSlots: MealSlotData[] = [
  {
    id: "breakfast",
    name: "Breakfast",
    time: "08:30 AM",
    calories: 480,
    protein: 38,
    carbs: 46,
    fat: 14,
    items: [
      { id: "1", name: "Rolled Oats", amount: "60g", calories: 230, protein: 8, carbs: 40, fat: 4 },
      { id: "2", name: "Whey Protein Isolate", amount: "30g", calories: 120, protein: 26, carbs: 1, fat: 1 },
      { id: "3", name: "Whole Milk", amount: "150ml", calories: 95, protein: 5, carbs: 7, fat: 5 },
      { id: "4", name: "Blueberries", amount: "50g", calories: 35, protein: 0, carbs: 8, fat: 0 },
    ],
  },
  {
    id: "lunch",
    name: "Lunch",
    time: "12:45 PM",
    calories: 680,
    protein: 52,
    carbs: 64,
    fat: 20,
    items: [
      { id: "5", name: "Grilled Chicken Breast", amount: "200g", calories: 330, protein: 46, carbs: 0, fat: 6 },
      { id: "6", name: "Jasmine White Rice", amount: "180g", calories: 235, protein: 4, carbs: 52, fat: 0 },
      { id: "7", name: "Steamed Broccoli", amount: "120g", calories: 42, protein: 3, carbs: 8, fat: 0 },
      { id: "8", name: "Extra Virgin Olive Oil", amount: "8g", calories: 73, protein: 0, carbs: 0, fat: 8 },
    ],
  },
  {
    id: "snacks",
    name: "Snacks",
    time: "04:00 PM",
    calories: 260,
    protein: 22,
    carbs: 18,
    fat: 10,
    items: [
      { id: "9", name: "Greek Yogurt 0%", amount: "170g", calories: 100, protein: 18, carbs: 6, fat: 0 },
      { id: "10", name: "Raw Almonds", amount: "20g", calories: 116, protein: 4, carbs: 4, fat: 10 },
      { id: "11", name: "Raw Honey", amount: "10g", calories: 30, protein: 0, carbs: 8, fat: 0 },
    ],
  },
];
