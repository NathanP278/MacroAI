"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppShell, QuickActionType } from "@/components/shell/app-shell";
import {
  Calendar,
  Sparkles,
  ChevronRight,
  Plus,
  Flame,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

interface FoodItem {
  id: string;
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealSlot {
  name: string;
  suggestedCalories: number;
  consumedCalories: number;
  items: FoodItem[];
}

const INITIAL_MEALS: MealSlot[] = [
  {
    name: "Breakfast",
    suggestedCalories: 550,
    consumedCalories: 520,
    items: [
      { id: "1", name: "Rolled Oats & Whey", portion: "80g oats, 30g whey", calories: 410, protein: 36, carbs: 54, fat: 6 },
      { id: "2", name: "Black Coffee & Honey", portion: "1 mug, 1 tsp", calories: 110, protein: 0, carbs: 17, fat: 0 },
    ],
  },
  {
    name: "Lunch",
    suggestedCalories: 750,
    consumedCalories: 710,
    items: [
      { id: "3", name: "Grilled Chicken Breast Bowl", portion: "200g chicken, 180g jasmine rice", calories: 540, protein: 55, carbs: 52, fat: 7 },
      { id: "4", name: "Avocado & Olive Oil Slaw", portion: "60g avocado", calories: 170, protein: 2, carbs: 8, fat: 15 },
    ],
  },
  {
    name: "Dinner",
    suggestedCalories: 650,
    consumedCalories: 450,
    items: [
      { id: "5", name: "Atlantic Salmon Fillet", portion: "180g", calories: 370, protein: 38, carbs: 0, fat: 22 },
      { id: "6", name: "Steamed Asparagus", portion: "120g", calories: 80, protein: 4, carbs: 8, fat: 1 },
    ],
  },
  {
    name: "Snacks",
    suggestedCalories: 250,
    consumedCalories: 0,
    items: [],
  },
];

export default function HomePage() {
  const [meals] = useState<MealSlot[]>(INITIAL_MEALS);
  const [activeActionNotice, setActiveActionNotice] = useState<string | null>(null);

  const targetCalories = 2200;
  const consumedCalories = meals.reduce((acc, m) => acc + m.consumedCalories, 0);
  const remainingCalories = targetCalories - consumedCalories;

  const targetProtein = 180;
  const consumedProtein = 133;

  const targetCarbs = 225;
  const consumedCarbs = 139;

  const targetFat = 65;
  const consumedFat = 51;

  const handleQuickAction = (action: QuickActionType) => {
    setActiveActionNotice(`Triggered: ${action}`);
    setTimeout(() => setActiveActionNotice(null), 3000);
  };

  return (
    <AppShell onQuickAction={handleQuickAction}>
      <div className="flex flex-col gap-4 p-4">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 font-black text-sm">
              M
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
                Today <span className="text-[10px] text-muted-foreground font-normal">Wed, Nov 14</span>
              </h1>
              <p className="text-[10px] text-emerald-400/90 flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3 h-3" /> Adherence Neutral
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/prototypes"
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-[#1B1D22] border border-white/[0.08] text-amber-400 hover:text-amber-300 transition-colors"
            >
              Prototypes &rarr;
            </Link>
          </div>
        </header>

        {activeActionNotice && (
          <div className="bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs px-3 py-2 rounded-xl animate-in fade-in duration-150">
            {activeActionNotice}
          </div>
        )}

        {/* Hero Hat: Energy Balance Summary */}
        <section className="bg-[#1B1D22] border border-white/[0.08] rounded-3xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Energy Balance</span>
            </div>
            <div className="text-[11px] font-mono text-muted-foreground">
              Target: <span className="tabular-nums text-foreground">{targetCalories}</span> kcal
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
            <div>
              <div className="text-3xl font-extrabold tracking-tight tabular-nums text-foreground">
                {remainingCalories >= 0 ? remainingCalories : `+${Math.abs(remainingCalories)}`}
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                {remainingCalories >= 0 ? "calories remaining" : "neutral surplus intake"}
              </div>
            </div>

            <div className="flex flex-col items-end text-right">
              <div className="text-base font-bold tabular-nums text-amber-400">
                {consumedCalories}
                <span className="text-xs text-muted-foreground ml-1">/ {targetCalories} kcal</span>
              </div>
              {/* Neutral progress bar */}
              <div className="w-full bg-[#16181D] h-2.5 rounded-full mt-1.5 overflow-hidden border border-white/[0.04]">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.round((consumedCalories / targetCalories) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid: Protein, Carbs, Fat */}
        <section className="grid grid-cols-3 gap-2.5">
          {/* Protein */}
          <div className="bg-[#1B1D22] border border-white/[0.08] rounded-2xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] font-semibold text-sky-400">
              <span>Protein</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {Math.max(0, targetProtein - consumedProtein)}g left
              </span>
            </div>
            <div className="my-2">
              <div className="text-lg font-bold tabular-nums text-foreground">
                {consumedProtein}
                <span className="text-[10px] text-muted-foreground ml-0.5">/ {targetProtein}g</span>
              </div>
            </div>
            <div className="w-full bg-[#16181D] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-sky-400 h-full rounded-full"
                style={{ width: `${Math.min(100, (consumedProtein / targetProtein) * 100)}%` }}
              />
            </div>
          </div>

          {/* Carbs */}
          <div className="bg-[#1B1D22] border border-white/[0.08] rounded-2xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-400">
              <span>Carbs</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {Math.max(0, targetCarbs - consumedCarbs)}g left
              </span>
            </div>
            <div className="my-2">
              <div className="text-lg font-bold tabular-nums text-foreground">
                {consumedCarbs}
                <span className="text-[10px] text-muted-foreground ml-0.5">/ {targetCarbs}g</span>
              </div>
            </div>
            <div className="w-full bg-[#16181D] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full"
                style={{ width: `${Math.min(100, (consumedCarbs / targetCarbs) * 100)}%` }}
              />
            </div>
          </div>

          {/* Fat */}
          <div className="bg-[#1B1D22] border border-white/[0.08] rounded-2xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] font-semibold text-rose-400">
              <span>Fat</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {Math.max(0, targetFat - consumedFat)}g left
              </span>
            </div>
            <div className="my-2">
              <div className="text-lg font-bold tabular-nums text-foreground">
                {consumedFat}
                <span className="text-[10px] text-muted-foreground ml-0.5">/ {targetFat}g</span>
              </div>
            </div>
            <div className="w-full bg-[#16181D] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-rose-400 h-full rounded-full"
                style={{ width: `${Math.min(100, (consumedFat / targetFat) * 100)}%` }}
              />
            </div>
          </div>
        </section>

        {/* Meal Slots Section */}
        <section className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Meal Log
            </h2>
            <Link href="/log" className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center">
              View Log <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {meals.map((meal) => (
              <div
                key={meal.name}
                className="bg-[#1B1D22] border border-white/[0.08] rounded-2xl p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground">{meal.name}</span>
                    <span className="text-[11px] text-muted-foreground tabular-nums ml-2">
                      {meal.consumedCalories} kcal
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickAction("quick-add")}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
                    aria-label={`Add item to ${meal.name}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {meal.items.length > 0 ? (
                  <div className="space-y-1.5">
                    {meal.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-[#16181D] border border-white/[0.03]"
                      >
                        <span className="text-foreground truncate max-w-[200px]">
                          {item.name}
                        </span>
                        <span className="text-muted-foreground tabular-nums font-mono text-[11px]">
                          {item.calories} kcal
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground italic py-1">
                    No foods logged yet for {meal.name}.
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
