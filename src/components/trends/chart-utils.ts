'use client';

import { useCallback, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

export const VB_W = 300;
export const VB_H = 150;
export const PAD = { l: 34, r: 10, t: 10, b: 18 } as const;

const KG_TO_LB = 2.20462;

export function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function formatWeight(kg: number, unit: 'kg' | 'lb'): string {
  const v = unit === 'lb' ? kg * KG_TO_LB : kg;
  return `${v.toFixed(1)} ${unit}`;
}

export function toUnit(kg: number, unit: 'kg' | 'lb'): number {
  return unit === 'lb' ? kg * KG_TO_LB : kg;
}

export function formatInt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function niceRange(values: number[], padFrac = 0.1): [number, number] {
  const finite = values.filter(isFiniteNum);
  if (finite.length === 0) return [0, 1];
  let min = Math.min(...finite);
  let max = Math.max(...finite);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * padFrac;
  return [min - pad, max + pad];
}

export function scale(v: number, d0: number, d1: number, r0: number, r1: number): number {
  if (d1 === d0) return (r0 + r1) / 2;
  return r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
}

export function linePoints(pts: Array<[number, number]>): string {
  return pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
}

/**
 * Pointer + keyboard scrubbing shared by the charts. `xs` are the x positions
 * (viewBox units) of each datum; the nearest datum to the pointer is active.
 */
export function useScrub(xs: number[]) {
  const [active, setActive] = useState<number | null>(null);

  const onPointerMove = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      if (xs.length === 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      if (!rect.width) return;
      const x = ((e.clientX - rect.left) / rect.width) * VB_W;
      let best = 0;
      let bestD = Infinity;
      xs.forEach((px, i) => {
        const d = Math.abs(px - x);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      setActive(best);
    },
    [xs],
  );
  const onPointerLeave = useCallback(() => setActive(null), []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (xs.length === 0) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActive((a) => (a === null ? 0 : Math.min(xs.length - 1, a + 1)));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActive((a) => (a === null ? xs.length - 1 : Math.max(0, a - 1)));
      } else if (e.key === 'Escape') {
        setActive(null);
      }
    },
    [xs],
  );
  const onBlur = useCallback(() => setActive(null), []);
  const boundedActive = active !== null && active < xs.length ? active : null;

  return { active: boundedActive, onPointerMove, onPointerLeave, onKeyDown, onBlur };
}
