import {
  WEEKDAY_KEYS,
  calculateMifflinStJeorTargets,
  computeWeeklyScheduleAverage,
  resolveGoalsForDate,
} from '@/lib/nutrition/goals';
import type {
  DailyMacroTargets,
  FoodLogEntry,
  UserGoals,
  WeekdayKey,
  WeightLogEntry,
} from '@/types/nutrition';

export interface DailyWeightPoint {
  date: string;
  scaleKg: number;
  trendKg: number;
  entryId: string;
}

export interface TdeeSeriesPoint {
  date: string;
  observedTdee: number;
  avgCalories: number;
}

export interface AdaptiveTdeeResult {
  status: 'calibrating' | 'ready';
  loggedFoodDays: number;
  requiredFoodDays: 10;
  weighInDays: number;
  requiredWeighInDays: 4;
  spanDays: number;
  requiredSpanDays: 10;
  latestScaleKg: number | null;
  latestTrendKg: number | null;
  weeklyRateKg: number | null;
  observedTdee: number | null;
  mifflinEstimate: number | null;
  weightSeries: DailyWeightPoint[];
  tdeeSeries: TdeeSeriesPoint[];
}

export interface WeeklyCheckInProposal {
  eligible: boolean;
  observedTdee: number;
  weeklyRateKg: number;
  currentBaselineCalories: number;
  proposedCalories: number;
  deltaCalories: number;
  proposedMacros: DailyMacroTargets;
  proposedSchedule?: Record<WeekdayKey, DailyMacroTargets>;
  preservesCycling: boolean;
}

const EMA_ALPHA_PER_DAY = 0.1;
const WINDOW_DAYS = 21;
const MIN_FOOD_DAYS = 10;
const MIN_WEIGH_INS = 4;
const MIN_SPAN_DAYS = 10;
const PARTIAL_DAY_RATIO = 0.4;
const KCAL_PER_KG = 7700;
const TDEE_MIN = 1000;
const TDEE_MAX = 6000;
const MAX_WEEKLY_SHIFT = 200;
const MIN_TARGET_CALORIES = 500;
const CHECK_IN_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function roundTo10(v: number): number {
  return Math.round(v / 10) * 10;
}

