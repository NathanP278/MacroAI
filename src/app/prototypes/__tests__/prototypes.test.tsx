import { describe, test, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PrototypesPage from '../page';

describe('PrototypesPage', () => {
  test('renders all three MacroFactor-inspired variants and switches active preview', () => {
    render(<PrototypesPage />);
    expect(screen.getByRole('tab', { name: /bento/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /macro bars/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /timeline/i })).toBeInTheDocument();

    // Default stage is bento
    expect(screen.getByTestId('prototype-stage')).toHaveAttribute('data-variant', 'bento');

    // Switch to Macro Bars
    fireEvent.click(screen.getByRole('tab', { name: /macro bars/i }));
    expect(screen.getByTestId('prototype-stage')).toHaveAttribute('data-variant', 'bars');

    // Switch to Timeline
    fireEvent.click(screen.getByRole('tab', { name: /timeline/i }));
    expect(screen.getByTestId('prototype-stage')).toHaveAttribute('data-variant', 'timeline');

    // Switch back to Bento
    fireEvent.click(screen.getByRole('tab', { name: /bento/i }));
    expect(screen.getByTestId('prototype-stage')).toHaveAttribute('data-variant', 'bento');
  });

  test('toggles adherence-neutral over-target preview mode', () => {
    render(<PrototypesPage />);
    const toggleBtn = screen.getByRole('button', { name: /mode/i });
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');

    // Toggle over-target
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText(/surplus/i).length).toBeGreaterThanOrEqual(1);
  });
});
