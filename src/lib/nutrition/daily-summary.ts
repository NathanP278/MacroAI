import type { FoodLogEntry, UserGoals } from '@/types/nutrition';
import { DEFAULT_RDA_MICROS } from '@/lib/nutrition/goals';

export type AdherenceStatus = 'under' | 'near' | 'over';

export interface MacroMetric {
  consumed: number;
  target: number;
  remaining: number;
  delta: number;
  percent: number;      // Clamped to 0..100 (ergonomic for progress bar widths)
  rawPercent: number;   // Unclamped percentage vs target (e.g. 110%)
  status: AdherenceStatus;
  overTarget: boolean;
}

export interface MicroMetric {
  key: string;
  name: string;
  unit: string;
  category: 'mineral' | 'vitamin';
  consumed: number;
  target: number;
  remaining: number;
  delta: number;
  percent: number;      // Clamped to 0..100
  rawPercent: number;   // Unclamped
  status: AdherenceStatus;
  overTarget: boolean;
}

export interface MicronutrientMeta {
  key: string;
  name: string;
  unit: string;
  category: 'mineral' | 'vitamin';
}

export interface DailySummary {
  calories: MacroMetric;
  protein: MacroMetric;
  carbs: MacroMetric;
  fat: MacroMetric;
  fiber: MacroMetric;
  micros: Record<string, MicroMetric>;
  logsCount: number;
}

export const RDA_MICRONUTRIENT_METADATA: Record<string, MicronutrientMeta> = {
  sodiumMg: { key: 'sodiumMg', name: 'Sodium', unit: 'mg', category: 'mineral' },
  potassiumMg: { key: 'potassiumMg', name: 'Potassium', unit: 'mg', category: 'mineral' },
  calciumMg: { key: 'calciumMg', name: 'Calcium', unit: 'mg', category: 'mineral' },
  ironMg: { key: 'ironMg', name: 'Iron', unit: 'mg', category: 'mineral' },
  magnesiumMg: { key: 'magnesiumMg', name: 'Magnesium', unit: 'mg', category: 'mineral' },
  zincMg: { key: 'zincMg', name: 'Zinc', unit: 'mg', category: 'mineral' },
  vitaminAMcg: { key: 'vitaminAMcg', name: 'Vitamin A', unit: 'mcg', category: 'vitamin' },
  vitaminCMg: { key: 'vitaminCMg', name: 'Vitamin C', unit: 'mg', category: 'vitamin' },
  vitaminDMcg: { key: 'vitaminDMcg', name: 'Vitamin D', unit: 'mcg', category: 'vitamin' },
  vitaminB6Mg: { key: 'vitaminB6Mg', name: 'Vitamin B6', unit: 'mg', category: 'vitamin' },
  vitaminB12Mcg: { key: 'vitaminB12Mcg', name: 'Vitamin B12', unit: 'mcg', category: 'vitamin' },
  folateMcg: { key: 'folateMcg', name: 'Folate', unit: 'mcg', category: 'vitamin' },
};

export function getMicronutrientMeta(key: string): MicronutrientMeta {
  if (RDA_MICRONUTRIENT_METADATA[key]) {
    return RDA_MICRONUTRIENT_METADATA[key];
  }

  // Graceful fallback for non-RDA or custom micronutrient keys
  const isVitamin = key.toLowerCase().includes('vitamin') || key.toLowerCase().includes('folate');
  const unit = key.endsWith('Mcg') ? 'mcg' : key.endsWith('Mg') ? 'mg' : 'g';
  const name = key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^(.)/, (s) => s.toUpperCase())
    .replace(/(Mg|Mcg)$/i, '')
    .trim();

  return {
    key,
    name,
    unit,
    category: isVitamin ? 'vitamin' : 'mineral',
  };
}

function safeNum(val: unknown): number {
  if (typeof val !== 'number' || !Number.isFinite(val) || Number.isNaN(val)) {
    return 0;
  }
  return Math.max(0, val);
}

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

