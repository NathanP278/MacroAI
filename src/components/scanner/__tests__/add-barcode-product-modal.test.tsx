import 'fake-indexeddb/auto';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { db } from '@/lib/db/macroai-db';
import { AddBarcodeProductModal } from '../add-barcode-product-modal';
import { BarcodeScannerDrawer } from '../barcode-scanner-drawer';
import { compressImageToJpeg } from '@/lib/media/image-compress';
import { AppShell } from '@/components/shell/app-shell';
import { useLoggerStore } from '@/stores/logger-store';

const originalCreateElement = document.createElement.bind(document);

describe('Task 8: Barcode Scanner & Missing-Barcode Creator', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useLoggerStore.setState({
      activeDate: '2026-11-14',
      activeMealSlot: 'snacks',
      activeSheet: null,
      aiDraft: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('compressImageToJpeg', () => {
    test('scales down bitmap when width exceeds maxWidth, exports jpeg, and closes bitmap', async () => {
      const mockClose = vi.fn();
      const mockBitmap = {
        width: 2048,
        height: 1024,
        close: mockClose,
      };

      vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap));

      const mockDrawImage = vi.fn();
      const mockToDataURL = vi.fn().mockReturnValue('data:image/jpeg;base64,mockjpeg');

      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: () => ({
              drawImage: mockDrawImage,
            }),
            toDataURL: mockToDataURL,
          } as unknown as HTMLCanvasElement;
        }
        return originalCreateElement(tagName);
      });

      const blob = new Blob(['dummy'], { type: 'image/png' });
      const dataUrl = await compressImageToJpeg(blob, 1024, 0.8);

      expect(dataUrl).toBe('data:image/jpeg;base64,mockjpeg');
      expect(mockDrawImage).toHaveBeenCalledWith(mockBitmap, 0, 0, 1024, 512);
      expect(mockToDataURL).toHaveBeenCalledWith('image/jpeg', 0.8);
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('AddBarcodeProductModal', () => {
    test('saves custom barcode product to foodsCache and logs serving immediately', async () => {
      render(
        <AddBarcodeProductModal
          open
          barcode="0987654321"
          date="2026-11-14"
          mealSlot="snacks"
          onClose={() => {}}
        />
      );

      fireEvent.change(screen.getByLabelText(/product name/i), { target: { value: 'Whey Isolate' } });
      fireEvent.change(screen.getByLabelText(/serving size/i), { target: { value: '30' } });
      fireEvent.change(screen.getByLabelText(/calories/i), { target: { value: '120' } });
      fireEvent.change(screen.getByLabelText(/protein/i), { target: { value: '27' } });
      fireEvent.click(screen.getByRole('button', { name: /save & log/i }));

      await waitFor(async () =>
        expect(await db.foodsCache.where('barcode').equals('0987654321').count()).toBe(1)
      );
      expect(await db.foodLogs.count()).toBe(1);

      const cached = await db.foodsCache.where('barcode').equals('0987654321').first();
      expect(cached?.name).toBe('Whey Isolate');
      expect(cached?.source).toBe('custom_barcode');
      expect(cached?.basis).toBe('per100g');
      // 120 cal / 30g * 100g = 400 cal
      expect(cached?.nutrientsPerBasis.calories).toBe(400);
      // 27g protein / 30g * 100g = 90g
      expect(cached?.nutrientsPerBasis.protein).toBe(90);

      const [log] = await db.foodLogs.toArray();
      expect(log?.foodId).toBe('custom_barcode:0987654321');
      expect(log?.source).toBe('custom_barcode');
      expect(log?.amount).toBe(30);
      expect(log?.unit).toBe('g');
      expect(log?.nutritionSnapshot.calories).toBe(120);
      expect(log?.nutritionSnapshot.protein).toBe(27);
    });

    test('normalizes nutrients correctly for ml (per100ml) and serving (perServing)', async () => {
      // Test liquid 'ml' normalization
      const { unmount } = render(
        <AddBarcodeProductModal
          open
          barcode="111222333"
          date="2026-11-14"
          mealSlot="breakfast"
          onClose={() => {}}
        />
      );

      fireEvent.change(screen.getByLabelText(/product name/i), { target: { value: 'Almond Drink' } });
      fireEvent.change(screen.getByLabelText(/serving size/i), { target: { value: '250' } });
      fireEvent.change(screen.getByLabelText(/serving unit/i), { target: { value: 'ml' } });
      fireEvent.change(screen.getByLabelText(/calories/i), { target: { value: '75' } });
      fireEvent.change(screen.getByLabelText(/protein/i), { target: { value: '2.5' } });
      fireEvent.change(screen.getByLabelText(/carbs/i), { target: { value: '10' } });
      fireEvent.change(screen.getByLabelText(/fat/i), { target: { value: '3' } });
      fireEvent.click(screen.getByRole('button', { name: /save & log/i }));

      await waitFor(async () =>
        expect(await db.foodsCache.where('barcode').equals('111222333').count()).toBe(1)
      );

      const liquidItem = await db.foodsCache.where('barcode').equals('111222333').first();
      expect(liquidItem?.basis).toBe('per100ml');
      // 75 / 250 * 100 = 30 kcal
      expect(liquidItem?.nutrientsPerBasis.calories).toBe(30);
      // 2.5 / 250 * 100 = 1g
      expect(liquidItem?.nutrientsPerBasis.protein).toBe(1);

      unmount();

      // Test 'serving' unit
      render(
        <AddBarcodeProductModal
          open
          barcode="444555666"
          date="2026-11-14"
          mealSlot="lunch"
          onClose={() => {}}
        />
      );

      fireEvent.change(screen.getByLabelText(/product name/i), { target: { value: 'Protein Bar' } });
      fireEvent.change(screen.getByLabelText(/serving size/i), { target: { value: '1' } });
      fireEvent.change(screen.getByLabelText(/serving unit/i), { target: { value: 'serving' } });
      fireEvent.change(screen.getByLabelText(/calories/i), { target: { value: '210' } });
      fireEvent.change(screen.getByLabelText(/protein/i), { target: { value: '20' } });
      fireEvent.click(screen.getByRole('button', { name: /save & log/i }));

      await waitFor(async () =>
        expect(await db.foodsCache.where('barcode').equals('444555666').count()).toBe(1)
      );

      const barItem = await db.foodsCache.where('barcode').equals('444555666').first();
      expect(barItem?.basis).toBe('perServing');
      expect(barItem?.nutrientsPerBasis.calories).toBe(210);
      expect(barItem?.nutrientsPerBasis.protein).toBe(20);
    });

    test('supports Scan Nutrition Label (AI OCR) button to populate form fields', async () => {
      // Mock global fetch for /api/ai/label-ocr
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            name: 'Greek Yogurt 0%',
            brand: 'Fage',
            servingSize: 170,
            servingUnit: 'g',
            calories: 90,
            protein: 18,
            carbs: 5,
            fat: 0,
            fiber: 0,
            sodiumMg: 65,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      // Mock compressImageToJpeg
      vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({
        width: 500,
        height: 500,
        close: vi.fn(),
      }));
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: () => ({ drawImage: vi.fn() }),
            toDataURL: () => 'data:image/jpeg;base64,mockocrimage',
          } as unknown as HTMLCanvasElement;
        }
        return originalCreateElement(tagName);
      });

      render(
        <AddBarcodeProductModal
          open
          barcode="5201051000001"
          date="2026-11-14"
          mealSlot="breakfast"
          onClose={() => {}}
        />
      );

      const file = new File(['mock content'], 'label.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByTestId('ocr-file-input');
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith('/api/ai/label-ocr', expect.objectContaining({
          method: 'POST',
        }));
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/product name/i)).toHaveValue('Greek Yogurt 0%');
        expect(screen.getByLabelText(/brand/i)).toHaveValue('Fage');
        expect(screen.getByLabelText(/serving size/i)).toHaveValue(170);
        expect(screen.getByLabelText(/calories/i)).toHaveValue(90);
        expect(screen.getByLabelText(/protein/i)).toHaveValue(18);
        expect(screen.getByLabelText(/carbs/i)).toHaveValue(5);
        expect(screen.getByLabelText(/fat/i)).toHaveValue(0);
        expect(screen.getByLabelText(/sodium/i)).toHaveValue(65);
      });
    });

    test('shows clear inline error feedback if /api/ai/label-ocr fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ error: 'OCR processing failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({
        width: 100,
        height: 100,
        close: vi.fn(),
      }));
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: () => ({ drawImage: vi.fn() }),
            toDataURL: () => 'data:image/jpeg;base64,mockocrimage',
          } as unknown as HTMLCanvasElement;
        }
        return originalCreateElement(tagName);
      });

      render(
        <AddBarcodeProductModal
          open
          barcode="9999999999"
          date="2026-11-14"
          mealSlot="dinner"
          onClose={() => {}}
        />
      );

      const file = new File(['err'], 'error.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByTestId('ocr-file-input');
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/OCR service failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('BarcodeScannerDrawer', () => {
    test('renders manual barcode entry and looks up product with hit result', async () => {
      // Seed an item in foodsCache
      await db.foodsCache.put({
        id: 'off:737628064502',
        barcode: '737628064502',
        source: 'off',
        name: 'Peanut Butter',
        brand: 'Jif',
        basis: 'perServing',
        servingSize: 32,
        servingUnit: 'g',
        nutrientsPerBasis: { calories: 190, protein: 7, carbs: 8, fat: 16, fiber: 2 },
        micronutrientsPerBasis: { sodiumMg: 140 },
        updatedAt: Date.now(),
      });

      const handleClose = vi.fn();
      render(
        <BarcodeScannerDrawer
          open
          date="2026-11-14"
          mealSlot="snacks"
          onClose={handleClose}
        />
      );

      expect(screen.getByLabelText(/^barcode$/i)).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/^barcode$/i), {
        target: { value: '737628064502' },
      });
      fireEvent.click(screen.getByRole('button', { name: /look up/i }));

      // Hits product card
      await waitFor(() => {
        expect(screen.getByText('Peanut Butter')).toBeInTheDocument();
      });

      // Portions adjust & log food button
      expect(screen.getByRole('button', { name: /log food/i })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /log food/i }));

      await waitFor(async () => {
        expect(await db.foodLogs.count()).toBe(1);
      });
      expect(handleClose).toHaveBeenCalled();
    });

    test('opens AddBarcodeProductModal on missing barcode result', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ status: 0 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(
        <BarcodeScannerDrawer
          open
          date="2026-11-14"
          mealSlot="snacks"
          onClose={() => {}}
        />
      );

      fireEvent.change(screen.getByLabelText(/^barcode$/i), {
        target: { value: '0000000000' },
      });
      fireEvent.click(screen.getByRole('button', { name: /look up/i }));

      await waitFor(() => {
        expect(screen.getByText(/Product Not Found/i)).toBeInTheDocument();
      });
      expect(screen.getByLabelText(/product name/i)).toBeInTheDocument();
    });

    test('displays offline message and manual add button on offline-miss result', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

      render(
        <BarcodeScannerDrawer
          open
          date="2026-11-14"
          mealSlot="snacks"
          onClose={() => {}}
        />
      );

      fireEvent.change(screen.getByLabelText(/^barcode$/i), {
        target: { value: '8888888888' },
      });
      fireEvent.click(screen.getByRole('button', { name: /look up/i }));

      await waitFor(() => {
        expect(screen.getByText(/network offline/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /add product offline/i })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /add product offline/i }));

      // Opens AddBarcodeProductModal
      await waitFor(() => {
        expect(screen.getByLabelText(/product name/i)).toBeInTheDocument();
      });
    });

    test('closes drawer on Escape key press', () => {
      const handleClose = vi.fn();
      render(
        <BarcodeScannerDrawer
          open
          date="2026-11-14"
          mealSlot="snacks"
          onClose={handleClose}
        />
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe('AppShell Integration', () => {
    test('opens BarcodeScannerDrawer when activeSheet is "barcode"', () => {
      render(
        <AppShell>
          <div>Main App</div>
        </AppShell>
      );

      fireEvent.click(screen.getByRole('button', { name: /open quick actions/i }));
      const barcodeAction = screen.getByRole('button', { name: /barcode scan/i });
      fireEvent.click(barcodeAction);

      expect(screen.getByRole('dialog', { name: /barcode scanner/i })).toBeInTheDocument();
    });
  });
});
