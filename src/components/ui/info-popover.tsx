'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { HelpCircle } from 'lucide-react';

export interface InfoPopoverProps {
  label: string;
  description: string;
  align?: 'left' | 'right';
}

/**
 * Compact, keyboard-accessible contextual definition popover (`?` icon)
 * styled in Smoked Liquid Glass.
 */
export function InfoPopover({
  label,
  description,
  align = 'left',
}: InfoPopoverProps) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative inline-flex items-center">
      <button
        type="button"
        aria-label={`What is ${label}?`}
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="touch-target inline-flex items-center justify-center rounded-full text-muted-foreground/75 hover:text-foreground transition-colors p-0.5"
      >
        <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
      </button>

      {open && (
        <div
          id={popoverId}
          role="tooltip"
          className={`absolute top-full mt-1.5 ${
            align === 'right' ? 'right-0' : 'left-0'
          } z-50 w-56 sm:w-64 surface-elevated-sheet rounded-xl p-2.5 text-[11px] leading-relaxed text-muted-foreground normal-case tracking-normal font-normal animate-modal-in`}
        >
          <span className="block font-semibold text-foreground mb-0.5">
            {label}
          </span>
          {description}
        </div>
      )}
    </div>
  );
}
