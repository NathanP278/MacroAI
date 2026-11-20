'use client';

import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Activity, BarChart3, Plus, Scale } from 'lucide-react';
import { db } from '@/lib/db/macroai-db';
import { DEFAULT_RDA_MICROS, resolveGoalsForDate } from '@/lib/nutrition/goals';
import { aggregateDailySummary } from '@/lib/nutrition/daily-summary';
import {
  buildWeeklyCheckInProposal,
  computeAdaptiveTdee,
  toLocalIsoDate,
  type AdaptiveTdeeResult,
} from '@/lib/nutrition/adaptive-tdee';
import { computeRangeAnalytics, type RangeDays } from '@/lib/nutrition/analytics';
import { AppShell } from '@/components/shell/app-shell';
import { SettingsHeaderLink } from '@/components/shell/settings-header-link';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { WeightTrendChart } from '@/components/trends/weight-trend-chart';
import { TdeeChart } from '@/components/trends/tdee-chart';
import { IntakeTrendChart } from '@/components/trends/intake-trend-chart';
import { WeeklyCheckInCard } from '@/components/trends/weekly-checkin-card';
import { WeightHistoryList } from '@/components/trends/weight-history-list';
import { formatInt, formatWeight } from '@/components/trends/chart-utils';
import { MicronutrientPanel } from '@/components/dashboard/micronutrient-panel';
import { WeighInDrawer } from '@/components/weight/weigh-in-drawer';
import { triggerHaptic } from '@/lib/motion';
import type { FoodLogEntry, UserGoals, WeightLogEntry } from '@/types/nutrition';

const RANGE_OPTIONS = [
  { value: '7', label: '7D' },
  { value: '14', label: '14D' },
  { value: '30', label: '30D' },
  { value: '90', label: '90D' },
] as const;

const INTAKE_MODE_OPTIONS = [
  { value: 'calories', label: 'Calories' },
  { value: 'macros', label: 'Macros' },
] as const;

function offsetIsoDate(iso: string, dayOffset: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + dayOffset);
  const nextY = date.getFullYear();
  const nextM = String(date.getMonth() + 1).padStart(2, '0');
  const nextD = String(date.getDate()).padStart(2, '0');
  return `${nextY}-${nextM}-${nextD}`;
}

function computeRollingWeeklySummary(logs: FoodLogEntry[], goals: UserGoals) {
  const loggedDays = new Set(logs.map((l) => l.date)).size;
  if (loggedDays <= 1) {
    return aggregateDailySummary(logs, goals);
  }
  const factor = 1 / loggedDays;
  const scaled: FoodLogEntry[] = logs.map((l) => {
    const snap = l.nutritionSnapshot;
    const scaledMicros: Record<string, number> = {};
    if (snap?.micros) {
      for (const [k, v] of Object.entries(snap.micros)) {
        if (typeof v === 'number' && Number.isFinite(v)) {
          scaledMicros[k] = v * factor;
        }
      }
    }
    return {
      ...l,
      nutritionSnapshot: {
        calories: (snap?.calories ?? 0) * factor,
        protein: (snap?.protein ?? 0) * factor,
        carbs: (snap?.carbs ?? 0) * factor,
        fat: (snap?.fat ?? 0) * factor,
        fiber: (snap?.fiber ?? 0) * factor,
        micros: scaledMicros,
      },
    };
  });
  return aggregateDailySummary(scaled, goals);
}

function formatSignedKcal(val: number): string {
  const rounded = Math.round(val);
  if (rounded > 0) return `+${formatInt(rounded)}`;
  if (rounded < 0) return `-${formatInt(Math.abs(rounded))}`;
  return '0';
}

