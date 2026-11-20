import { aggregateDailySummary } from '@/lib/nutrition/daily-summary';
import { resolveGoalsForDate } from '@/lib/nutrition/goals';
import type { FoodLogEntry, UserGoals } from '@/types/nutrition';

export type RangeDays = 7 | 14 | 30 | 90;

export interface RangeDay {
  date: string;
  /** True when at least one log entry exists for the date. */
  logged: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  targetFiber: number;
}

export interface Rolling7dSummary {
  loggedDays: number;
  avgCalories: number;
  avgTargetCalories: number;
  /** Sum of (intake - target) over logged days in the last 7 days. */
  netBalance: number;
}

export interface RangeAnalytics {
  /** Every calendar day in range (oldest → endDate), logged or not. */
  days: RangeDay[];
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  avgFiber: number;
  /** Mean per-day (cycling-aware) calorie target across ALL days in range. */
  avgTargetCalories: number;
  /** Intake minus target summed over logged days in the last 7 days; positive = above target. */
  weeklyNetBalance: number;
  /** Share of macro calories (4/4/9 kcal per g), 0-100, one decimal. All 0 when nothing logged. */
  macroPct: { protein: number; carbs: number; fat: number };
  proteinPerKg: number | null;
  fiberPer1000Kcal: number | null;
  rolling7dSummary: Rolling7dSummary;
}

export interface NutrientContributor {
  name: string;
  foodId: string;
  amount: number;
  sharePct: number;
  count: number;
}

function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function addDaysIso(date: string, n: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date;
  // Pure calendar arithmetic in UTC on the parsed parts; no local-time conversion involved.
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) + n * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * Range analytics over local-ISO calendar days.
 *
 * Intake averages (calories/macros/fiber) are taken over LOGGED days only, so skipped
 * days never drag the average toward zero. `days` still contains every day in range.
 * Targets are resolved per day (weekly cycling aware).
 */
export function computeRangeAnalytics(
  logs: FoodLogEntry[],
  goals: UserGoals,
  endDate: string,
  rangeDays: RangeDays,
  latestWeightKg?: number | null,
): RangeAnalytics {
  const byDate = new Map<string, FoodLogEntry[]>();
  for (const l of logs ?? []) {
    if (!l || typeof l.date !== 'string') continue;
    const arr = byDate.get(l.date);
    if (arr) arr.push(l);
    else byDate.set(l.date, [l]);
  }

  const days: RangeDay[] = [];
  for (let i = rangeDays - 1; i >= 0; i--) {
    const date = addDaysIso(endDate, -i);
    const dayLogs = byDate.get(date) ?? [];
    const g = resolveGoalsForDate(goals, date);
    const s = aggregateDailySummary(dayLogs, g);
    days.push({
      date,
      logged: dayLogs.length > 0,
      calories: s.calories.consumed,
      protein: s.protein.consumed,
      carbs: s.carbs.consumed,
      fat: s.fat.consumed,
      fiber: s.fiber.consumed,
      targetCalories: s.calories.target,
      targetProtein: s.protein.target,
      targetCarbs: s.carbs.target,
      targetFat: s.fat.target,
      targetFiber: s.fiber.target,
    });
  }

  const logged = days.filter((d) => d.logged);
  const mean = (pick: (d: RangeDay) => number): number =>
    logged.length > 0 ? logged.reduce((sum, d) => sum + pick(d), 0) / logged.length : 0;

  const avgCalories = mean((d) => d.calories);
  const avgProtein = mean((d) => d.protein);
  const avgCarbs = mean((d) => d.carbs);
  const avgFat = mean((d) => d.fat);
  const avgFiber = mean((d) => d.fiber);
  const avgTargetCalories =
    days.length > 0 ? days.reduce((sum, d) => sum + d.targetCalories, 0) / days.length : 0;

  const last7 = days.slice(-7);
  const last7Logged = last7.filter((d) => d.logged);
  const netBalance = last7Logged.reduce((sum, d) => sum + (d.calories - d.targetCalories), 0);
  const rolling7dSummary: Rolling7dSummary = {
    loggedDays: last7Logged.length,
    avgCalories:
      last7Logged.length > 0
        ? last7Logged.reduce((s, d) => s + d.calories, 0) / last7Logged.length
        : 0,
    avgTargetCalories:
      last7.length > 0 ? last7.reduce((s, d) => s + d.targetCalories, 0) / last7.length : 0,
    netBalance,
  };

  const pKcal = avgProtein * 4;
  const cKcal = avgCarbs * 4;
  const fKcal = avgFat * 9;
  const macroKcal = pKcal + cKcal + fKcal;
  const macroPct =
    macroKcal > 0
      ? {
          protein: round1((pKcal / macroKcal) * 100),
          carbs: round1((cKcal / macroKcal) * 100),
          fat: round1((fKcal / macroKcal) * 100),
        }
      : { protein: 0, carbs: 0, fat: 0 };

  const weight = isFiniteNum(latestWeightKg) && latestWeightKg > 0
    ? latestWeightKg
    : isFiniteNum(goals?.profile?.weightKg) && goals.profile!.weightKg > 0
      ? goals.profile!.weightKg
      : null;
  const proteinPerKg = weight !== null && logged.length > 0 ? avgProtein / weight : null;
  const fiberPer1000Kcal = avgCalories > 0 ? (avgFiber / avgCalories) * 1000 : null;

  return {
    days,
    avgCalories,
    avgProtein,
    avgCarbs,
    avgFat,
    avgFiber,
    avgTargetCalories,
    weeklyNetBalance: netBalance,
    macroPct,
    proteinPerKg,
    fiberPer1000Kcal,
    rolling7dSummary,
  };
}

