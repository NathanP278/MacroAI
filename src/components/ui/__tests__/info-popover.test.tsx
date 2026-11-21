import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InfoPopover } from '../info-popover';

describe('InfoPopover', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('portals the tooltip directly into document.body to escape card stacking contexts', () => {
    const { container } = render(
      <div data-testid="bento-card" className="bg-card overflow-hidden">
        <InfoPopover
          label="Weekly Calorie Bank"
          description="Tracks your cumulative calorie balance across the week."
        />
      </div>
    );

    const trigger = screen.getByRole('button', {
      name: /what is weekly calorie bank\?/i,
    });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('Weekly Calorie Bank');
    expect(tooltip).toHaveTextContent(
      'Tracks your cumulative calorie balance across the week.'
    );
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    // Tooltip must be portaled to document.body, NOT trapped inside the bento card
    const card = screen.getByTestId('bento-card');
    expect(card.contains(tooltip)).toBe(false);
    expect(tooltip.parentElement).toBe(document.body);
    expect(container.contains(tooltip)).toBe(false);

    // Pressing Escape closes the popover and returns focus to trigger
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on outside mousedown in fallback mode', () => {
    render(
      <div>
        <InfoPopover
          label="Observed TDEE"
          description="Rolling 21-day expenditure estimate."
          align="right"
        />
        <button type="button">Outside</button>
      </div>
    );

    const trigger = screen.getByRole('button', {
      name: /what is observed tdee\?/i,
    });
    fireEvent.click(trigger);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
