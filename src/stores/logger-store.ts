import { create } from 'zustand';
import type { MacroNutrients, Micronutrients } from '@/types/nutrition';

export type LogSheetType = 'ai-scan' | 'barcode' | 'search' | 'quick-add';

export interface AiDraftItem {
  id: string;
  name: string;
  grams: number;
  per100g: MacroNutrients;
  microsPer100g?: Micronutrients;
  verifiedSource: string | null;
  verifiedFoodId?: string;
}

export interface AiDraft {
  imageDataUrl: string | null;
  contextPrompt: string;
  items: AiDraftItem[];
}

export interface LoggerState {
  activeDate: string;
  activeMealSlot: string;
  activeSheet: LogSheetType | null;
  aiDraft: AiDraft | null;
  openSheet: (sheet: LogSheetType, mealSlot?: string) => void;
  closeSheet: () => void;
  setActiveDate: (date: string) => void;
  setActiveMealSlot: (slot: string) => void;
  setAiDraft: (draft: AiDraft | null) => void;
  resetDraft: () => void;
}

function getTodayIsoDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const useLoggerStore = create<LoggerState>((set) => ({
  activeDate: getTodayIsoDate(),
  activeMealSlot: 'breakfast',
  activeSheet: null,
  aiDraft: null,
  openSheet: (sheet, mealSlot) =>
    set((state) => ({
      activeSheet: sheet,
      activeMealSlot: mealSlot ?? state.activeMealSlot,
    })),
  closeSheet: () => set({ activeSheet: null }),
  setActiveDate: (date) => set({ activeDate: date }),
  setActiveMealSlot: (slot) => set({ activeMealSlot: slot }),
  setAiDraft: (draft) => set({ aiDraft: draft }),
  resetDraft: () => set({ aiDraft: null }),
}));