function parseIso(date: string): number | null {
  const m = typeof date === 'string' ? date.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function dayDiff(from: string, to: string): number {
  const a = parseIso(from);
  const b = parseIso(to);
  if (a === null || b === null) return 0;
  return Math.round((b - a) / 86_400_000);
}

function addDays(date: string, n: number): string {
  const t = parseIso(date);
  if (t === null) return date;
  return new Date(t + n * 86_400_000).toISOString().slice(0, 10);
}

/** Local calendar date (YYYY-MM-DD) for a timestamp, avoiding UTC drift. */
function localIso(now: number): string {
  const d = new Date(now);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Picks the latest-created weigh-in per calendar date; returns ascending by date.
 * trendKg is seeded with scaleKg (see computeEmaTrendSeries).
 */
export function resolveDailyWeights(entries: WeightLogEntry[]): DailyWeightPoint[] {
  const byDate = new Map<string, WeightLogEntry>();
  for (const e of entries ?? []) {
    if (!e || !isFiniteNum(e.weightKg) || e.weightKg <= 0) continue;
    if (parseIso(e.date) === null) continue;
    const prev = byDate.get(e.date);
    if (!prev || (e.createdAt ?? 0) >= (prev.createdAt ?? 0)) {
      byDate.set(e.date, e);
    }
  }
  return [...byDate.values()]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((e) => ({
      date: e.date,
      scaleKg: e.weightKg,
      trendKg: e.weightKg,
      entryId: e.id,
    }));
}

/**
 * Time-adjusted EMA: alphaEff = 1 - (1 - 0.1)^deltaDays, so gaps weigh more.
 */
export function computeEmaTrendSeries(points: DailyWeightPoint[]): DailyWeightPoint[] {
  const out: DailyWeightPoint[] = [];
  let trend: number | null = null;
  let prevDate: string | null = null;
  for (const p of points ?? []) {
    if (!isFiniteNum(p.scaleKg)) continue;
    if (trend === null || prevDate === null) {
      trend = p.scaleKg;
    } else {
      const delta = Math.max(1, dayDiff(prevDate, p.date));
      const alphaEff = 1 - Math.pow(1 - EMA_ALPHA_PER_DAY, delta);
      trend = trend + alphaEff * (p.scaleKg - trend);
    }
    prevDate = p.date;
    out.push({ ...p, trendKg: trend });
  }
  return out;
}

interface WindowCalc {
  loggedFoodDays: number;
  weighInDays: number;
  spanDays: number;
  avgCalories: number | null;
  observedTdee: number | null;
  weeklyRateKg: number | null;
  ready: boolean;
}

function computeWindow(
  endDate: string,
  series: DailyWeightPoint[],
  dayKcal: Map<string, number>,
  goals: UserGoals,
): WindowCalc {
  const startDate = addDays(endDate, -(WINDOW_DAYS - 1));

  let foodDays = 0;
  let kcalSum = 0;
  for (const [date, kcal] of dayKcal) {
    if (date < startDate || date > endDate) continue;
    const target = resolveGoalsForDate(goals, date).dailyCalories;
    const threshold = isFiniteNum(target) ? PARTIAL_DAY_RATIO * target : 0;
    if (kcal > 0 && kcal >= threshold) {
      foodDays += 1;
      kcalSum += kcal;
    }
  }

  const win = series.filter((p) => p.date >= startDate && p.date <= endDate);
  const first = win[0];
  const last = win[win.length - 1];
  const spanDays = first && last ? dayDiff(first.date, last.date) : 0;
  const avgCalories = foodDays > 0 ? kcalSum / foodDays : null;

  let observedTdee: number | null = null;
  let weeklyRateKg: number | null = null;
  if (first && last && spanDays > 0) {
    const deltaTrend = last.trendKg - first.trendKg;
    weeklyRateKg = (deltaTrend / spanDays) * 7;
    if (avgCalories !== null) {
      const raw = avgCalories - (deltaTrend / spanDays) * KCAL_PER_KG;
      if (Number.isFinite(raw)) observedTdee = clamp(raw, TDEE_MIN, TDEE_MAX);
    }
  }
  if (weeklyRateKg !== null && !Number.isFinite(weeklyRateKg)) weeklyRateKg = null;

  const ready =
    foodDays >= MIN_FOOD_DAYS &&
    win.length >= MIN_WEIGH_INS &&
    spanDays >= MIN_SPAN_DAYS &&
    observedTdee !== null;

  return {
    loggedFoodDays: foodDays,
    weighInDays: win.length,
    spanDays,
    avgCalories,
    observedTdee,
    weeklyRateKg,
    ready,
  };
}

export function computeAdaptiveTdee(input: {
  weights: WeightLogEntry[];
  foodLogs: FoodLogEntry[];
  goals: UserGoals;
  /** Local ISO date (YYYY-MM-DD) the trailing window ends on. */
  today: string;
}): AdaptiveTdeeResult {
  const { weights, foodLogs, goals, today } = input;
  const series = computeEmaTrendSeries(resolveDailyWeights(weights ?? []));

  const dayKcal = new Map<string, number>();
  for (const f of foodLogs ?? []) {
    const kcal = f?.nutritionSnapshot?.calories;
    if (!f || !isFiniteNum(kcal) || parseIso(f.date) === null) continue;
    dayKcal.set(f.date, (dayKcal.get(f.date) ?? 0) + kcal);
  }

  const profile = goals?.profile;
  const mifflinEstimate = profile
    ? calculateMifflinStJeorTargets({ ...profile, goalDeltaKcal: 0 }).dailyCalories
    : null;

  const endDate = parseIso(today) !== null ? today : (series[series.length - 1]?.date ?? today);
  const calc = computeWindow(endDate, series, dayKcal, goals);

  const tdeeSeries: TdeeSeriesPoint[] = [];
  for (const p of series) {
    const c = computeWindow(p.date, series, dayKcal, goals);
    if (c.ready && c.observedTdee !== null && c.avgCalories !== null) {
      tdeeSeries.push({
        date: p.date,
        observedTdee: c.observedTdee,
        avgCalories: c.avgCalories,
      });
    }
  }

  const latest = series[series.length - 1];
  return {
    status: calc.ready ? 'ready' : 'calibrating',
    loggedFoodDays: calc.loggedFoodDays,
    requiredFoodDays: MIN_FOOD_DAYS,
    weighInDays: calc.weighInDays,
    requiredWeighInDays: MIN_WEIGH_INS,
    spanDays: calc.spanDays,
    requiredSpanDays: MIN_SPAN_DAYS,
    latestScaleKg: latest ? latest.scaleKg : null,
    latestTrendKg: latest ? latest.trendKg : null,
    weeklyRateKg: calc.ready ? calc.weeklyRateKg : null,
    observedTdee: calc.ready ? calc.observedTdee : null,
    mifflinEstimate,
    weightSeries: series,
    tdeeSeries,
  };
}

function resolveGoalDelta(goals: UserGoals): number {
  const v = goals.goalDeltaKcal ?? goals.profile?.goalDeltaKcal ?? 0;
  return isFiniteNum(v) ? v : 0;
}

/** Shifts a day's calories by delta, scaling fat, holding protein, carbs absorb the rest. */
function rebaseTargets(
  row: DailyMacroTargets,
  delta: number,
  proteinG: number = row.proteinG,
): DailyMacroTargets {
  const calories = Math.round(Math.max(MIN_TARGET_CALORIES, row.calories + delta));
  const ratio = row.calories > 0 ? calories / row.calories : 1;
  const fatG = Math.max(0, Math.round(row.fatG * ratio));
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));
  return {
    calories,
    proteinG,
    carbsG,
    fatG,
    fiberG: Math.max(0, Math.round((calories / 1000) * 14)),
  };
}

