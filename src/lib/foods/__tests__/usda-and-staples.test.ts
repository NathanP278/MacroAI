import 'fake-indexeddb/auto';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mapUsdaFoodToFoodItem, fetchAndCacheUsdaFood } from '../usda-adapter';
import { filterStaples, searchStaples, loadStaples, setStaplesCache } from '../staples-search';
import { GET as usdaRouteHandler } from '@/app/api/usda/[...path]/route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/macroai-db';
import type { FoodItem } from '@/types/nutrition';

describe('USDA adapter and Staples search', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('normalizes USDA Foundation nutrients (energy kcal, macros, micros) to per100g', () => {
    const item = mapUsdaFoodToFoodItem({
      fdcId: 171705,
      description: 'Avocados, raw, all commercial varieties',
      dataType: 'SR Legacy',
      foodNutrients: [
        { nutrient: { id: 1008, name: 'Energy', unitName: 'kcal' }, amount: 160 },
        { nutrient: { id: 1003, name: 'Protein', unitName: 'g' }, amount: 2 },
        { nutrient: { id: 1005, name: 'Carbohydrate, by difference', unitName: 'g' }, amount: 8.53 },
        { nutrient: { id: 1004, name: 'Total lipid (fat)', unitName: 'g' }, amount: 14.66 },
        { nutrient: { id: 1079, name: 'Fiber, total dietary', unitName: 'g' }, amount: 6.7 },
        { nutrient: { id: 1092, name: 'Potassium, K', unitName: 'mg' }, amount: 485 },
      ],
    });
    expect(item.id).toBe('usda:171705');
    expect(item.basis).toBe('per100g');
    expect(item.nutrientsPerBasis.calories).toBe(160);
    expect(item.nutrientsPerBasis.protein).toBe(2);
    expect(item.nutrientsPerBasis.carbs).toBe(8.53);
    expect(item.nutrientsPerBasis.fat).toBe(14.66);
    expect(item.nutrientsPerBasis.fiber).toBe(6.7);
    expect(item.micronutrientsPerBasis.potassiumMg).toBe(485);
  });

  test('normalizes USDA /foods/search flat nutrient format and ignores kJ (1062)', () => {
    const item = mapUsdaFoodToFoodItem({
      fdcId: 234567,
      description: 'Egg, whole, raw, fresh',
      dataType: 'Foundation',
      foodNutrients: [
        { nutrientId: 1062, nutrientName: 'Energy', unitName: 'kJ', value: 600 },
        { nutrientId: 1008, nutrientName: 'Energy', unitName: 'kcal', value: 143 },
        { nutrientId: 1003, nutrientName: 'Protein', unitName: 'g', value: 12.56 },
        { nutrientId: 1004, nutrientName: 'Total lipid (fat)', unitName: 'g', value: 9.51 },
        { nutrientId: 1005, nutrientName: 'Carbohydrate, by difference', unitName: 'g', value: 0.72 },
        { nutrientId: 1079, nutrientName: 'Fiber, total dietary', unitName: 'g', value: 0 },
        { nutrientId: 1093, nutrientName: 'Sodium, Na', unitName: 'mg', value: 142 },
        { nutrientId: 1087, nutrientName: 'Calcium, Ca', unitName: 'mg', value: 56 },
        { nutrientId: 1089, nutrientName: 'Iron, Fe', unitName: 'mg', value: 1.75 },
        { nutrientId: 1090, nutrientName: 'Magnesium, Mg', unitName: 'mg', value: 12 },
        { nutrientId: 1095, nutrientName: 'Zinc, Zn', unitName: 'mg', value: 1.29 },
        { nutrientId: 1106, nutrientName: 'Vitamin A, RAE', unitName: 'µg', value: 160 },
        { nutrientId: 1162, nutrientName: 'Vitamin C, total ascorbic acid', unitName: 'mg', value: 0 },
        { nutrientId: 1114, nutrientName: 'Vitamin D (D2 + D3)', unitName: 'µg', value: 2 },
        { nutrientId: 1175, nutrientName: 'Vitamin B-6', unitName: 'mg', value: 0.17 },
        { nutrientId: 1178, nutrientName: 'Vitamin B-12', unitName: 'µg', value: 0.89 },
        { nutrientId: 1177, nutrientName: 'Folate, total', unitName: 'µg', value: 47 },
      ],
    });

    expect(item.id).toBe('usda:234567');
    expect(item.name).toBe('Egg, whole, raw, fresh');
    expect(item.basis).toBe('per100g');
    expect(item.servingSize).toBe(100);
    expect(item.servingUnit).toBe('g');
    expect(item.nutrientsPerBasis.calories).toBe(143);
    expect(item.nutrientsPerBasis.protein).toBe(12.56);
    expect(item.nutrientsPerBasis.fat).toBe(9.51);
    expect(item.nutrientsPerBasis.carbs).toBe(0.72);
    expect(item.nutrientsPerBasis.fiber).toBe(0);
    expect(item.micronutrientsPerBasis.sodiumMg).toBe(142);
    expect(item.micronutrientsPerBasis.calciumMg).toBe(56);
    expect(item.micronutrientsPerBasis.ironMg).toBe(1.75);
    expect(item.micronutrientsPerBasis.magnesiumMg).toBe(12);
    expect(item.micronutrientsPerBasis.zincMg).toBe(1.29);
    expect(item.micronutrientsPerBasis.vitaminAMcg).toBe(160);
    expect(item.micronutrientsPerBasis.vitaminCMg).toBe(0);
    expect(item.micronutrientsPerBasis.vitaminDMcg).toBe(2);
    expect(item.micronutrientsPerBasis.vitaminB6Mg).toBe(0.17);
    expect(item.micronutrientsPerBasis.vitaminB12Mcg).toBe(0.89);
    expect(item.micronutrientsPerBasis.folateMcg).toBe(47);
  });

  test('supports sourceOverride: staple', () => {
    const item = mapUsdaFoodToFoodItem(
      {
        fdcId: 99999,
        description: 'Rolled Oats',
        foodNutrients: [
          { nutrient: { id: 1008, name: 'Energy', unitName: 'kcal' }, amount: 389 },
          { nutrient: { id: 1003, name: 'Protein', unitName: 'g' }, amount: 16.89 },
          { nutrient: { id: 1004, name: 'Total lipid (fat)', unitName: 'g' }, amount: 6.9 },
          { nutrient: { id: 1005, name: 'Carbohydrate', unitName: 'g' }, amount: 66.27 },
        ],
      },
      'staple'
    );
    expect(item.id).toBe('staple:99999');
    expect(item.source).toBe('staple');
  });

  test('ranks exact/prefix token matches first across staples', () => {
    const sample = [
      { id: 'staple:1', name: 'Chicken breast, raw' },
      { id: 'staple:2', name: 'Soup, chicken broth' },
      { id: 'staple:3', name: 'Chicken breast, cooked, roasted' },
    ] as FoodItem[];

    const results = filterStaples(sample, 'chicken breast', 10);
    expect(results.length).toBe(2);
    expect(results[0].id).toBe('staple:1');
    expect(results[1].id).toBe('staple:3');
  });

  test('handles empty or whitespace queries cleanly', () => {
    const sample = [
      { id: 'staple:1', name: 'Chicken breast, raw' },
      { id: 'staple:2', name: 'Apple, raw' },
    ] as FoodItem[];

    expect(filterStaples(sample, '', 10)).toHaveLength(2);
    expect(filterStaples(sample, '   ', 10)).toHaveLength(2);
  });

  test('loadStaples and searchStaples loads ~2500 staples from public/data/staples-2500.json', async () => {
    setStaplesCache(null);
    const loaded = await loadStaples();
    expect(loaded.length).toBeGreaterThanOrEqual(2500);
    expect(loaded[0].basis).toBe('per100g');
    expect(loaded[0].source).toBe('staple');

    const searchHits = await searchStaples('chicken', 5);
    expect(searchHits.length).toBeGreaterThan(0);
    expect(searchHits[0].name.toLowerCase()).toContain('chicken');
  });

  test('fetchAndCacheUsdaFood returns cached item without fetching if already in Dexie foodsCache', async () => {
    const mockItem: FoodItem = {
      id: 'usda:12345',
      source: 'usda',
      name: 'Cached Salmon',
      basis: 'per100g',
      servingSize: 100,
      servingUnit: 'g',
      nutrientsPerBasis: { calories: 200, protein: 20, carbs: 0, fat: 12, fiber: 0 },
      micronutrientsPerBasis: {},
      updatedAt: 123456,
    };
    await db.foodsCache.put(mockItem);

    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await fetchAndCacheUsdaFood(12345);
    expect(result.name).toBe('Cached Salmon');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('USDA route handler allows only foods/search and food/<numericId>, rejecting traversal', async () => {
    const req1 = new NextRequest('http://localhost:3000/api/usda/invalid/path');
    const res1 = await usdaRouteHandler(req1, { params: Promise.resolve({ path: ['invalid', 'path'] }) });
    expect(res1.status).toBe(400);

    const req2 = new NextRequest('http://localhost:3000/api/usda/foods/download');
    const res2 = await usdaRouteHandler(req2, { params: Promise.resolve({ path: ['foods', 'download'] }) });
    expect(res2.status).toBe(400);

    const req3 = new NextRequest('http://localhost:3000/api/usda/food/abc');
    const res3 = await usdaRouteHandler(req3, { params: Promise.resolve({ path: ['food', 'abc'] }) });
    expect(res3.status).toBe(400);
  });

  test('USDA route handler forwards foods/search with enforced dataType and Cache-Control', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
      const urlStr = String(url);
      expect(urlStr).toContain('https://api.nal.usda.gov/fdc/v1/foods/search');
      expect(urlStr).toContain('dataType=Foundation%2CSR+Legacy');
      expect(urlStr).toContain('api_key=');
      return new Response(JSON.stringify({ totalHits: 1, foods: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const req = new NextRequest('http://localhost:3000/api/usda/foods/search?query=spinach');
    const res = await usdaRouteHandler(req, { params: Promise.resolve({ path: ['foods', 'search'] }) });
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=86400');
    expect(fetchSpy).toHaveBeenCalled();
  });
});
