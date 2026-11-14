import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BackupPanel } from '../backup-panel';
import * as backupModule from '@/lib/db/backup';

describe('BackupPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders backup export and import controls', () => {
    render(<BackupPanel />);

    expect(screen.getByRole('button', { name: /export backup/i })).toBeInTheDocument();
    expect(screen.getByText(/data backup & restore/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^merge$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^replace$/i })).toBeInTheDocument();
  });

  it('triggers export and creates a downloadable JSON file', async () => {
    const mockJson = JSON.stringify({ version: 1, exportedAt: 1000, tables: {} });
    vi.spyOn(backupModule, 'exportBackupJson').mockResolvedValue(mockJson);

    // Mock URL.createObjectURL and URL.revokeObjectURL
    const createObjectURLSpy = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURLSpy = vi.fn();
    window.URL.createObjectURL = createObjectURLSpy;
    window.URL.revokeObjectURL = revokeObjectURLSpy;

    render(<BackupPanel />);

    const exportBtn = screen.getByRole('button', { name: /export backup/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(backupModule.exportBackupJson).toHaveBeenCalled();
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(screen.getByText(/backup exported successfully/i)).toBeInTheDocument();
    });
  });

  it('imports valid backup file in merge mode and shows imported counts', async () => {
    vi.spyOn(backupModule, 'importBackupJson').mockResolvedValue({
      importedCounts: {
        foodLogs: 5,
        foodsCache: 2,
        customRecipes: 1,
        userGoals: 1,
      },
    });

    render(<BackupPanel />);

    const file = new File(['{"version": 1}'], 'macroai-backup.json', {
      type: 'application/json',
    });

    const fileInput = screen.getByTestId('backup-file-input');
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(backupModule.importBackupJson).toHaveBeenCalledWith(
        expect.any(String),
        'merge'
      );
      expect(screen.getByText(/imported: 5 logs, 2 foods, 1 recipe/i)).toBeInTheDocument();
    });
  });

  it('displays error message when importing corrupt backup file', async () => {
    vi.spyOn(backupModule, 'importBackupJson').mockRejectedValue(
      new Error('Invalid backup schema')
    );

    render(<BackupPanel />);

    const file = new File(['bad json'], 'corrupt.json', {
      type: 'application/json',
    });

    const fileInput = screen.getByTestId('backup-file-input');
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/invalid backup schema/i)).toBeInTheDocument();
    });
  });

  it('handles replace mode with confirmation prompt', async () => {
    const importSpy = vi.spyOn(backupModule, 'importBackupJson').mockResolvedValue({
      importedCounts: {
        foodLogs: 1,
        foodsCache: 0,
        customRecipes: 0,
        userGoals: 0,
      },
    });

    const confirmSpy = vi.spyOn(window, 'confirm');

    render(<BackupPanel />);

    // Switch to replace mode
    const replaceBtn = screen.getByRole('button', { name: /^replace$/i });
    fireEvent.click(replaceBtn);

    expect(screen.getByText(/replace mode:/i)).toBeInTheDocument();

    const file = new File(['{"version": 1}'], 'replace.json', { type: 'application/json' });
    const fileInput = screen.getByTestId('backup-file-input');

    // 1. User cancels confirmation
    confirmSpy.mockReturnValueOnce(false);
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(importSpy).not.toHaveBeenCalled();

    // 2. User accepts confirmation
    confirmSpy.mockReturnValueOnce(true);
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(importSpy).toHaveBeenCalledWith(expect.any(String), 'replace');
      expect(screen.getByText(/imported: 1 log, 0 foods, 0 recipes, 0 goals/i)).toBeInTheDocument();
    });
  });
});
