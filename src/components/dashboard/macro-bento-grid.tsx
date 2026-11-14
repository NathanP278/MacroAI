'use client';

import React from 'react';
import type { DailySummary, MacroMetric } from '@/lib/nutrition/daily-summary';
import { Flame, Activity } from 'lucide-react';

export interface MacroBentoGridProps {
  summary: DailySummary;
  className?: string;
}

interface MacroCardProps {
  label: string;
  metric: MacroMetric;
  unit?: string;
  colorClass: string;
  barColor: string;
}

function MacroCard({ label, metric, unit = 'g', colorClass, barColor }: MacroCardProps) {
  const isOver = metric.overTarget;

  return (
    <div className="bg-card border border-border rounded-2xl p-3 flex flex-col justify-between shadow-sm">
      <div className="flex items-center justify-between text-[11px] font-semibold">
        <span className={colorClass}>{label}</span>
        {isOver ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-mono tabular-nums bg-slate-500/15 text-slate-300 border border-slate-500/20">
            +{metric.delta}
            {unit}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
            {metric.remaining}
            {unit} left
          </span>
        )}
      </div>

      <div className="my-2">
        <div className="text-lg font-bold tabular-nums text-foreground tracking-tight">
          {metric.consumed}
          <span className="text-[10px] font-normal text-muted-foreground ml-1">
            / {metric.target}
            {unit}
          </span>
        </div>
      </div>

      {/* Neutral adherence progress bar */}
      <div className="w-full bg-surface-sub h-1.5 rounded-full overflow-hidden border border-border/30">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isOver ? 'bg-slate-400/80' : barColor
          }`}
          style={{ width: `${metric.percent}%` }}
        />
      </div>
    </div>
  );
}

export function MacroBentoGrid({ summary, className = '' }: MacroBentoGridProps) {
  const { calories, protein, carbs, fat, fiber } = summary;

  // Calorie ring SVG dimensions
  const size = 112;
  const strokeWidth = 8;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (calories.percent / 100) * circumference;

  return (
    <section className={`space-y-3 ${className}`}>
      {/* Energy Balance Bento Hat */}
      <div className="bg-card border border-border rounded-3xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Energy Balance</span>
          </div>
          <div className="flex items-center gap-2">
            {calories.overTarget ? (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-slate-500/15 text-slate-300 border border-slate-500/20">
                Surplus +{calories.delta} kcal
              </span>
            ) : calories.status === 'near' ? (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                Target Met
              </span>
            ) : (
              <span className="text-[11px] font-mono text-muted-foreground">
                Target: <span className="tabular-nums text-foreground">{calories.target}</span> kcal
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
          {/* Numbers readout */}
          <div>
            <div className="text-3xl font-extrabold tracking-tight tabular-nums text-foreground flex items-baseline gap-1">
              {calories.overTarget ? `+${calories.delta}` : calories.remaining}
              <span className="text-sm font-semibold text-muted-foreground">kcal</span>
            </div>
            <div className="text-xs text-muted-foreground font-medium mt-0.5">
              {calories.overTarget ? 'neutral surplus intake' : 'calories remaining'}
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <Activity className="w-3.5 h-3.5 text-amber-400/80" />
              <span>
                <strong className="text-foreground tabular-nums">{calories.consumed}</strong>
                {' / '}
                <span className="tabular-nums">{calories.target}</span> kcal ({calories.rawPercent}%)
              </span>
            </div>
          </div>

          {/* SVG Calorie Ring */}
          <div className="relative flex items-center justify-center">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="rotate-[-90deg] transition-all duration-300"
              aria-label={`Calorie progress: ${calories.consumed} of ${calories.target} kcal`}
            >
              {/* Background track */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                className="text-surface-sub stroke-current"
              />
              {/* Progress stroke */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={`transition-all duration-500 ease-out ${
                  calories.overTarget ? 'text-slate-400 stroke-current' : 'text-amber-400 stroke-current'
                }`}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-sm font-bold tabular-nums text-foreground">
                {calories.percent}%
              </span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                RDA
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Macro Grid: Protein, Carbs, Fat, Fiber */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <MacroCard
          label="Protein"
          metric={protein}
          colorClass="text-sky-400"
          barColor="bg-sky-400"
        />
        <MacroCard
          label="Carbs"
          metric={carbs}
          colorClass="text-emerald-400"
          barColor="bg-emerald-400"
        />
        <MacroCard
          label="Fat"
          metric={fat}
          colorClass="text-rose-400"
          barColor="bg-rose-400"
        />
        <MacroCard
          label="Fiber"
          metric={fiber}
          colorClass="text-purple-400"
          barColor="bg-purple-400"
        />
      </div>
    </section>
  );
}
