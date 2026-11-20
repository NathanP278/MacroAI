import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { db } from '@/lib/db/macroai-db';
import { GoalsCalculatorForm } from '../goals-calculator-form';
import {
  DEFAULT_RDA_MICROS,
  calculateMifflinStJeorTargets,
} from '@/lib/nutrition/goals';

describe('GoalsCalculatorForm', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('renders calculator form, computes Mifflin-St Jeor targets, and saves to Dexie', async () => {
    render(<GoalsCalculatorForm />);

    // Check presence of form inputs
    expect(screen.getByLabelText(/biological sex/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/age/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/weight/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/height/i)).toBeInTheDocument();

    // Fill in custom profile
    fireEvent.change(screen.getByLabelText(/biological sex/i), { target: { value: 'female' } });
    fireEvent.change(screen.getByLabelText(/age/i), { target: { value: '28' } });
    fireEvent.change(screen.getByLabelText(/weight/i), { target: { value: '60' } });
    fireEvent.change(screen.getByLabelText(/height/i), { target: { value: '165' } });

    // Save button click
    const saveBtn = screen.getByRole('button', { name: /save nutrition goals/i });
    fireEvent.click(saveBtn);

    await waitFor(async () => {
      const activeGoals = await db.userGoals.get('active');
      expect(activeGoals).toBeDefined();
      expect(activeGoals?.profile?.sex).toBe('female');
      expect(activeGoals?.profile?.weightKg).toBe(60);
      expect(activeGoals?.dailyCalories).toBeGreaterThan(1200);
      expect(activeGoals?.proteinG).toBeGreaterThan(0);
    });
  });

  it('loads existing profile if present in Dexie', async () => {
    await db.userGoals.put({
      id: 'active',
      dailyCalories: 2350,
      proteinG: 170,
      carbsG: 240,
      fatG: 70,
      fiberG: 32,
      micronutrientTargets: { ...DEFAULT_RDA_MICROS },
      mealSlots: [],
      profile: {
        sex: 'male',
        age: 35,
        weightKg: 85,
        heightCm: 182,
        activityMultiplier: 1.55,
        goalDeltaKcal: 0,
        proteinPerKg: 2,
      },
      updatedAt: Date.now(),
    });

    render(<GoalsCalculatorForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/weight/i)).toHaveValue(85);
      expect(screen.getByLabelText(/age/i)).toHaveValue(35);
      expect(screen.getByLabelText(/height/i)).toHaveValue(182);
    });
  });

  it('preserves coached targets when toggling weight unit and saving preferences', async () => {
    const coachedAt = Date.now() - 86_400_000;
    await db.userGoals.put({
      id: 'active',
      dailyCalories: 2350,
      proteinG: 175,
      carbsG: 255,
      fatG: 70,
      fiberG: 33,
      micronutrientTargets: { ...DEFAULT_RDA_MICROS },
      mealSlots: [],
      targetMode: 'calculator',
      goalDeltaKcal: -250,
      weightUnit: 'kg',
      lastCheckInAt: coachedAt,
      profile: {
        sex: 'male',
        age: 30,
        weightKg: 75,
        heightCm: 175,
        activityMultiplier: 1.55,
        goalDeltaKcal: -250,
        proteinPerKg: 2.0,
      },
      updatedAt: Date.now(),
    });

    render(<GoalsCalculatorForm />);

    await waitFor(() => {
      expect(screen.getByText(/coached/i)).toBeInTheDocument();
      expect(screen.getByText(/2,350 kcal/i)).toBeInTheDocument();
    });

    // Toggle Weight Display Unit to lb
    fireEvent.click(screen.getByRole('button', { name: /^lb$/i }));

    // Save preferences without clicking Recalculate
    fireEvent.click(screen.getByRole('button', { name: /save nutrition goals/i }));

    await waitFor(async () => {
      const saved = await db.userGoals.get('active');
      expect(saved?.weightUnit).toBe('lb');
      expect(saved?.dailyCalories).toBe(2350);
      expect(saved?.proteinG).toBe(175);
      expect(saved?.carbsG).toBe(255);
      expect(saved?.fatG).toBe(70);
      expect(saved?.fiberG).toBe(33);
      expect(saved?.lastCheckInAt).toBe(coachedAt);
      expect(saved?.targetMode).toBe('calculator');
    });
  });

  it('recalculates and saves Mifflin-St Jeor targets only when explicitly requested', async () => {
    await db.userGoals.put({
      id: 'active',
      dailyCalories: 2350,
      proteinG: 175,
      carbsG: 255,
      fatG: 70,
      fiberG: 33,
      micronutrientTargets: { ...DEFAULT_RDA_MICROS },
      mealSlots: [],
      targetMode: 'calculator',
      goalDeltaKcal: 0,
      weightUnit: 'kg',
      lastCheckInAt: Date.now() - 86_400_000,
      profile: {
        sex: 'male',
        age: 30,
        weightKg: 80,
        heightCm: 180,
        activityMultiplier: 1.55,
        goalDeltaKcal: 0,
        proteinPerKg: 2.0,
      },
      updatedAt: Date.now(),
    });

    const expected = calculateMifflinStJeorTargets({
      sex: 'male',
      age: 30,
      weightKg: 80,
      heightCm: 180,
      activityMultiplier: 1.55,
      goalDeltaKcal: 0,
      proteinPerKg: 2.0,
    });

    render(<GoalsCalculatorForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/weight/i)).toHaveValue(80);
    });

    fireEvent.click(
      screen.getByRole('button', { name: /recalculate from mifflin-st jeor/i })
    );
    fireEvent.click(screen.getByRole('button', { name: /save nutrition goals/i }));

    await waitFor(async () => {
      const saved = await db.userGoals.get('active');
      expect(saved?.dailyCalories).toBe(expected.dailyCalories);
      expect(saved?.proteinG).toBe(expected.proteinG);
      expect(saved?.carbsG).toBe(expected.carbsG);
      expect(saved?.fatG).toBe(expected.fatG);
      expect(saved?.fiberG).toBe(expected.fiberG);
    });
  });

  it('saves direct custom targets, shared goalDeltaKcal, weekly calorie cycling, and custom micro/extended targets', async () => {
    render(<GoalsCalculatorForm />);

    // Switch to Custom Targets mode
    fireEvent.click(screen.getByRole('tab', { name: /custom targets/i }));

    fireEvent.change(screen.getByLabelText(/daily calories/i), {
      target: { value: '2150' },
    });
    fireEvent.change(screen.getByLabelText(/^protein \(g\)$/i), {
      target: { value: '165' },
    });
    fireEvent.change(screen.getByLabelText(/^carbs \(g\)$/i), {
      target: { value: '220' },
    });
    fireEvent.change(screen.getByLabelText(/^fat \(g\)$/i), {
      target: { value: '65' },
    });
    fireEvent.change(screen.getByLabelText(/^fiber \(g\)$/i), {
      target: { value: '32' },
    });

    // Set shared goal rate
    fireEvent.change(screen.getByLabelText(/goal rate/i), {
      target: { value: '-250' },
    });

    // Open Weekly Calorie Cycling editor and enable cycling
    fireEvent.click(screen.getByRole('button', { name: /weekly calorie cycling/i }));
    fireEvent.click(screen.getByLabelText(/enable weekly calorie cycling/i));
    fireEvent.click(screen.getByRole('button', { name: /higher weekend/i }));
    fireEvent.change(screen.getByLabelText(/fri calories/i), {
      target: { value: '2450' },
    });

    // Open Custom Micronutrient Targets editor and customize Sodium + Caffeine
    fireEvent.click(screen.getByRole('button', { name: /custom micronutrient targets/i }));
    fireEvent.change(screen.getByLabelText(/sodium \(mg\)/i), {
      target: { value: '2000' },
    });
    fireEvent.change(screen.getByLabelText(/caffeine \(mg\)/i), {
      target: { value: '300' },
    });

    // Save
    fireEvent.click(screen.getByRole('button', { name: /save nutrition goals/i }));

    await waitFor(async () => {
      const saved = await db.userGoals.get('active');
      expect(saved?.targetMode).toBe('custom');
      expect(saved?.dailyCalories).toBe(2150);
      expect(saved?.proteinG).toBe(165);
      expect(saved?.carbsG).toBe(220);
      expect(saved?.fatG).toBe(65);
      expect(saved?.fiberG).toBe(32);
      expect(saved?.goalDeltaKcal).toBe(-250);
      expect(saved?.weeklyCyclingEnabled).toBe(true);
      expect(saved?.weeklySchedule?.fri?.calories).toBe(2450);
      expect(saved?.micronutrientTargets?.sodiumMg).toBe(2000);
      expect(saved?.micronutrientTargets?.caffeineMg).toBe(300);
    });
  });

  it('resets custom micronutrient and extended targets back to Adult RDA defaults', async () => {
    await db.userGoals.put({
      id: 'active',
      dailyCalories: 2100,
      proteinG: 160,
      carbsG: 210,
      fatG: 65,
      fiberG: 30,
      micronutrientTargets: {
        ...DEFAULT_RDA_MICROS,
        sodiumMg: 1500,
        caffeineMg: 150,
      },
      mealSlots: [],
      updatedAt: Date.now(),
    });

    render(<GoalsCalculatorForm />);

    fireEvent.click(screen.getByRole('button', { name: /custom micronutrient targets/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/sodium \(mg\)/i)).toHaveValue(1500);
      expect(screen.getByLabelText(/caffeine \(mg\)/i)).toHaveValue(150);
    });

    fireEvent.click(screen.getByRole('button', { name: /reset to adult rda defaults/i }));

    expect(screen.getByLabelText(/sodium \(mg\)/i)).toHaveValue(2300);
    expect(screen.getByLabelText(/caffeine \(mg\)/i)).toHaveValue(400);
  });
});
