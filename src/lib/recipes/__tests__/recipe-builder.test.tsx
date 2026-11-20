import 'fake-indexeddb/auto';
import React, { act } from 'react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { db } from '@/lib/db/macroai-db';
import {
  copyLogsFromDate,
  copyYesterdayLogs,
  saveCustomRecipe,
  logCustomRecipe,
  offsetIsoDate,
  calculateRecipeTotals,
} from '@/lib/recipes/recipe-builder';
import { MealSlotsView } from '@/components/log/meal-slots-view';
import { RecipeBuilderModal } from '@/components/recipes/recipe-builder-modal';
import RecipesPage from '@/app/recipes/page';
import LogPage from '@/app/log/page';
import { useLoggerStore } from '@/stores/logger-store';
import type { CustomRecipeIngredient } from '@/types/nutrition';

describe('Recipe Builder, Date Copy & Unified Log Views', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useLoggerStore.setState({
      activeDate: '2026-11-14',
      activeMealSlot: 'log',
      activeSheet: null,
      aiDraft: null,
    });
  });

  describe('offsetIsoDate helper', () => {
    test('correctly offsets dates across months and leap days without UTC drift', () => {
      expect(offsetIsoDate('2026-11-14', -1)).toBe('2026-11-13');
      expect(offsetIsoDate('2026-11-14', 1)).toBe('2026-11-15');
      expect(offsetIsoDate('2026-12-01', -1)).toBe('2026-11-30');
      expect(offsetIsoDate('2026-01-01', -1)).toBe('2025-12-31');
      expect(offsetIsoDate('2024-03-01', -1)).toBe('2024-02-29'); // Leap year
    });
  });

  describe('Custom Recipe builder & logging helpers', () => {
    test('saves custom recipe with perServing basis and computes totals', async () => {
      const recipe = await saveCustomRecipe({
        name: 'Protein Oatmeal Bowl',
        defaultServings: 2,
        basis: 'perServing',
        ingredients: [
          {
            foodId: 'staple:oats',
            name: 'Rolled Oats',
            amount: 80,
            unit: 'g',
            nutritionSnapshot: {
              calories: 300,
              protein: 10,
              carbs: 54,
              fat: 5,
              fiber: 8,
              micros: { ironMg: 3 },
            },
          },
          {
            foodId: 'staple:whey',
            name: 'Whey Protein',
            amount: 30,
            unit: 'g',
            nutritionSnapshot: {
              calories: 120,
              protein: 24,
              carbs: 2,
              fat: 1,
              fiber: 0,
              micros: { calciumMg: 150 },
            },
          },
        ],
      });

      expect(recipe.id).toBeDefined();
      expect(recipe.name).toBe('Protein Oatmeal Bowl');
      expect(recipe.totalGrams).toBe(110);
      expect(recipe.defaultServings).toBe(2);
      expect(recipe.basis).toBe('perServing');
      // Total calories is 420; per serving (2 servings) should be 210
      expect(recipe.nutrientsPerBasis.calories).toBe(210);
      expect(recipe.nutrientsPerBasis.protein).toBe(17); // (10 + 24) / 2
      expect(recipe.nutrientsPerBasis.carbs).toBe(28); // (54 + 2) / 2
      expect(recipe.nutrientsPerBasis.fat).toBe(3); // (5 + 1) / 2
      expect(recipe.nutrientsPerBasis.fiber).toBe(4); // 8 / 2
      expect(recipe.micronutrientsPerBasis.ironMg).toBe(1.5);
      expect(recipe.micronutrientsPerBasis.calciumMg).toBe(75);

      // Verify persisted in DB
      const stored = await db.customRecipes.get(recipe.id);
      expect(stored?.name).toBe('Protein Oatmeal Bowl');
    });

    test('saves custom recipe with per100g basis', async () => {
      const recipe = await saveCustomRecipe({
        name: 'Trail Mix',
        basis: 'per100g',
        ingredients: [
          {
            foodId: 'staple:almonds',
            name: 'Almonds',
            amount: 100,
            unit: 'g',
            nutritionSnapshot: {
              calories: 579,
              protein: 21,
              carbs: 22,
              fat: 50,
              fiber: 12,
              micros: {},
            },
          },
          {
            foodId: 'staple:raisins',
            name: 'Raisins',
            amount: 100,
            unit: 'g',
            nutritionSnapshot: {
              calories: 299,
              protein: 3,
              carbs: 79,
              fat: 0.5,
              fiber: 4,
              micros: {},
            },
          },
        ],
      });

      expect(recipe.totalGrams).toBe(200);
      expect(recipe.basis).toBe('per100g');
      // Total calories = 878 over 200g -> 439 per 100g
      expect(recipe.nutrientsPerBasis.calories).toBe(439);
      expect(recipe.nutrientsPerBasis.protein).toBe(12); // (24/200)*100
    });

    test('logs custom recipe into db.foodLogs with scaled nutrition', async () => {
      const recipe = await saveCustomRecipe({
        name: 'Omelette',
        defaultServings: 1,
        basis: 'perServing',
        ingredients: [
          {
            foodId: 'staple:egg',
            name: 'Eggs',
            amount: 100,
            unit: 'g',
            nutritionSnapshot: {
              calories: 143,
              protein: 13,
              carbs: 1,
              fat: 10,
              fiber: 0,
              micros: { ironMg: 1.8 },
            },
          },
        ],
      });

      const entry = await logCustomRecipe(recipe, {
        date: '2026-11-14',
        servings: 2,
      });

      expect(entry.id).toBeDefined();
      expect(entry.foodId).toBe(`recipe:${recipe.id}`);
      expect(entry.name).toBe('Omelette');
      expect(entry.source).toBe('recipe');
      expect(entry.amount).toBe(2);
      expect(entry.nutritionSnapshot.calories).toBe(286);
      expect(entry.nutritionSnapshot.protein).toBe(26);
      expect(entry.nutritionSnapshot.micros.ironMg).toBe(3.6);

      const inDb = await db.foodLogs.get(entry.id);
      expect(inDb?.name).toBe('Omelette');
    });

    test('copyYesterdayLogs clones all yesterday entries regardless of mealSlot', async () => {
      await db.foodLogs.bulkAdd([
        {
          id: 'y-1',
          date: '2026-11-13',
          mealSlot: 'breakfast',
          foodId: 's:1',
          name: 'Eggs',
          source: 'staple',
          amount: 100,
          unit: 'g',
          nutritionSnapshot: { calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5, fiber: 0, micros: {} },
          createdAt: 1,
        },
        {
          id: 'y-2',
          date: '2026-11-13',
          mealSlot: 'dinner',
          foodId: 's:2',
          name: 'Salmon',
          source: 'staple',
          amount: 150,
          unit: 'g',
          nutritionSnapshot: { calories: 310, protein: 32, carbs: 0, fat: 19, fiber: 0, micros: {} },
          createdAt: 2,
        },
      ]);

      const count = await copyYesterdayLogs('2026-11-14');
      expect(count).toBe(2);
      const copied = await db.foodLogs.where('date').equals('2026-11-14').toArray();
      expect(copied.map((c) => c.name).sort()).toEqual(['Eggs', 'Salmon']);
    });

    test('copyLogsFromDate clones all or selected entries from sourceDate to targetDate and returns insertedIds', async () => {
      await db.foodLogs.bulkAdd([
        {
          id: 'src-1',
          date: '2026-11-10',
          mealSlot: 'log',
          foodId: 's:1',
          name: 'Oats',
          source: 'staple',
          amount: 80,
          unit: 'g',
          nutritionSnapshot: { calories: 300, protein: 10, carbs: 54, fat: 5, fiber: 8, micros: {} },
          createdAt: 10,
        },
        {
          id: 'src-2',
          date: '2026-11-10',
          mealSlot: 'log',
          foodId: 's:2',
          name: 'Chicken Breast',
          source: 'staple',
          amount: 150,
          unit: 'g',
          nutritionSnapshot: { calories: 248, protein: 46.5, carbs: 0, fat: 5.4, fiber: 0, micros: {} },
          createdAt: 20,
        },
      ]);

      const selective = await copyLogsFromDate('2026-11-10', '2026-11-14', ['src-2']);
      expect(selective.count).toBe(1);
      expect(selective.insertedIds).toHaveLength(1);
      expect(selective.insertedIds[0]).not.toBe('src-2');

      const copiedRow = await db.foodLogs.get(selective.insertedIds[0]);
      expect(copiedRow?.name).toBe('Chicken Breast');
      expect(copiedRow?.date).toBe('2026-11-14');

      const empty = await copyLogsFromDate('2026-11-10', '2026-11-15', []);
      expect(empty).toEqual({ count: 0, insertedIds: [] });

      const all = await copyLogsFromDate('2026-11-10', '2026-11-16');
      expect(all.count).toBe(2);
      expect(all.insertedIds).toHaveLength(2);
    });
  });

  describe('UI Component: MealSlotsView & LogPage', () => {
    test('renders unified logged entries list without meal-slot groupings and copies yesterday', async () => {
      // Seed user goals
      await db.userGoals.put({
        id: 'active',
        dailyCalories: 2000,
        proteinG: 150,
        carbsG: 200,
        fatG: 65,
        fiberG: 30,
        micronutrientTargets: {},
        updatedAt: 1,
        mealSlots: [],
      });

      // Seed yesterday entries across different legacy mealSlots
      await db.foodLogs.bulkAdd([
        {
          id: 'yesterday-entry',
          date: '2026-11-13',
          mealSlot: 'breakfast',
          foodId: 'staple:1',
          name: 'Greek Yogurt',
          source: 'staple',
          amount: 200,
          unit: 'g',
          nutritionSnapshot: {
            calories: 130,
            protein: 20,
            carbs: 8,
            fat: 2,
            fiber: 0,
            micros: {},
          },
          createdAt: 100,
        },
        {
          id: 'yesterday-entry-2',
          date: '2026-11-13',
          mealSlot: 'dinner',
          foodId: 'staple:2',
          name: 'Chicken Bowl',
          source: 'staple',
          amount: 250,
          unit: 'g',
          nutritionSnapshot: {
            calories: 420,
            protein: 40,
            carbs: 38,
            fat: 12,
            fiber: 4,
            micros: {},
          },
          createdAt: 200,
        },
      ]);

      render(React.createElement(MealSlotsView));

      // No Breakfast / Lunch / Dinner / Snacks headings anywhere
      expect(screen.getByText('Logged Entries')).toBeInTheDocument();
      expect(screen.queryByText('Breakfast')).not.toBeInTheDocument();
      expect(screen.queryByText('Lunch')).not.toBeInTheDocument();
      expect(screen.queryByText('Dinner')).not.toBeInTheDocument();
      expect(screen.queryByText('Snacks')).not.toBeInTheDocument();

      // Check "Copy Yesterday" button is present (after useLiveQuery resolves)
      const copyBtn = await screen.findByRole('button', { name: /^copy yesterday$/i });
      expect(copyBtn).toBeInTheDocument();

      // Click "Copy Yesterday"
      await act(async () => {
        fireEvent.click(copyBtn);
      });

      // Today should now have both copied entries in the unified list
      await waitFor(async () => {
        const todayLogs = await db.foodLogs.where('date').equals('2026-11-14').toArray();
        expect(todayLogs).toHaveLength(2);
      });

      await waitFor(() => {
        expect(screen.getByText('Greek Yogurt')).toBeInTheDocument();
        expect(screen.getByText('Chicken Bowl')).toBeInTheDocument();
      });

      // Test + Add button triggers openSheet('search')
      const addFoodBtn = screen.getByRole('button', { name: /add food/i });
      fireEvent.click(addFoodBtn);
      expect(useLoggerStore.getState().activeSheet).toBe('search');

      // Test delete entry
      const deleteBtn = screen.getByRole('button', { name: /delete greek yogurt/i });
      await act(async () => {
        fireEvent.click(deleteBtn);
      });

      await waitFor(async () => {
        const count = await db.foodLogs.where('date').equals('2026-11-14').count();
        expect(count).toBe(1);
      });
    });

    test('LogPage renders date switcher and synchronizes with useLoggerStore', async () => {
      render(React.createElement(LogPage));

      // Click previous day
      const prevBtn = screen.getByRole('button', { name: /previous day/i });
      fireEvent.click(prevBtn);
      expect(useLoggerStore.getState().activeDate).toBe('2026-11-13');

      // Click next day
      const nextBtn = screen.getByRole('button', { name: /next day/i });
      fireEvent.click(nextBtn);
      expect(useLoggerStore.getState().activeDate).toBe('2026-11-14');
    });
  });

  describe('UI Component: RecipeBuilderModal & RecipesPage', () => {
    test('RecipeBuilderModal creates a custom recipe with live calculations and closes on Escape', async () => {
      const handleClose = vi.fn();
      const handleSaved = vi.fn();

      const { rerender } = render(
        React.createElement(RecipeBuilderModal, {
          isOpen: true,
          onClose: handleClose,
          onSaved: handleSaved,
        })
      );

      // Dialog accessibility check
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      // Enter recipe name
      const nameInput = screen.getByPlaceholderText(/recipe title/i);
      fireEvent.change(nameInput, { target: { value: 'Avocado Toast' } });

      // Add a manual ingredient
      const ingNameInput = screen.getByPlaceholderText(/ingredient name/i);
      const ingGramsInput = screen.getByPlaceholderText(/weight \(g\)/i);
      const ingCalsInput = screen.getByPlaceholderText(/calories/i);
      const ingProteinInput = screen.getByPlaceholderText(/protein/i);
      const addIngBtn = screen.getByRole('button', { name: /add ingredient/i });

      fireEvent.change(ingNameInput, { target: { value: 'Sourdough Bread' } });
      fireEvent.change(ingGramsInput, { target: { value: '50' } });
      fireEvent.change(ingCalsInput, { target: { value: '130' } });
      fireEvent.change(ingProteinInput, { target: { value: '5' } });
      fireEvent.click(addIngBtn);

      // Verify ingredient was added
      expect(screen.getByText('Sourdough Bread')).toBeInTheDocument();

      // Click Save Recipe
      const saveBtn = screen.getByRole('button', { name: /save recipe/i });
      await act(async () => {
        fireEvent.click(saveBtn);
      });

      await waitFor(async () => {
        const recipes = await db.customRecipes.toArray();
        expect(recipes).toHaveLength(1);
        expect(recipes[0].name).toBe('Avocado Toast');
        expect(handleSaved).toHaveBeenCalled();
        expect(handleClose).toHaveBeenCalled();
      });

      // Test Escape key closes modal
      rerender(
        React.createElement(RecipeBuilderModal, {
          isOpen: true,
          onClose: handleClose,
          onSaved: handleSaved,
        })
      );
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(2);
    });

    test('RecipesPage lists recipes, enables 1-tap logging and deletion', async () => {
      // Seed a recipe
      await db.customRecipes.put({
        id: 'rec-1',
        name: 'Protein Shake',
        ingredients: [],
        basis: 'perServing',
        totalGrams: 300,
        nutrientsPerBasis: {
          calories: 250,
          protein: 30,
          carbs: 10,
          fat: 5,
          fiber: 2,
        },
        micronutrientsPerBasis: {},
        defaultServings: 1,
        createdAt: 1,
      });

      render(React.createElement(RecipesPage));

      // Check recipe rendered
      await waitFor(() => {
        expect(screen.getByText('Protein Shake')).toBeInTheDocument();
        expect(screen.getByText(/250 kcal/)).toBeInTheDocument();
      });

      // 1-tap Log button
      const logBtn = screen.getByRole('button', { name: /log protein shake/i });
      await act(async () => {
        fireEvent.click(logBtn);
      });

      // Verify logged to db.foodLogs
      await waitFor(async () => {
        const logs = await db.foodLogs.where('date').equals('2026-11-14').toArray();
        expect(logs).toHaveLength(1);
        expect(logs[0].name).toBe('Protein Shake');
        expect(logs[0].nutritionSnapshot.calories).toBe(250);
      });

      // Delete recipe
      const deleteRecipeBtn = screen.getByRole('button', { name: /delete recipe protein shake/i });
      await act(async () => {
        fireEvent.click(deleteRecipeBtn);
      });

      await waitFor(async () => {
        const remaining = await db.customRecipes.toArray();
        expect(remaining).toHaveLength(0);
      });
    });

    test('regression: editing ingredient amount in RecipeBuilderModal through 100 -> 1 -> "" -> 200 yields exact 2x calories without rounding drift', async () => {
      render(
        React.createElement(RecipeBuilderModal, {
          isOpen: true,
          onClose: () => {},
        })
      );

      // Add a manual ingredient with 100g, 389 kcal, 16.9g protein, 66.3g carbs, 6.9g fat
      const ingNameInput = screen.getByPlaceholderText(/ingredient name/i);
      const ingGramsInput = screen.getByPlaceholderText(/weight \(g\)/i);
      const ingCalsInput = screen.getByPlaceholderText(/calories/i);
      const ingProteinInput = screen.getByPlaceholderText(/protein/i);
      const addIngBtn = screen.getByRole('button', { name: /add ingredient/i });

      fireEvent.change(ingNameInput, { target: { value: 'Rolled Oats' } });
      fireEvent.change(ingGramsInput, { target: { value: '100' } });
      fireEvent.change(ingCalsInput, { target: { value: '389' } });
      fireEvent.change(ingProteinInput, { target: { value: '16.9' } });
      fireEvent.click(addIngBtn);

      expect(screen.getByText('Rolled Oats')).toBeInTheDocument();
      expect(screen.getByText(/389 kcal/)).toBeInTheDocument();

      // Find the ingredient's amount input
      const amountInput = screen.getByDisplayValue('100');

      // Edit: 100 -> 1 (intermediate edit)
      fireEvent.change(amountInput, { target: { value: '1' } });
      // At 1g, calories is Math.round(389 * 0.01) = 4 kcal
      expect(screen.getByText(/4 kcal/)).toBeInTheDocument();

      // Edit: 1 -> "" (user clears input while typing)
      fireEvent.change(amountInput, { target: { value: '' } });

      // Edit: "" -> 200 (final desired amount)
      fireEvent.change(amountInput, { target: { value: '200' } });

      // At 200g, calories MUST be exact 2x of baseline (389 * 2 = 778 kcal), NOT drifted compounding (e.g. 4 * 200 = 800)
      expect(screen.getByText(/778 kcal/)).toBeInTheDocument();
      // Protein should also be exact 2x (16.9 * 2 = 33.8g, rounded to 34P in display)
      expect(screen.getByText(/34P/)).toBeInTheDocument();
    });

    test('regression: perServing item inside per100g recipe computes realistic totalGrams and nutrientsPerBasis without counting 1 serving as 1 gram', async () => {
      // 1. Direct unit test of calculateRecipeTotals with a perServing ingredient that has servingSize: 50g
      const eggIng: CustomRecipeIngredient = {
        foodId: 'food:egg',
        name: 'Whole Egg',
        amount: 2, // 2 eggs
        unit: 'serving',
        nutritionSnapshot: {
          calories: 144, // 72 kcal per egg
          protein: 12.6,
          carbs: 0.8,
          fat: 9.6,
          fiber: 0,
          micros: {},
        },
      };
      eggIng.gramsPerUnit = 50; // 50g per egg
      eggIng.servingSize = 50;

      const totals = calculateRecipeTotals([eggIng]);
      // 2 eggs * 50g = 100g total weight, NOT 2g!
      expect(totals.totalGrams).toBe(100);

      // Save custom recipe with basis per100g
      const recipe = await saveCustomRecipe({
        name: 'Egg Scramble Base',
        basis: 'per100g',
        ingredients: [eggIng],
      });

      // Total grams is 100g
      expect(recipe.totalGrams).toBe(100);
      // Per 100g calories must be 144 kcal (144 * 100 / 100), NOT 7200 kcal!
      expect(recipe.nutrientsPerBasis.calories).toBe(144);
      expect(recipe.nutrientsPerBasis.protein).toBe(13); // round(12.6)

      // 2. Test in RecipeBuilderModal with a perServing staple food item
      const { setStaplesCache } = await import('@/lib/foods/staples-search');
      setStaplesCache([
        {
          id: 'staple:egg-large',
          name: 'Large Egg',
          basis: 'perServing',
          servingSize: 50,
          servingUnit: 'g',
          nutrientsPerBasis: {
            calories: 72,
            protein: 6.3,
            carbs: 0.4,
            fat: 4.8,
            fiber: 0,
          },
          micronutrientsPerBasis: {},
          source: 'staple',
          updatedAt: 1,
        },
      ]);

      render(
        React.createElement(RecipeBuilderModal, {
          isOpen: true,
          onClose: () => {},
        })
      );

      // Switch basis to per100g
      const per100gBtn = screen.getByRole('button', { name: /per 100g/i });
      fireEvent.click(per100gBtn);

      // Search and add Large Egg
      const searchInput = screen.getByPlaceholderText(/search foods to add as ingredient/i);
      fireEvent.change(searchInput, { target: { value: 'Egg' } });

      const foodResult = await screen.findByText('Large Egg');
      fireEvent.click(foodResult);

      // The modal should display 50g total weight for 1 egg (not 1g!)
      expect(screen.getByText(/50g total weight/i)).toBeInTheDocument();

      // And preview per 100g should be realistic (~144 kcal for 100g of egg, not 7200 kcal!)
      expect(screen.getByText(/144/)).toBeInTheDocument();
    });
  });
});
