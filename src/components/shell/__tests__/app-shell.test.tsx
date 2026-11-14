import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppShell } from '../app-shell';
import { useLoggerStore } from '@/stores/logger-store';

describe('AppShell', () => {
  beforeEach(() => {
    useLoggerStore.setState({
      activeDate: '2026-11-14',
      activeMealSlot: 'breakfast',
      activeSheet: null,
      aiDraft: null,
    });
  });

  it('toggles quick-action dock with all four logging entry points', () => {
    render(
      <AppShell>
        <div>Body</div>
      </AppShell>
    );

    expect(screen.getByText('Body')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /open quick actions/i }));
    expect(screen.getByRole('button', { name: /ai meal scan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /barcode scan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /quick search/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /quick add macros/i })).toBeInTheDocument();
  });

  it('triggers onQuickAction callback and closes dock when an action is clicked', () => {
    const handleQuickAction = vi.fn();
    render(
      <AppShell onQuickAction={handleQuickAction}>
        <div>Body Content</div>
      </AppShell>
    );

    fireEvent.click(screen.getByRole('button', { name: /open quick actions/i }));
    const aiScanButton = screen.getByRole('button', { name: /ai meal scan/i });
    fireEvent.click(aiScanButton);

    expect(handleQuickAction).toHaveBeenCalledWith('ai-scan');
    // Dock should close
    expect(screen.queryByRole('button', { name: /ai meal scan/i })).not.toBeInTheDocument();
  });

  it('closes quick-action dock when close button or backdrop is clicked', () => {
    render(
      <AppShell>
        <div>Main Area</div>
      </AppShell>
    );

    fireEvent.click(screen.getByRole('button', { name: /open quick actions/i }));
    expect(screen.getByRole('button', { name: /ai meal scan/i })).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: /close quick actions/i });
    fireEvent.click(closeButton);
    expect(screen.queryByRole('button', { name: /ai meal scan/i })).not.toBeInTheDocument();
  });

  it('opens QuickAddDrawer when quick-add is clicked in QuickActionDock', () => {
    render(
      <AppShell>
        <div>Body Content</div>
      </AppShell>
    );

    fireEvent.click(screen.getByRole('button', { name: /open quick actions/i }));
    const quickAddButton = screen.getByRole('button', { name: /quick add macros/i });
    fireEvent.click(quickAddButton);

    expect(screen.getByTestId('quick-add-drawer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log quick add/i })).toBeInTheDocument();
  });
});
