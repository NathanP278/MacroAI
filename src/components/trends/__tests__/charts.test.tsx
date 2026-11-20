import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WeightTrendChart } from '../weight-trend-chart';
import { TdeeChart } from '../tdee-chart';
import { IntakeTrendChart } from '../intake-trend-chart';
import type { AdaptiveTdeeResult, DailyWeightPoint } from '@/lib/nutrition/adaptive-tdee';
import type { RangeDay } from '@/lib/nutrition/analytics';

function mockRect(el: Element) {
  (el as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 300, height: 150, right: 300, bottom: 150, x: 0, y: 0 }) as DOMRect;
}

const weights: DailyWeightPoint[] = [
  { date: '2026-03-01', scaleKg: 80, trendKg: 80, entryId: 'a' },
  { date: '2026-03-02', scaleKg: 79, trendKg: 79.9, entryId: 'b' },
  { date: '2026-03-03', scaleKg: 81, trendKg: 80.0, entryId: 'c' },
];

describe('WeightTrendChart', () => {
  it('renders a calm empty state with no points', () => {
    render(<WeightTrendChart points={[]} unit="kg" />);
    expect(screen.getByText(/no weigh-ins/i)).toBeInTheDocument();
    expect(document.querySelector('svg')).toBeNull();
  });

  it('renders a single point without crashing or NaN coordinates', () => {
    const { container } = render(<WeightTrendChart points={[weights[0]]} unit="kg" />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('viewBox');
    expect(svg.getAttribute('role')).toBe('img');
    expect(container.innerHTML).not.toContain('NaN');
  });

  it('ignores NaN points', () => {
    const bad = [...weights, { date: '2026-03-04', scaleKg: NaN, trendKg: NaN, entryId: 'z' }];
    const { container } = render(<WeightTrendChart points={bad} unit="kg" />);
    expect(container.innerHTML).not.toContain('NaN');
  });

  it('has an aria-label summary in kg and lb', () => {
    const { container, rerender } = render(<WeightTrendChart points={weights} unit="kg" />);
    expect(container.querySelector('svg')!.getAttribute('aria-label')).toMatch(/80\.0 kg/);
    rerender(<WeightTrendChart points={weights} unit="lb" />);
    expect(container.querySelector('svg')!.getAttribute('aria-label')).toMatch(/176\.4 lb/);
  });

  it('shows a scrub readout on pointer move and hides on leave', () => {
    const { container } = render(<WeightTrendChart points={weights} unit="lb" />);
    const svg = container.querySelector('svg')!;
    mockRect(svg);
    expect(screen.queryByTestId('scrub-readout')).toBeNull();
    fireEvent.pointerMove(svg, { clientX: 300, clientY: 50 });
    const readout = screen.getByTestId('scrub-readout');
    expect(readout.textContent).toMatch(/2026-03-03/);
    expect(readout.textContent).toMatch(/178\.6 lb/); // 81 kg
    fireEvent.pointerLeave(svg);
    expect(screen.queryByTestId('scrub-readout')).toBeNull();
  });

  it('exposes a keyboard-focusable readout fallback', () => {
    render(<WeightTrendChart points={weights} unit="kg" />);
    const el = screen.getByTestId('chart-data-summary');
    expect(el).toHaveAttribute('tabindex', '0');
  });
});

function tdee(over: Partial<AdaptiveTdeeResult> = {}): AdaptiveTdeeResult {
  return {
    status: 'ready',
    loggedFoodDays: 12,
    requiredFoodDays: 10,
    weighInDays: 6,
    requiredWeighInDays: 4,
    spanDays: 14,
    requiredSpanDays: 10,
    latestScaleKg: 80,
    latestTrendKg: 80,
    weeklyRateKg: -0.3,
    observedTdee: 2400,
    mifflinEstimate: 2300,
    weightSeries: [],
    tdeeSeries: [
      { date: '2026-03-01', observedTdee: 2300, avgCalories: 2000 },
      { date: '2026-03-02', observedTdee: 2400, avgCalories: 2000 },
      { date: '2026-03-03', observedTdee: 2500, avgCalories: 2000 },
    ],
    ...over,
  };
}

describe('TdeeChart', () => {
  it('renders observed polyline and dashed Mifflin reference when ready', () => {
    const { container } = render(<TdeeChart result={tdee()} />);
    expect(container.querySelector('polyline[data-series="observed"]')).not.toBeNull();
    const ref = container.querySelector('[data-series="mifflin"]')!;
    expect(ref).not.toBeNull();
    expect(ref.getAttribute('stroke-dasharray')).toBeTruthy();
    expect(container.innerHTML).not.toContain('NaN');
  });

  it('renders calm calibration progress when calibrating', () => {
    const { container } = render(
      <TdeeChart
        result={tdee({ status: 'calibrating', loggedFoodDays: 3, weighInDays: 1, spanDays: 2, tdeeSeries: [] })}
      />,
    );
    expect(container.querySelector('svg')).toBeNull();
    const bars = screen.getAllByRole('progressbar');
    expect(bars).toHaveLength(3);
    expect(bars[0]).toHaveAttribute('aria-valuenow', '3');
    expect(bars[0]).toHaveAttribute('aria-valuemax', '10');
    expect(bars[1]).toHaveAttribute('aria-valuenow', '1');
    expect(bars[1]).toHaveAttribute('aria-valuemax', '4');
    expect(bars[2]).toHaveAttribute('aria-valuenow', '2');
    expect(bars[2]).toHaveAttribute('aria-valuemax', '10');
    expect(screen.getByText(/calibrating/i)).toBeInTheDocument();
  });

  it('handles ready state with an empty series and single point', () => {
    const { container, rerender } = render(<TdeeChart result={tdee({ tdeeSeries: [] })} />);
    expect(container.innerHTML).not.toContain('NaN');
    rerender(<TdeeChart result={tdee({ tdeeSeries: [tdee().tdeeSeries[0]] })} />);
    expect(container.innerHTML).not.toContain('NaN');
  });

  it('shows scrub readout on pointer move', () => {
    const { container } = render(<TdeeChart result={tdee()} />);
    const svg = container.querySelector('svg')!;
    mockRect(svg);
    fireEvent.pointerMove(svg, { clientX: 0, clientY: 20 });
    expect(screen.getByTestId('scrub-readout').textContent).toMatch(/2,?300/);
  });
});

function day(date: string, calories: number, target = 2000, logged = true): RangeDay {
  return {
    date,
    logged,
    calories,
    protein: logged ? 100 : 0,
    carbs: logged ? 200 : 0,
    fat: logged ? 50 : 0,
    fiber: 0,
    targetCalories: target,
    targetProtein: 150,
    targetCarbs: 200,
    targetFat: 65,
    targetFiber: 30,
  };
}

describe('IntakeTrendChart', () => {
  it('renders empty state when no day is logged', () => {
    render(<IntakeTrendChart days={[day('2026-03-01', 0, 2000, false)]} mode="calories" />);
    expect(screen.getByText(/no logged days/i)).toBeInTheDocument();
  });

  it('renders one column and one target notch per day (calories)', () => {
    const days = [day('2026-03-01', 1800), day('2026-03-02', 2300), day('2026-03-03', 0, 2000, false)];
    const { container } = render(<IntakeTrendChart days={days} mode="calories" />);
    expect(container.querySelectorAll('[data-bar="calories"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-notch]')).toHaveLength(3);
    expect(container.innerHTML).not.toContain('NaN');
    expect(container.innerHTML).not.toMatch(/#ef4444/i);
  });

  it('renders stacked macro segments in macro mode using CSS tokens', () => {
    const { container } = render(<IntakeTrendChart days={[day('2026-03-01', 1800)]} mode="macros" />);
    expect(container.querySelector('[data-bar="protein"]')).not.toBeNull();
    expect(container.querySelector('[data-bar="carbs"]')).not.toBeNull();
    expect(container.querySelector('[data-bar="fat"]')).not.toBeNull();
    expect(container.innerHTML).toContain('var(--macro-protein)');
  });

  it('shows scrub tooltip on pointer move with tabular-nums', () => {
    const days = [day('2026-03-01', 1800), day('2026-03-02', 2300)];
    const { container } = render(<IntakeTrendChart days={days} mode="calories" />);
    const svg = container.querySelector('svg')!;
    mockRect(svg);
    fireEvent.pointerMove(svg, { clientX: 290, clientY: 40 });
    const readout = screen.getByTestId('scrub-readout');
    expect(readout.textContent).toMatch(/2026-03-02/);
    expect(readout.textContent).toMatch(/2,?300/);
    expect(readout.className).toMatch(/tabular-nums/);
    fireEvent.pointerLeave(svg);
    expect(screen.queryByTestId('scrub-readout')).toBeNull();
  });

  it('handles a 90-day range', () => {
    const days = Array.from({ length: 90 }, (_, i) =>
      day(`2026-01-${String((i % 28) + 1).padStart(2, '0')}`, 1500 + i * 5),
    );
    const { container } = render(<IntakeTrendChart days={days} mode="calories" />);
    expect(container.querySelectorAll('[data-bar="calories"]')).toHaveLength(90);
  });
});
