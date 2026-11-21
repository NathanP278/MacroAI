'use client';

import React, { useRef } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { SettingsHeaderLink } from '@/components/shell/settings-header-link';
import { MealSlotsView } from '@/components/log/meal-slots-view';
import { DatePickerPopover } from '@/components/log/date-picker-popover';
import { PageStagger, StaggerItem } from '@/components/motion/motion-primitives';
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
      <PageStagger className="flex flex-col gap-5 sm:gap-6 px-4 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-8">
        {/* Compact Single-Row Header & Date Switcher matching Dashboard Obsidian Aesthetic */}
        <StaggerItem>
        <header
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="flex items-center justify-between gap-2"
        >
          <div className="min-w-0 flex-1">
            <DatePickerPopover
              activeDate={activeDate}
              onSelectDate={handleSelectDate}
              align="left"
              trigger={
                <button
                  type="button"
                  title="Choose date"
                  className="tactile-press inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors tabular-nums"
                >
                  <Calendar className="w-3 h-3 text-[var(--macro-calories)] shrink-0" aria-hidden="true" />
                  <span suppressHydrationWarning className="truncate">{label}</span>
                </button>
              }
            />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight mt-0.5 truncate">
              Food Log
            </h1>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!isToday && (
              <button
                type="button"
                onClick={handleToday}
                className="touch-target tactile-press px-2.5 sm:px-3 min-h-[36px] py-1.5 rounded-full text-[11px] font-semibold bg-surface-sub border border-border/50 text-foreground hover:bg-surface-elevated flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                <span>Today</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrevDay}
              aria-label="Previous day"
              className="touch-target tactile-press w-10 h-10 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-card border border-border/50 hover:bg-surface-sub text-muted-foreground hover:text-foreground shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextDay}
              aria-label="Next day"
              className="touch-target tactile-press w-10 h-10 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-card border border-border/50 hover:bg-surface-sub text-muted-foreground hover:text-foreground shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <SettingsHeaderLink />
          </div>
        </header>
        </StaggerItem>

        {/* Meal Slots View with Daily Consumed & Copy Yesterday */}
        <StaggerItem
          key={`log-date-${activeDate}`}
          style={{ viewTransitionName: 'date-stage' }}
          className={dateSlideClass}
        >
          <MealSlotsView />
        </StaggerItem>
      </PageStagger>
    </AppShell>
  );
}
