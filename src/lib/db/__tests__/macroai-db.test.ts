import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../macroai-db';
import { scaleNutrition, computeMacroCalories } from '../../nutrition/scaling';
import type { FoodLogEntry, CustomRecipe, UserGoals } from '@/types/nutrition';

describe('MacroAIDB & Nutrition Scaling Helpers', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  describe('Nutrition Scaling Helpers', () => {
    const base = { calories: 200, protein: 20, carbs: 10, fat: 8, fiber: 2 };

    it('scales per100g, per100ml, perServing, and zero-amount safely', () => {
      expect(scaleNutrition(base, { sodiumMg: 100 }, 'per100g', 150).macros.calories).toBe(300);
      expect(scaleNutrition(base, {}, 'per100ml', 250).macros.protein).toBe(50);
      expect(scaleNutrition(base, {}, 'perServing', 1.5).macros.carbs).toBe(15);
      expect(scaleNutrition(base, {}, 'per100g', 0).macros.calories).toBe(0);
      expect(computeMacroCalories(30, 40, 10)).toBe(370);
    });

    it('correctly scales micronutrients alongside macronutrients', () => {
      const res = scaleNutrition(base, { sodiumMg: 120, calciumMg: 80 }, 'per100g', 150);
      expect(res.macros).toEqual({
        calories: 300,
        protein: 30,
        carbs: 15,
        fat: 12,
        fiber: 3,
      });
      expect(res.micros.sodiumMg).toBe(180);
      expect(res.micros.calciumMg).toBe(120);
    });

    it('safely handles negative and NaN amounts by clamping to 0', () => {
      const neg = scaleNutrition(base, { potassiumMg: 100 }, 'per100g', -50);
      expect(neg.macros.calories).toBe(0);
      expect(neg.macros.protein).toBe(0);
      expect(neg.micros.potassiumMg).toBe(0);

      const nanRes = scaleNutrition(base, { potassiumMg: 100 }, 'per100g', Number.NaN);
      expect(nanRes.macros.calories).toBe(0);
      expect(nanRes.macros.protein).toBe(0);
      expect(nanRes.micros.potassiumMg).toBe(0);
    });

    it('safely handles negative or NaN nutrient values in input', () => {
      const corruptBase = { calories: -100, protein: Number.NaN, carbs: 10, fat: -5, fiber: 0 };
      const corruptMicros = { sodiumMg: -50, ironMg: Number.NaN };
      const res = scaleNutrition(corruptBase, corruptMicros, 'per100g', 100);
      expect(res.macros.calories).toBe(0);
      expect(res.macros.protein).toBe(0);
      expect(res.macros.carbs).toBe(10);
      expect(res.macros.fat).toBe(0);
      expect(res.micros.sodiumMg).toBe(0);
      expect(res.micros.ironMg).toBe(0);
    });

    it('handles servingSize edge cases when passed (positive, zero, negative, NaN)', () => {
      // Normal servingSize passed as metadata / reference
      const resWithServing = scaleNutrition(base, {}, 'per100g', 150, 170);
      expect(resWithServing.macros.calories).toBe(300);

      // ServingSize zero, negative, or NaN should not throw or corrupt output
      const resZeroServing = scaleNutrition(base, {}, 'perServing', 2, 0);
      expect(resZeroServing.macros.calories).toBe(400);

      const resNegServing = scaleNutrition(base, {}, 'perServing', 2, -50);
      expect(resNegServing.macros.calories).toBe(400);

      const resNanServing = scaleNutrition(base, {}, 'per100ml', 100, Number.NaN);
      expect(resNanServing.macros.calories).toBe(200);
    });

    it('computeMacroCalories safely clamps negative and NaN inputs to 0', () => {
      expect(computeMacroCalories(0, 0, 0)).toBe(0);
      expect(computeMacroCalories(-10, 20, 5)).toBe(4 * 0 + 4 * 20 + 9 * 5); // 125
      expect(computeMacroCalories(Number.NaN, 10, Number.NaN)).toBe(40);
    });
  });

  describe('MacroAIDB Schema & Indexing', () => {
    it('persists foodLog with immutable nutritionSnapshot and barcode lookup', async () => {
      await db.foodsCache.put({
        id: 'off:12345',
        barcode: '12345',
        source: 'off',
        name: 'Greek Yogurt',
        basis: 'per100g',
        servingSize: 170,
        servingUnit: 'g',
        nutrientsPerBasis: { calories: 59, protein: 10, carbs: 3.6, fat: 0.4, fiber: 0 },
        micronutrientsPerBasis: { calciumMg: 110 },
        updatedAt: 1000,
      });

      const hit = await db.foodsCache.where('barcode').equals('12345').first();
      expect(hit?.name).toBe('Greek Yogurt');
      expect(hit?.nutrientsPerBasis.calories).toBe(59);
      expect(hit?.micronutrientsPerBasis.calciumMg).toBe(110);
    });

    it('persists and queries foodLogs by date and mealSlot', async () => {
      const entry: FoodLogEntry = {
        id: 'log-1',
        date: '2026-11-14',
        mealSlot: 'breakfast',
        foodId: 'off:12345',
        name: 'Greek Yogurt',
        source: 'off',
        amount: 170,
        unit: 'g',
        nutritionSnapshot: {
          calories: 100.3,
          protein: 17,
          carbs: 6.12,
          fat: 0.68,
          fiber: 0,
          micros: { calciumMg: 187 },
        },
        note: 'Post-workout',
        createdAt: Date.now(),
      };

      await db.foodLogs.put(entry);

      const byDate = await db.foodLogs.where('date').equals('2026-11-14').toArray();
      expect(byDate).toHaveLength(1);
      expect(byDate[0].nutritionSnapshot.micros.calciumMg).toBe(187);

      const bySlot = await db.foodLogs.where('mealSlot').equals('breakfast').toArray();
      expect(bySlot).toHaveLength(1);
      expect(bySlot[0].name).toBe('Greek Yogurt');
    });

    it('persists customRecipes and supports retrieval by id and name', async () => {
      const recipe: CustomRecipe = {
        id: 'recipe-1',
        name: 'Overnight Oats Bowl',
        ingredients: [
          {
            foodId: 'staple:oats',
            name: 'Rolled Oats',
            amount: 50,
            unit: 'g',
            nutritionSnapshot: {
              calories: 190,
              protein: 6.5,
              carbs: 34,
              fat: 3.5,
              fiber: 5,
              micros: { ironMg: 1.8 },
            },
          },
        ],
        basis: 'perServing',
        totalGrams: 250,
        nutrientsPerBasis: { calories: 350, protein: 25, carbs: 45, fat: 8, fiber: 6 },
        micronutrientsPerBasis: { calciumMg: 200, ironMg: 2.5 },
        defaultServings: 1,
        createdAt: 1700000000,
      };

      await db.customRecipes.put(recipe);

      const hit = await db.customRecipes.where('name').equals('Overnight Oats Bowl').first();
      expect(hit?.id).toBe('recipe-1');
      expect(hit?.ingredients[0].nutritionSnapshot.micros.ironMg).toBe(1.8);
    });

    it('persists userGoals singleton with optional profile', async () => {
      const goals: UserGoals = {
        id: 'active',
        dailyCalories: 2400,
        proteinG: 180,
        carbsG: 240,
        fatG: 80,
        fiberG: 35,
        micronutrientTargets: { sodiumMg: 2300, calciumMg: 1000 },
        mealSlots: [
          { id: 'breakfast', name: 'Breakfast', weightPct: 25 },
          { id: 'lunch', name: 'Lunch', weightPct: 35 },
          { id: 'dinner', name: 'Dinner', weightPct: 40 },
        ],
        profile: {
          sex: 'male',
          age: 28,
          weightKg: 82,
          heightCm: 180,
          activityMultiplier: 1.55,
          goalDeltaKcal: -300,
          proteinPerKg: 2.2,
        },
        updatedAt: Date.now(),
      };

      await db.userGoals.put(goals);

      const active = await db.userGoals.get('active');
      expect(active?.dailyCalories).toBe(2400);
      expect(active?.profile?.weightKg).toBe(82);
      expect(active?.mealSlots).toHaveLength(3);
    });
  });
});
