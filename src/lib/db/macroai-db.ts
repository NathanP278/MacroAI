import Dexie, { type Table } from 'dexie';
import type { FoodItem, FoodLogEntry, CustomRecipe, UserGoals } from '@/types/nutrition';
import { createCentralSyncMiddleware } from './cloud-sync';

export class MacroAIDB extends Dexie {
  foodLogs!: Table<FoodLogEntry, string>;
  foodsCache!: Table<FoodItem, string>;
  customRecipes!: Table<CustomRecipe, string>;
  userGoals!: Table<UserGoals, string>;

  constructor() {
    super('MacroAIDB');
    this.version(1).stores({
      foodLogs: 'id, date, mealSlot, foodId, createdAt',
      foodsCache: 'id, barcode, source, name, updatedAt',
      customRecipes: 'id, name, createdAt',
      userGoals: 'id, updatedAt',
    });
    this.use(createCentralSyncMiddleware(() => this));
  }
}

export const generateId = (): string => crypto.randomUUID();

export const db = new MacroAIDB();
