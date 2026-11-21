import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { aggregateDailySummary } from '@/lib/nutrition/daily-summary';
import { MicronutrientPanel } from '../micronutrient-panel';
import { HabitsAnalyticsGrid, type LoggedDayDot } from '../habits-analytics-grid';
import type { DayNutritionPoint } from '../macro-bento-grid';
import type { FoodLogEntry } from '@/types/nutrition';

function makeLog(overrides: Partial<FoodLogEntry> & { id: string; name: string }): FoodLogEntry {
  return {
    date: '2026-11-20',
    foodId: overrides.foodId ?? `food-${overrides.id}`,
    source: 'staple',
    amount: 100,
    unit: 'g',
    createdAt: 1700000000000,
    nutritionSnapshot: {
      calories: 200,
      protein: 20,
      carbs: 15,
      fat: 5,
      fiber: 3,
      micros: {},
    },
    ...overrides,
  };
}

const todayLogs: FoodLogEntry[] = [
  makeLog({
    id: 'log-1',
    foodId: 'espresso',
    name: 'Double Espresso',
    nutritionSnapshot: {
      calories: 10,
      protein: 0,
      carbs: 2,
      fat: 0,
      fiber: 0,
      micros: { caffeineMg: 120, potassiumMg: 100, sodiumMg: 10, sugarG: 0 },
    },
  }),
  makeLog({
    id: 'log-2',
    foodId: 'espresso',
    name: 'Double Espresso',
    nutritionSnapshot: {
      calories: 10,
      protein: 0,
      carbs: 2,
      fat: 0,
      fiber: 0,
      micros: { caffeineMg: 120, potassiumMg: 100, sodiumMg: 10, sugarG: 0 },
    },
  }),
  makeLog({
    id: 'log-3',
    foodId: 'matcha',
    name: 'Iced Matcha Latte',
    nutritionSnapshot: {
      calories: 140,
      protein: 6,
      carbs: 22,
      fat: 3,
      fiber: 2,
      micros: { caffeineMg: 60, potassiumMg: 400, sodiumMg: 180, sugarG: 14, addedSugarG: 10 },
    },
  }),
];

const weeklyLogs: FoodLogEntry[] = [
  ...todayLogs,
  makeLog({
    id: 'log-4',
    date: '2026-11-19',
    foodId: 'cold-brew',
    name: 'Cold Brew Coffee',
    nutritionSnapshot: {
      calories: 5,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      micros: { caffeineMg: 210, potassiumMg: 150, sodiumMg: 15 },
    },
  }),
];

const todaySummary = aggregateDailySummary(todayLogs);
const weekSummary = aggregateDailySummary(weeklyLogs);

describe('MicronutrientPanel', () => {
  it('switches to Extended tab, toggles 7D Avg, and opens Top Contributors sheet when clicking a nutrient row', () => {
    render(
      <MicronutrientPanel
        micros={todaySummary.micros}
        weeklyMicros={weekSummary.micros}
        netCarbsG={38}
        weeklyNetCarbsG={44}
        potassiumSodiumRatio={1.5}
        weeklyPotassiumSodiumRatio={1.82}
        todayLogs={todayLogs}
        weeklyLogs={weeklyLogs}
      />
    );

    // Net Carbs & K:Na ratio strip are intentionally omitted for cleaner layout
    expect(screen.queryByText(/net carbs/i)).toBeNull();
    expect(screen.queryByText(/k:na ratio/i)).toBeNull();

    // Switch to Extended tab and check zero-target nutrients render cleanly without / 0 or NaN
    fireEvent.click(screen.getByRole('button', { name: /extended/i }));
    const caffeineBtn = screen.getByRole('button', { name: /caffeine/i });
    expect(caffeineBtn).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sugar/i })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('NaN');
    expect(document.body.textContent).not.toContain('/ 0 g');

    // Clicking Caffeine opens Top Contributors dialog with ranked today contributors
    fireEvent.click(caffeineBtn);
    const dialog = screen.getByRole('dialog', { name: /top contributors/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog.textContent).toMatch(/Double Espresso/);
    expect(dialog.textContent).toMatch(/2×/);
    expect(dialog.textContent).toMatch(/240/);
    expect(dialog.textContent).toMatch(/80%/);
    expect(dialog.textContent).toMatch(/Iced Matcha Latte/);
    expect(dialog.textContent).not.toMatch(/Cold Brew Coffee/);

    // Escape closes the dialog
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: /top contributors/i })).toBeNull();

    // Toggle to 7D Avg and uses weeklyLogs for contributors
    fireEvent.click(screen.getByRole('button', { name: /7d avg/i }));

    fireEvent.click(screen.getByRole('button', { name: /caffeine/i }));
    const weeklyDialog = screen.getByRole('dialog', { name: /top contributors/i });
    expect(weeklyDialog.textContent).toMatch(/Cold Brew Coffee/);
    expect(weeklyDialog.textContent).toMatch(/210/);
  });

  it('omits 7D Avg toggle when weeklyMicros is omitted and shows empty state when no contributors exist', () => {
    render(
      <MicronutrientPanel
        micros={todaySummary.micros}
        todayLogs={todayLogs}
      />
    );

    // Toggle should not render when weeklyMicros is omitted
    expect(screen.queryByRole('button', { name: /7d avg/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /extended/i }));
    fireEvent.click(screen.getByRole('button', { name: /alcohol/i }));
    const dialog = screen.getByRole('dialog', { name: /top contributors/i });
    expect(dialog.textContent).toMatch(/no logged foods contributed/i);
  });
});

