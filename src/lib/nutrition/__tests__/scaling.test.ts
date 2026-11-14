import { describe, expect, it } from 'vitest';
import {
  formatPortionUnit,
  getServingOptionsForFood,
  parseHouseholdServingText,
  scaleFoodByOption,
} from '@/lib/nutrition/scaling';
import type { FoodItem } from '@/types/nutrition';

const EGG_MCMUFFIN: FoodItem = {
  id: 'ph:mcdo-egg-mcmuffin',
  source: 'staple',
  name: 'Egg McMuffin',
  brand: "McDonald's",
  region: 'PH',
  basis: 'perServing',
  servingSize: 1,
  servingUnit: 'pc',
  servingWeightGrams: 136,
  servingOptions: [
    { id: 'pc', label: 'pc (136g)', unit: 'pc', grams: 136, defaultAmount: 1 },
    { id: 'g', label: 'g', unit: 'g', grams: 1, defaultAmount: 100 },
  ],
  nutrientsPerBasis: {
    calories: 310,
    protein: 17,
    carbs: 30,
    fat: 13,
    fiber: 2,
  },
  micronutrientsPerBasis: {
    sodiumMg: 770,
  },
  updatedAt: 1700000000000,
};

const RAW_CHICKEN_BREAST: FoodItem = {
  id: 'staple:chicken-breast',
  source: 'staple',
  name: 'Chicken breast, raw',
  basis: 'per100g',
  servingSize: 100,
  servingUnit: 'g',
  nutrientsPerBasis: {
    calories: 120,
    protein: 22.5,
    carbs: 0,
    fat: 2.6,
    fiber: 0,
  },
  micronutrientsPerBasis: {},
  updatedAt: 1700000000000,
};

const BOTTLED_WATER: FoodItem = {
  id: 'staple:water',
  source: 'staple',
  name: 'Water',
  basis: 'per100ml',
  servingSize: 100,
  servingUnit: 'ml',
  nutrientsPerBasis: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  micronutrientsPerBasis: {},
  updatedAt: 1700000000000,
};

describe('formatPortionUnit', () => {
  it('handles singular and plural countable units correctly', () => {
    expect(formatPortionUnit(1, 'pc')).toBe('pc');
    expect(formatPortionUnit(0.5, 'pc')).toBe('pc');
    expect(formatPortionUnit(1.5, 'pc')).toBe('pcs');
    expect(formatPortionUnit(2, 'pc')).toBe('pcs');
    expect(formatPortionUnit(1, 'pcs')).toBe('pc');
    expect(formatPortionUnit(1, 'pack')).toBe('pack');
    expect(formatPortionUnit(3, 'pack')).toBe('packs');
  });

  it('keeps metric and invariant spoon units unchanged', () => {
    expect(formatPortionUnit(1, 'g')).toBe('g');
    expect(formatPortionUnit(250, 'g')).toBe('g');
    expect(formatPortionUnit(200, 'ml')).toBe('ml');
    expect(formatPortionUnit(2, 'tbsp')).toBe('tbsp');
  });
});

describe('parseHouseholdServingText', () => {
  it('parses household servings into canonical countable units', () => {
    expect(parseHouseholdServingText('1 SANDWICH')).toEqual({ count: 1, unit: 'pc' });
    expect(parseHouseholdServingText('2 slices (50g)')).toEqual({ count: 2, unit: 'slice' });
    expect(parseHouseholdServingText('1 pack (80 g)')).toEqual({ count: 1, unit: 'pack' });
    expect(parseHouseholdServingText('1 cup, cooked')).toEqual({ count: 1, unit: 'cup' });
  });

  it('returns null for pure metric weights or uncountable labels', () => {
    expect(parseHouseholdServingText('100 g')).toBeNull();
    expect(parseHouseholdServingText('250 ml')).toBeNull();
    expect(parseHouseholdServingText('')).toBeNull();
  });
});

describe('getServingOptionsForFood', () => {
  it('returns only a single metric option for plain per100g/per100ml foods without servings', () => {
    expect(getServingOptionsForFood(RAW_CHICKEN_BREAST)).toEqual([
      { id: 'g', label: 'g', unit: 'g', grams: 1, defaultAmount: 100 },
    ]);
    expect(getServingOptionsForFood(BOTTLED_WATER)).toEqual([
      { id: 'ml', label: 'ml', unit: 'ml', grams: 1, defaultAmount: 100 },
    ]);
  });

  it('returns both countable unit and grams options when applicable', () => {
    const options = getServingOptionsForFood(EGG_MCMUFFIN);
    expect(options).toHaveLength(2);
    expect(options[0].unit).toBe('pc');
    expect(options[0].grams).toBe(136);
    expect(options[1].unit).toBe('g');
    expect(options[1].grams).toBe(1);
  });
});

describe('scaleFoodByOption', () => {
  it('scales Egg McMuffin accurately across piece counts and grams', () => {
    const [pcOpt, gOpt] = getServingOptionsForFood(EGG_MCMUFFIN);

    const onePc = scaleFoodByOption(EGG_MCMUFFIN, 1, pcOpt);
    expect(onePc.macros.calories).toBe(310);
    expect(onePc.macros.protein).toBe(17);
    expect(onePc.effectiveGrams).toBe(136);

    const twoPcs = scaleFoodByOption(EGG_MCMUFFIN, 2, pcOpt);
    expect(twoPcs.macros.calories).toBe(620);
    expect(twoPcs.macros.protein).toBe(34);
    expect(twoPcs.effectiveGrams).toBe(272);

    const halfByGrams = scaleFoodByOption(EGG_MCMUFFIN, 68, gOpt);
    expect(halfByGrams.macros.calories).toBe(155);
    expect(halfByGrams.macros.protein).toBe(8.5);
    expect(halfByGrams.effectiveGrams).toBe(68);
  });
});
