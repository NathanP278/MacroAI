'use client';

import React, { useState, useMemo } from 'react';
import type { MicroMetric } from '@/lib/nutrition/daily-summary';
import type { FoodLogEntry } from '@/types/nutrition';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { InfoPopover } from '@/components/ui/info-popover';
import { NutrientContributorsSheet } from './nutrient-contributors-sheet';
import { triggerHaptic } from '@/lib/motion';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface MicronutrientPanelProps {
  micros?: Record<string, MicroMetric>;
  weeklyMicros?: Record<string, MicroMetric>;
  netCarbsG?: number;
  weeklyNetCarbsG?: number;
  potassiumSodiumRatio?: number | null;
  weeklyPotassiumSodiumRatio?: number | null;
  todayLogs?: FoodLogEntry[];
  weeklyLogs?: FoodLogEntry[];
  defaultWindow?: 'today' | '7d';
  className?: string;
}

type FilterTab = 'all' | 'minerals' | 'vitamins' | 'extended';
type WindowMode = 'today' | '7d';

function formatNetCarbs(val: number): string {
  if (!Number.isFinite(val)) return '0g';
  const rounded = Math.round(val * 10) / 10;
  return `${rounded}g`;
}

function formatRatio(val: number | null | undefined): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return '—';
  return val.toFixed(2);
}

function MicroRow({
  item,
  onSelect,
  hidden = false,
}: {
  item: MicroMetric;
  onSelect: (metric: MicroMetric) => void;
  hidden?: boolean;
}) {
  const hasTarget = item.target > 0;
  const isNear = hasTarget && item.status === 'near';
  const isOver = hasTarget && item.overTarget;
  const fillColor = isOver
    ? 'var(--neutral-over)'
    : isNear
      ? 'var(--macro-carbs)'
      : 'var(--macro-calories)';
  const safePercent = hasTarget ? Math.min(100, Math.max(0, item.percent)) : 0;

  return (
    <button
      type="button"
      tabIndex={hidden ? -1 : 0}
      onClick={() => {
        triggerHaptic(6);
        onSelect(item);
      }}
      className="w-full text-left py-2.5 first:pt-1 last:pb-1 space-y-1.5 group rounded-lg hover:bg-surface-sub/45 transition-colors -mx-1.5 px-1.5"
    >
      <div className="flex items-center justify-between text-xs gap-2">
        <span className="font-medium text-foreground truncate flex items-center gap-1">
          <span className="truncate">{item.name}</span>
          <ChevronRight
            className="w-3 h-3 text-muted-foreground/60 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity shrink-0"
            aria-hidden="true"
          />
        </span>

        <div className="flex items-center gap-2 text-xs tabular-nums shrink-0">
          {hasTarget ? (
            <>
              <span className="text-foreground font-semibold">
                {item.consumed}
                <span className="text-muted-foreground font-normal ml-0.5">
                  / {item.target} {item.unit}
                </span>
              </span>
              <span className="text-xs font-medium text-muted-foreground min-w-[38px] text-right">
                {item.rawPercent}%
              </span>
            </>
          ) : (
            <>
              <span className="text-foreground font-semibold">
                {item.consumed}
                <span className="text-muted-foreground font-normal ml-0.5">
                  {item.unit}
                </span>
              </span>
              <span className="text-xs font-medium text-muted-foreground min-w-[38px] text-right">
                —
              </span>
            </>
          )}
        </div>
      </div>

      {hasTarget ? (
        <progress
          className="macro-progress w-full h-1.5 block"
          max={100}
          value={safePercent}
          aria-label={`${item.name} RDA progress`}
          style={
            {
              '--progress-bar-fill': fillColor,
              '--progress-bar-track': 'var(--surface-sub)',
            } as React.CSSProperties
          }
        />
      ) : (
        <div
          className="w-full h-1.5 rounded-[3px] bg-surface-sub overflow-hidden"
          aria-hidden="true"
        >
          {item.consumed > 0 && (
            <div
              className="h-full rounded-[3px]"
              style={{ width: '100%', backgroundColor: 'var(--neutral-over)', opacity: 0.35 }}
            />
          )}
        </div>
      )}
    </button>
  );
}

