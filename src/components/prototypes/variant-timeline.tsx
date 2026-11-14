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
  Clock,
  Calendar,
  Sparkle,
} from "lucide-react";

interface VariantProps {
  isOverTarget: boolean;
}

export function VariantTimeline({ isOverTarget }: VariantProps) {
  const data = isOverTarget ? overTargetDayData : normalDayData;
  const calRemaining = data.calories.target - data.calories.consumed;

  return (
    <div className="flex flex-col min-h-full pb-24 text-slate-100 select-none">
      {/* Sticky Compact Top HUD */}
      <div className="sticky top-0 z-10 bg-[#121316]/95 backdrop-blur-md border-b border-white/[0.08] px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Chronological Feed
            </span>
          </div>
          <div className="text-[11px] font-mono tabular-nums text-slate-400">
            {calRemaining >= 0
              ? `${calRemaining} kcal left`
              : `+${Math.abs(calRemaining)} kcal surplus`}
          </div>
        </div>

        {/* Compact Mini Macro Metrics Bar */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-1.5 rounded-lg bg-[#1B1D22] border border-white/[0.06]">
            <div className="text-[9px] uppercase tracking-wider text-amber-400 font-bold">
              Cal
            </div>
            <div className="font-mono font-bold tabular-nums text-white">
              {data.calories.consumed}
            </div>
          </div>
          <div className="p-1.5 rounded-lg bg-[#1B1D22] border border-white/[0.06]">
            <div className="text-[9px] uppercase tracking-wider text-sky-400 font-bold">
              Prot
            </div>
            <div className="font-mono font-bold tabular-nums text-white">
              {data.protein.consumed}g
            </div>
          </div>
          <div className="p-1.5 rounded-lg bg-[#1B1D22] border border-white/[0.06]">
            <div className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold">
              Carb
            </div>
            <div className="font-mono font-bold tabular-nums text-white">
              {data.carbs.consumed}g
            </div>
          </div>
          <div className="p-1.5 rounded-lg bg-[#1B1D22] border border-white/[0.06]">
            <div className="text-[9px] uppercase tracking-wider text-rose-400 font-bold">
              Fat
            </div>
            <div className="font-mono font-bold tabular-nums text-white">
              {data.fat.consumed}g
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="p-4 relative">
        {/* Continuous Vertical Rail */}
        <div className="absolute left-[29px] top-6 bottom-6 w-0.5 bg-white/[0.08]" />

        <div className="space-y-6 relative">
          {/* Fasting / Start of Day Marker */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-[#1B1D22] border border-white/[0.12] flex items-center justify-center text-slate-400 z-10">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Fasting window broken at 08:30 AM (14h 20m fast)
            </div>
          </div>

          {/* Timeline Meal Items */}
          {mockMealSlots.map((slot) => (
            <div key={slot.id} className="flex items-start gap-3">
              <div className="w-7 h-7 -mt-0.5 rounded-full bg-[#1B1D22] border border-amber-400/40 text-amber-400 flex items-center justify-center font-mono text-[10px] font-bold z-10 shadow-sm shadow-amber-400/10">
                <Flame className="w-3.5 h-3.5" />
              </div>

              <div className="flex-1 rounded-2xl bg-[#1B1D22] border border-white/[0.08] p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="text-sm font-bold text-white">
                      {slot.name}
                    </span>
                    <span className="text-xs font-mono text-slate-400 ml-2">
                      {slot.time}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-sm tabular-nums text-amber-400">
                    {slot.calories} kcal
                  </span>
                </div>

                <div className="text-[11px] font-mono tabular-nums text-slate-400 flex items-center gap-2 mb-3">
                  <span className="text-sky-400">P {slot.protein}g</span>
                  <span>•</span>
                  <span className="text-emerald-400">C {slot.carbs}g</span>
                  <span>•</span>
                  <span className="text-rose-400">F {slot.fat}g</span>
                </div>

                {/* Sub-item pills */}
                <div className="space-y-1.5 border-t border-white/[0.04] pt-2">
                  {slot.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs py-0.5"
                    >
                      <span className="text-slate-300">
                        {item.name}{" "}
                        <span className="text-slate-500 font-mono text-[10px]">
                          ({item.amount})
                        </span>
                      </span>
                      <span className="font-mono tabular-nums text-slate-400">
                        {item.calories}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Dynamic Budget Slot Recommendation in the stream */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 -mt-0.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 flex items-center justify-center font-mono text-[10px] font-bold z-10">
              <Sparkle className="w-3.5 h-3.5" />
            </div>

            <div className="flex-1 rounded-2xl bg-gradient-to-br from-[#16181D] to-[#1E2028] border border-purple-500/20 p-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-purple-300">
                  Upcoming: Dinner Budget
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Est. 7:30 PM
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mb-2">
                Dynamic Fitia-style allocation of remaining macros:
              </p>
              <div className="flex items-center gap-2 font-mono text-xs tabular-nums text-slate-200">
                <span className="text-amber-400 font-bold">
                  {Math.max(0, calRemaining)} kcal
                </span>
                <span>•</span>
                <span className="text-sky-400">
                  P {Math.max(0, data.protein.target - data.protein.consumed)}g
                </span>
                <span>•</span>
                <span className="text-emerald-400">
                  C {Math.max(0, data.carbs.target - data.carbs.consumed)}g
                </span>
                <span>•</span>
                <span className="text-rose-400">
                  F {Math.max(0, data.fat.target - data.fat.consumed)}g
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Action Dock */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-[#1B1D22]/95 backdrop-blur-md border-t border-white/[0.08] px-6 py-2.5 flex items-center justify-between z-20">
        <div className="flex items-center justify-around flex-1">
          <button className="flex flex-col items-center gap-1 text-amber-400">
            <Clock className="w-5 h-5" />
            <span className="text-[10px] font-medium">Timeline</span>
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
