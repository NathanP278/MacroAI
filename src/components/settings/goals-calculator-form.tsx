"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, Check, Flame, Dumbbell, Wheat, Droplets, Leaf } from 'lucide-react';
import { db } from '@/lib/db/macroai-db';
import {
  calculateMifflinStJeorTargets,
  DEFAULT_RDA_MICROS,
  ACTIVITY_LEVELS,
  GOAL_DELTAS,
} from '@/lib/nutrition/goals';
import { triggerHaptic } from '@/lib/motion';
import type { UserGoals, UserProfile } from '@/types/nutrition';

export function GoalsCalculatorForm() {
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState<number>(30);
  const [weightKg, setWeightKg] = useState<number>(75);
  const [heightCm, setHeightCm] = useState<number>(175);
  const [activityMultiplier, setActivityMultiplier] = useState<number>(1.55);
  const [goalDeltaKcal, setGoalDeltaKcal] = useState<number>(-300);
  const [proteinPerKg, setProteinPerKg] = useState<number>(2.0);
  const [touched, setTouched] = useState<{
    age?: boolean;
    weightKg?: boolean;
    heightCm?: boolean;
    proteinPerKg?: boolean;
  }>({});

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing profile from active goals on mount
  useEffect(() => {
    async function loadGoals() {
      try {
        const goals = await db.userGoals.get('active');
        if (goals?.profile) {
          const p = goals.profile;
          setSex(p.sex ?? 'male');
          setAge(p.age ?? 30);
          setWeightKg(p.weightKg ?? 75);
          setHeightCm(p.heightCm ?? 175);
          setActivityMultiplier(p.activityMultiplier ?? 1.55);
          setGoalDeltaKcal(p.goalDeltaKcal ?? 0);
          setProteinPerKg(p.proteinPerKg ?? 2.0);
        }
      } catch (err) {
        console.error('Failed to load user goals profile:', err);
      }
    }
    loadGoals();
  }, []);

  const targets = useMemo(() => {
    return calculateMifflinStJeorTargets({
      sex,
      age,
      weightKg,
      heightCm,
      activityMultiplier,
      goalDeltaKcal,
      proteinPerKg,
    });
  }, [sex, age, weightKg, heightCm, activityMultiplier, goalDeltaKcal, proteinPerKg]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const existing = await db.userGoals.get('active');
      const profile: UserProfile = {
        sex,
        age,
        weightKg,
        heightCm,
        activityMultiplier,
        goalDeltaKcal,
        proteinPerKg,
      };

      const updatedGoals: UserGoals = {
        ...(existing ?? {}),
        id: 'active',
        dailyCalories: targets.dailyCalories,
        proteinG: targets.proteinG,
        carbsG: targets.carbsG,
        fatG: targets.fatG,
        fiberG: targets.fiberG,
        micronutrientTargets: existing?.micronutrientTargets ?? { ...DEFAULT_RDA_MICROS },
        mealSlots: existing?.mealSlots ?? [],
        targetMode: existing?.targetMode ?? 'calculator',
        goalDeltaKcal,
        profile,
        updatedAt: Date.now(),
      };

      await db.userGoals.put(updatedGoals);
      triggerHaptic(10);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save user goals:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-2xl bg-[var(--macro-calories)]/15 flex items-center justify-center text-[var(--macro-calories)] shrink-0">
          <Calculator className="w-4 h-4" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground tracking-tight">Goals & TDEE Calculator</h2>
          <p className="text-xs text-muted-foreground">Mifflin-St Jeor metabolic target estimation</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Profile Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="goals-sex" className="block text-xs font-medium text-muted-foreground mb-1.5">
              Biological Sex
            </label>
            <select
              id="goals-sex"
              aria-label="Biological Sex"
              value={sex}
              onChange={(e) => setSex(e.target.value as 'male' | 'female')}
              className="w-full h-10 px-3.5 text-base sm:text-sm rounded-xl bg-surface-sub focus:outline-none focus:ring-2 focus:ring-ring text-foreground transition-shadow"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <div>
            <label htmlFor="goals-age" className="block text-xs font-medium text-muted-foreground mb-1.5">
              Age (years)
            </label>
            <input
              id="goals-age"
              aria-label="Age"
              type="number"
              min={12}
              max={120}
              value={age || ''}
              onChange={(e) => setAge(Math.max(1, parseInt(e.target.value) || 0))}
              onBlur={() => setTouched((prev) => ({ ...prev, age: true }))}
              className="w-full h-10 px-3.5 text-base sm:text-sm tabular-nums rounded-xl bg-surface-sub focus:outline-none focus:ring-2 focus:ring-ring text-foreground transition-shadow"
            />
            {touched.age && (age < 12 || age > 120) && (
              <p className="text-[11px] text-[var(--neutral-over)] mt-1">
                Typical adult range: 12–120 years.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="goals-weight" className="block text-xs font-medium text-muted-foreground mb-1.5">
              Weight (kg)
            </label>
            <input
              id="goals-weight"
              aria-label="Weight"
              type="number"
              step="0.5"
              min={30}
              max={300}
              value={weightKg || ''}
              onChange={(e) => setWeightKg(Math.max(1, parseFloat(e.target.value) || 0))}
              onBlur={() => setTouched((prev) => ({ ...prev, weightKg: true }))}
              className="w-full h-10 px-3.5 text-base sm:text-sm tabular-nums rounded-xl bg-surface-sub focus:outline-none focus:ring-2 focus:ring-ring text-foreground transition-shadow"
            />
            {touched.weightKg && (weightKg < 30 || weightKg > 300) && (
              <p className="text-[11px] text-[var(--neutral-over)] mt-1">
                Typical range: 30–300 kg.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="goals-height" className="block text-xs font-medium text-muted-foreground mb-1.5">
              Height (cm)
            </label>
            <input
              id="goals-height"
              aria-label="Height"
              type="number"
              min={100}
              max={250}
              value={heightCm || ''}
              onChange={(e) => setHeightCm(Math.max(1, parseInt(e.target.value) || 0))}
              onBlur={() => setTouched((prev) => ({ ...prev, heightCm: true }))}
              className="w-full h-10 px-3.5 text-base sm:text-sm tabular-nums rounded-xl bg-surface-sub focus:outline-none focus:ring-2 focus:ring-ring text-foreground transition-shadow"
            />
            {touched.heightCm && (heightCm < 100 || heightCm > 250) && (
              <p className="text-[11px] text-[var(--neutral-over)] mt-1">
                Typical range: 100–250 cm.
              </p>
            )}
          </div>
        </div>

        {/* Activity & Target Delta */}
        <div className="space-y-3">
          <div>
            <label htmlFor="goals-activity" className="block text-xs font-medium text-muted-foreground mb-1.5">
              Activity Level
            </label>
            <select
              id="goals-activity"
              aria-label="Activity Level"
              value={activityMultiplier}
              onChange={(e) => setActivityMultiplier(parseFloat(e.target.value))}
              className="w-full h-10 px-3.5 text-base sm:text-sm rounded-xl bg-surface-sub focus:outline-none focus:ring-2 focus:ring-ring text-foreground transition-shadow"
            >
              {ACTIVITY_LEVELS.map((act) => (
                <option key={act.value} value={act.value}>
                  {act.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="goals-delta" className="block text-xs font-medium text-muted-foreground mb-1.5">
              Caloric Goal / Target Delta
            </label>
            <select
              id="goals-delta"
              aria-label="Caloric Goal"
              value={goalDeltaKcal}
              onChange={(e) => setGoalDeltaKcal(parseInt(e.target.value))}
              className="w-full h-10 px-3.5 text-base sm:text-sm rounded-xl bg-surface-sub focus:outline-none focus:ring-2 focus:ring-ring text-foreground transition-shadow"
            >
              {GOAL_DELTAS.map((delta) => (
                <option key={delta.value} value={delta.value}>
                  {delta.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="goals-protein-per-kg" className="text-xs font-medium text-muted-foreground">
                Protein per kg
              </label>
              <span className="text-xs text-muted-foreground tabular-nums">
                {proteinPerKg.toFixed(1)} g/kg
              </span>
            </div>
            <input
              id="goals-protein-per-kg"
              aria-label="Protein per kg"
              type="number"
              step="0.1"
              min={1.0}
              max={3.5}
              value={proteinPerKg || ''}
              onChange={(e) => setProteinPerKg(Math.max(0.5, parseFloat(e.target.value) || 0))}
              onBlur={() => setTouched((prev) => ({ ...prev, proteinPerKg: true }))}
              className="w-full h-10 px-3.5 text-base sm:text-sm tabular-nums rounded-xl bg-surface-sub focus:outline-none focus:ring-2 focus:ring-ring text-foreground transition-shadow"
            />
            {touched.proteinPerKg && (proteinPerKg < 1.0 || proteinPerKg > 3.5) && (
              <p className="text-[11px] text-[var(--neutral-over)] mt-1">
                Recommended protein calibration band: 1.0–3.5 g/kg.
              </p>
            )}
          </div>
        </div>

        {/* Calculated Targets Preview */}
        <div className="bg-surface-sub rounded-2xl p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Target Daily Nutrition</span>
            <span className="inline-flex items-center gap-1 text-sm font-bold text-foreground tabular-nums">
              <Flame className="w-3.5 h-3.5 text-[var(--macro-calories)]" aria-hidden="true" />
              {targets.dailyCalories} kcal
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-card text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-[var(--macro-protein)] font-semibold">
                <Dumbbell className="w-3 h-3" aria-hidden="true" />
                <span>Protein</span>
              </div>
              <p className="text-sm font-bold text-foreground tabular-nums mt-0.5">{targets.proteinG}g</p>
            </div>

            <div className="p-3 rounded-xl bg-card text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-[var(--macro-fat)] font-semibold">
                <Droplets className="w-3 h-3" aria-hidden="true" />
                <span>Fat</span>
              </div>
              <p className="text-sm font-bold text-foreground tabular-nums mt-0.5">{targets.fatG}g</p>
            </div>

            <div className="p-3 rounded-xl bg-card text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-[var(--macro-carbs)] font-semibold">
                <Wheat className="w-3 h-3" aria-hidden="true" />
                <span>Carbs</span>
              </div>
              <p className="text-sm font-bold text-foreground tabular-nums mt-0.5">{targets.carbsG}g</p>
            </div>

            <div className="p-3 rounded-xl bg-card text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-[var(--macro-fiber)] font-semibold">
                <Leaf className="w-3 h-3" aria-hidden="true" />
                <span>Fiber</span>
              </div>
              <p className="text-sm font-bold text-foreground tabular-nums mt-0.5">{targets.fiberG}g</p>
            </div>
          </div>
        </div>

        {/* Action Button & Status */}
        <button
          type="submit"
          disabled={isSaving}
          className="tactile-press w-full h-11 px-4 rounded-full bg-foreground text-background font-semibold text-[13px] hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
        >
          {savedSuccess ? (
            <span className="animate-check-pop inline-flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[var(--macro-carbs)]" aria-hidden="true" />
              <span>Goals Saved!</span>
            </span>
          ) : (
            <span>Save Nutrition Goals</span>
          )}
        </button>
      </form>
    </section>
  );
}