export default function TrendsPage() {
  const [nowMs] = useState(() => Date.now());
  const today = useMemo(() => toLocalIsoDate(nowMs), [nowMs]);
  const queryStartDate = useMemo(() => offsetIsoDate(today, -89), [today]);

  const [rangeStr, setRangeStr] = useState<'7' | '14' | '30' | '90'>('30');
  const [intakeMode, setIntakeMode] = useState<'calories' | 'macros'>('calories');
  const [isWeighInOpen, setIsWeighInOpen] = useState(false);
  const [editingWeight, setEditingWeight] = useState<WeightLogEntry | null>(null);

  const rangeDays = Number(rangeStr) as RangeDays;
  const rangeStartDate = useMemo(
    () => offsetIsoDate(today, -(rangeDays - 1)),
    [today, rangeDays],
  );
  const weekStartDate = useMemo(() => offsetIsoDate(today, -6), [today]);

  const foodLogs = useLiveQuery(
    () =>
      db.foodLogs
        .where('date')
        .between(queryStartDate, today, true, true)
        .toArray(),
    [queryStartDate, today],
  );

  const weightLogs = useLiveQuery(() => db.weightLogs.toArray(), []);
  const userGoals = useLiveQuery(() => db.userGoals.get('active'), []);

  const fallbackGoals: UserGoals = useMemo(
    () => ({
      id: 'active',
      dailyCalories: 2000,
      proteinG: 150,
      carbsG: 200,
      fatG: 65,
      fiberG: 30,
      micronutrientTargets: { ...DEFAULT_RDA_MICROS },
      mealSlots: [],
      weightUnit: 'kg',
      updatedAt: 0,
    }),
    [],
  );

  const activeGoals = userGoals ?? fallbackGoals;
  const weightUnit: 'kg' | 'lb' = activeGoals.weightUnit === 'lb' ? 'lb' : 'kg';

  const safeFoodLogs = useMemo(() => foodLogs ?? [], [foodLogs]);
  const safeWeightLogs = useMemo(() => weightLogs ?? [], [weightLogs]);

  const adaptive = useMemo(
    () =>
      computeAdaptiveTdee({
        weights: safeWeightLogs,
        foodLogs: safeFoodLogs,
        goals: activeGoals,
        today,
      }),
    [safeWeightLogs, safeFoodLogs, activeGoals, today],
  );

  const proposal = useMemo(
    () => buildWeeklyCheckInProposal(activeGoals, adaptive, nowMs),
    [activeGoals, adaptive, nowMs],
  );

  const analytics = useMemo(
    () =>
      computeRangeAnalytics(
        safeFoodLogs,
        activeGoals,
        today,
        rangeDays,
        adaptive.latestTrendKg,
      ),
    [safeFoodLogs, activeGoals, today, rangeDays, adaptive.latestTrendKg],
  );

  const visibleWeightPoints = useMemo(
    () =>
      adaptive.weightSeries.filter(
        (p) => p.date >= rangeStartDate && p.date <= today,
      ),
    [adaptive.weightSeries, rangeStartDate, today],
  );

  const rangedAdaptive: AdaptiveTdeeResult = useMemo(() => {
    if (adaptive.status !== 'ready') return adaptive;
    const filtered = adaptive.tdeeSeries.filter(
      (p) => p.date >= rangeStartDate && p.date <= today,
    );
    return {
      ...adaptive,
      tdeeSeries: filtered.length > 0 ? filtered : adaptive.tdeeSeries,
    };
  }, [adaptive, rangeStartDate, today]);

  const todayLogs = useMemo(
    () => safeFoodLogs.filter((l) => l.date === today),
    [safeFoodLogs, today],
  );

  const weeklyLogs = useMemo(
    () => safeFoodLogs.filter((l) => l.date >= weekStartDate && l.date <= today),
    [safeFoodLogs, weekStartDate, today],
  );

  const todaySummary = useMemo(
    () => aggregateDailySummary(todayLogs, resolveGoalsForDate(activeGoals, today)),
    [todayLogs, activeGoals, today],
  );

  const weeklyMicroSummary = useMemo(
    () => computeRollingWeeklySummary(weeklyLogs, activeGoals),
    [weeklyLogs, activeGoals],
  );

  const openNewWeighIn = () => {
    triggerHaptic(8);
    setEditingWeight(null);
    setIsWeighInOpen(true);
  };

  const openEditWeighIn = (entry: WeightLogEntry) => {
    setEditingWeight(entry);
    setIsWeighInOpen(true);
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-5 sm:gap-6 px-4 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-8">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Trends
            </h1>
            <p className="text-xs sm:text-[13px] text-muted-foreground mt-0.5">
              Weight trend, observed expenditure &amp; multi-day nutrition
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              role="group"
              ariaLabel="Analytics time range"
              value={rangeStr}
              onChange={(next) => {
                triggerHaptic(6);
                setRangeStr(next);
              }}
              className="bg-card border border-border/50 p-0.5"
              buttonClassName="px-2.5 py-1 text-xs"
              options={RANGE_OPTIONS}
            />

            <button
              type="button"
              onClick={openNewWeighIn}
              className="touch-target tactile-press inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold hover:opacity-90 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Weigh In</span>
            </button>

            <SettingsHeaderLink />
          </div>
        </header>

        {/* Responsive 12-Column Obsidian Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 lg:gap-6 items-start animate-card-enter">
          {/* Weekly Check-In Card (only when eligible) */}
          {proposal?.eligible && (
            <div className="md:col-span-12">
              <WeeklyCheckInCard
                goals={activeGoals}
                proposal={proposal}
                unit={weightUnit}
              />
            </div>
          )}

          {/* Summary Telemetry Strip */}
          <div className="md:col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Weekly Calorie Bank */}
            <div className="bg-card border border-border/50 rounded-2xl p-3.5 sm:p-4 space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Weekly Calorie Bank
              </div>
              <div className="text-lg sm:text-xl font-bold tabular-nums text-foreground">
                {formatSignedKcal(analytics.weeklyNetBalance)}{' '}
                <span className="text-xs font-normal text-muted-foreground">kcal</span>
              </div>
              <div className="text-[11px] text-muted-foreground tabular-nums">
                Last 7D ({analytics.rolling7dSummary.loggedDays}/7 logged)
              </div>
            </div>

            {/* Daily Avg Intake */}
            <div className="bg-card border border-border/50 rounded-2xl p-3.5 sm:p-4 space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Daily Avg Intake
              </div>
              <div className="text-lg sm:text-xl font-bold tabular-nums text-foreground">
                {formatInt(analytics.avgCalories)}{' '}
                <span className="text-xs font-normal text-muted-foreground">kcal</span>
              </div>
              <div className="text-[11px] text-muted-foreground tabular-nums">
                Target avg {formatInt(analytics.avgTargetCalories)} kcal
              </div>
            </div>

            {/* Macro Split % */}
            <div className="bg-card border border-border/50 rounded-2xl p-3.5 sm:p-4 space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Macro Split
              </div>
              <div className="text-sm sm:text-base font-bold tabular-nums flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-0.5">
                <span style={{ color: 'var(--macro-protein)' }}>
                  {Math.round(analytics.macroPct.protein)}% P
                </span>
                <span style={{ color: 'var(--macro-carbs)' }}>
                  {Math.round(analytics.macroPct.carbs)}% C
                </span>
                <span style={{ color: 'var(--macro-fat)' }}>
                  {Math.round(analytics.macroPct.fat)}% F
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground tabular-nums">
                {Math.round(analytics.avgProtein)}P · {Math.round(analytics.avgCarbs)}C ·{' '}
                {Math.round(analytics.avgFat)}F g/day
              </div>
            </div>

            {/* Protein g/kg & Fiber / 1000 kcal */}
            <div className="bg-card border border-border/50 rounded-2xl p-3.5 sm:p-4 space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Density &amp; Protein
              </div>
              <div className="text-lg sm:text-xl font-bold tabular-nums text-foreground">
                {analytics.proteinPerKg !== null
                  ? `${analytics.proteinPerKg.toFixed(2)}`
                  : '—'}{' '}
                <span className="text-xs font-normal text-muted-foreground">g/kg</span>
              </div>
              <div className="text-[11px] text-muted-foreground tabular-nums">
                Fiber{' '}
                {analytics.fiberPer1000Kcal !== null
                  ? `${analytics.fiberPer1000Kcal.toFixed(1)} g / 1000 kcal`
                  : '—'}
              </div>
            </div>
          </div>

          {/* Weight Trend Chart */}
          <section className="md:col-span-7 bg-card border border-border/50 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[var(--macro-fiber)]/15 flex items-center justify-center text-[var(--macro-fiber)] shrink-0">
                  <Scale className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-foreground tracking-tight">
                    Weight &amp; EMA Trend
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Smoothed trend line &amp; scale weigh-ins ({rangeDays}D)
                  </p>
                </div>
              </div>
              {adaptive.latestTrendKg !== null && (
                <div className="text-right tabular-nums shrink-0">
                  <div
                    className="text-sm font-bold"
                    style={{ color: 'var(--macro-calories)' }}
                  >
                    {formatWeight(adaptive.latestTrendKg, weightUnit)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">EMA trend</div>
                </div>
              )}
            </div>

            <WeightTrendChart points={visibleWeightPoints} unit={weightUnit} />
          </section>

          {/* Observed TDEE Chart */}
          <section className="md:col-span-5 bg-card border border-border/50 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[var(--macro-calories)]/15 flex items-center justify-center text-[var(--macro-calories)] shrink-0">
                  <Activity className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-foreground tracking-tight">
                    Observed TDEE
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Rolling 21-day expenditure estimate
                  </p>
                </div>
              </div>
              {adaptive.status === 'ready' && adaptive.observedTdee !== null && (
                <div className="text-right tabular-nums shrink-0">
                  <div className="text-sm font-bold text-foreground">
                    {formatInt(adaptive.observedTdee)}{' '}
                    <span className="text-[11px] font-normal text-muted-foreground">kcal</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">Observed</div>
                </div>
              )}
            </div>

            <TdeeChart result={rangedAdaptive} />
          </section>

          {/* Multi-Day Intake Trend Chart */}
          <section className="md:col-span-12 bg-card border border-border/50 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[var(--macro-carbs)]/15 flex items-center justify-center text-[var(--macro-carbs)] shrink-0">
                  <BarChart3 className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-foreground tracking-tight">
                    Intake History
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Daily intake vs cycling-aware target ({rangeDays}D)
                  </p>
                </div>
              </div>

              <SegmentedControl
                role="group"
                ariaLabel="Intake chart display mode"
                value={intakeMode}
                onChange={(next) => {
                  triggerHaptic(6);
                  setIntakeMode(next);
                }}
                className="bg-surface-sub p-0.5"
                buttonClassName="px-2.5 py-1 text-[11px]"
                options={INTAKE_MODE_OPTIONS}
              />
            </div>

            <IntakeTrendChart days={analytics.days} mode={intakeMode} />
          </section>

          {/* Micronutrients (7D Avg default) + Weight History List */}
          <div className="md:col-span-6">
            <MicronutrientPanel
              defaultWindow="7d"
              micros={todaySummary.micros}
              weeklyMicros={weeklyMicroSummary.micros}
              netCarbsG={todaySummary.netCarbsG}
              weeklyNetCarbsG={weeklyMicroSummary.netCarbsG}
              potassiumSodiumRatio={todaySummary.potassiumSodiumRatio}
              weeklyPotassiumSodiumRatio={weeklyMicroSummary.potassiumSodiumRatio}
              todayLogs={todayLogs}
              weeklyLogs={weeklyLogs}
            />
          </div>

          <div className="md:col-span-6">
            <WeightHistoryList
              entries={safeWeightLogs}
              weightSeries={adaptive.weightSeries}
              unit={weightUnit}
              onEdit={openEditWeighIn}
              onLogFirst={openNewWeighIn}
            />
          </div>
        </div>
      </div>

      {/* Local Weigh-In Drawer supporting both create and edit modes */}
      <WeighInDrawer
        open={isWeighInOpen}
        initialEntry={editingWeight}
        defaultDate={today}
        onClose={() => {
          setIsWeighInOpen(false);
          setEditingWeight(null);
        }}
      />
    </AppShell>
  );
}
