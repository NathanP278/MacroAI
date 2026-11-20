import { describe, expect, it } from 'vitest';
import {
  applyWeeklyCheckInToGoals,
  buildWeeklyCheckInProposal,
  computeAdaptiveTdee,
  computeEmaTrendSeries,
  resolveDailyWeights,
  type AdaptiveTdeeResult,
} from '../adaptive-tdee';
import { computeWeeklyScheduleAverage } from '../goals';
import type {
  DailyMacroTargets,
  FoodLogEntry,
  UserGoals,
  WeekdayKey,
  WeightLogEntry,
} from '@/types/nutrition';

const DAY = 86_400_000;

function iso(base: string, offset: number): string {
  const [y, m, d] = base.split('-').map(Number);
  const dt = new Date(y, m - 1, d + offset);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function weight(date: string, kg: number, createdAt = 1, id = `w-${date}-${createdAt}`): WeightLogEntry {
  return { id, date, weightKg: kg, source: 'manual', recordedAt: `${date}T08:00:00`, createdAt, updatedAt: createdAt };
}

function food(date: string, calories: number, id = `f-${date}-${calories}`): FoodLogEntry {
  return {
    id,
    date,
    foodId: 'x',
    name: 'x',
    source: 'quick_add',
    amount: 1,
    unit: 'serving',
    nutritionSnapshot: { calories, protein: 0, carbs: 0, fat: 0, fiber: 0, micros: {} },
    createdAt: 1,
  };
}

function baseGoals(over: Partial<UserGoals> = {}): UserGoals {
  return {
    id: 'active',
    dailyCalories: 2000,
    proteinG: 150,
    carbsG: 200,
    fatG: 67,
    fiberG: 28,
    micronutrientTargets: {},
    updatedAt: 1,
    ...over,
  };
}

const START = '2026-01-01';

describe('resolveDailyWeights', () => {
  it('keeps the latest createdAt entry per date, sorted ascending', () => {
    const out = resolveDailyWeights([
      weight('2026-01-02', 80, 5, 'b'),
      weight('2026-01-01', 81, 1, 'a1'),
      weight('2026-01-01', 79.5, 9, 'a2'),
    ]);
    expect(out.map((p) => [p.date, p.scaleKg, p.entryId])).toEqual([
      ['2026-01-01', 79.5, 'a2'],
      ['2026-01-02', 80, 'b'],
    ]);
  });

  it('handles empty and non-finite input', () => {
    expect(resolveDailyWeights([])).toEqual([]);
    expect(resolveDailyWeights([weight('2026-01-01', Number.NaN)])).toEqual([]);
  });
});

describe('computeEmaTrendSeries', () => {
  it('seeds with first weight and uses time-adjusted alpha across gaps', () => {
    const pts = resolveDailyWeights([
      weight('2026-01-01', 80),
      weight('2026-01-02', 79),
      weight('2026-01-06', 78),
    ]);
    const s = computeEmaTrendSeries(pts);
    expect(s[0].trendKg).toBe(80);
    expect(s[1].trendKg).toBeCloseTo(80 + 0.1 * -1, 6);
    const alpha4 = 1 - Math.pow(0.9, 4);
    expect(s[2].trendKg).toBeCloseTo(79.9 + alpha4 * (78 - 79.9), 6);
  });

  it('handles empty and single points', () => {
    expect(computeEmaTrendSeries([])).toEqual([]);
    const one = computeEmaTrendSeries(resolveDailyWeights([weight('2026-01-01', 70)]));
    expect(one).toHaveLength(1);
    expect(one[0].trendKg).toBe(70);
  });
});

describe('computeAdaptiveTdee', () => {
  const today = iso(START, 20);

  it('excludes <40% partial days: 15 days @2200 + 1 @400 -> ~2200', () => {
    const foods: FoodLogEntry[] = [];
    for (let i = 0; i < 15; i++) foods.push(food(iso(START, i), 2200));
    foods.push(food(iso(START, 15), 400));
    const weights = [0, 5, 10, 15, 20].map((o) => weight(iso(START, o), 75));
    const r = computeAdaptiveTdee({ weights, foodLogs: foods, goals: baseGoals(), today });
    expect(r.status).toBe('ready');
    expect(r.loggedFoodDays).toBe(15);
    expect(r.observedTdee).toBeCloseTo(2200, 3);
    expect(r.weeklyRateKg).toBeCloseTo(0, 6);
    expect(r.tdeeSeries.length).toBeGreaterThan(0);
  });

  it('is calibrating with exact counts when food days are insufficient', () => {
    const foods = [0, 1, 2].map((o) => food(iso(START, o), 2000));
    const weights = [0, 5, 10, 15, 20].map((o) => weight(iso(START, o), 75));
    const r = computeAdaptiveTdee({ weights, foodLogs: foods, goals: baseGoals(), today });
    expect(r.status).toBe('calibrating');
    expect(r.loggedFoodDays).toBe(3);
    expect(r.weighInDays).toBe(5);
    expect(r.spanDays).toBe(20);
    expect(r.observedTdee).toBeNull();
    expect(r.weeklyRateKg).toBeNull();
  });

  it('is calibrating with <4 weigh-ins or <10 day span', () => {
    const foods: FoodLogEntry[] = [];
    for (let i = 0; i < 12; i++) foods.push(food(iso(START, i), 2000));
    const few = computeAdaptiveTdee({
      weights: [0, 10, 20].map((o) => weight(iso(START, o), 75)),
      foodLogs: foods,
      goals: baseGoals(),
      today,
    });
    expect(few.status).toBe('calibrating');
    const short = computeAdaptiveTdee({
      weights: [10, 12, 14, 16, 18, 20].map((o) => weight(iso(START, o), 75)).slice(0, 4),
      foodLogs: foods,
      goals: baseGoals(),
      today,
    });
    expect(short.spanDays).toBe(6);
    expect(short.status).toBe('calibrating');
  });

  it('guards empty inputs and single weigh-in', () => {
    const empty = computeAdaptiveTdee({ weights: [], foodLogs: [], goals: baseGoals(), today });
    expect(empty.status).toBe('calibrating');
    expect(empty.latestScaleKg).toBeNull();
    expect(empty.observedTdee).toBeNull();
    const single = computeAdaptiveTdee({
      weights: [weight(today, 70)],
      foodLogs: [],
      goals: baseGoals(),
      today,
    });
    expect(single.spanDays).toBe(0);
    expect(single.latestTrendKg).toBe(70);
    expect(single.observedTdee).toBeNull();
  });

  it('infers a deficit-implied TDEE above intake when losing weight, and exposes Mifflin estimate', () => {
    const foods: FoodLogEntry[] = [];
    for (let i = 0; i <= 20; i++) foods.push(food(iso(START, i), 2000));
    const weights = [0, 7, 14, 20].map((o, idx) => weight(iso(START, o), 80 - idx));
    const goals = baseGoals({
      profile: {
        sex: 'male',
        age: 30,
        weightKg: 80,
        heightCm: 180,
        activityMultiplier: 1.5,
        goalDeltaKcal: -500,
        proteinPerKg: 2,
      },
    });
    const r = computeAdaptiveTdee({ weights, foodLogs: foods, goals, today });
    expect(r.status).toBe('ready');
    expect(r.observedTdee!).toBeGreaterThan(2000);
    expect(r.weeklyRateKg!).toBeLessThan(0);
    expect(r.mifflinEstimate).toBe(Math.round((10 * 80 + 6.25 * 180 - 150 + 5) * 1.5));
  });
});

function readyResult(observedTdee: number): AdaptiveTdeeResult {
  return {
    status: 'ready',
    loggedFoodDays: 14,
    requiredFoodDays: 10,
    weighInDays: 6,
    requiredWeighInDays: 4,
    spanDays: 20,
    requiredSpanDays: 10,
    latestScaleKg: 75,
    latestTrendKg: 75,
    weeklyRateKg: -0.2,
    observedTdee,
    mifflinEstimate: 2400,
    weightSeries: [],
    tdeeSeries: [],
  };
}

function cyclingGoals(): UserGoals {
  const mk = (calories: number): DailyMacroTargets => ({
    calories,
    proteinG: 150,
    carbsG: Math.round((calories - 600 - 67 * 9) / 4),
    fatG: 67,
    fiberG: Math.round((calories / 1000) * 14),
  });
  const schedule: Record<WeekdayKey, DailyMacroTargets> = {
    mon: mk(1800),
    tue: mk(1800),
    wed: mk(1800),
    thu: mk(1800),
    fri: mk(1800),
    sat: mk(2600),
    sun: mk(2600),
  };
  const avg = computeWeeklyScheduleAverage(schedule);
  return baseGoals({
    targetMode: 'custom',
    weeklyCyclingEnabled: true,
    weeklySchedule: schedule,
    dailyCalories: avg.calories,
  });
}

describe('buildWeeklyCheckInProposal / applyWeeklyCheckInToGoals', () => {
  const now = 1_800_000_000_000;

  it('returns null while calibrating', () => {
    const r = { ...readyResult(2500), status: 'calibrating' as const, observedTdee: null, weeklyRateKg: null };
    expect(buildWeeklyCheckInProposal(baseGoals(), r, now)).toBeNull();
  });

  it('clamps to +200 of cycling average and rebases all Mon-Sun rows', () => {
    const goals = cyclingGoals();
    // flat schedule at 2000 avg for the spec scenario
    const flat = {} as Record<WeekdayKey, DailyMacroTargets>;
    for (const k of Object.keys(goals.weeklySchedule!) as WeekdayKey[]) {
      flat[k] = { calories: 2000, proteinG: 150, carbsG: 250, fatG: 67, fiberG: 28 };
    }
    const g = { ...goals, weeklySchedule: flat, dailyCalories: 2000, goalDeltaKcal: 0 };
    const p = buildWeeklyCheckInProposal(g, readyResult(2700), now)!;
    expect(p.currentBaselineCalories).toBe(2000);
    expect(p.proposedCalories).toBe(2200);
    expect(p.deltaCalories).toBe(200);
    expect(p.preservesCycling).toBe(true);
    expect(p.eligible).toBe(true);

    const next = applyWeeklyCheckInToGoals(g, p, now);
    expect(next.weeklyCyclingEnabled).toBe(true);
    expect(next.targetMode).toBe('custom');
    expect(next.lastCheckInAt).toBe(now);
    for (const k of Object.keys(flat) as WeekdayKey[]) {
      expect(next.weeklySchedule![k].calories).toBe(2200);
    }
    expect(next.dailyCalories).toBe(2200);
  });

  it('preserves relative weekday offsets when rebasing an uneven schedule', () => {
    const g = cyclingGoals();
    const avg = computeWeeklyScheduleAverage(g.weeklySchedule!).calories;
    const p = buildWeeklyCheckInProposal({ ...g, goalDeltaKcal: 0 }, readyResult(avg - 100), now)!;
    expect(p.deltaCalories).toBe(-100 + (p.proposedCalories - (avg - 100)));
    const next = applyWeeklyCheckInToGoals(g, p, now);
    expect(next.weeklySchedule!.mon.calories).toBe(1800 + p.deltaCalories);
    expect(next.weeklySchedule!.sat.calories).toBe(2600 + p.deltaCalories);
  });

  it('honours custom goalDeltaKcal (profile fallback and top-level override)', () => {
    const profile = {
      sex: 'male' as const,
      age: 30,
      weightKg: 75,
      heightCm: 175,
      activityMultiplier: 1.5,
      goalDeltaKcal: -300,
      proteinPerKg: 2,
    };
    const fromProfile = buildWeeklyCheckInProposal(
      baseGoals({ dailyCalories: 2400, profile }),
      readyResult(2600),
      now,
    )!;
    expect(fromProfile.proposedCalories).toBe(2300);
    const topLevel = buildWeeklyCheckInProposal(
      baseGoals({ dailyCalories: 2400, profile, goalDeltaKcal: -100 }),
      readyResult(2600),
      now,
    )!;
    expect(topLevel.proposedCalories).toBe(2500);
    expect(topLevel.preservesCycling).toBe(false);
    expect(topLevel.proposedMacros.proteinG).toBe(150);
    const applied = applyWeeklyCheckInToGoals(baseGoals({ dailyCalories: 2400, profile }), topLevel, now);
    expect(applied.dailyCalories).toBe(2500);
    expect(applied.weeklyCyclingEnabled).toBeUndefined();
  });

  it('is not eligible within 7 days of last check-in or dismissal', () => {
    const recent = buildWeeklyCheckInProposal(
      baseGoals({ lastCheckInDismissedAt: now - 3 * DAY }),
      readyResult(2100),
      now,
    )!;
    expect(recent.eligible).toBe(false);
    const old = buildWeeklyCheckInProposal(
      baseGoals({ lastCheckInAt: now - 8 * DAY }),
      readyResult(2100),
      now,
    )!;
    expect(old.eligible).toBe(true);
  });
});
