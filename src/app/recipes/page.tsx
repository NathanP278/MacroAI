"use client";

import React from "react";
import { AppShell } from "@/components/shell/app-shell";
import { ChefHat, Plus, Search, BookOpen } from "lucide-react";

export default function RecipesPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-4 p-4">
        {/* Header */}
        <header className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-base font-bold tracking-tight text-foreground">Recipes & Custom Foods</h1>
            <p className="text-[11px] text-muted-foreground">Offline recipe book and custom ingredients</p>
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#121316] text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create</span>
          </button>
        </header>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search saved recipes..."
            className="w-full bg-[#1B1D22] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>

        {/* Empty State / Library Placeholder */}
        <div className="bg-[#1B1D22] border border-white/[0.08] rounded-2xl p-6 text-center space-y-2 mt-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 mx-auto flex items-center justify-center text-amber-400">
            <ChefHat className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Recipe Book</h2>
          <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
            Build custom composite meals with calculated macro targets and serving portions. Stored 100% offline in IndexedDB.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
