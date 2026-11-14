'use client';

import React from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { MealSlotsView } from '@/components/log/meal-slots-view';
import { useLoggerStore } from '@/stores/logger-store';
import { offsetIsoDate } from '@/lib/recipes/recipe-builder';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

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

  const { label } = formatDisplayDate(activeDate);

  const handlePrevDay = () => setActiveDate(offsetIsoDate(activeDate, -1));
  const handleNextDay = () => setActiveDate(offsetIsoDate(activeDate, 1));

  return (
    <AppShell>
      <div className="flex flex-col gap-4 p-4">
        {/* Header & Date Switcher */}
        <header className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-base font-bold tracking-tight text-foreground">Food Log</h1>
            <p className="text-[11px] text-muted-foreground">
              Adherence-neutral chronological diary
            </p>
          </div>
          <div className="flex items-center gap-1 bg-card border border-border px-2 py-1 rounded-xl shadow-xs">
            <button
              type="button"
              onClick={handlePrevDay}
              aria-label="Previous day"
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-1 text-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3 text-amber-400" />
              {label}
            </span>
            <button
              type="button"
              onClick={handleNextDay}
              aria-label="Next day"
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
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
