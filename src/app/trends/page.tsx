'use client';

import React from 'react';
import { Scale, TrendingUp, Activity, CalendarRange } from 'lucide-react';
import { AppShell } from '@/components/shell/app-shell';
import { SettingsHeaderLink } from '@/components/shell/settings-header-link';

export default function TrendsPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-5 sm:gap-6 px-4 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-8">
        {/* Header matching Dashboard Obsidian Aesthetic */}
        <header className="flex items-center sm:items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Trends
            </h1>
            <p className="text-xs sm:text-[13px] text-muted-foreground mt-0.5">
              Weight trend, observed expenditure &amp; multi-day nutrition
            </p>
          </div>
          <SettingsHeaderLink />
        </header>

        {/* Responsive 12-Column Obsidian Bento Shell */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 lg:gap-6 items-start animate-card-enter">
          <section className="md:col-span-7 bg-card border border-border/50 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[var(--macro-fiber)]/15 flex items-center justify-center text-[var(--macro-fiber)] shrink-0">
                <Scale className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-foreground tracking-tight">
                  Weight &amp; EMA Trend
                </h2>
                <p className="text-xs text-muted-foreground">
                  Smoothed scale weight &amp; rolling rate of change
                </p>
              </div>
            </div>
            <div className="bg-surface-sub rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">
                  Adaptive coaching workspace
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Multi-day EMA trend charts, Observed TDEE calibration, and weekly target check-ins activate here as weigh-ins and food logs accumulate.
                </p>
              </div>
              <TrendingUp
                className="w-5 h-5 text-[var(--macro-calories)] shrink-0"
                aria-hidden="true"
              />
            </div>
          </section>

          <section className="md:col-span-5 bg-card border border-border/50 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[var(--macro-calories)]/15 flex items-center justify-center text-[var(--macro-calories)] shrink-0">
                <Activity className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-foreground tracking-tight">
                  Multi-Day Nutrition
                </h2>
                <p className="text-xs text-muted-foreground">
                  7D / 14D / 30D / 90D intake &amp; micronutrient averages
                </p>
              </div>
            </div>
            <div className="bg-surface-sub rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">
                  Adherence-neutral telemetry
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed tabular-nums">
                  Weekly calorie balance, macro split consistency, and rolling 7-day micronutrient contributors.
                </p>
              </div>
              <CalendarRange
                className="w-5 h-5 text-[var(--macro-carbs)] shrink-0"
                aria-hidden="true"
              />
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