export function MicronutrientPanel({
  micros = {},
  weeklyMicros,
  netCarbsG,
  weeklyNetCarbsG,
  potassiumSodiumRatio,
  weeklyPotassiumSodiumRatio,
  todayLogs = [],
  weeklyLogs,
  defaultWindow = 'today',
  className = '',
}: MicronutrientPanelProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [activeWindow, setActiveWindow] = useState<WindowMode>(defaultWindow);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MicroMetric | null>(null);

  const hasWeekly = Boolean(weeklyMicros);
  const effectiveWindow: WindowMode = hasWeekly ? activeWindow : 'today';
  const activeMicros = effectiveWindow === '7d' && weeklyMicros ? weeklyMicros : micros;

  const activeNetCarbsG =
    effectiveWindow === '7d' ? (weeklyNetCarbsG ?? netCarbsG) : netCarbsG;
  const activePotassiumSodiumRatio =
    effectiveWindow === '7d'
      ? weeklyPotassiumSodiumRatio !== undefined
        ? weeklyPotassiumSodiumRatio
        : potassiumSodiumRatio
      : potassiumSodiumRatio;

  const showSummaryStrip =
    activeNetCarbsG !== undefined || activePotassiumSodiumRatio !== undefined;

  const microList = useMemo(() => {
    return Object.values(activeMicros);
  }, [activeMicros]);

  const filteredList = useMemo(() => {
    if (activeTab === 'minerals') {
      return microList.filter((m) => m.category === 'mineral');
    }
    if (activeTab === 'vitamins') {
      return microList.filter((m) => m.category === 'vitamin');
    }
    if (activeTab === 'extended') {
      return microList.filter((m) => m.category === 'extended');
    }
    return microList;
  }, [microList, activeTab]);

  const hasCollapsibleTail = activeTab === 'all' && filteredList.length > 6;
  const primaryItems = hasCollapsibleTail ? filteredList.slice(0, 6) : filteredList;
  const extraItems = hasCollapsibleTail ? filteredList.slice(6) : [];

  const metCount = useMemo(() => {
    return microList.filter((m) => m.target > 0 && m.percent >= 90).length;
  }, [microList]);

  const contributorLogs =
    effectiveWindow === '7d' ? (weeklyLogs ?? todayLogs) : todayLogs;

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

        {hasWeekly && (
          <SegmentedControl
            role="group"
            ariaLabel="Micronutrient time window"
            value={effectiveWindow}
            onChange={(next) => {
              triggerHaptic(6);
              setActiveWindow(next);
            }}
            className="bg-surface-sub p-0.5"
            buttonClassName="text-[11px] px-2.5 py-1"
            options={[
              { value: 'today', label: 'Today' },
              { value: '7d', label: '7D Avg' },
            ]}
          />
        )}
      </div>

      {/* Compact Net Carbs & K:Na Ratio strip */}
      {showSummaryStrip && (
        <div className="grid grid-cols-2 gap-2.5">
          {activeNetCarbsG !== undefined && (
            <div className="rounded-xl bg-surface-sub/65 border border-border/40 px-3 py-2 flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Net Carbs
              </span>
              <InfoPopover
                label="Net Carbs"
                description="Total carbohydrates minus dietary fiber — estimates digestible carbs."
              />
              <span className="ml-auto text-sm font-bold text-foreground tabular-nums">
                {formatNetCarbs(activeNetCarbsG)}
              </span>
            </div>
          )}
          {activePotassiumSodiumRatio !== undefined && (
            <div className="rounded-xl bg-surface-sub/65 border border-border/40 px-3 py-2 flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                K:Na Ratio
              </span>
              <InfoPopover
                label="K:Na Ratio"
                description="Potassium-to-sodium ratio. A higher ratio generally reflects more whole-food potassium relative to dietary sodium."
                align="right"
              />
              <span className="ml-auto text-sm font-bold text-foreground tabular-nums">
                {formatRatio(activePotassiumSodiumRatio)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Clean Segmented Filter Pills */}
      <div className="overflow-x-auto no-scrollbar">
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
            { value: 'extended', label: 'Extended' },
          ]}
        />
      </div>

      {/* Clean Divider Rows (zero box-inside-box nesting) */}
      <div key={`${activeTab}-${effectiveWindow}`} className="animate-panel-switch">
        {filteredList.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            No micronutrients tracked for this category.
          </div>
        ) : (
          <>
            <div className="divide-y divide-border/60">
              {primaryItems.map((item) => (
                <MicroRow key={item.key} item={item} onSelect={setSelectedMetric} />
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
                    <MicroRow
                      key={item.key}
                      item={item}
                      onSelect={setSelectedMetric}
                      hidden={!isExpanded}
                    />
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

      <NutrientContributorsSheet
        open={Boolean(selectedMetric)}
        nutrientKey={selectedMetric?.key ?? ''}
        nutrientLabel={selectedMetric?.name ?? ''}
        unit={selectedMetric?.unit ?? ''}
        windowLabel={effectiveWindow === '7d' ? 'Last 7 Days' : 'Today'}
        logs={contributorLogs}
        onClose={() => setSelectedMetric(null)}
      />
    </section>
  );
}
