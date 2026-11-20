'use client';

import React, { useState, useMemo } from 'react';
import type { MicroMetric } from '@/lib/nutrition/daily-summary';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { triggerHaptic } from '@/lib/motion';
import { ChevronDown } from 'lucide-react';

export interface MicronutrientPanelProps {
  micros?: Record<string, MicroMetric>;
  className?: string;
}

type FilterTab = 'all' | 'minerals' | 'vitamins';

function MicroRow({ item }: { item: MicroMetric }) {
  const isNear = item.status === 'near';
  const fillColor = item.overTarget
    ? 'var(--neutral-over)'
    : isNear
    ? 'var(--macro-carbs)'
    : 'var(--macro-calories)';

  return (
    <div className="py-2.5 first:pt-1 last:pb-1 space-y-1.5">
      <div className="flex items-center justify-between text-xs gap-2">
        <span className="font-medium text-foreground truncate">{item.name}</span>

        <div className="flex items-center gap-2 text-xs tabular-nums shrink-0">
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
}

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

  const hasCollapsibleTail = activeTab === 'all' && filteredList.length > 6;
  const primaryItems = hasCollapsibleTail ? filteredList.slice(0, 6) : filteredList;
  const extraItems = hasCollapsibleTail ? filteredList.slice(6) : [];

  const metCount = useMemo(() => {
    return microList.filter((m) => m.percent >= 90).length;
  }, [microList]);

  return (
    <section
      aria-label="Micronutrient Targets"
      className={`bg-card border border-border/50 rounded-2xl p-4 sm:p-5 space-y-3.5 ${className}`}
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
        <SegmentedControl
          role="group"
          ariaLabel="Micronutrient category filter"
          value={activeTab}
          onChange={(next) => {
            triggerHaptic(6);
            setActiveTab(next);
          }}
          className="bg-surface-sub p-0.5"
          buttonClassName="text-[11px] px-2.5 py-1"
          options={[
            { value: 'all', label: `All (${microList.length})` },
            { value: 'minerals', label: 'Minerals' },
            { value: 'vitamins', label: 'Vitamins' },
          ]}
        />
      </div>

      {/* Clean Divider Rows (zero box-inside-box nesting) */}
      <div key={activeTab} className="animate-panel-switch">
        {filteredList.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            No micronutrients tracked for this category.
          </div>
        ) : (
          <>
            <div className="divide-y divide-border/60">
              {primaryItems.map((item) => (
                <MicroRow key={item.key} item={item} />
              ))}
            </div>

            {hasCollapsibleTail && (
              <div
                className="accordion-grid"
                data-open={isExpanded ? 'true' : 'false'}
                aria-hidden={!isExpanded}
              >
                <div className="accordion-inner border-t border-border/60 divide-y divide-border/60">
                  {extraItems.map((item) => (
                    <MicroRow key={item.key} item={item} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {hasCollapsibleTail && (
        <button
          type="button"
          onClick={() => {
            triggerHaptic(6);
            setIsExpanded((prev) => !prev);
          }}
          aria-expanded={isExpanded}
          className="touch-target tactile-press w-full py-2 text-xs text-muted-foreground hover:text-foreground font-medium flex items-center justify-center gap-1 rounded-xl hover:bg-surface-sub"
        >
          <span>
            {isExpanded
              ? 'Show Less'
              : `Show All ${filteredList.length} Micronutrients`}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>
      )}
    </section>
  );
}