export function buildWeeklyCheckInProposal(
  goals: UserGoals,
  result: AdaptiveTdeeResult,
  now: number,
): WeeklyCheckInProposal | null {
  if (
    result.status !== 'ready' ||
    !isFiniteNum(result.observedTdee) ||
    !isFiniteNum(result.weeklyRateKg)
  ) {
    return null;
  }

  const cycling = !!goals.weeklyCyclingEnabled && !!goals.weeklySchedule;
  const avg = cycling ? computeWeeklyScheduleAverage(goals.weeklySchedule!) : null;
  const baseline = avg ? avg.calories : goals.dailyCalories;
  if (!isFiniteNum(baseline)) return null;

  const lastTouch = Math.max(goals.lastCheckInAt ?? 0, goals.lastCheckInDismissedAt ?? 0);
  const eligible = now - lastTouch >= CHECK_IN_INTERVAL_MS;

  const goalDelta = resolveGoalDelta(goals);
  const target = roundTo10(result.observedTdee + goalDelta);
  const proposedCalories = clamp(target, baseline - MAX_WEEKLY_SHIFT, baseline + MAX_WEEKLY_SHIFT);
  const deltaCalories = proposedCalories - baseline;

  const current: DailyMacroTargets = avg ?? {
    calories: goals.dailyCalories,
    proteinG: goals.proteinG,
    carbsG: goals.carbsG,
    fatG: goals.fatG,
    fiberG: goals.fiberG,
  };

  let proteinG: number;
  if (goals.targetMode !== 'custom' && goals.profile) {
    proteinG = Math.round(goals.profile.weightKg * goals.profile.proteinPerKg);
  } else {
    const ratio = current.calories > 0 ? proposedCalories / current.calories : 1;
    proteinG = Math.round(current.proteinG * ratio);
  }
  const fatFloor = Math.round((proposedCalories * 0.2) / 9);
  const fatScaled = Math.round(
    current.calories > 0 ? current.fatG * (proposedCalories / current.calories) : fatFloor,
  );
  const fatG = Math.max(fatFloor, fatScaled);
  const carbsG = Math.max(0, Math.round((proposedCalories - proteinG * 4 - fatG * 9) / 4));
  const proposedMacros: DailyMacroTargets = {
    calories: proposedCalories,
    proteinG,
    carbsG,
    fatG,
    fiberG: Math.round((proposedCalories / 1000) * 14),
  };

  let proposedSchedule: Record<WeekdayKey, DailyMacroTargets> | undefined;
  if (cycling) {
    proposedSchedule = {} as Record<WeekdayKey, DailyMacroTargets>;
    for (const key of WEEKDAY_KEYS) {
      const row = goals.weeklySchedule![key];
      if (row) proposedSchedule[key] = rebaseTargets(row, deltaCalories);
    }
  }

  return {
    eligible,
    observedTdee: result.observedTdee,
    weeklyRateKg: result.weeklyRateKg,
    currentBaselineCalories: baseline,
    proposedCalories,
    deltaCalories,
    proposedMacros,
    proposedSchedule,
    preservesCycling: cycling,
  };
}

export function applyWeeklyCheckInToGoals(
  goals: UserGoals,
  proposal: WeeklyCheckInProposal,
  now: number,
): UserGoals {
  const delta = proposal.deltaCalories;

  let weeklySchedule = goals.weeklySchedule;
  if (goals.weeklySchedule) {
    const next = { ...goals.weeklySchedule };
    for (const key of WEEKDAY_KEYS) {
      const row = goals.weeklySchedule[key];
      if (row) next[key] = proposal.proposedSchedule?.[key] ?? rebaseTargets(row, delta);
    }
    weeklySchedule = next;
  }

  let top: DailyMacroTargets;
  if (proposal.preservesCycling && proposal.proposedSchedule) {
    top = computeWeeklyScheduleAverage(proposal.proposedSchedule);
  } else if (proposal.preservesCycling && weeklySchedule) {
    top = computeWeeklyScheduleAverage(weeklySchedule);
  } else {
    top = proposal.proposedMacros;
  }

  return {
    ...goals,
    dailyCalories: top.calories,
    proteinG: top.proteinG,
    carbsG: top.carbsG,
    fatG: top.fatG,
    fiberG: top.fiberG,
    ...(weeklySchedule ? { weeklySchedule } : {}),
    lastCheckInAt: now,
    updatedAt: now,
  };
}

export { localIso as toLocalIsoDate };
