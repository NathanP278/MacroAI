import 'fake-indexeddb/auto';
import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { db } from '@/lib/db/macroai-db';
import { useLoggerStore } from '@/stores/logger-store';
import { FoodSearchDrawer } from '../food-search-drawer';
import { setStaplesCache } from '@/lib/foods/staples-search';
import { AppShell } from '@/components/shell/app-shell';
import type { FoodItem } from '@/types/nutrition';

const mockStaples: FoodItem[] = [
  {
    id: 'staple:101',
    source: 'staple',
    name: 'Chicken breast, raw',
    basis: 'per100g',
    servingSize: 100,
    servingUnit: 'g',
    nutrientsPerBasis: { calories: 120, protein: 22.5, carbs: 0, fat: 2.6, fiber: 0 },
    micronutrientsPerBasis: { potassiumMg: 350, sodiumMg: 65 },
    updatedAt: 1000,
  },
  {
    id: 'staple:102',
    source: 'staple',
    name: 'Brown rice, medium-grain, cooked',
    basis: 'per100g',
    servingSize: 100,
    servingUnit: 'g',
    nutrientsPerBasis: { calories: 112, protein: 2.3, carbs: 23.5, fat: 0.8, fiber: 1.8 },
    micronutrientsPerBasis: { magnesiumMg: 43 },
    updatedAt: 1000,
  },
];

describe('FoodSearchDrawer component', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    setStaplesCache(mockStaples);
    useLoggerStore.setState({
      activeDate: '2026-11-14',
      activeMealSlot: 'lunch',
      activeSheet: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renders drawer when open and displays staples', async () => {
    render(<FoodSearchDrawer open date="2026-11-14" mealSlot="lunch" onClose={() => {}} />);

    expect(screen.getByTestId('food-search-drawer')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search 2,500 offline whole-food staples/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Chicken breast, raw')).toBeInTheDocument();
      expect(screen.getByText('Brown rice, medium-grain, cooked')).toBeInTheDocument();
    });
  });

  test('filters staples on query input', async () => {
    render(<FoodSearchDrawer open date="2026-11-14" mealSlot="lunch" onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Chicken breast, raw')).toBeInTheDocument();
    });

    const input = screen.getByLabelText(/search foods/i);
    fireEvent.change(input, { target: { value: 'rice' } });

    expect(screen.getByText('Brown rice, medium-grain, cooked')).toBeInTheDocument();
    expect(screen.queryByText('Chicken breast, raw')).not.toBeInTheDocument();
  });

  test('selects food, configures grams portion, and logs food entry to Dexie', async () => {
    const handleClose = vi.fn();
    render(<FoodSearchDrawer open date="2026-11-14" mealSlot="lunch" onClose={handleClose} />);

    await waitFor(() => {
      expect(screen.getByText('Chicken breast, raw')).toBeInTheDocument();
    });

    // Select Chicken breast
    fireEvent.click(screen.getByText('Chicken breast, raw'));

    // Should now show portion editor
    expect(screen.getByText(/portion amount/i)).toBeInTheDocument();
    const amountInput = screen.getByLabelText(/portion amount/i);
    expect(amountInput).toHaveValue(100);

    // Change amount to 200g
    fireEvent.change(amountInput, { target: { value: '200' } });

    // Live scaled calories should be 120 * 2 = 240 kcal
    expect(screen.getByText('240 kcal')).toBeInTheDocument();
    // Scaled protein should be 22.5 * 2 = 45g
    expect(screen.getByText('45g')).toBeInTheDocument();

    // Log food
    const logButton = screen.getByRole('button', { name: /log food/i });
    fireEvent.click(logButton);

    await waitFor(async () => {
      expect(await db.foodLogs.count()).toBe(1);
    });

    const [logged] = await db.foodLogs.toArray();
    expect(logged.name).toBe('Chicken breast, raw');
    expect(logged.amount).toBe(200);
    expect(logged.unit).toBe('g');
    expect(logged.mealSlot).toBe('lunch');
    expect(logged.nutritionSnapshot.calories).toBe(240);
    expect(logged.nutritionSnapshot.protein).toBe(45);
    expect(logged.nutritionSnapshot.micros.potassiumMg).toBe(700);

    // Verify it also cached the food item
    const cached = await db.foodsCache.get('staple:101');
    expect(cached).toBeDefined();
    expect(handleClose).toHaveBeenCalled();
  });

  test('USDA online tab triggers search and allows logging online result', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
      if (String(url).includes('/api/usda/foods/search')) {
        return new Response(
          JSON.stringify({
            foods: [
              {
                fdcId: 555,
                description: 'Wild Alaskan Salmon',
                foodNutrients: [
                  { nutrientId: 1008, nutrientName: 'Energy', unitName: 'kcal', value: 182 },
                  { nutrientId: 1003, nutrientName: 'Protein', unitName: 'g', value: 25 },
                  { nutrientId: 1004, nutrientName: 'Total lipid (fat)', unitName: 'g', value: 8 },
                  { nutrientId: 1005, nutrientName: 'Carbohydrate', unitName: 'g', value: 0 },
                ],
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('{}', { status: 200 });
    });

    render(<FoodSearchDrawer open date="2026-11-14" mealSlot="dinner" onClose={() => {}} />);

    // Switch to USDA Online tab
    const usdaTab = screen.getByRole('button', { name: /usda online/i });
    fireEvent.click(usdaTab);

    const input = screen.getByPlaceholderText(/search online usda fooddata central/i);
    fireEvent.change(input, { target: { value: 'salmon' } });

    await waitFor(() => {
      expect(screen.getByText('Wild Alaskan Salmon')).toBeInTheDocument();
    });

    // Select the online result
    fireEvent.click(screen.getByText('Wild Alaskan Salmon'));
    expect(screen.getByText(/wild alaskan salmon/i)).toBeInTheDocument();

    // Log food
    fireEvent.click(screen.getByRole('button', { name: /log food/i }));

    await waitFor(async () => {
      expect(await db.foodLogs.count()).toBe(1);
    });

    const [logged] = await db.foodLogs.toArray();
    expect(logged.name).toBe('Wild Alaskan Salmon');
    expect(logged.source).toBe('usda');
    expect(logged.nutritionSnapshot.calories).toBe(182);

    // Verify it was saved to Dexie foodsCache
    const cached = await db.foodsCache.get('usda:555');
    expect(cached).toBeDefined();
    expect(cached?.name).toBe('Wild Alaskan Salmon');
  });

  test('AppShell mounts FoodSearchDrawer when activeSheet is search', () => {
    useLoggerStore.setState({ activeSheet: 'search' });

    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    expect(screen.getByTestId('food-search-drawer')).toBeInTheDocument();
  });
});
