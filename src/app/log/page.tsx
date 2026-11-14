"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { Calendar, ChevronLeft, ChevronRight, Plus, Utensils } from "lucide-react";

export default function LogPage() {
  const [selectedDate] = useState("Today, Nov 14");

  return (
    <AppShell>
      <div className="flex flex-col gap-4 p-4">
        {/* Header & Date Switcher */}
        <header className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-base font-bold tracking-tight text-foreground">Food Log</h1>
            <p className="text-[11px] text-muted-foreground">Adherence-neutral chronological diary</p>
          </div>
          <div className="flex items-center gap-1 bg-[#1B1D22] border border-white/[0.08] px-2 py-1 rounded-xl">
            <button
              type="button"
              aria-label="Previous day"
              className="p-1 rounded text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-1">{selectedDate}</span>
            <button
              type="button"
              aria-label="Next day"
              className="p-1 rounded text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Daily Summary Pill */}
        <div className="bg-[#1B1D22] border border-white/[0.08] rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground">Total Consumed</span>
            <div className="text-xl font-bold tabular-nums text-foreground mt-0.5">
              1,680 <span className="text-xs font-normal text-muted-foreground">/ 2,200 kcal</span>
            </div>
          </div>
          <div className="flex gap-3 text-right font-mono text-xs">
            <div>
              <div className="text-sky-400 font-semibold tabular-nums">133g</div>
              <div className="text-[10px] text-muted-foreground">Pro</div>
            </div>
            <div>
              <div className="text-emerald-400 font-semibold tabular-nums">139g</div>
              <div className="text-[10px] text-muted-foreground">Carb</div>
            </div>
            <div>
              <div className="text-rose-400 font-semibold tabular-nums">51g</div>
              <div className="text-[10px] text-muted-foreground">Fat</div>
            </div>
          </div>
        </div>

        {/* Timeline Log Feed Placeholder */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            <span>Logged Entries</span>
            <span>4 items</span>
          </div>

          <div className="bg-[#1B1D22] border border-white/[0.08] rounded-2xl p-4 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-white/[0.04] mx-auto flex items-center justify-center text-muted-foreground">
              <Utensils className="w-5 h-5" />
            </div>
            <p className="text-xs text-foreground font-medium">Daily Food Log Ready</p>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
              Tap the center + button in the dock below to add foods using AI scanning, barcode scanner, or quick search.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
