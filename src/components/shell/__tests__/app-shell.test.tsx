import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AppShell } from '../app-shell';
import { useLoggerStore } from '@/stores/logger-store';

describe('AppShell', () => {
  beforeEach(() => {
    useLoggerStore.setState({
      activeDate: '2026-11-14',
      activeMealSlot: 'breakfast',
      activeSheet: null,
      aiDraft: null,
      isCommandPaletteOpen: false,
      undoToast: null,
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

  it('opens Command Palette with Ctrl/Cmd + K, filters commands, and closes on Escape', () => {
    render(
      <AppShell>
        <div>Workspace</div>
      </AppShell>
    );

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByTestId('command-palette')).toBeInTheDocument();

    const searchInput = screen.getByLabelText(/search commands or staple foods/i);
    fireEvent.change(searchInput, { target: { value: 'quick add' } });
    expect(screen.getByText('Quick Add Macros')).toBeInTheDocument();
    expect(screen.queryByText('Scan Barcode')).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument();
  });

  it('triggers UndoToast callback on Undo click and Ctrl+Z shortcut', async () => {
    const onUndoClick = vi.fn().mockResolvedValue(undefined);
    const onUndoKey = vi.fn().mockResolvedValue(undefined);

    render(
      <AppShell>
        <div>Workspace</div>
      </AppShell>
    );

    act(() => {
      useLoggerStore.getState().showUndoToast({
        message: 'Removed Chicken Breast',
        onUndo: onUndoClick,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('undo-toast')).toBeInTheDocument();
      expect(screen.getByText('Removed Chicken Breast')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => {
      expect(onUndoClick).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('undo-toast')).not.toBeInTheDocument();
    });

    act(() => {
      useLoggerStore.getState().showUndoToast({
        message: 'Removed Brown Rice',
        onUndo: onUndoKey,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('undo-toast')).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    await waitFor(() => {
      expect(onUndoKey).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('undo-toast')).not.toBeInTheDocument();
    });
  });
});
