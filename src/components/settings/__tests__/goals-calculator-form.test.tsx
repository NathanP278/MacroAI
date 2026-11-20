import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { db } from '@/lib/db/macroai-db';
import { GoalsCalculatorForm } from '../goals-calculator-form';
import { DEFAULT_RDA_MICROS } from '@/lib/nutrition/goals';

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
});
