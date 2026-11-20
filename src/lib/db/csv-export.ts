import { aggregateDailySummary } from '@/lib/nutrition/daily-summary';
import { resolveGoalsForDate } from '@/lib/nutrition/goals';
import type { FoodLogEntry, UserGoals, WeightLogEntry } from '@/types/nutrition';

const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;
const NEEDS_QUOTES_RE = /[",\r\n]/;
const KG_TO_LB = 2.2046226218;

const EXTENDED_MICRO_KEYS = [
  'sugarG',
  'addedSugarG',
  'saturatedFatG',
  'cholesterolMg',
  'caffeineMg',
  'alcoholG',
] as const;

const RDA_MICRO_KEYS = [
  'sodiumMg',
  'potassiumMg',
  'calciumMg',
  'ironMg',
  'magnesiumMg',
  'zincMg',
  'vitaminAMcg',
  'vitaminCMg',
  'vitaminDMcg',
  'vitaminB6Mg',
  'vitaminB12Mcg',
  'folateMcg',
] as const;

const REMAINING_RDA_MICRO_KEYS = RDA_MICRO_KEYS.filter(
  (key) => key !== 'sodiumMg' && key !== 'potassiumMg'
);

const FOOD_LOGS_HEADERS = [
  'date',
  'recordedAt',
  'id',
  'name',
  'source',
  'amount',
  'unit',
  'calories',
  'proteinG',
  'carbsG',
  'fatG',
  'fiberG',
  'netCarbsG',
  ...EXTENDED_MICRO_KEYS,
  ...RDA_MICRO_KEYS,
  'note',
] as const;

const DAILY_SUMMARY_HEADERS = [
  'date',
  'logsCount',
  'calories',
  'caloriesTarget',
  'caloriesDelta',
  'proteinG',
  'proteinTargetG',
  'carbsG',
  'carbsTargetG',
  'fatG',
  'fatTargetG',
  'fiberG',
  'fiberTargetG',
  'netCarbsG',
  ...EXTENDED_MICRO_KEYS,
  'sodiumMg',
  'potassiumMg',
  'potassiumSodiumRatio',
  ...REMAINING_RDA_MICRO_KEYS,
] as const;

const WEIGHT_LOGS_HEADERS = [
  'date',
  'recordedAt',
  'id',
  'weightKg',
  'weightLb',
  'source',
  'note',
] as const;

function round1(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toIsoTimestamp(ms: number | undefined): string {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) {
    return '';
  }
  return new Date(ms).toISOString();
}

function serializeCsv(headers: readonly string[], rows: readonly unknown[][]): string {
  const allRows = [headers, ...rows];
  return allRows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}

/**
 * Escapes a single CSV cell according to RFC 4180 and neutralizes leading
 * spreadsheet formula-injection characters (`=`, `+`, `-`, `@`, `\t`, `\r`)
 * on string values while preserving finite numeric literals (including negatives).
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return '';
    }
    return Object.is(value, -0) ? '0' : String(value);
  }

  const str = String(value);
  const neutralized = FORMULA_PREFIX_RE.test(str) ? `'${str}` : str;
  const needsQuotes = neutralized !== str || NEEDS_QUOTES_RE.test(neutralized);

  if (!needsQuotes) {
    return neutralized;
  }

  return `"${neutralized.replace(/"/g, '""')}"`;
}

/**
 * Builds a chronologically ordered, formula-safe CSV of all logged food entries.
 */
export function buildFoodLogsCsv(logs: FoodLogEntry[]): string {
  const ordered = [...(logs ?? [])].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.createdAt ?? 0) - (b.createdAt ?? 0) ||
      a.id.localeCompare(b.id)
  );

  const allMicroKeys = [...EXTENDED_MICRO_KEYS, ...RDA_MICRO_KEYS];

  const rows = ordered.map((entry) => {
    const snap = entry.nutritionSnapshot;
    const carbs = Number.isFinite(snap?.carbs) ? snap.carbs : 0;
    const fiber = Number.isFinite(snap?.fiber) ? snap.fiber : 0;
    const netCarbsG = Math.max(0, round1(carbs - fiber));
    const micros = snap?.micros;

    return [
      entry.date,
      toIsoTimestamp(entry.createdAt),
      entry.id,
      entry.name,
      entry.source,
      entry.amount,
      entry.unit,
      snap?.calories ?? 0,
      snap?.protein ?? 0,
      carbs,
      snap?.fat ?? 0,
      fiber,
      netCarbsG,
      ...allMicroKeys.map((key) => {
        const val = micros?.[key];
        return typeof val === 'number' && Number.isFinite(val) ? val : '';
      }),
      entry.note ?? '',
    ];
  });

  return serializeCsv(FOOD_LOGS_HEADERS, rows);
}

/**
 * Builds a chronologically ordered CSV summarizing daily consumed macros, micros,
 * resolved weekday-cycling targets, calorie deltas, Net Carbs, and K:Na ratio.
 */
export function buildDailySummaryCsv(
  logs: FoodLogEntry[],
  goals: UserGoals
): string {
  const logsByDate = new Map<string, FoodLogEntry[]>();

  for (const entry of logs ?? []) {
    if (!entry?.date) continue;
    const bucket = logsByDate.get(entry.date);
    if (bucket) {
      bucket.push(entry);
    } else {
      logsByDate.set(entry.date, [entry]);
    }
  }

  const orderedDates = [...logsByDate.keys()].sort((a, b) => a.localeCompare(b));

  const rows = orderedDates.map((date) => {
    const dayLogs = logsByDate.get(date) ?? [];
    const dayGoals = resolveGoalsForDate(goals, date);
    const summary = aggregateDailySummary(dayLogs, dayGoals);

    const netCarbsG = Math.max(
      0,
      round1(summary.carbs.consumed - summary.fiber.consumed)
    );
    const sodiumMg = summary.micros.sodiumMg?.consumed ?? 0;
    const potassiumMg = summary.micros.potassiumMg?.consumed ?? 0;
    const potassiumSodiumRatio =
      sodiumMg > 0 ? round2(potassiumMg / sodiumMg) : '';

    return [
      date,
      summary.logsCount,
      summary.calories.consumed,
      summary.calories.target,
      summary.calories.delta,
      summary.protein.consumed,
      summary.protein.target,
      summary.carbs.consumed,
      summary.carbs.target,
      summary.fat.consumed,
      summary.fat.target,
      summary.fiber.consumed,
      summary.fiber.target,
      netCarbsG,
      ...EXTENDED_MICRO_KEYS.map((key) => summary.micros[key]?.consumed ?? 0),
      sodiumMg,
      potassiumMg,
      potassiumSodiumRatio,
      ...REMAINING_RDA_MICRO_KEYS.map((key) => summary.micros[key]?.consumed ?? 0),
    ];
  });

  return serializeCsv(DAILY_SUMMARY_HEADERS, rows);
}

/**
 * Builds a chronologically ordered, formula-safe CSV of weigh-in records.
 */
export function buildWeightLogsCsv(weights: WeightLogEntry[]): string {
  const ordered = [...(weights ?? [])].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.recordedAt.localeCompare(b.recordedAt) ||
      (a.createdAt ?? 0) - (b.createdAt ?? 0) ||
      a.id.localeCompare(b.id)
  );

  const rows = ordered.map((entry) => [
    entry.date,
    entry.recordedAt,
    entry.id,
    round2(entry.weightKg),
    round2(entry.weightKg * KG_TO_LB),
    entry.source,
    entry.note ?? '',
  ]);

  return serializeCsv(WEIGHT_LOGS_HEADERS, rows);
}
