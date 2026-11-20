import { create } from 'zustand';
import type {
  CustomRecipeIngredient,
  FoodLogEntry,
  MacroNutrients,
  Micronutrients,
  WeightLogEntry,
} from '@/types/nutrition';
import type { TransitionDirection } from '@/lib/motion';

export type LogSheetType =
  | 'ai-scan'
  | 'barcode'
  | 'search'
  | 'quick-add'
  | 'weight'
  | 'meal-ideas';

export interface UndoToastItem {
  id: string;
  message: string;
  onUndo: () => Promise<void> | void;
}

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
  dateDirection: TransitionDirection;
  activeMealSlot: string;
  activeSheet: LogSheetType | null;
  searchInitialQuery: string;
  aiDraft: AiDraft | null;
  editingEntry: FoodLogEntry | null;
  editingWeight: WeightLogEntry | null;
  recipeSeedIngredients: CustomRecipeIngredient[] | null;
  undoToast: UndoToastItem | null;
  isCommandPaletteOpen: boolean;
  syncAuthLocked: boolean;
  openSheet: (sheet: LogSheetType, mealSlot?: string) => void;
  closeSheet: () => void;
  setSearchInitialQuery: (query: string) => void;
  setActiveDate: (date: string) => void;
  setActiveMealSlot: (slot: string) => void;
  setAiDraft: (draft: AiDraft | null) => void;
  resetDraft: () => void;
  setEditingEntry: (entry: FoodLogEntry | null) => void;
  setEditingWeight: (entry: WeightLogEntry | null) => void;
  setRecipeSeedIngredients: (ingredients: CustomRecipeIngredient[] | null) => void;
  openRecipeBuilderWithIngredients: (ingredients: CustomRecipeIngredient[]) => void;
  showUndoToast: (item: Omit<UndoToastItem, 'id'>) => void;
  dismissUndoToast: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSyncAuthLocked: (locked: boolean) => void;
}

export function getTodayIsoDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatHumanDate(iso: string): string {
  const parts = (iso || '').split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return iso;
  const [y, m, day] = parts;
  const dateObj = new Date(y, m - 1, day);
  const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
  const todayIso = getTodayIsoDate();
  if (iso === todayIso) {
    return `Today, ${monthName} ${day}`;
  }
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const yestIso = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;
  if (iso === yestIso) {
    return `Yesterday, ${monthName} ${day}`;
  }
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
  return `${dayName}, ${monthName} ${day}`;
}

export const useLoggerStore = create<LoggerState>((set) => ({
  activeDate: getTodayIsoDate(),
  dateDirection: null,
  activeMealSlot: 'log',
  activeSheet: null,
  searchInitialQuery: '',
  aiDraft: null,
  editingEntry: null,
  editingWeight: null,
  recipeSeedIngredients: null,
  undoToast: null,
  isCommandPaletteOpen: false,
  syncAuthLocked: false,
  openSheet: (sheet, mealSlot) =>
    set((state) => ({
      activeSheet: sheet,
      activeMealSlot: mealSlot ?? (state.activeMealSlot || 'log'),
    })),
  closeSheet: () =>
    set({
      activeSheet: null,
      searchInitialQuery: '',
      activeMealSlot: 'log',
      editingWeight: null,
    }),
  setSearchInitialQuery: (query) => set({ searchInitialQuery: query }),
  setActiveDate: (date) =>
    set((state) => ({
      activeDate: date,
      dateDirection:
        date > state.activeDate
          ? 'forward'
          : date < state.activeDate
            ? 'backward'
            : null,
    })),
  setActiveMealSlot: (slot) => set({ activeMealSlot: slot }),
  setAiDraft: (draft) => set({ aiDraft: draft }),
  resetDraft: () => set({ aiDraft: null }),
  setEditingEntry: (entry) => set({ editingEntry: entry }),
  setEditingWeight: (entry) => set({ editingWeight: entry }),
  setRecipeSeedIngredients: (ingredients) =>
    set({ recipeSeedIngredients: ingredients }),
  openRecipeBuilderWithIngredients: (ingredients) =>
    set({ recipeSeedIngredients: ingredients }),
  showUndoToast: (item) =>
    set({
      undoToast: {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...item,
      },
    }),
  dismissUndoToast: () => set({ undoToast: null }),
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  setSyncAuthLocked: (locked) => set({ syncAuthLocked: locked }),
}));
