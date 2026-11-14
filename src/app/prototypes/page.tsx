"use client";

import React, { useState } from "react";
import { VariantBento } from "@/components/prototypes/variant-bento";
import { VariantBars } from "@/components/prototypes/variant-bars";
import { VariantTimeline } from "@/components/prototypes/variant-timeline";
import { Sparkles, Smartphone, ShieldCheck, ToggleLeft, ToggleRight } from "lucide-react";

export type VariantType = "bento" | "bars" | "timeline";

export default function PrototypesPage() {
  const [activeVariant, setActiveVariant] = useState<VariantType>("bento");
  const [isOverTarget, setIsOverTarget] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-[#0E0F12] text-slate-100 flex flex-col items-center py-6 px-3">
      {/* Top Banner / Variant Switcher Toolbar */}
      <header className="w-full max-w-xl mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#1B1D22] border border-white/[0.08] rounded-2xl p-4 shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-amber-400/10 text-amber-400">
                <Sparkles className="w-4 h-4" />
              </span>
              <h1 className="text-base font-bold tracking-tight text-white">
                MacroFactor UI Prototypes
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Select a mobile layout variant to preview adherence-neutral ergonomics.
            </p>
          </div>

          {/* Adherence-Neutral Surplus Simulator Toggle */}
          <button
            type="button"
            onClick={() => setIsOverTarget(!isOverTarget)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono transition-colors text-slate-300 self-start sm:self-auto"
            aria-pressed={isOverTarget}
          >
            {isOverTarget ? (
              <ToggleRight className="w-4 h-4 text-amber-400" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-slate-500" />
            )}
            <span>
              {isOverTarget ? "Surplus Mode (+180 kcal)" : "Normal Mode (520 kcal left)"}
            </span>
          </button>
        </div>

        {/* Tab Switcher for the 3 Variants */}
        <div
          role="tablist"
          aria-label="Prototype Variants"
          className="grid grid-cols-3 gap-2 bg-[#16181D] border border-white/[0.08] p-1.5 rounded-xl"
        >
          <button
            role="tab"
            aria-selected={activeVariant === "bento"}
            onClick={() => setActiveVariant("bento")}
            className={`py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              activeVariant === "bento"
                ? "bg-[#1B1D22] text-amber-400 shadow-md border border-white/[0.1]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Bento
          </button>

          <button
            role="tab"
            aria-selected={activeVariant === "bars"}
            onClick={() => setActiveVariant("bars")}
            className={`py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              activeVariant === "bars"
                ? "bg-[#1B1D22] text-amber-400 shadow-md border border-white/[0.1]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Macro Bars
          </button>

          <button
            role="tab"
            aria-selected={activeVariant === "timeline"}
            onClick={() => setActiveVariant("timeline")}
            className={`py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              activeVariant === "timeline"
                ? "bg-[#1B1D22] text-amber-400 shadow-md border border-white/[0.1]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Timeline
          </button>
        </div>
      </header>

      {/* Mobile Device Frame & Prototype Stage */}
      <main className="w-full max-w-[430px] flex flex-col items-center">
        <div className="w-full flex items-center justify-between text-[11px] text-slate-500 px-2 mb-2 font-mono">
          <span className="flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5" /> 390 x 844 (iPhone 15 Pro)
          </span>
          <span className="flex items-center gap-1 text-emerald-400/80">
            <ShieldCheck className="w-3.5 h-3.5" /> Adherence Neutral
          </span>
        </div>

        {/* Prototype Stage Element */}
        <div
          data-testid="prototype-stage"
          data-variant={activeVariant}
          className="w-full min-h-[720px] rounded-[36px] bg-[#121316] border-[6px] border-[#22252C] shadow-2xl overflow-hidden relative"
        >
          {activeVariant === "bento" && <VariantBento isOverTarget={isOverTarget} />}
          {activeVariant === "bars" && <VariantBars isOverTarget={isOverTarget} />}
          {activeVariant === "timeline" && <VariantTimeline isOverTarget={isOverTarget} />}
        </div>
      </main>
    </div>
  );
}
