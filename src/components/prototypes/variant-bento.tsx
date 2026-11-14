"use client";

import React, { useState } from "react";
import {
  normalDayData,
  overTargetDayData,
  mockMealSlots,
} from "./mock-data";
import {
  Plus,
  Flame,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Barcode,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
} from "lucide-react";

interface VariantProps {
  isOverTarget: boolean;
}

export function VariantBento({ isOverTarget }: VariantProps) {
  const data = isOverTarget ? overTargetDayData : normalDayData;
  const [expandedSlots, setExpandedSlots] = useState<Record<string, boolean>>({
    breakfast: true,
    lunch: false,
    snacks: false,
  });

  const toggleSlot = (id: string) => {
    setExpandedSlots((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const calRemaining = data.calories.target - data.calories.consumed;
  const calPercent = Math.min(100, Math.round((data.calories.consumed / data.calories.target) * 100));

  return (
    <div className="flex flex-col min-h-full pb-24 text-slate-100 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold tracking-tight text-slate-200">
            Today, Nov 14
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono tabular-nums text-slate-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Neutral Tracking</span>
        </div>
      </div>

      {/* Bento Main Canvas */}
      <div className="p-4 space-y-3">
        {/* The "Hat" / Calorie Hero Bento Tile */}
        <div className="relative overflow-hidden rounded-2xl bg-[#1B1D22] border border-white/[0.08] p-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" /> Energy Target
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold tracking-tight tabular-nums text-white">
                  {data.calories.consumed.toLocaleString()}
                </span>
                <span className="text-xs font-mono text-slate-400 tabular-nums">
                  / {data.calories.target.toLocaleString()} kcal
                </span>
              </div>
            </div>

            {/* Circular Gauge Preview */}
            <div className="relative flex items-center justify-center w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-white/[0.08]"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-amber-400 transition-all duration-500 ease-out"
                  strokeDasharray={`${calPercent}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-[11px] font-bold font-mono tabular-nums text-slate-200">
                  {calPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* Adherence-Neutral Delta Badge */}
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
            {calRemaining >= 0 ? (
              <>
                <span className="text-slate-400">Remaining to target:</span>
                <span className="font-mono font-semibold tabular-nums text-amber-400">
                  {calRemaining.toLocaleString()} kcal left
                </span>
              </>
            ) : (
              <>
                <span className="text-slate-400">Target balance:</span>
                <span className="font-mono font-semibold tabular-nums text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  +{Math.abs(calRemaining)} kcal surplus
                </span>
              </>
            )}
          </div>
        </div>

        {/* 3-Column Bento Grid for Macros */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Protein Bento Tile */}
          <div className="rounded-xl bg-[#1B1D22] border border-white/[0.08] p-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                  Protein
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              </div>
              <div className="text-lg font-bold font-mono tabular-nums text-white">
                {data.protein.consumed}g
              </div>
              <div className="text-[10px] font-mono tabular-nums text-slate-400">
                target {data.protein.target}g
              </div>
            </div>

            <div className="mt-2.5">
              <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                <div
                  className="h-full rounded-full bg-sky-400 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (data.protein.consumed / data.protein.target) * 100)}%`,
                  }}
                />
              </div>
              <div className="mt-1.5 text-[10px] font-mono tabular-nums text-slate-400">
                {data.protein.target - data.protein.consumed >= 0
                  ? `${data.protein.target - data.protein.consumed}g left`
                  : `+${Math.abs(data.protein.target - data.protein.consumed)}g over`}
              </div>
            </div>
          </div>

          {/* Carbs Bento Tile */}
          <div className="rounded-xl bg-[#1B1D22] border border-white/[0.08] p-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Carbs
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
              <div className="text-lg font-bold font-mono tabular-nums text-white">
                {data.carbs.consumed}g
              </div>
              <div className="text-[10px] font-mono tabular-nums text-slate-400">
                target {data.carbs.target}g
              </div>
            </div>

            <div className="mt-2.5">
              <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (data.carbs.consumed / data.carbs.target) * 100)}%`,
                  }}
                />
              </div>
              <div className="mt-1.5 text-[10px] font-mono tabular-nums text-slate-400">
                {data.carbs.target - data.carbs.consumed >= 0
                  ? `${data.carbs.target - data.carbs.consumed}g left`
                  : `+${Math.abs(data.carbs.target - data.carbs.consumed)}g over`}
              </div>
            </div>
          </div>

          {/* Fat Bento Tile */}
          <div className="rounded-xl bg-[#1B1D22] border border-white/[0.08] p-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                  Fat
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              </div>
              <div className="text-lg font-bold font-mono tabular-nums text-white">
                {data.fat.consumed}g
              </div>
              <div className="text-[10px] font-mono tabular-nums text-slate-400">
                target {data.fat.target}g
              </div>
            </div>

            <div className="mt-2.5">
              <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                <div
                  className="h-full rounded-full bg-rose-400 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (data.fat.consumed / data.fat.target) * 100)}%`,
                  }}
                />
              </div>
              <div className="mt-1.5 text-[10px] font-mono tabular-nums text-slate-400">
                {data.fat.target - data.fat.consumed >= 0
                  ? `${data.fat.target - data.fat.consumed}g left`
                  : `+${Math.abs(data.fat.target - data.fat.consumed)}g over`}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Meal Distribution Teaser (Fitia-style) */}
        <div className="p-3 rounded-xl bg-[#16181D] border border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <div>
              <div className="text-xs font-semibold text-slate-200">
                Dinner Target Budget
              </div>
              <div className="text-[10px] text-slate-400">
                Proportionally distributed across unlogged slots
              </div>
            </div>
          </div>
          <div className="text-right font-mono text-xs tabular-nums text-purple-300 font-semibold">
            {calRemaining > 0 ? `${calRemaining} kcal` : "Balanced"}
          </div>
        </div>

        {/* Meal Slots Section */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Logged Meals
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              3 slots recorded
            </span>
          </div>

          {mockMealSlots.map((slot) => {
            const isExpanded = !!expandedSlots[slot.id];
            return (
              <div
                key={slot.id}
                className="overflow-hidden rounded-xl bg-[#1B1D22] border border-white/[0.08] transition-colors"
              >
                <div
                  onClick={() => toggleSlot(slot.id)}
                  className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      className="p-1 -ml-1 text-slate-400 hover:text-white"
                      aria-label="Toggle slot"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {slot.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {slot.time} • {slot.items.length} items
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold font-mono tabular-nums text-amber-400">
                      {slot.calories} kcal
                    </div>
                    <div className="text-[10px] font-mono tabular-nums text-slate-400 flex items-center gap-1.5 justify-end">
                      <span className="text-sky-400">P {slot.protein}g</span>
                      <span>•</span>
                      <span className="text-emerald-400">C {slot.carbs}g</span>
                      <span>•</span>
                      <span className="text-rose-400">F {slot.fat}g</span>
                    </div>
                  </div>
                </div>

                {/* Items Drawer */}
                {isExpanded && (
                  <div className="border-t border-white/[0.06] bg-[#16181D]/60 divide-y divide-white/[0.04]">
                    {slot.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-2 px-4 text-xs"
                      >
                        <div>
                          <div className="font-medium text-slate-200">
                            {item.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {item.amount}
                          </div>
                        </div>
                        <div className="text-right font-mono tabular-nums">
                          <div className="text-slate-200 font-semibold">
                            {item.calories} kcal
                          </div>
                          <div className="text-[10px] text-slate-400">
                            P {item.protein} C {item.carbs} F {item.fat}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="p-2 flex justify-center">
                      <button
                        type="button"
                        className="w-full py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-400" />
                        <span>Add item to {slot.name}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Thumb Dock */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-[#1B1D22]/95 backdrop-blur-md border-t border-white/[0.08] px-6 py-2.5 flex items-center justify-between z-20">
        <div className="flex items-center justify-around flex-1">
          <button className="flex flex-col items-center gap-1 text-amber-400">
            <Flame className="w-5 h-5" />
            <span className="text-[10px] font-medium">Dashboard</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200">
            <Barcode className="w-5 h-5" />
            <span className="text-[10px] font-medium">Scan</span>
          </button>
        </div>

        {/* Center Elevate Action Button */}
        <div className="px-3">
          <button
            type="button"
            className="w-12 h-12 -mt-5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-400/20 active:scale-95 transition-all"
            aria-label="Quick Add"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        <div className="flex items-center justify-around flex-1">
          <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span className="text-[10px] font-medium">AI Meal</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200">
            <Search className="w-5 h-5" />
            <span className="text-[10px] font-medium">Search</span>
          </button>
        </div>
      </div>
    </div>
  );
}
