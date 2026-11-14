import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../theme-provider';

function ThemeConsumer() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolvedTheme">{resolvedTheme}</span>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('system')}>Set System</button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('defaults to dark theme and sets .dark on document.documentElement', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('resolvedTheme')).toHaveTextContent('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('allows changing theme to light and updates localStorage and document class', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    act(() => {
      fireEvent.click(screen.getByText('Set Light'));
    });

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(screen.getByTestId('resolvedTheme')).toHaveTextContent('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('macroai-theme')).toBe('light');
  });

  it('loads saved theme preference from localStorage', () => {
    localStorage.setItem('macroai-theme', 'light');

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(screen.getByTestId('resolvedTheme')).toHaveTextContent('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });
});
