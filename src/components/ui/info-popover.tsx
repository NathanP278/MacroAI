'use client';

import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

export interface InfoPopoverProps {
  label: string;
  description: string;
  align?: 'left' | 'right';
}

const VIEWPORT_MARGIN = 12;
const TRIGGER_GAP = 6;

function detectNativePopover(): boolean {
  return (
    typeof HTMLElement !== 'undefined' &&
    Object.hasOwn(HTMLElement.prototype, 'popover')
  );
}

function detectAnchorPositioning(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('position-area: block-end')
  );
}

/**
 * Compact, keyboard-accessible contextual definition popover (`?` icon)
 * styled in Smoked Liquid Glass.
 *
 * Uses the native Popover API (`popover="auto"`) portaled to `document.body` so
 * it renders in the browser Top Layer above every bento card stacking context
 * (including `backdrop-filter` and `overflow-hidden` cards). Uses CSS Anchor
 * Positioning (`position-area` + `position-try-fallbacks`) when supported, with
 * a viewport-clamped `fixed` fallback for browsers without anchor positioning.
 */
export function InfoPopover({
  label,
  description,
  align = 'left',
}: InfoPopoverProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [fallbackCoords, setFallbackCoords] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const rawId = useId();
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  const popoverId = `info-popover-${safeId}`;
  const anchorName = `--info-anchor-${safeId}`;

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const supportsPopover = mounted && detectNativePopover();
  const supportsAnchor = mounted && supportsPopover && detectAnchorPositioning();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync React `open` state with native Popover API toggle events
  useEffect(() => {
    if (!supportsPopover) return;
    const el = popoverRef.current;
    if (!el) return;

    const handleToggle = (e: Event) => {
      const toggleEvent = e as ToggleEvent;
      setOpen(toggleEvent.newState === 'open');
    };

    el.addEventListener('toggle', handleToggle);
    return () => el.removeEventListener('toggle', handleToggle);
  }, [supportsPopover]);

  // Fallback outside-click and Escape handling when native Popover API is unavailable
  useEffect(() => {
    if (!open || supportsPopover) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, supportsPopover]);

  const updateFallbackPosition = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = popoverRef.current;
    if (!trigger || !panel || typeof window === 'undefined') return;

    const triggerRect = trigger.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const panelWidth =
      panelRect.width || Math.min(256, window.innerWidth - VIEWPORT_MARGIN * 2);
    const panelHeight = panelRect.height || 88;

    const idealLeft =
      align === 'right' ? triggerRect.right - panelWidth : triggerRect.left;
    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(idealLeft, window.innerWidth - panelWidth - VIEWPORT_MARGIN)
    );

    const belowTop = triggerRect.bottom + TRIGGER_GAP;
    const aboveTop = triggerRect.top - panelHeight - TRIGGER_GAP;
    const fitsBelow = belowTop + panelHeight <= window.innerHeight - VIEWPORT_MARGIN;
    const fitsAbove = aboveTop >= VIEWPORT_MARGIN;

    const top = fitsBelow
      ? belowTop
      : fitsAbove
        ? aboveTop
        : Math.max(
            VIEWPORT_MARGIN,
            Math.min(belowTop, window.innerHeight - panelHeight - VIEWPORT_MARGIN)
          );

    setFallbackCoords({ top, left });
  }, [align]);

  useLayoutEffect(() => {
    if (!open || supportsAnchor) {
      setFallbackCoords(null);
      return;
    }

    updateFallbackPosition();

    window.addEventListener('resize', updateFallbackPosition);
    window.addEventListener('scroll', updateFallbackPosition, {
      capture: true,
      passive: true,
    });
    return () => {
      window.removeEventListener('resize', updateFallbackPosition);
      window.removeEventListener('scroll', updateFallbackPosition, {
        capture: true,
      });
    };
  }, [open, supportsAnchor, updateFallbackPosition]);

  const triggerStyle: React.CSSProperties | undefined = supportsAnchor
    ? ({ anchorName } as React.CSSProperties)
    : undefined;

  const panelStyle: React.CSSProperties = supportsAnchor
    ? ({ positionAnchor: anchorName } as React.CSSProperties)
    : fallbackCoords
      ? {
          position: 'fixed',
          inset: 'auto',
          margin: 0,
          top: `${fallbackCoords.top}px`,
          left: `${fallbackCoords.left}px`,
        }
      : {
          position: 'fixed',
          inset: 'auto',
          margin: 0,
        };

  const shouldRenderPortal = mounted && (supportsPopover || open);

  const popoverPanel = (
    <div
      ref={popoverRef}
      id={popoverId}
      role="tooltip"
      data-align={align}
      data-anchored={supportsAnchor ? 'true' : undefined}
      {...(supportsPopover ? ({ popover: 'auto' } as Record<string, unknown>) : {})}
      style={panelStyle}
      className={`info-popover-panel surface-elevated-sheet rounded-xl text-[11px] leading-relaxed text-muted-foreground normal-case tracking-normal font-normal ${
        supportsPopover ? '' : 'z-[100] animate-modal-in'
      }`}
    >
      <span className="block font-semibold text-foreground mb-0.5">{label}</span>
      {description}
    </div>
  );

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`What is ${label}?`}
        aria-expanded={open}
        aria-controls={popoverId}
        style={triggerStyle}
        {...(supportsPopover ? { popoverTarget: popoverId } : {})}
        onClick={(e) => {
          e.stopPropagation();
          if (!supportsPopover) {
            setOpen((prev) => !prev);
          }
        }}
        className="touch-target inline-flex items-center justify-center rounded-full text-muted-foreground/75 hover:text-foreground transition-colors p-0.5"
      >
        <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
      </button>

      {shouldRenderPortal &&
        typeof document !== 'undefined' &&
        createPortal(popoverPanel, document.body)}
    </span>
  );
}
