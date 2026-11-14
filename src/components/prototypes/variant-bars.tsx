"use client";

import React from "react";
import {
  normalDayData,
  overTargetDayData,
  mockMealSlots,
} from "./mock-data";
import {
  Plus,
  Flame,
  Sparkles,
  Barcode,
  Search,
  Sliders,
  Layers,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";

interface VariantProps {
  isOverTarget: boolean;
}

export function VariantBars({ isOverTarget }: VariantProps) {
  const data = isOverTarget ? overTargetDayData : normalDayData;

  const calRemaining = data.calories.target - data.calories.consumed;

  const nutrients = [
    {
      name: "Calories",
      consumed: data.calories.consumed,
      target: data.calories.target,
      unit: "kcal",
      colorClass: "bg-amber-400",
      textClass: "text-amber-400",
      borderClass: "border-amber-400/20",
    },
    {
      name: "Protein",
      consumed: data.protein.consumed,
      target: data.protein.target,
      unit: "g",
      colorClass: "bg-sky-400",
      textClass: "text-sky-400",
      borderClass: "border-sky-400/20",
    },
    {
      name: "Carbohydrates",
      consumed: data.carbs.consumed,
      target: data.carbs.target,
      unit: "g",
      colorClass: "bg-emerald-400",
      textClass: "text-emerald-400",
      borderClass: "border-emerald-400/20",
    },
    {
      name: "Fat",
      consumed: data.fat.consumed,
      target: data.fat.target,
      unit: "g",
      colorClass: "bg-rose-400",
      textClass: "text-rose-400",
      borderClass: "border-rose-400/20",
    },
  ];

  return (
    <div className="flex flex-col min-h-full pb-24 text-slate-100 select-none">
      {/* Top Bar Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold tracking-tight text-slate-200">
            Macro Factor Bars
          </span>
        </div>
        <div className="text-xs font-mono tabular-nums text-slate-400">
          Target Mode: Active
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Calorie Headline Banner */}
        <div className="rounded-2xl bg-[#1B1D22] border border-white/[0.08] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Daily Energy Target
            </span>
            <span className="text-xs font-mono font-medium text-amber-400 tabular-nums">
              {calRemaining >= 0
                ? `${calRemaining.toLocaleString()} kcal remaining`
                : `+${Math.abs(calRemaining).toLocaleString()} kcal surplus`}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-3xl font-extrabold font-mono tabular-nums text-white">
              {data.calories.consumed.toLocaleString()}
            </span>
            <span className="text-sm font-mono text-slate-400 tabular-nums">
              / {data.calories.target.toLocaleString()} kcal
            </span>
          </div>

          {/* Calorie Progress Bar with neutral overflow mark */}
          <div className="relative mt-3 h-2.5 w-full bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (data.calories.consumed / data.calories.target) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Detailed Horizontal Macro Progress Bars */}
        <div className="rounded-2xl bg-[#1B1D22] border border-white/[0.08] p-4 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Macronutrient Breakdown
            </span>
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {nutrients.map((n) => {
            const percent = Math.round((n.consumed / n.target) * 100);
            const delta = n.target - n.consumed;
            const isOver = delta < 0;

            return (
              <div key={n.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{n.name}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${n.borderClass} border bg-white/[0.02] ${n.textClass}`}>
                      {percent}%
                    </span>
                  </div>
                  <div className="font-mono tabular-nums text-right">
                    <span className="font-bold text-white">
                      {n.consumed}{n.unit}
                    </span>
                    <span className="text-slate-500"> / {n.target}{n.unit}</span>
                  </div>
                </div>

                {/* Progress bar with threshold indicator */}
                <div className="relative h-2 w-full bg-white/[0.08] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${n.colorClass} rounded-full transition-all duration-300`}
                    style={{ width: `${Math.min(100, percent)}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] font-mono tabular-nums text-slate-400">
                  <span>{percent}% fulfilled</span>
                  <span className={isOver ? `${n.textClass} font-semibold` : ""}>
                    {isOver ? `+${Math.abs(delta)}${n.unit} over target` : `${delta}${n.unit} left`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Remaining Distribution (Fitia-style) */}
        <div className="rounded-2xl bg-[#16181D] border border-white/[0.06] p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-slate-200">
                Remaining Meal Allocation
              </span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-[11px] text-slate-400 mb-3">
            Dynamically distributed budget for upcoming Dinner:
          </p>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <div className="text-[10px] text-slate-400">Calories</div>
              <div className="font-mono font-bold text-xs tabular-nums text-amber-400">
                {Math.max(0, calRemaining)}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <div className="text-[10px] text-slate-400">Protein</div>
              <div className="font-mono font-bold text-xs tabular-nums text-sky-400">
                {Math.max(0, data.protein.target - data.protein.consumed)}g
              </div>
            </div>
            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <div className="text-[10px] text-slate-400">Carbs</div>
              <div className="font-mono font-bold text-xs tabular-nums text-emerald-400">
                {Math.max(0, data.carbs.target - data.carbs.consumed)}g
              </div>
            </div>
            <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <div className="text-[10px] text-slate-400">Fat</div>
              <div className="font-mono font-bold text-xs tabular-nums text-rose-400">
                {Math.max(0, data.fat.target - data.fat.consumed)}g
              </div>
            </div>
          </div>
        </div>

        {/* Meal Rows */}
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
            Logged Entries
          </div>
          {mockMealSlots.map((slot) => (
            <div
              key={slot.id}
              className="p-3.5 rounded-xl bg-[#1B1D22] border border-white/[0.08] flex items-center justify-between"
            >
              <div>
                <div className="text-sm font-semibold text-white">
                  {slot.name}
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  {slot.time} • {slot.items.length} items
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold font-mono tabular-nums text-amber-400">
                  {slot.calories} kcal
                </div>
                <div className="text-[10px] font-mono tabular-nums text-slate-400">
                  P {slot.protein}g • C {slot.carbs}g • F {slot.fat}g
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Bottom Action Dock */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-[#1B1D22]/95 backdrop-blur-md border-t border-white/[0.08] px-6 py-2.5 flex items-center justify-between z-20">
        <div className="flex items-center justify-around flex-1">
          <button className="flex flex-col items-center gap-1 text-amber-400">
            <Flame className="w-5 h-5" />
            <span className="text-[10px] font-medium">Bars</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200">
            <Barcode className="w-5 h-5" />
            <span className="text-[10px] font-medium">Barcode</span>
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
            <span className="text-[10px] font-medium">AI Scan</span>
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
