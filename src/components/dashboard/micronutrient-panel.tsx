'use client';

import React, { useState, useMemo } from 'react';
import type { MicroMetric } from '@/lib/nutrition/daily-summary';
import { ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';

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
    <section className={`bg-card border border-border rounded-3xl p-4 shadow-xl space-y-3.5 ${className}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-tight text-foreground uppercase">
              Micronutrient Targets
            </h2>
            <p className="text-[10px] text-muted-foreground font-mono">
              Cronometer-style daily RDA · {metCount}/{microList.length} targets on track
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-surface-sub p-0.5 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`text-[10px] px-2 py-1 rounded-lg font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-card text-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({microList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('minerals')}
            className={`text-[10px] px-2 py-1 rounded-lg font-medium transition-colors ${
              activeTab === 'minerals'
                ? 'bg-card text-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Minerals
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vitamins')}
            className={`text-[10px] px-2 py-1 rounded-lg font-medium transition-colors ${
              activeTab === 'vitamins'
                ? 'bg-card text-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Vitamins
          </button>
        </div>
      </div>

      {/* Micronutrients List */}
      <div className="space-y-2 pt-1">
        {displayedList.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            No micronutrients tracked for this category.
          </div>
        ) : (
          displayedList.map((item) => {
            const isOver = item.overTarget;
            const isNear = item.status === 'near';

            return (
              <div
                key={item.key}
                className="bg-surface-sub/60 hover:bg-surface-sub border border-border/50 rounded-xl p-2.5 space-y-1.5 transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground text-[11px]">
                      {item.name}
                    </span>
                    <span className="text-[9px] uppercase px-1 rounded text-muted-foreground bg-surface-sub border border-border/40 font-mono">
                      {item.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="tabular-nums text-foreground">
                      {item.consumed}
                      <span className="text-muted-foreground font-normal ml-0.5">
                        / {item.target} {item.unit}
                      </span>
                    </span>
                    <span
                      className={`text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded ${
                        isOver
                          ? 'bg-slate-500/15 text-slate-300'
                          : isNear
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-surface-sub text-muted-foreground'
                      }`}
                    >
                      {item.rawPercent}%
                    </span>
                  </div>
                </div>

                {/* Neutral progress bar */}
                <div className="w-full bg-surface-sub h-1.5 rounded-full overflow-hidden border border-border/30">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isOver
                        ? 'bg-slate-400'
                        : isNear
                        ? 'bg-emerald-400'
                        : 'bg-sky-400/80'
                    }`}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Expand/Collapse Toggle for ergonomic mobile view */}
      {activeTab === 'all' && filteredList.length > 6 && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground font-medium flex items-center justify-center gap-1 rounded-xl hover:bg-surface-sub transition-colors"
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
