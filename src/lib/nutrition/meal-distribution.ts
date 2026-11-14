import type { FoodLogEntry, UserGoals } from '@/types/nutrition';

export interface SlotMacroBudget {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Distributes remaining daily macros proportionally across unlogged meal slots
 * according to their configured weights (weightPct), clamping overages cleanly to 0.
 *
 * Logged slots receive 0 remaining budget.
 * If all unlogged slots have 0 weightPct, remaining budget is split evenly across unlogged slots.
 */
export function distributeRemainingMacros(
  goals: UserGoals | null | undefined,
  logs: FoodLogEntry[] = []
): Record<string, SlotMacroBudget> {
  const result: Record<string, SlotMacroBudget> = {};

  if (!goals || !Array.isArray(goals.mealSlots) || goals.mealSlots.length === 0) {
    return result;
  }

  // Calculate total consumed so far
  let consumedCalories = 0;
  let consumedProtein = 0;
  let consumedCarbs = 0;
  let consumedFat = 0;

  for (const entry of logs) {
    if (entry?.nutritionSnapshot) {
      consumedCalories += Number(entry.nutritionSnapshot.calories) || 0;
      consumedProtein += Number(entry.nutritionSnapshot.protein) || 0;
      consumedCarbs += Number(entry.nutritionSnapshot.carbs) || 0;
      consumedFat += Number(entry.nutritionSnapshot.fat) || 0;
    }
  }

  // Daily remaining targets, clamped to 0 on surplus/overage
  const remainingCalories = Math.max(0, (goals.dailyCalories || 0) - consumedCalories);
  const remainingProtein = Math.max(0, (goals.proteinG || 0) - consumedProtein);
  const remainingCarbs = Math.max(0, (goals.carbsG || 0) - consumedCarbs);
  const remainingFat = Math.max(0, (goals.fatG || 0) - consumedFat);

  // Track slots that already have at least one logged item
  const loggedSlotIds = new Set<string>();
  for (const entry of logs) {
    if (entry.mealSlot) {
      loggedSlotIds.add(entry.mealSlot);
    }
  }

  // Identify unlogged slots
  const unloggedSlots = goals.mealSlots.filter((slot) => !loggedSlotIds.has(slot.id));
  const totalUnloggedWeightPct = unloggedSlots.reduce(
    (acc, slot) => acc + Math.max(0, slot.weightPct || 0),
    0
  );

  for (const slot of goals.mealSlots) {
    if (loggedSlotIds.has(slot.id)) {
      result[slot.id] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    } else {
      // Proportional ratio based on weightPct, or fallback evenly
      const ratio =
        totalUnloggedWeightPct > 0
          ? Math.max(0, slot.weightPct || 0) / totalUnloggedWeightPct
          : unloggedSlots.length > 0
            ? 1 / unloggedSlots.length
            : 0;

      result[slot.id] = {
        calories: Math.round(remainingCalories * ratio),
        protein: Math.round(remainingProtein * ratio),
        carbs: Math.round(remainingCarbs * ratio),
        fat: Math.round(remainingFat * ratio),
      };
    }
  }

  return result;
}
