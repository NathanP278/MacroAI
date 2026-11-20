import { describe, it, expect } from 'vitest';
import {
  computeRangeAnalytics,
  computeNutrientContributors,
  computeLoggingStreak,
} from '../analytics';
import type { FoodLogEntry, UserGoals } from '@/types/nutrition';

function goals(over: Partial<UserGoals> = {}): UserGoals {
  return {
    id: 'active',
    dailyCalories: 2000,
    proteinG: 150,
    carbsG: 200,
    fatG: 65,
    fiberG: 30,
    micronutrientTargets: {},
    updatedAt: 0,
    ...over,
  };
}

function log(
  id: string,
  date: string,
  snap: Partial<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    micros: Record<string, number>;
  }>,
  extra: Partial<FoodLogEntry> = {},
): FoodLogEntry {
  return {
    id,
    date,
    foodId: extra.foodId ?? `food-${id}`,
    name: extra.name ?? `Food ${id}`,
    source: 'custom_food',
    amount: 1,
    unit: 'serving',
    createdAt: 1,
    nutritionSnapshot: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      micros: {},
      ...snap,
    },
    ...extra,
  } as FoodLogEntry;
}

describe('computeRangeAnalytics', () => {
  it('returns one day entry per day of the range, ending on endDate (local ISO)', () => {
    const r = computeRangeAnalytics([], goals(), '2026-03-01', 7);
    expect(r.days).toHaveLength(7);
    expect(r.days[0].date).toBe('2026-02-23');
    expect(r.days[6].date).toBe('2026-03-01');
    expect(r.days.every((d) => d.logged === false)).toBe(true);
  });

  it('handles empty logs without NaN and with null ratios', () => {
    const r = computeRangeAnalytics([], goals({ profile: undefined }), '2026-03-01', 14);
    expect(r.avgCalories).toBe(0);
    expect(r.avgProtein).toBe(0);
    expect(r.weeklyNetBalance).toBe(0);
    expect(r.macroPct).toEqual({ protein: 0, carbs: 0, fat: 0 });
    expect(r.proteinPerKg).toBeNull();
    expect(r.fiberPer1000Kcal).toBeNull();
    expect(r.rolling7dSummary.loggedDays).toBe(0);
    expect(r.avgTargetCalories).toBe(2000);
  });

  it('averages intake over logged days only (unlogged days excluded)', () => {
    const logs = [
      log('a', '2026-03-01', { calories: 2000, protein: 100, carbs: 200, fat: 50, fiber: 20 }),
      log('b', '2026-03-01', { calories: 400, protein: 20, carbs: 20, fat: 10, fiber: 4 }),
      log('c', '2026-02-27', { calories: 1600, protein: 120, carbs: 100, fat: 40, fiber: 16 }),
    ];
    const r = computeRangeAnalytics(logs, goals(), '2026-03-01', 7);
    expect(r.days.filter((d) => d.logged)).toHaveLength(2);
    // day totals: 2400 and 1600 -> avg 2000 (not 4000/7)
    expect(r.avgCalories).toBe(2000);
    expect(r.avgProtein).toBe(120);
    expect(r.avgCarbs).toBe(160);
    expect(r.avgFat).toBe(50);
    expect(r.avgFiber).toBe(20);
  });

  it('computes weekly net balance (intake minus target over logged days in last 7 days)', () => {
    const logs = [
      log('a', '2026-03-01', { calories: 2300 }),
      log('b', '2026-02-28', { calories: 1700 }),
      log('c', '2026-02-10', { calories: 5000 }), // outside last 7 days, inside 30d
    ];
    const r = computeRangeAnalytics(logs, goals(), '2026-03-01', 30);
    // (2300-2000) + (1700-2000) = 0
    expect(r.weeklyNetBalance).toBe(0);
    expect(r.rolling7dSummary.loggedDays).toBe(2);
    expect(r.rolling7dSummary.avgCalories).toBe(2000);

    const r2 = computeRangeAnalytics([log('a', '2026-03-01', { calories: 2500 })], goals(), '2026-03-01', 7);
    expect(r2.weeklyNetBalance).toBe(500);
  });

  it('computes macro calorie % split, protein g/kg and fiber per 1000 kcal', () => {
    // protein 100g=400kcal, carbs 200g=800kcal, fat 50g=450kcal -> total 1650
    const logs = [
      log('a', '2026-03-01', { calories: 2000, protein: 100, carbs: 200, fat: 50, fiber: 28 }),
    ];
    const r = computeRangeAnalytics(logs, goals(), '2026-03-01', 7, 80);
    expect(r.macroPct.protein).toBeCloseTo(24.2, 1);
    expect(r.macroPct.carbs).toBeCloseTo(48.5, 1);
    expect(r.macroPct.fat).toBeCloseTo(27.3, 1);
    expect(r.macroPct.protein + r.macroPct.carbs + r.macroPct.fat).toBeCloseTo(100, 0);
    expect(r.proteinPerKg).toBeCloseTo(1.25, 2);
    expect(r.fiberPer1000Kcal).toBeCloseTo(14, 5);
  });

  it('falls back to profile weight for protein g/kg, then null', () => {
    const logs = [log('a', '2026-03-01', { calories: 2000, protein: 150 })];
    const withProfile = goals({
      profile: {
        sex: 'male',
        age: 30,
        weightKg: 75,
        heightCm: 180,
        activityMultiplier: 1.55,
        goalDeltaKcal: 0,
        proteinPerKg: 2,
      },
    });
    expect(computeRangeAnalytics(logs, withProfile, '2026-03-01', 7).proteinPerKg).toBe(2);
    expect(computeRangeAnalytics(logs, withProfile, '2026-03-01', 7, 100).proteinPerKg).toBe(1.5);
    expect(computeRangeAnalytics(logs, withProfile, '2026-03-01', 7, null).proteinPerKg).toBe(2);
    expect(computeRangeAnalytics(logs, goals(), '2026-03-01', 7).proteinPerKg).toBeNull();
    expect(computeRangeAnalytics(logs, goals(), '2026-03-01', 7, 0).proteinPerKg).toBeNull();
  });

  it('uses per-day cycling targets via resolveGoalsForDate', () => {
    const t = (calories: number) => ({ calories, proteinG: 100, carbsG: 100, fatG: 50, fiberG: 25 });
    const g = goals({
      weeklyCyclingEnabled: true,
      weeklySchedule: {
        mon: t(1800), tue: t(1800), wed: t(1800), thu: t(1800), fri: t(1800),
        sat: t(2600), sun: t(2600),
      },
    });
    // 2026-02-28 is Saturday, 2026-03-01 is Sunday, 2026-02-27 Friday
    const r = computeRangeAnalytics(
      [log('a', '2026-02-28', { calories: 2600 }), log('b', '2026-02-27', { calories: 1800 })],
      g,
      '2026-03-01',
      7,
    );
    const sat = r.days.find((d) => d.date === '2026-02-28')!;
    const fri = r.days.find((d) => d.date === '2026-02-27')!;
    expect(sat.targetCalories).toBe(2600);
    expect(fri.targetCalories).toBe(1800);
    expect(r.weeklyNetBalance).toBe(0);
    // avgTargetCalories averages targets over all days in range: (5*1800+2*2600)/7
    expect(r.avgTargetCalories).toBeCloseTo((5 * 1800 + 2 * 2600) / 7, 5);
  });
});

