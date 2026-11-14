'use client';

import React, { useState, useMemo } from 'react';
import type { MicroMetric } from '@/lib/nutrition/daily-summary';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface MicronutrientPanelProps {
  micros?: Record<string, MicroMetric>;
  className?: string;
}

type FilterTab = 'all' | 'minerals' | 'vitamins';

export function MicronutrientPanel({ micros = {}, className = '' }: MicronutrientPanelProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [isExpanded, setIsExpanded] = useState(false);

  const microList = useMemo(() => {
    return Object.values(micros);
  }, [micros]);

  const filteredList = useMemo(() => {
    if (activeTab === 'minerals') {
      return microList.filter((m) => m.category === 'mineral');
    }
    if (activeTab === 'vitamins') {
      return microList.filter((m) => m.category === 'vitamin');
    }
    return microList;
  }, [microList, activeTab]);

  // Mobile ergonomic view: collapse to 6 items if not expanded in 'all' tab
  const displayedList = useMemo(() => {
    if (activeTab === 'all' && !isExpanded) {
      return filteredList.slice(0, 6);
    }
    return filteredList;
  }, [filteredList, activeTab, isExpanded]);

  const metCount = useMemo(() => {
    return microList.filter((m) => m.percent >= 90).length;
  }, [microList]);

  return (
    <section
      aria-label="Micronutrient Targets"
      className={`bg-card rounded-2xl p-4 sm:p-5 space-y-3.5 ${className}`}
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold tracking-tight text-foreground">
            Micronutrient Targets
          </h2>
          <p className="text-xs text-muted-foreground tabular-nums">
            {metCount}/{microList.length} targets on track
          </p>
        </div>

        {/* Clean Segmented Filter Pills */}
        <div
          role="group"
          aria-label="Micronutrient category filter"
          className="flex items-center gap-0.5 bg-surface-sub p-0.5 rounded-full"
        >
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            aria-pressed={activeTab === 'all'}
            className={`macro-spring active:scale-95 text-[11px] px-2.5 py-1 rounded-full font-medium ${
              activeTab === 'all'
                ? 'bg-foreground text-background font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({microList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('minerals')}
            aria-pressed={activeTab === 'minerals'}
            className={`macro-spring active:scale-95 text-[11px] px-2.5 py-1 rounded-full font-medium ${
              activeTab === 'minerals'
                ? 'bg-foreground text-background font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Minerals
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vitamins')}
            aria-pressed={activeTab === 'vitamins'}
            className={`macro-spring active:scale-95 text-[11px] px-2.5 py-1 rounded-full font-medium ${
              activeTab === 'vitamins'
                ? 'bg-foreground text-background font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Vitamins
          </button>
        </div>
      </div>

      {/* Clean Divider Rows (zero box-inside-box nesting) */}
      <div className="divide-y divide-border/60">
        {displayedList.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            No micronutrients tracked for this category.
          </div>
        ) : (
          displayedList.map((item) => {
            const isNear = item.status === 'near';
            const fillColor = item.overTarget
              ? 'var(--neutral-over)'
              : isNear
              ? 'var(--macro-carbs)'
              : 'var(--macro-calories)';

            return (
              <div key={item.key} className="py-2.5 first:pt-1 last:pb-1 space-y-1.5">
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="font-medium text-foreground">{item.name}</span>

                  <div className="flex items-center gap-2 text-xs tabular-nums">
                    <span className="text-foreground font-semibold">
                      {item.consumed}
                      <span className="text-muted-foreground font-normal ml-0.5">
                        / {item.target} {item.unit}
                      </span>
                    </span>
                    <span className="text-xs font-medium text-muted-foreground min-w-[38px] text-right">
                      {item.rawPercent}%
                    </span>
                  </div>
                </div>

                <progress
                  className="macro-progress w-full h-1.5 block"
                  max={100}
                  value={Math.min(100, Math.max(0, item.percent))}
                  aria-label={`${item.name} RDA progress`}
                  style={
                    {
                      '--progress-bar-fill': fillColor,
                      '--progress-bar-track': 'var(--surface-sub)',
                    } as React.CSSProperties
                  }
                />
              </div>
            );
          })
        )}
      </div>

      {activeTab === 'all' && filteredList.length > 6 && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="macro-spring active:scale-[0.985] w-full py-2 text-xs text-muted-foreground hover:text-foreground font-medium flex items-center justify-center gap-1 rounded-xl hover:bg-surface-sub"
        >
          {isExpanded ? (
            <>
              Show Less <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              Show All {filteredList.length} Micronutrients <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}
    </section>
  );
}
