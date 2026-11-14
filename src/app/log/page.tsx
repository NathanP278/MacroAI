'use client';

import React from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { MealSlotsView } from '@/components/log/meal-slots-view';
import { useLoggerStore } from '@/stores/logger-store';
import { offsetIsoDate } from '@/lib/recipes/recipe-builder';
import { ChevronLeft, ChevronRight, Calendar, RotateCcw } from 'lucide-react';

function getTodayIsoDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(iso: string): { label: string; isToday: boolean } {
  const d = new Date();
  const todayY = d.getFullYear();
  const todayM = String(d.getMonth() + 1).padStart(2, '0');
  const todayD = String(d.getDate()).padStart(2, '0');
  const todayIso = `${todayY}-${todayM}-${todayD}`;

  const isToday = iso === todayIso;
  const parts = (iso || '').split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return { label: iso, isToday };
  }

  const [y, m, day] = parts;
  const dateObj = new Date(y, m - 1, day);
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
  const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });

  return {
    label: isToday ? `Today, ${monthName} ${day}` : `${dayName}, ${monthName} ${day}`,
    isToday,
  };
}

export default function LogPage() {
  const activeDate = useLoggerStore((s) => s.activeDate);
  const setActiveDate = useLoggerStore((s) => s.setActiveDate);

  const { label, isToday } = formatDisplayDate(activeDate);

  const handlePrevDay = () => setActiveDate(offsetIsoDate(activeDate, -1));
  const handleNextDay = () => setActiveDate(offsetIsoDate(activeDate, 1));
  const handleToday = () => setActiveDate(getTodayIsoDate());

  return (
    <AppShell>
      <div className="flex flex-col gap-5 sm:gap-6 px-4 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-8">
        {/* Header & Date Switcher matching Dashboard Obsidian Aesthetic */}
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Food Log
            </h1>
            <p className="text-xs sm:text-[13px] text-muted-foreground mt-0.5">
              Adherence-neutral chronological diary
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!isToday && (
              <button
                type="button"
                onClick={handleToday}
                className="touch-target macro-spring active:scale-95 px-2.5 py-1.5 rounded-full text-[11px] font-semibold bg-surface-sub border border-border/50 text-foreground hover:bg-surface-elevated flex items-center gap-1 mr-1"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                Today
              </button>
            )}
            <button
              type="button"
              onClick={handlePrevDay}
              aria-label="Previous day"
              className="touch-target macro-spring active:scale-95 w-9 h-9 rounded-full flex items-center justify-center bg-card border border-border/50 hover:bg-surface-sub text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-3.5 py-2 rounded-full bg-card border border-border/50 text-foreground flex items-center gap-1.5 tabular-nums">
              <Calendar className="w-3.5 h-3.5 text-[var(--macro-calories)]" aria-hidden="true" />
              {label}
            </span>
            <button
              type="button"
              onClick={handleNextDay}
              aria-label="Next day"
              className="touch-target macro-spring active:scale-95 w-9 h-9 rounded-full flex items-center justify-center bg-card border border-border/50 hover:bg-surface-sub text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Meal Slots View with Daily Consumed & Copy Yesterday */}
        <MealSlotsView />
      </div>
    </AppShell>
  );
}