describe('computeNutrientContributors', () => {
  const logs = [
    log('1', '2026-03-01', { micros: { sodiumMg: 800 } }, { foodId: 'soy', name: 'Soy sauce' }),
    log('2', '2026-03-01', { micros: { sodiumMg: 200 } }, { foodId: 'bread', name: 'Bread' }),
    log('3', '2026-03-02', { micros: { sodiumMg: 600 } }, { foodId: 'soy', name: 'Soy sauce' }),
    log('4', '2026-03-02', { micros: { sodiumMg: 400 } }, { foodId: 'egg', name: 'Egg' }),
    log('5', '2026-03-02', { micros: {} }, { foodId: 'apple', name: 'Apple' }),
  ];

  it('groups by foodId, sorts descending, and shares sum to 100', () => {
    const r = computeNutrientContributors(logs, 'sodiumMg');
    expect(r.map((c) => c.foodId)).toEqual(['soy', 'egg', 'bread']);
    expect(r[0]).toMatchObject({ name: 'Soy sauce', amount: 1400, count: 2 });
    expect(r[0].sharePct).toBeCloseTo(70, 5);
    expect(r.reduce((s, c) => s + c.sharePct, 0)).toBeCloseTo(100, 5);
  });

  it('truncates by limit but keeps shares relative to the full total', () => {
    const r = computeNutrientContributors(logs, 'sodiumMg', 2);
    expect(r).toHaveLength(2);
    expect(r[0].sharePct).toBeCloseTo(70, 5);
    expect(r[1].sharePct).toBeCloseTo(20, 5);
    expect(r.reduce((s, c) => s + c.sharePct, 0)).toBeLessThan(100);
  });

  it('supports macro keys and returns [] for missing/zero nutrients', () => {
    const macro = [log('m', '2026-03-01', { protein: 30 }, { foodId: 'x' })];
    expect(computeNutrientContributors(macro, 'protein')[0].amount).toBe(30);
    expect(computeNutrientContributors(logs, 'zincMg')).toEqual([]);
    expect(computeNutrientContributors([], 'sodiumMg')).toEqual([]);
  });
});

describe('computeLoggingStreak', () => {
  it('counts the current streak back from the last dot, plus consistency', () => {
    const dots = [
      { date: '2026-03-01', hasLogs: true },
      { date: '2026-03-02', hasLogs: false },
      { date: '2026-03-03', hasLogs: true },
      { date: '2026-03-04', hasLogs: true },
    ];
    expect(computeLoggingStreak(dots)).toEqual({
      currentStreak: 2,
      loggedCount: 3,
      consistencyPct: 75,
    });
  });

  it('does not break the streak when the final (today) dot is not yet logged', () => {
    const dots = [
      { date: '2026-03-01', hasLogs: true },
      { date: '2026-03-02', hasLogs: true },
      { date: '2026-03-03', hasLogs: false },
    ];
    expect(computeLoggingStreak(dots).currentStreak).toBe(2);
  });

  it('handles empty input', () => {
    expect(computeLoggingStreak([])).toEqual({ currentStreak: 0, loggedCount: 0, consistencyPct: 0 });
  });
});