/**
 * Ranks foods by total contribution of a nutrient (macro key such as `protein`, or a
 * micro key such as `sodiumMg`), grouped by foodId, descending by amount.
 *
 * `sharePct` is relative to the FULL total across all contributors, so when `limit`
 * truncates the list the returned shares sum to less than 100 (remainder = the rest).
 * Without truncation they sum to 100.
 */
export function computeNutrientContributors(
  logs: FoodLogEntry[],
  nutrientKey: string,
  limit?: number,
): NutrientContributor[] {
  const groups = new Map<string, NutrientContributor>();
  let total = 0;
  for (const l of logs ?? []) {
    const snap = l?.nutritionSnapshot as unknown as
      | (Record<string, unknown> & { micros?: Record<string, unknown> })
      | undefined;
    if (!snap) continue;
    const raw = snap.micros && nutrientKey in snap.micros ? snap.micros[nutrientKey] : snap[nutrientKey];
    if (!isFiniteNum(raw) || raw <= 0) continue;
    total += raw;
    const g = groups.get(l.foodId);
    if (g) {
      g.amount += raw;
      g.count += 1;
    } else {
      groups.set(l.foodId, { name: l.name, foodId: l.foodId, amount: raw, sharePct: 0, count: 1 });
    }
  }
  if (total <= 0) return [];
  const sorted = [...groups.values()]
    .map((g) => ({ ...g, sharePct: (g.amount / total) * 100 }))
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
  return isFiniteNum(limit) && limit >= 0 ? sorted.slice(0, limit) : sorted;
}

/**
 * Current streak counts consecutive logged days ending at the last dot. If the final
 * dot (today) is not yet logged it is skipped rather than breaking the streak.
 * `dots` must be ascending by date.
 */
export function computeLoggingStreak(
  dots: Array<{ date: string; hasLogs: boolean }>,
): { currentStreak: number; loggedCount: number; consistencyPct: number } {
  const list = dots ?? [];
  const loggedCount = list.filter((d) => d.hasLogs).length;
  let i = list.length - 1;
  if (i >= 0 && !list[i].hasLogs) i -= 1;
  let currentStreak = 0;
  while (i >= 0 && list[i].hasLogs) {
    currentStreak += 1;
    i -= 1;
  }
  const consistencyPct = list.length > 0 ? Math.round((loggedCount / list.length) * 100) : 0;
  return { currentStreak, loggedCount, consistencyPct };
}
