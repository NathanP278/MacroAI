import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/components/theme/theme-provider';
import SettingsPage from '../page';

describe('SettingsPage', () => {
  it('renders ThemeSwitcher, BackupPanel, and privacy sections', () => {
    render(
      <ThemeProvider>
        <SettingsPage />
      </ThemeProvider>
    );

    expect(screen.getByText('Settings & Preferences')).toBeInTheDocument();
    expect(screen.getByText('Theme & Appearance')).toBeInTheDocument();
    expect(screen.getByText('Goals & TDEE Calculator')).toBeInTheDocument();
    expect(screen.getByText('Data Backup & Restore')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export backup/i })).toBeInTheDocument();
    expect(screen.getByText(/adherence-neutral analytics/i)).toBeInTheDocument();
    expect(screen.getByText(/offline storage & privacy/i)).toBeInTheDocument();
  });
});
