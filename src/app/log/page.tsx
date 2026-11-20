'use client';

import React, { useRef } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { SettingsHeaderLink } from '@/components/shell/settings-header-link';
import { MealSlotsView } from '@/components/log/meal-slots-view';
import { DatePickerPopover } from '@/components/log/date-picker-popover';
import { useLoggerStore } from '@/stores/logger-store';
import { offsetIsoDate } from '@/lib/recipes/recipe-builder';
import { runViewTransition, triggerHaptic } from '@/lib/motion';
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
  const dateDirection = useLoggerStore((s) => s.dateDirection);
  const setActiveDate = useLoggerStore((s) => s.setActiveDate);
  const touchStartX = useRef<number | null>(null);

  const { label, isToday } = formatDisplayDate(activeDate);

  const handlePrevDay = () => {
    triggerHaptic(8);
    runViewTransition(() => setActiveDate(offsetIsoDate(activeDate, -1)), {
      direction: 'backward',
    });
  };
  const handleNextDay = () => {
    triggerHaptic(8);
    runViewTransition(() => setActiveDate(offsetIsoDate(activeDate, 1)), {
      direction: 'forward',
    });
  };
  const handleToday = () => {
    triggerHaptic(8);
    const today = getTodayIsoDate();
    runViewTransition(() => setActiveDate(today), {
      direction: today > activeDate ? 'forward' : today < activeDate ? 'backward' : null,
    });
  };
  const handleSelectDate = (iso: string) => {
    triggerHaptic(8);
    runViewTransition(() => setActiveDate(iso), {
      direction: iso > activeDate ? 'forward' : iso < activeDate ? 'backward' : null,
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const dx = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 48) return;
    if (dx > 0) handlePrevDay();
    else handleNextDay();
  };

  const dateSlideClass =
    dateDirection === 'forward'
      ? 'slide-enter-right'
      : dateDirection === 'backward'
        ? 'slide-enter-left'
        : '';

  return (
    <AppShell>
      <div className="flex flex-col gap-5 sm:gap-6 px-4 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-8">
        {/* Header & Date Switcher matching Dashboard Obsidian Aesthetic */}
        <header
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="flex flex-wrap items-center sm:items-end justify-between gap-x-2 gap-y-3"
        >
          <div className="min-w-0 flex-1 sm:flex-initial">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Food Log
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Adherence-neutral chronological diary
            </p>
          </div>

          <div className="order-3 sm:order-2 sm:ml-auto flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0">
            {!isToday && (
              <button
                type="button"
                onClick={handleToday}
                className="touch-target tactile-press px-3 min-h-[44px] sm:min-h-[36px] py-2 sm:py-1.5 rounded-full text-xs sm:text-[11px] font-semibold bg-surface-sub border border-border/50 text-foreground hover:bg-surface-elevated flex items-center gap-1 mr-0.5 sm:mr-1"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                Today
              </button>
            )}
            <button
              type="button"
              onClick={handlePrevDay}
              aria-label="Previous day"
              className="touch-target tactile-press w-11 h-11 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-card border border-border/50 hover:bg-surface-sub text-muted-foreground hover:text-foreground shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <DatePickerPopover
              activeDate={activeDate}
              onSelectDate={handleSelectDate}
              align="right"
              className="flex-1 sm:flex-initial"
              trigger={
                <button
                  type="button"
                  title="Choose date"
                  className="w-full touch-target tactile-press justify-center text-xs font-semibold px-3.5 min-h-[44px] sm:min-h-[36px] py-2 sm:py-1.5 rounded-full bg-card border border-border/50 hover:bg-surface-sub text-foreground flex items-center gap-1.5 tabular-nums whitespace-nowrap"
                >
                  <Calendar className="w-3.5 h-3.5 text-[var(--macro-calories)] shrink-0" aria-hidden="true" />
                  <span suppressHydrationWarning>{label}</span>
                </button>
              }
            />
            <button
              type="button"
              onClick={handleNextDay}
              aria-label="Next day"
              className="touch-target tactile-press w-11 h-11 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-card border border-border/50 hover:bg-surface-sub text-muted-foreground hover:text-foreground shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="order-2 sm:order-3 shrink-0">
            <SettingsHeaderLink />
          </div>
        </header>

        {/* Meal Slots View with Daily Consumed & Copy Yesterday */}
        <div
          key={`log-date-${activeDate}`}
          style={{ viewTransitionName: 'date-stage' }}
          className={dateSlideClass}
        >
          <MealSlotsView />
        </div>
      </div>
    </AppShell>
  );
}
