'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/macroai-db';
import { useLoggerStore } from '@/stores/logger-store';
import { DEFAULT_MEAL_SLOTS, DEFAULT_RDA_MICROS } from '@/lib/nutrition/goals';
import { aggregateDailySummary } from '@/lib/nutrition/daily-summary';
import { MacroBentoGrid } from '@/components/dashboard/macro-bento-grid';
import { MicronutrientPanel } from '@/components/dashboard/micronutrient-panel';
import { AppShell } from '@/components/shell/app-shell';
import type { UserGoals } from '@/types/nutrition';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ShieldCheck,
  Utensils,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

function getTodayIsoDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function offsetIsoDate(iso: string, dayOffset: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + dayOffset);
  const nextY = date.getFullYear();
  const nextM = String(date.getMonth() + 1).padStart(2, '0');
  const nextD = String(date.getDate()).padStart(2, '0');
  return `${nextY}-${nextM}-${nextD}`;
}

function formatDisplayDate(iso: string): { label: string; sub: string; isToday: boolean } {
  const today = getTodayIsoDate();
  const isToday = iso === today;
  const [y, m, d] = iso.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
  const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
  const dayNum = dateObj.getDate();

  return {
    label: isToday ? 'Today' : `${dayName}, ${monthName} ${dayNum}`,
    sub: isToday ? `${dayName}, ${monthName} ${dayNum}` : `${y}`,
    isToday,
  };
}

export default function HomePage() {
  const activeDate = useLoggerStore((s) => s.activeDate);
  const setActiveDate = useLoggerStore((s) => s.setActiveDate);
  const openSheet = useLoggerStore((s) => s.openSheet);

  // Live query for logs on active date and user goals
  const foodLogs = useLiveQuery(
    () => db.foodLogs.where('date').equals(activeDate).toArray(),
    [activeDate]
  );

  const userGoals = useLiveQuery(
    () => db.userGoals.get('active'),
    []
  );

  // Safe fallback before goals resolve or seed
  const fallbackGoals: UserGoals = useMemo(
    () => ({
      id: 'active',
      dailyCalories: 2000,
      proteinG: 150,
      carbsG: 200,
      fatG: 65,
      fiberG: 30,
      micronutrientTargets: { ...DEFAULT_RDA_MICROS },
      mealSlots: [...DEFAULT_MEAL_SLOTS],
      updatedAt: 0,
    }),
    []
  );

  const activeGoals = userGoals ?? fallbackGoals;
  const activeLogs = useMemo(() => foodLogs ?? [], [foodLogs]);

  const summary = useMemo(
    () => aggregateDailySummary(activeLogs, activeGoals),
    [activeLogs, activeGoals]
  );

  const mealSlots = useMemo(() => {
    return activeGoals.mealSlots && activeGoals.mealSlots.length > 0
      ? activeGoals.mealSlots
      : DEFAULT_MEAL_SLOTS;
  }, [activeGoals.mealSlots]);

  const dateInfo = formatDisplayDate(activeDate);

  const handlePrevDay = () => setActiveDate(offsetIsoDate(activeDate, -1));
  const handleNextDay = () => setActiveDate(offsetIsoDate(activeDate, 1));
  const handleToday = () => setActiveDate(getTodayIsoDate());

  return (
    <AppShell>
      <div className="flex flex-col gap-4 p-4">
        {/* Top Header & Date Navigation Bar */}
        <header className="flex flex-col gap-2.5 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 font-black text-sm">
                M
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
                  MacroAI
                </h1>
                <p className="text-[10px] text-emerald-400/90 flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3 h-3" /> Adherence Neutral
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/prototypes"
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-card border border-border text-amber-400 hover:text-amber-300 transition-colors"
              >
                Prototypes &rarr;
              </Link>
            </div>
          </div>

          {/* Date Switcher Pill */}
          <div className="bg-card border border-border rounded-2xl p-1.5 flex items-center justify-between shadow-xs">
            <button
              type="button"
              onClick={handlePrevDay}
              aria-label="Previous day"
              className="p-1.5 rounded-xl hover:bg-surface-sub text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <div className="text-center">
                <span className="text-xs font-bold text-foreground tracking-tight">
                  {dateInfo.label}
                </span>
                <span className="text-[10px] text-muted-foreground ml-1.5 font-mono">
                  {dateInfo.sub}
                </span>
              </div>
              {!dateInfo.isToday && (
                <button
                  type="button"
                  onClick={handleToday}
                  className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Today
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleNextDay}
              aria-label="Next day"
              className="p-1.5 rounded-xl hover:bg-surface-sub text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Bento Grid: Calorie Ring + Macros */}
        <MacroBentoGrid summary={summary} />

        {/* Meal Slots Section */}
        <section className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Utensils className="w-3.5 h-3.5 text-amber-400" />
              <span>Meal Log</span>
            </div>
            <Link
              href="/log"
              className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-0.5"
            >
              View Log <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {mealSlots.map((slot) => {
              const slotLogs = activeLogs.filter((entry) => entry.mealSlot === slot.id);
              const slotCalories = slotLogs.reduce(
                (sum, entry) => sum + (entry.nutritionSnapshot?.calories ?? 0),
                0
              );

              return (
                <div
                  key={slot.id}
                  className="bg-card border border-border rounded-2xl p-3.5 space-y-2.5 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-foreground">{slot.name}</span>
                      <span className="text-[11px] text-muted-foreground font-mono tabular-nums ml-2">
                        {Math.round(slotCalories)} kcal
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openSheet('search', slot.id)}
                      aria-label={`Add food to ${slot.name}`}
                      className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-sub transition-colors border border-border/40 hover:border-border"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {slotLogs.length > 0 ? (
                    <div className="space-y-1.5">
                      {slotLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between text-xs py-1 px-2.5 rounded-xl bg-surface-sub border border-border/40"
                        >
                          <span className="text-foreground truncate max-w-[200px] text-[11px]">
                            {log.name}{' '}
                            <span className="text-muted-foreground text-[10px]">
                              ({Math.round(log.amount)}
                              {log.unit})
                            </span>
                          </span>
                          <span className="text-muted-foreground tabular-nums font-mono text-[11px]">
                            {Math.round(log.nutritionSnapshot.calories)} kcal
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground/70 italic py-0.5">
                      No foods logged yet for {slot.name}.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Micronutrient Targets Panel */}
        <MicronutrientPanel micros={summary.micros} />
      </div>
    </AppShell>
  );
}