describe('HabitsAnalyticsGrid', () => {
  const weekly: DayNutritionPoint[] = Array.from({ length: 7 }, (_, idx) => {
    const day = 14 + idx;
    return {
      date: `2026-11-${String(day).padStart(2, '0')}`,
      dayLetter: 'M',
      calories: 1900,
      protein: 140,
      fat: 60,
      carbs: 190,
      caloriesTarget: 2000,
      proteinTarget: 150,
      fatTarget: 65,
      carbsTarget: 200,
      isSelected: idx === 6,
    };
  });

  // 30 days ending 2026-11-20: last 4 days logged (17, 18, 19, 20), 16th unlogged, 15th & 14th partial
  const dots: LoggedDayDot[] = Array.from({ length: 30 }, (_, idx) => {
    const offsetFromEnd = idx - 29; // -29 .. 0
    const d = new Date(Date.UTC(2026, 10, 20 + offsetFromEnd));
    const date = d.toISOString().slice(0, 10);
    if (date >= '2026-11-17' && date <= '2026-11-20') {
      return { date, hasLogs: true, intensity: 'logged', calories: 1950, targetCalories: 2000 };
    }
    if (date === '2026-11-15') {
      return { date, hasLogs: true, calories: 600, targetCalories: 2000 }; // < 50% -> partial
    }
    if (date === '2026-11-14') {
      return { date, hasLogs: true, intensity: 'partial', calories: 800, targetCalories: 2000 };
    }
    return { date, hasLogs: false, intensity: 'none', calories: 0, targetCalories: 2000 };
  });

  it('calls onSelectDate when clicking any dot in the 30-day heatmap and shows streak and consistency', () => {
    const onSelectDate = vi.fn();
    render(
      <HabitsAnalyticsGrid
        summary={todaySummary}
        weeklyDays={weekly}
        thirtyDayDots={dots}
        onSelectDate={onSelectDate}
      />
    );

    const heatmap = screen.getByRole('group', { name: /food logging 30-day heatmap/i });
    const dotBtn = within(heatmap).getByRole('button', { name: /2026-11-18/i });
    // Dots must not be wrapped inside an anchor link
    expect(dotBtn.closest('a')).toBeNull();

    fireEvent.click(dotBtn);
    expect(onSelectDate).toHaveBeenCalledWith('2026-11-18');

    // Streak (last 4 days logged: 17..20 -> 4 day streak) & 30-day consistency (6/30 = 20%)
    expect(screen.getByText(/4 day streak/i)).toBeInTheDocument();
    expect(screen.getByText(/20%/i)).toBeInTheDocument();

    // Shading intensities inside the 30-day heatmap
    expect(within(heatmap).getByRole('button', { name: /2026-11-10/i })).toHaveAttribute(
      'data-intensity',
      'none'
    );
    expect(within(heatmap).getByRole('button', { name: /2026-11-15/i })).toHaveAttribute(
      'data-intensity',
      'partial'
    );
    expect(within(heatmap).getByRole('button', { name: /2026-11-14/i })).toHaveAttribute(
      'data-intensity',
      'partial'
    );
    expect(within(heatmap).getByRole('button', { name: /2026-11-18/i })).toHaveAttribute(
      'data-intensity',
      'logged'
    );
  });
});