function computeMetric(
  rawConsumed: number,
  rawTarget: number,
  isInteger = false
): {
  consumed: number;
  target: number;
  remaining: number;
  delta: number;
  percent: number;
  rawPercent: number;
  status: AdherenceStatus;
  overTarget: boolean;
} {
  const safeC = safeNum(rawConsumed);
  const safeT = safeNum(rawTarget);

  const consumed = isInteger ? Math.round(safeC) : round1(safeC);
  const target = isInteger ? Math.round(safeT) : round1(safeT);

  const delta = isInteger ? consumed - target : round1(consumed - target);
  const remaining = Math.max(0, isInteger ? target - consumed : round1(target - consumed));

  const rawPercent = target > 0 ? Math.round((consumed / target) * 100) : 0;
  const percent = Math.min(100, Math.max(0, rawPercent));

  const overTarget = consumed > target;
  let status: AdherenceStatus;
  if (overTarget) {
    status = 'over';
  } else if (target > 0 && consumed >= target * 0.9) {
    status = 'near';
  } else {
    status = 'under';
  }

  return {
    consumed,
    target,
    remaining,
    delta,
    percent,
    rawPercent,
    status,
    overTarget,
  };
}

/**
 * Aggregates daily logs against user targets into non-punitive, adherence-neutral metrics.
 */
export function aggregateDailySummary(
  logs: FoodLogEntry[] = [],
  goals?: Partial<UserGoals> | null
): DailySummary {
  const safeLogs = Array.isArray(logs) ? logs : [];

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;
  const microsSum: Record<string, number> = {};

  // Initialize all standard RDA micro sums to 0
  for (const key of Object.keys(DEFAULT_RDA_MICROS)) {
    microsSum[key] = 0;
  }

  for (const entry of safeLogs) {
    const snap = entry?.nutritionSnapshot;
    if (!snap) continue;

    totalCalories += safeNum(snap.calories);
    totalProtein += safeNum(snap.protein);
    totalCarbs += safeNum(snap.carbs);
    totalFat += safeNum(snap.fat);
    totalFiber += safeNum(snap.fiber);

    if (snap.micros && typeof snap.micros === 'object') {
      for (const [k, v] of Object.entries(snap.micros)) {
        if (v !== undefined) {
          microsSum[k] = (microsSum[k] ?? 0) + safeNum(v);
        }
      }
    }
  }

  // Safe goal targets
  const targetCalories = goals?.dailyCalories ?? 2000;
  const targetProtein = goals?.proteinG ?? 150;
  const targetCarbs = goals?.carbsG ?? 200;
  const targetFat = goals?.fatG ?? 65;
  const targetFiber = goals?.fiberG ?? 30;
  const microTargets = goals?.micronutrientTargets ?? DEFAULT_RDA_MICROS;

  const caloriesMetric = computeMetric(totalCalories, targetCalories, true);
  const proteinMetric = computeMetric(totalProtein, targetProtein, false);
  const carbsMetric = computeMetric(totalCarbs, targetCarbs, false);
  const fatMetric = computeMetric(totalFat, targetFat, false);
  const fiberMetric = computeMetric(totalFiber, targetFiber, false);

  // Micronutrients collection: standard 12 RDA plus any extras in targets or logs
  const allMicroKeys = new Set<string>([
    ...Object.keys(DEFAULT_RDA_MICROS),
    ...Object.keys(microTargets ?? {}),
    ...Object.keys(microsSum),
  ]);

  const micros: Record<string, MicroMetric> = {};

  for (const key of allMicroKeys) {
    const meta = getMicronutrientMeta(key);
    const consumed = microsSum[key] ?? 0;
    const target = microTargets?.[key] ?? DEFAULT_RDA_MICROS[key] ?? 0;
    const metric = computeMetric(consumed, target, false);

    micros[key] = {
      key,
      name: meta.name,
      unit: meta.unit,
      category: meta.category,
      ...metric,
    };
  }

  return {
    calories: caloriesMetric,
    protein: proteinMetric,
    carbs: carbsMetric,
    fat: fatMetric,
    fiber: fiberMetric,
    micros,
    logsCount: safeLogs.length,
  };
}
