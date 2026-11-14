import 'fake-indexeddb/auto';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { useLoggerStore } from '@/stores/logger-store';
import { db } from '@/lib/db/macroai-db';
import { AiMealScannerSheet } from '../ai-meal-scanner-sheet';
import { AppShell } from '@/components/shell/app-shell';
import type { FoodItem } from '@/types/nutrition';

const originalCreateElement = document.createElement.bind(document);

describe('Task 10: AI Meal Scanner Sheet & HITL Review', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useLoggerStore.setState({
      activeDate: '2026-11-14',
      activeMealSlot: 'lunch',
      activeSheet: null,
      aiDraft: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // 1. Exact test from task-10-brief.md
  test('updates totals instantaneously on multiplier/gram change, swaps food preserving grams, and logs on confirm', async () => {
    useLoggerStore.getState().setAiDraft({
      imageDataUrl: 'data:image/jpeg;base64,abc',
      contextPrompt: 'chicken and rice',
      items: [
        {
          id: '1',
          name: 'AI Rice',
          grams: 100,
          per100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 },
          verifiedSource: null,
        },
      ],
    });
    render(<AiMealScannerSheet open date="2026-11-14" mealSlot="lunch" onClose={() => {}} />);

    // Click 1.5x multiplier chip on the row
    fireEvent.click(screen.getByRole('button', { name: '1.5x' }));
    expect(screen.getByTestId('hitl-total-calories')).toHaveTextContent('195');
    expect(await db.foodLogs.count()).toBe(0); // never auto-logged

    // Click Confirm & Log
    fireEvent.click(screen.getByRole('button', { name: /confirm & log/i }));
    await waitFor(async () => expect(await db.foodLogs.count()).toBe(1));
    const entries = await db.foodLogs.toArray();
    expect(entries[0].amount).toBe(150);
    expect(entries[0].nutritionSnapshot.calories).toBe(195);
    expect(entries[0].source).toBe('ai_scan');
    expect(useLoggerStore.getState().aiDraft).toBeNull();
  });

  // 2. Multipliers and direct inputs without compounding
  test('handles quick multipliers (0.5x, 1x, 2x) and direct numeric/slider input cleanly without compounding', async () => {
    useLoggerStore.getState().setAiDraft({
      imageDataUrl: null,
      contextPrompt: '',
      items: [
        {
          id: 'item-1',
          name: 'Grilled Chicken',
          grams: 200,
          per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
          verifiedSource: null,
        },
      ],
    });

    render(<AiMealScannerSheet open date="2026-11-14" mealSlot="dinner" onClose={() => {}} />);

    // Baseline is 200g -> 330 kcal
    expect(screen.getByTestId('hitl-total-calories')).toHaveTextContent('330');

    // Click 0.5x -> 100g -> 165 kcal
    fireEvent.click(screen.getByRole('button', { name: '0.5x' }));
    expect(screen.getByTestId('hitl-total-calories')).toHaveTextContent('165');

    // Click 2x -> 400g (200g baseline * 2, not 100g * 2) -> 660 kcal
    fireEvent.click(screen.getByRole('button', { name: '2x' }));
    expect(screen.getByTestId('hitl-total-calories')).toHaveTextContent('660');

    // Click 1x -> back to 200g -> 330 kcal
    fireEvent.click(screen.getByRole('button', { name: '1x' }));
    expect(screen.getByTestId('hitl-total-calories')).toHaveTextContent('330');

    // Numeric input direct edit
    const numInput = screen.getByRole('spinbutton', { name: /grams for Grilled Chicken/i });
    fireEvent.change(numInput, { target: { value: '150' } });
    expect(screen.getByTestId('hitl-total-calories')).toHaveTextContent('248'); // 165 * 1.5 = 247.5 -> 248

    // Range slider edit
    const rangeSlider = screen.getByRole('slider', { name: /gram slider for Grilled Chicken/i });
    fireEvent.change(rangeSlider, { target: { value: '250' } });
    expect(screen.getByTestId('hitl-total-calories')).toHaveTextContent('413'); // 165 * 2.5 = 412.5 -> 413
  });

  // 3. Verification Swap preserves row grams and handles perServing conversion
  test('verification swap modal searches staples/cache/usda, swaps food preserving current grams, and handles perServing density', async () => {
    // Seed cached custom product with perServing basis
    const cachedItem: FoodItem = {
      id: 'custom:protein-shake',
      name: 'Custom Protein Shake',
      source: 'custom_barcode',
      basis: 'perServing',
      servingSize: 50,
      servingUnit: 'g',
      nutrientsPerBasis: { calories: 180, protein: 30, carbs: 4, fat: 2, fiber: 1 },
      micronutrientsPerBasis: { calciumMg: 200 },
      updatedAt: Date.now(),
    };
    await db.foodsCache.put(cachedItem);

    // Seed staple in mock staples or staple search
    useLoggerStore.getState().setAiDraft({
      imageDataUrl: null,
      contextPrompt: '',
      items: [
        {
          id: 'item-swap',
          name: 'Generic White Rice',
          grams: 150,
          per100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 },
          verifiedSource: null,
        },
      ],
    });

    render(<AiMealScannerSheet open date="2026-11-14" mealSlot="lunch" onClose={() => {}} />);

    // Click Verify / Swap button on the row
    fireEvent.click(screen.getByRole('button', { name: /verify \/ swap/i }));

    // Modal opens
    expect(screen.getByRole('dialog', { name: /verify or swap food/i })).toBeInTheDocument();

    // Search for cached protein shake
    const searchInput = screen.getByPlaceholderText(/search staples, usda, or saved foods/i);
    fireEvent.change(searchInput, { target: { value: 'Protein Shake' } });

    // Wait for search results
    await waitFor(() => {
      expect(screen.getByText('Custom Protein Shake')).toBeInTheDocument();
    });

    // Select the food
    fireEvent.click(screen.getByText('Custom Protein Shake'));

    // Modal closes
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /verify or swap food/i })).not.toBeInTheDocument();
    });

    // Current grams (150g) must be preserved!
    // Density converted from perServing (50g): 180 kcal / 50g = 360 kcal / 100g.
    // For 150g: 360 * 1.5 = 540 kcal!
    expect(screen.getByTestId('hitl-total-calories')).toHaveTextContent('540');
    expect(screen.getByText('Custom Protein Shake')).toBeInTheDocument();
    // Badge shows verified source
    expect(screen.getByText(/verified/i)).toBeInTheDocument();
  });

  // 4. Add missing ingredient and delete item
  test('allows deleting an item and adding a missing ingredient', async () => {
    useLoggerStore.getState().setAiDraft({
      imageDataUrl: null,
      contextPrompt: '',
      items: [
        {
          id: 'item-del',
          name: 'Extra Butter',
          grams: 20,
          per100g: { calories: 717, protein: 0.9, carbs: 0.1, fat: 81, fiber: 0 },
          verifiedSource: null,
        },
        {
          id: 'item-keep',
          name: 'Steamed Broccoli',
          grams: 100,
          per100g: { calories: 35, protein: 2.4, carbs: 7.2, fat: 0.4, fiber: 2.6 },
          verifiedSource: null,
        },
      ],
    });

    render(<AiMealScannerSheet open date="2026-11-14" mealSlot="lunch" onClose={() => {}} />);

    // Initial calories: 20g butter (143.4) + 100g broccoli (35) = 178 kcal
    expect(screen.getByTestId('hitl-total-calories')).toHaveTextContent('178');

    // Delete butter
    const deleteButterBtn = screen.getByRole('button', { name: /delete Extra Butter/i });
    fireEvent.click(deleteButterBtn);

    // Only broccoli remains: 35 kcal
    expect(screen.queryByText('Extra Butter')).not.toBeInTheDocument();
    expect(screen.getByTestId('hitl-total-calories')).toHaveTextContent('35');

    // Add missing ingredient
    fireEvent.click(screen.getByRole('button', { name: /add missing ingredient/i }));
    expect(screen.getByRole('dialog', { name: /verify or swap food|add ingredient/i })).toBeInTheDocument();

    // Type manual ingredient if not searching, or select food
    const nameInput = screen.getByPlaceholderText(/ingredient name/i);
    const gramsInput = screen.getByPlaceholderText(/grams/i);
    const calInput = screen.getByPlaceholderText(/calories per 100g/i);
    fireEvent.change(nameInput, { target: { value: 'Olive Oil' } });
    fireEvent.change(gramsInput, { target: { value: '10' } });
    fireEvent.change(calInput, { target: { value: '884' } });

    fireEvent.click(screen.getByRole('button', { name: /add to meal/i }));

    // Olive oil added: 10g of 884 kcal/100g = 88.4 kcal + 35 = 123 kcal
    await waitFor(() => {
      expect(screen.getByText('Olive Oil')).toBeInTheDocument();
      expect(screen.getByTestId('hitl-total-calories')).toHaveTextContent('123');
    });
  });

  // 5. Stage 1 Photo Capture & Context Prompt -> /api/ai/meal-scan -> Stage 2 Transition
  test('Stage 1 accepts image upload, prep prompt, analyzes via /api/ai/meal-scan, and transitions to Stage 2', async () => {
    // Mock createImageBitmap and canvas for compressImageToJpeg
    const mockClose = vi.fn();
    const mockBitmap = { width: 800, height: 600, close: mockClose };
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap));

    const mockDrawImage = vi.fn();
    const mockToDataURL = vi.fn().mockReturnValue('data:image/jpeg;base64,compressed-jpeg-data');

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage: mockDrawImage }),
          toDataURL: mockToDataURL,
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    });

    // Mock fetch for /api/ai/meal-scan
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('/api/ai/meal-scan')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              {
                name: 'Grilled Salmon',
                grams: 180,
                per100g: { calories: 208, protein: 22, carbs: 0, fat: 13, fiber: 0 },
              },
              {
                name: 'Asparagus',
                grams: 100,
                per100g: { calories: 20, protein: 2.2, carbs: 3.9, fat: 0.1, fiber: 2.1 },
              },
            ],
          }),
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    render(<AiMealScannerSheet open date="2026-11-14" mealSlot="dinner" onClose={() => {}} />);

    // Stage 1 elements should be visible
    expect(screen.getByText(/ai meal scanner/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/cooking oil, sauces, prep style/i)).toBeInTheDocument();

    // Type prep context
    const promptTextarea = screen.getByPlaceholderText(/cooking oil, sauces, prep style/i);
    fireEvent.change(promptTextarea, { target: { value: 'Cooked with 1 tbsp butter and garlic' } });

    // Upload an image file
    const file = new File(['fake-image'], 'meal.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText(/upload meal photo|take photo/i, { selector: 'input' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for image compression and preview
    await waitFor(() => {
      expect(screen.getByAltText(/meal preview/i)).toBeInTheDocument();
    });

    // Click Analyze Meal
    const analyzeBtn = screen.getByRole('button', { name: /analyze meal/i });
    expect(analyzeBtn).not.toBeDisabled();
    fireEvent.click(analyzeBtn);

    // Verify Stage 2 transition with returned items
    await waitFor(() => {
      expect(screen.getByText('Grilled Salmon')).toBeInTheDocument();
      expect(screen.getByText('Asparagus')).toBeInTheDocument();
    });

    // Total calories: 180g salmon (374.4) + 100g asparagus (20) = 394 kcal
    expect(screen.getByTestId('hitl-total-calories')).toHaveTextContent('394');

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/ai/meal-scan',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          imageDataUrl: 'data:image/jpeg;base64,compressed-jpeg-data',
          contextPrompt: 'Cooked with 1 tbsp butter and garlic',
        }),
      })
    );
  });

  // 6. Stage 1 error handling retains image & context prompt
  test('Stage 1 shows inline error banner on scan failure while retaining image & context prompt', async () => {
    const mockClose = vi.fn();
    const mockBitmap = { width: 500, height: 500, close: mockClose };
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap));

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage: vi.fn() }),
          toDataURL: () => 'data:image/jpeg;base64,retry-data',
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    });

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ error: 'AI service unavailable. Please try again.' }),
    } as Response);

    render(<AiMealScannerSheet open date="2026-11-14" mealSlot="dinner" onClose={() => {}} />);

    const promptTextarea = screen.getByPlaceholderText(/cooking oil, sauces, prep style/i);
    fireEvent.change(promptTextarea, { target: { value: 'Keep my prompt intact' } });

    const file = new File(['fake-image'], 'meal.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText(/upload meal photo|take photo/i, { selector: 'input' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByAltText(/meal preview/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /analyze meal/i }));

    // Error banner appears
    await waitFor(() => {
      expect(screen.getByText(/AI service unavailable\. Please try again\./i)).toBeInTheDocument();
    });

    // Image and prompt are preserved
    expect(screen.getByAltText(/meal preview/i)).toBeInTheDocument();
    expect(promptTextarea).toHaveValue('Keep my prompt intact');
  });

  // 7. Conversational "Refine with AI" success and error handling
  test('Conversational "Refine with AI" updates draft items on success, and keeps draft intact on error', async () => {
    useLoggerStore.getState().setAiDraft({
      imageDataUrl: 'data:image/jpeg;base64,initial-photo',
      contextPrompt: 'initial context',
      items: [
        {
          id: '1',
          name: 'Pork Chop',
          grams: 150,
          per100g: { calories: 242, protein: 27, carbs: 0, fat: 14, fiber: 0 },
          verifiedSource: null,
        },
      ],
    });

    let refineSuccess = true;
    vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('/api/ai/refine')) {
        if (!refineSuccess) {
          return {
            ok: false,
            status: 422,
            json: async () => ({ error: 'Could not understand refinement instruction' }),
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              {
                name: 'Pork Chop (Trimmed)',
                grams: 120,
                per100g: { calories: 200, protein: 28, carbs: 0, fat: 9, fiber: 0 },
              },
            ],
          }),
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    render(<AiMealScannerSheet open date="2026-11-14" mealSlot="dinner" onClose={() => {}} />);

    const refineInput = screen.getByPlaceholderText(/e\.g\., remove the cheese, make the chicken 200g/i);
    const refineBtn = screen.getByRole('button', { name: /refine/i });

    // First test successful refine
    fireEvent.change(refineInput, { target: { value: 'Make it trimmed and 120 grams' } });
    fireEvent.click(refineBtn);

    await waitFor(() => {
      expect(screen.getByText('Pork Chop (Trimmed)')).toBeInTheDocument();
      // 120g * 200 kcal / 100g = 240 kcal
      expect(screen.getByTestId('hitl-total-calories')).toHaveTextContent('240');
    });

    // Second test error handling
    refineSuccess = false;
    fireEvent.change(refineInput, { target: { value: 'Invalid gibberish command' } });
    fireEvent.click(refineBtn);

    await waitFor(() => {
      expect(screen.getByText(/Could not understand refinement instruction/i)).toBeInTheDocument();
    });
    // Draft items still intact
    expect(screen.getByText('Pork Chop (Trimmed)')).toBeInTheDocument();
  });

  // 8. AppShell integration and escape key close
  test('AppShell renders AiMealScannerSheet when activeSheet is "ai-scan" and supports Escape key close', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    // Initially sheet is closed
    expect(screen.queryByTestId('ai-meal-scanner-sheet')).not.toBeInTheDocument();

    // Open sheet via quick action dock
    fireEvent.click(screen.getByRole('button', { name: /open quick actions/i }));
    const aiScanAction = screen.getByRole('button', { name: /ai meal scan/i });
    fireEvent.click(aiScanAction);

    expect(screen.getByTestId('ai-meal-scanner-sheet')).toBeInTheDocument();

    // Press Escape to close
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useLoggerStore.getState().activeSheet).toBeNull();
  });

  // 9. Regression: Escape key handling with open HitlVerificationSwapModal
  test('regression: opening HitlVerificationSwapModal and pressing Escape closes ONLY swap modal while keeping AiMealScannerSheet open', () => {
    const handleClose = vi.fn();
    useLoggerStore.getState().setAiDraft({
      imageDataUrl: 'data:image/jpeg;base64,photo',
      contextPrompt: '',
      items: [
        {
          id: 'item-esc',
          name: 'Sweet Potato',
          grams: 150,
          per100g: { calories: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3 },
          verifiedSource: null,
        },
      ],
    });

    render(<AiMealScannerSheet open date="2026-11-14" mealSlot="lunch" onClose={handleClose} />);

    // Open swap modal
    fireEvent.click(screen.getByRole('button', { name: /verify \/ swap/i }));
    expect(screen.getByRole('dialog', { name: /verify or swap food/i })).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' });

    // Swap modal must be closed
    expect(screen.queryByRole('dialog', { name: /verify or swap food/i })).not.toBeInTheDocument();

    // Parent sheet must still be open and handleClose NOT called
    expect(handleClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('ai-meal-scanner-sheet')).toBeInTheDocument();
  });

  // 10. Regression: Confirming & logging resets draft and local state so reopening starts clean in Stage 1
  test('regression: confirming and logging resets draft and local state so reopening starts clean in Stage 1', async () => {
    const handleClose = vi.fn();
    useLoggerStore.getState().setAiDraft({
      imageDataUrl: 'data:image/jpeg;base64,my-test-photo',
      contextPrompt: 'cooked with olive oil',
      items: [
        {
          id: 'item-log',
          name: 'Steak',
          grams: 200,
          per100g: { calories: 250, protein: 26, carbs: 0, fat: 17, fiber: 0 },
          verifiedSource: null,
        },
      ],
    });

    const { rerender } = render(
      <AiMealScannerSheet open date="2026-11-14" mealSlot="dinner" onClose={handleClose} />
    );

    // Confirm and log
    fireEvent.click(screen.getByRole('button', { name: /confirm & log/i }));
    await waitFor(async () => expect(await db.foodLogs.count()).toBe(1));
    expect(handleClose).toHaveBeenCalled();

    // Reopen sheet (simulate close then reopen in AppShell)
    rerender(<AiMealScannerSheet open={false} date="2026-11-14" mealSlot="dinner" onClose={handleClose} />);
    rerender(<AiMealScannerSheet open={true} date="2026-11-14" mealSlot="dinner" onClose={handleClose} />);

    // Should be back to Stage 1 with clean state (no leftover image preview, empty prompt)
    expect(screen.queryByAltText(/meal preview/i)).not.toBeInTheDocument();
    const promptInput = screen.getByPlaceholderText(/cooking oil, sauces, prep style/i) as HTMLTextAreaElement;
    expect(promptInput.value).toBe('');
  });

  // 11. Regression: Refine with AI updates baselineGrams cleanly
  test('regression: clicking 1x after Refine with AI preserves refined gram value instead of reverting to stale pre-refine grams', async () => {
    useLoggerStore.getState().setAiDraft({
      imageDataUrl: 'data:image/jpeg;base64,test',
      contextPrompt: '',
      items: [
        {
          id: '1',
          name: 'Pork Chop',
          grams: 100,
          per100g: { calories: 200, protein: 25, carbs: 0, fat: 10, fiber: 0 },
          verifiedSource: null,
        },
      ],
    });

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          {
            id: '1',
            name: 'Pork Chop',
            grams: 250,
            per100g: { calories: 200, protein: 25, carbs: 0, fat: 10, fiber: 0 },
          },
        ],
      }),
    } as Response);

    render(<AiMealScannerSheet open date="2026-11-14" mealSlot="dinner" onClose={() => {}} />);

    // Initial grams: 100g -> 200 kcal
    expect(screen.getByTestId('hitl-total-calories')).toHaveTextContent('200');

    // Refine to 250g
    const refineInput = screen.getByPlaceholderText(/e\.g\., remove the cheese, make the chicken 200g/i);
    fireEvent.change(refineInput, { target: { value: 'Make it 250 grams' } });
    fireEvent.click(screen.getByRole('button', { name: /refine/i }));

    await waitFor(() => {
      // 250g * 2 = 500 kcal
      expect(screen.getByTestId('hitl-total-calories')).toHaveTextContent('500');
    });

    // Now click '1x' multiplier: it must preserve the 250g refined baseline, NOT snap back to 100g!
    fireEvent.click(screen.getByRole('button', { name: '1x' }));
    expect(screen.getByTestId('hitl-total-calories')).toHaveTextContent('500');
  });
});
