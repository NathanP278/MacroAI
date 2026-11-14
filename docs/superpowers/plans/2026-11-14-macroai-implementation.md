# MacroAI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build **MacroAI**, a free, personal, offline-first Next.js nutrition tracking PWA with MacroFactor-inspired dark-first UI, `Dexie.js` (`MacroAIDB`) storage, USDA/Open Food Facts lookup waterfall, barcode + AI label OCR creation, and server-configured OpenAI-compatible Vision meal scanning with full HITL verification.

**Architecture:** Client-reactive Next.js App Router shell powered by `Dexie.js` (`useLiveQuery`) for persistent offline data and `Zustand` for transient HITL/logger staging state. Three stateless Next.js Route Handler groups (`/api/off/[barcode]`, `/api/usda/[...path]`, `/api/ai/*`) handle CORS-restricted `User-Agent` headers, server `USDA_API_KEY`, and server-env custom OpenAI-compatible AI credentials without exposing secrets to the browser. A custom `public/sw.js` + `app/manifest.ts` provides Turbopack-safe PWA offline caching.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, Shadcn UI, Lucide Icons, Dexie.js + `dexie-react-hooks`, Zustand, Zod, `html5-qrcode`, Vitest + `@testing-library/react` + `fake-indexeddb`.

**Spec:** [docs/superpowers/specs/2026-11-14-macroai-design.md](file:///d:/Coding/MacroAI/docs/superpowers/specs/2026-11-14-macroai-design.md)

## Global Constraints

- Dark-first obsidian/charcoal surfaces with light/system theme toggle, crisp 1px subtle borders, and `tabular-nums` on every numeric calorie/macro/gram readout.
- Adherence-neutral nutrient accents for Calories, Protein, Carbs, and Fat; never use punitive red warnings when exceeding daily targets.
- No BYOK UI, no `aiSettings` IndexedDB table, and no client-supplied AI target URLs; read `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, and optional `AI_CUSTOM_HEADERS` exclusively in server Route Handlers.
- All user data (`foodLogs`, `foodsCache`, `customRecipes`, `userGoals`) persists strictly in IndexedDB (`MacroAIDB`) with `crypto.randomUUID()` PKs on `foodLogs` and `customRecipes`.
- Every AI meal scan and nutrition label OCR output passes through user-editable HITL review before writing to `foodLogs` or `foodsCache`.
- Turbopack-safe PWA via `src/app/manifest.ts` and hand-written `public/sw.js` (no Webpack-coupled `@serwist/next`).

## Review Focus

- Open Food Facts HTTP 200 `{ status: 0 }` misses and kJ `nutriments.energy` vs `energy-kcal_100g` confusion — pinned in Task 7 tests.
- Vision LLM markdown-fenced or malformed JSON and double-counted/zero-gram items — pinned in Task 9 tests.
- Scaling edge cases across `per100g` / `per100ml` / `perServing` bases and Quick Add manual calorie overrides — pinned in Tasks 3 & 5 tests.
- Backup Merge UUID collision handling, `userGoals.updatedAt` conflict resolution, and rollback on corrupt JSON — pinned in Task 4 tests.
- Negative remaining-macro clamping (`max(0, ...)`) when earlier meals exceed daily targets in Fitia-style slot distribution — pinned in Task 12 tests.

---

### Task 1: Project Scaffold, Test Harness & Phase 1 UI Prototypes (`/riff` MacroFactor App Adaptation)

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.env.example`, `.gitignore`
- Create: `DESIGN.md`
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/prototypes/page.tsx`
- Create: `src/components/prototypes/variant-bento.tsx`, `src/components/prototypes/variant-bars.tsx`, `src/components/prototypes/variant-timeline.tsx`
- Test: `src/app/prototypes/__tests__/prototypes.test.tsx`

**Interfaces:**
- Consumes: Public MacroFactor App UI screenshots/references (`help.macrofactorapp.com` / App Store / user-supplied screenshots).
- Produces: `DESIGN.md` (distilled design tokens, typography, surface hierarchy), runnable Vitest + `fake-indexeddb` setup, and 3 clickable mobile PWA prototype variants at `/prototypes` for user selection.

- [ ] **Step 1: Initialize git repo, Next.js App Router + TypeScript + Tailwind + Shadcn UI + Vitest dependencies**

Run:
```bash
git init
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes
npm install dexie dexie-react-hooks zustand zod lucide-react html5-qrcode
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom fake-indexeddb
npx shadcn@latest init -y
```
Add `.env.example` with `USDA_API_KEY=`, `AI_BASE_URL=`, `AI_API_KEY=`, `AI_MODEL=`, `AI_CUSTOM_HEADERS=`, and add `.env.local` + `.riff/` to `.gitignore`.

- [ ] **Step 2: Write the failing prototype render test**

```tsx
// src/app/prototypes/__tests__/prototypes.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import PrototypesPage from '../page';

test('renders all three MacroFactor-inspired variants and switches active preview', () => {
  render(<PrototypesPage />);
  expect(screen.getByRole('tab', { name: /bento/i })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /macro bars/i })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /timeline/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: /macro bars/i }));
  expect(screen.getByTestId('prototype-stage')).toHaveAttribute('data-variant', 'bars');
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/app/prototypes/__tests__/prototypes.test.tsx`
Expected: FAIL (`Cannot find module '../page'`).

- [ ] **Step 4: Distill MacroFactor App visual DNA into `DESIGN.md` and implement the 3 prototype components + `/prototypes` switcher**

Fetch/review public MacroFactor App UI screens (`help.macrofactorapp.com` / App Store) to capture obsidian/charcoal surfaces (`#121316` canvas, `#1B1D22` elevated tile, `1px` `rgba(255,255,255,0.08)` border), `tabular-nums`, adherence-neutral Calorie/Protein/Carbs/Fat tokens, and bottom `+` dock ergonomics into `DESIGN.md`. Implement `PrototypesPage` and the 3 mobile-viewport variants (`variant-bento.tsx`, `variant-bars.tsx`, `variant-timeline.tsx`) using mocked daily nutrition figures and adherence-neutral over-target preview toggle.

- [ ] **Step 5: Run test to verify it passes and visually inspect `/prototypes`**

Run: `npx vitest run src/app/prototypes/__tests__/prototypes.test.tsx`
Expected: PASS. User reviews `/prototypes` in browser and locks the winning variant before Task 2.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: scaffold Next.js app, test harness, DESIGN.md, and Phase 1 UI prototypes"
```

---

### Task 2: Design Tokens, Theme Switcher & Mobile-First App Shell

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`
- Create: `src/components/theme/theme-provider.tsx`
- Create: `src/components/shell/app-shell.tsx`, `src/components/shell/bottom-nav.tsx`, `src/components/shell/quick-action-dock.tsx`
- Create: `src/app/page.tsx`, `src/app/log/page.tsx`, `src/app/recipes/page.tsx`, `src/app/settings/page.tsx`
- Test: `src/components/shell/__tests__/app-shell.test.tsx`

**Interfaces:**
- Consumes: Winning design tokens from `DESIGN.md` (Task 1).
- Produces:
  - `AppShell({ children }): JSX.Element`
  - `QuickActionDock({ onAction: (action: 'ai-scan' | 'barcode' | 'search' | 'quick-add') => void }): JSX.Element`
  - `ThemeProvider` supporting `'dark' | 'light' | 'system'` (default `'dark'`).

- [ ] **Step 1: Write the failing shell & quick-action dock test**

```tsx
// src/components/shell/__tests__/app-shell.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { AppShell } from '../app-shell';

test('toggles quick-action dock with all four logging entry points', () => {
  render(<AppShell><div>Body</div></AppShell>);
  fireEvent.click(screen.getByRole('button', { name: /open quick actions/i }));
  expect(screen.getByRole('button', { name: /ai meal scan/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /barcode scan/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /quick search/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /quick add macros/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/shell/__tests__/app-shell.test.tsx`
Expected: FAIL (`Cannot find module '../app-shell'`).

- [ ] **Step 3: Lock design tokens in `src/app/globals.css` and implement `ThemeProvider`, `AppShell`, `BottomNav`, `QuickActionDock`, and route stubs**

Add CSS variables for dark (`#121316` / `#1B1D22`) and light themes, nutrient accent tokens (`--macro-calories`, `--macro-protein`, `--macro-carbs`, `--macro-fat`, `--macro-fiber`, `--neutral-over`), and `tabular-nums` utility rules. Build thumb-friendly bottom bar (`Dashboard`, `Log`, prominent `+` button, `Recipes`, `Settings`) and overlay dock firing the 4 logging actions.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/shell/__tests__/app-shell.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app src/components
git commit -m "feat: implement locked design tokens, theme provider, and mobile app shell"
```

---

### Task 3: `MacroAIDB` Schema (Dexie) & Nutrition Scaling Helpers

**Files:**
- Create: `src/types/nutrition.ts`
- Create: `src/lib/db/macroai-db.ts`
- Create: `src/lib/nutrition/scaling.ts`
- Test: `src/lib/db/__tests__/macroai-db.test.ts`

**Interfaces:**
- Consumes: `dexie`, `crypto.randomUUID`.
- Produces:
  - Types in `src/types/nutrition.ts`: `NutritionBasis = 'per100g' | 'per100ml' | 'perServing'`, `MacroNutrients`, `Micronutrients`, `FoodItem`, `FoodLogEntry`, `CustomRecipe`, `MealSlotConfig`, `UserGoals`.
  - `db: MacroAIDB` (tables: `foodLogs`, `foodsCache`, `customRecipes`, `userGoals`).
  - `scaleNutrition(nutrientsPerBasis: MacroNutrients, microsPerBasis: Micronutrients, basis: NutritionBasis, amount: number, servingSize?: number): { macros: MacroNutrients; micros: Micronutrients }`.
  - `computeMacroCalories(proteinG: number, carbsG: number, fatG: number): number` (`4 * P + 4 * C + 9 * F`).

- [ ] **Step 1: Write the failing DB and scaling tests**

```ts
// src/lib/db/__tests__/macroai-db.test.ts
import 'fake-indexeddb/auto';
import { db } from '../macroai-db';
import { scaleNutrition, computeMacroCalories } from '../../nutrition/scaling';

test('scales per100g, per100ml, perServing, and zero-amount safely', () => {
  const base = { calories: 200, protein: 20, carbs: 10, fat: 8, fiber: 2 };
  expect(scaleNutrition(base, { sodiumMg: 100 }, 'per100g', 150).macros.calories).toBe(300);
  expect(scaleNutrition(base, {}, 'per100ml', 250).macros.protein).toBe(50);
  expect(scaleNutrition(base, {}, 'perServing', 1.5).macros.carbs).toBe(15);
  expect(scaleNutrition(base, {}, 'per100g', 0).macros.calories).toBe(0);
  expect(computeMacroCalories(30, 40, 10)).toBe(370);
});

test('persists foodLog with immutable nutritionSnapshot and barcode lookup', async () => {
  await db.foodsCache.put({
    id: 'off:12345', barcode: '12345', source: 'off', name: 'Greek Yogurt',
    basis: 'per100g', servingSize: 170, servingUnit: 'g',
    nutrientsPerBasis: { calories: 59, protein: 10, carbs: 3.6, fat: 0.4, fiber: 0 },
    micronutrientsPerBasis: { calciumMg: 110 }, updatedAt: 1000,
  });
  const hit = await db.foodsCache.where('barcode').equals('12345').first();
  expect(hit?.name).toBe('Greek Yogurt');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/db/__tests__/macroai-db.test.ts`
Expected: FAIL (`Cannot find module '../macroai-db'`).

- [ ] **Step 3: Implement `src/types/nutrition.ts`, `src/lib/db/macroai-db.ts`, and `src/lib/nutrition/scaling.ts`**

Define Dexie v1 stores:
- `foodLogs: 'id, date, mealSlot, foodId, createdAt'`
- `foodsCache: 'id, barcode, source, name, updatedAt'`
- `customRecipes: 'id, name, createdAt'`
- `userGoals: 'id, updatedAt'`
Implement pure `scaleNutrition` (dividing by 100 for `per100g` / `per100ml`, multiplying directly for `perServing`, guarding negative/NaN to `0`) and `computeMacroCalories`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/db/__tests__/macroai-db.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types src/lib/db src/lib/nutrition
git commit -m "feat: add MacroAIDB Dexie schema and nutrition scaling utilities"
```

---

### Task 4: JSON Backup Export & Transactional Import (`macroai-backup.json`)

**Files:**
- Create: `src/lib/db/backup.ts`
- Modify: `src/app/settings/page.tsx`
- Test: `src/lib/db/__tests__/backup.test.ts`

**Interfaces:**
- Consumes: `db` (`MacroAIDB` from Task 3), Zod.
- Produces:
  - `exportBackupJson(): Promise<string>` (`{ version: 1, exportedAt, tables: { foodLogs, foodsCache, customRecipes, userGoals } }`).
  - `importBackupJson(rawJson: string, mode: 'replace' | 'merge'): Promise<{ importedCounts: Record<string, number> }>`.

- [ ] **Step 1: Write the failing backup export/merge/rollback tests**

```ts
// src/lib/db/__tests__/backup.test.ts
import 'fake-indexeddb/auto';
import { db } from '../macroai-db';
import { exportBackupJson, importBackupJson } from '../backup';

test('merge upserts by UUID without duplicating and resolves userGoals by updatedAt', async () => {
  await db.delete(); await db.open();
  await db.userGoals.put({ id: 'active', dailyCalories: 2500, proteinG: 180, carbsG: 260, fatG: 80, fiberG: 35, micronutrientTargets: {}, mealSlots: [], updatedAt: 2000 });
  const stalePayload = JSON.stringify({
    version: 1, exportedAt: 1000,
    tables: {
      foodLogs: [{ id: 'log-1', date: '2026-11-14', mealSlot: 'lunch', foodId: 'staple:1', name: 'Rice', source: 'staple', amount: 150, unit: 'g', nutritionSnapshot: { calories: 195, protein: 4, carbs: 42, fat: 0.4, fiber: 0.6, micros: {} }, createdAt: 1000 }],
      foodsCache: [], customRecipes: [],
      userGoals: [{ id: 'active', dailyCalories: 1800, proteinG: 140, carbsG: 180, fatG: 55, fiberG: 25, micronutrientTargets: {}, mealSlots: [], updatedAt: 1000 }],
    },
  });
  await importBackupJson(stalePayload, 'merge');
  await importBackupJson(stalePayload, 'merge');
  expect(await db.foodLogs.count()).toBe(1);
  expect((await db.userGoals.get('active'))?.dailyCalories).toBe(2500);
});

test('corrupt JSON leaves existing MacroAIDB tables untouched', async () => {
  await expect(importBackupJson('{"version": 99}', 'replace')).rejects.toThrow();
  expect((await db.userGoals.get('active'))?.dailyCalories).toBe(2500);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/db/__tests__/backup.test.ts`
Expected: FAIL (`Cannot find module '../backup'`).

- [ ] **Step 3: Implement `src/lib/db/backup.ts` and wire export/import UI into `src/app/settings/page.tsx`**

Validate incoming JSON strictly with Zod before opening `db.transaction('rw', ...)`. In `'replace'` mode, clear all 4 tables and `bulkPut`. In `'merge'` mode, `bulkPut` `foodLogs`, `foodsCache`, `customRecipes` by stable ID and compare `updatedAt` before overwriting `userGoals`. Add Download + Upload (`Replace` / `Merge`) controls in Settings.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/db/__tests__/backup.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/backup.ts src/lib/db/__tests__/backup.test.ts src/app/settings/page.tsx
git commit -m "feat: add versioned macroai-backup.json export and transactional import"
```

---

### Task 5: Zustand Staging Store, Goals/TDEE Calculator & Quick Add Macros Drawer

**Files:**
- Create: `src/stores/logger-store.ts`
- Create: `src/lib/nutrition/goals.ts`
- Create: `src/components/logging/quick-add-drawer.tsx`
- Create: `src/components/settings/goals-calculator-form.tsx`
- Test: `src/components/logging/__tests__/quick-add-drawer.test.tsx`

**Interfaces:**
- Consumes: `db`, `computeMacroCalories` (Task 3), `QuickActionDock` trigger (Task 2).
- Produces:
  - `useLoggerStore` (`activeDate`, `activeMealSlot`, `activeSheet`, `aiDraft`, `openSheet`, `closeSheet`, `setAiDraft`, `resetDraft`).
  - `calculateMifflinStJeorTargets(input: { sex: 'male' | 'female'; age: number; weightKg: number; heightCm: number; activityMultiplier: number; goalDeltaKcal: number; proteinPerKg: number }): Pick<UserGoals, 'dailyCalories' | 'proteinG' | 'carbsG' | 'fatG' | 'fiberG'>`.
  - `DEFAULT_RDA_MICROS: Record<string, number>`, `DEFAULT_MEAL_SLOTS: MealSlotConfig[]`.
  - `QuickAddDrawer` component writing `source: 'quick_add'` entries to `db.foodLogs`.

- [ ] **Step 1: Write the failing Quick Add & TDEE calculator tests**

```tsx
// src/components/logging/__tests__/quick-add-drawer.test.tsx
import 'fake-indexeddb/auto';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { db } from '@/lib/db/macroai-db';
import { calculateMifflinStJeorTargets } from '@/lib/nutrition/goals';
import { QuickAddDrawer } from '../quick-add-drawer';

test('auto-calculates 4P+4C+9F calories and preserves manual calorie override', async () => {
  await db.delete(); await db.open();
  render(<QuickAddDrawer open date="2026-11-14" mealSlot="dinner" onClose={() => {}} />);
  fireEvent.change(screen.getByLabelText(/protein/i), { target: { value: '40' } });
  fireEvent.change(screen.getByLabelText(/carbs/i), { target: { value: '50' } });
  fireEvent.change(screen.getByLabelText(/fat/i), { target: { value: '10' } });
  expect(screen.getByLabelText(/calories/i)).toHaveValue(450);

  fireEvent.change(screen.getByLabelText(/calories/i), { target: { value: '500' } });
  fireEvent.change(screen.getByLabelText(/protein/i), { target: { value: '45' } });
  expect(screen.getByLabelText(/calories/i)).toHaveValue(500);

  fireEvent.click(screen.getByRole('button', { name: /log quick add/i }));
  await waitFor(async () => expect(await db.foodLogs.count()).toBe(1));
  const [entry] = await db.foodLogs.toArray();
  expect(entry.nutritionSnapshot.calories).toBe(500);
});

test('computes Mifflin-St Jeor targets', () => {
  const res = calculateMifflinStJeorTargets({ sex: 'male', age: 30, weightKg: 80, heightCm: 180, activityMultiplier: 1.55, goalDeltaKcal: -300, proteinPerKg: 2 });
  expect(res.proteinG).toBe(160);
  expect(res.dailyCalories).toBeGreaterThan(2000);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/logging/__tests__/quick-add-drawer.test.tsx`
Expected: FAIL (`Cannot find module '../quick-add-drawer'`).

- [ ] **Step 3: Implement `useLoggerStore`, `src/lib/nutrition/goals.ts`, `QuickAddDrawer`, and `GoalsCalculatorForm`**

Track `isCalorieOverridden` boolean inside `QuickAddDrawer` (resettable via a "Sync to macros" button). Seed `userGoals` on first app load if missing using `DEFAULT_MEAL_SLOTS` (`Breakfast`, `Lunch`, `Dinner`, `Snacks`, 25/30/35/10%) and `DEFAULT_RDA_MICROS`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/logging/__tests__/quick-add-drawer.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores src/lib/nutrition/goals.ts src/components/logging src/components/settings
git commit -m "feat: add Zustand logger store, goals/TDEE calculator, and Quick Add drawer"
```

---

### Task 6: Offline ~2,500 Whole-Food Staples & USDA FoodData Central Proxy

**Files:**
- Create: `scripts/build-staples.ts`
- Create: `public/data/staples-2500.json`
- Create: `src/lib/foods/staples-search.ts`
- Create: `src/lib/foods/usda-adapter.ts`
- Create: `src/app/api/usda/[...path]/route.ts`
- Create: `src/components/logging/food-search-drawer.tsx`
- Test: `src/lib/foods/__tests__/usda-and-staples.test.ts`

**Interfaces:**
- Consumes: `FoodItem`, `db.foodsCache` (Task 3).
- Produces:
  - `searchStaples(query: string, limit?: number): Promise<FoodItem[]>` (lazy-loaded & cached in memory from `/data/staples-2500.json`).
  - `GET /api/usda/[...path]` proxying `https://api.nal.usda.gov/fdc/v1/...` with `USDA_API_KEY || 'DEMO_KEY'`.
  - `searchUsdaFoods(query: string): Promise<FoodItem[]>` & `fetchAndCacheUsdaFood(fdcId: number): Promise<FoodItem>`.
  - `FoodSearchDrawer` supporting offline staples + online USDA tab + `foodsCache` hits.

- [ ] **Step 1: Write the failing staples search and USDA normalizer tests**

```ts
// src/lib/foods/__tests__/usda-and-staples.test.ts
import { mapUsdaFoodToFoodItem } from '../usda-adapter';
import { filterStaples } from '../staples-search';

test('normalizes USDA Foundation nutrients (energy kcal, macros, micros) to per100g', () => {
  const item = mapUsdaFoodToFoodItem({
    fdcId: 171705, description: 'Avocados, raw, all commercial varieties', dataType: 'SR Legacy',
    foodNutrients: [
      { nutrient: { id: 1008, name: 'Energy', unitName: 'kcal' }, amount: 160 },
      { nutrient: { id: 1003, name: 'Protein', unitName: 'g' }, amount: 2 },
      { nutrient: { id: 1005, name: 'Carbohydrate, by difference', unitName: 'g' }, amount: 8.53 },
      { nutrient: { id: 1004, name: 'Total lipid (fat)', unitName: 'g' }, amount: 14.66 },
      { nutrient: { id: 1079, name: 'Fiber, total dietary', unitName: 'g' }, amount: 6.7 },
      { nutrient: { id: 1092, name: 'Potassium, K', unitName: 'mg' }, amount: 485 },
    ],
  });
  expect(item.id).toBe('usda:171705');
  expect(item.basis).toBe('per100g');
  expect(item.nutrientsPerBasis.calories).toBe(160);
  expect(item.micronutrientsPerBasis.potassiumMg).toBe(485);
});

test('ranks exact/prefix token matches first across staples', () => {
  const sample = [
    { id: 'staple:1', name: 'Chicken breast, raw' },
    { id: 'staple:2', name: 'Soup, chicken broth' },
  ] as never[];
  expect(filterStaples(sample, 'chicken breast', 10)[0].id).toBe('staple:1');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/foods/__tests__/usda-and-staples.test.ts`
Expected: FAIL (`Cannot find module '../usda-adapter'`).

- [ ] **Step 3: Build `public/data/staples-2500.json`, implement `staples-search.ts`, `usda-adapter.ts`, `/api/usda/[...path]/route.ts`, and `FoodSearchDrawer`**

Write `scripts/build-staples.ts` to parse public USDA FoodData Central Foundation + SR Legacy JSON (from `fdc.nal.usda.gov` bulk download or paginated FDC API) and emit ~2,500 clean whole-food staples (`per100g` macros + key micronutrients) into committed `public/data/staples-2500.json`. Enforce `dataType: ['Foundation', 'SR Legacy']` and `Cache-Control: public, max-age=86400` in `/api/usda/[...path]/route.ts` (allowing only `foods/search` and `food/*` paths). Wire `FoodSearchDrawer` with instant offline staples + `foodsCache` results and debounced live USDA search when online.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/foods/__tests__/usda-and-staples.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts public/data/staples-2500.json src/lib/foods src/app/api/usda src/components/logging/food-search-drawer.tsx
git commit -m "feat: add 2500 offline staples dataset, USDA proxy, and food search drawer"
```

---

### Task 7: Open Food Facts Proxy & Barcode Waterfall

**Files:**
- Create: `src/app/api/off/[barcode]/route.ts`
- Create: `src/lib/foods/off-adapter.ts`
- Create: `src/hooks/use-barcode-lookup.ts`
- Test: `src/lib/foods/__tests__/off-adapter.test.ts`

**Interfaces:**
- Consumes: `db.foodsCache`, `FoodItem` (Task 3).
- Produces:
  - `GET /api/off/[barcode]` fetching `https://world.openfoodfacts.org/api/v2/product/${barcode}.json` with header `User-Agent: MacroAI/1.0`.
  - `parseOffProduct(barcode: string, payload: unknown): FoodItem | null`.
  - `lookupBarcodeWaterfall(barcode: string): Promise<{ status: 'hit'; item: FoodItem } | { status: 'missing'; barcode: string } | { status: 'offline-miss'; barcode: string }>`.

- [ ] **Step 1: Write the failing Open Food Facts & waterfall tests**

```ts
// src/lib/foods/__tests__/off-adapter.test.ts
import 'fake-indexeddb/auto';
import { parseOffProduct } from '../off-adapter';
import { lookupBarcodeWaterfall } from '@/hooks/use-barcode-lookup';
import { db } from '@/lib/db/macroai-db';

test('returns null on OFF status === 0 even when HTTP 200', () => {
  expect(parseOffProduct('999999', { status: 0, status_verbose: 'product not found' })).toBeNull();
});

test('uses energy-kcal_100g and ignores kJ energy field; falls back to perServing', () => {
  const item = parseOffProduct('0111', {
    status: 1,
    product: { product_name: 'Oat Milk', nutriments: { energy: 192, 'energy-kcal_100g': 46, proteins_100g: 1, carbohydrates_100g: 6.5, fat_100g: 1.5 } },
  });
  expect(item?.nutrientsPerBasis.calories).toBe(46);

  const servingOnly = parseOffProduct('0222', {
    status: 1,
    product: { product_name: 'Electrolyte Tab', serving_quantity: 1, nutriments: { energy: 420, 'energy-kcal_serving': 15, carbohydrates_serving: 3 } },
  });
  expect(servingOnly?.basis).toBe('perServing');
  expect(servingOnly?.nutrientsPerBasis.calories).toBe(15);
});

test('checks MacroAIDB.foodsCache before calling /api/off', async () => {
  await db.delete(); await db.open();
  await db.foodsCache.put({ id: 'custom:1', barcode: '888', source: 'custom_barcode', name: 'Local Bar', basis: 'perServing', servingSize: 1, servingUnit: 'serving', nutrientsPerBasis: { calories: 210, protein: 20, carbs: 18, fat: 7, fiber: 3 }, micronutrientsPerBasis: {}, updatedAt: 1 });
  const res = await lookupBarcodeWaterfall('888');
  expect(res.status).toBe('hit');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/foods/__tests__/off-adapter.test.ts`
Expected: FAIL (`Cannot find module '../off-adapter'`).

- [ ] **Step 3: Implement `/api/off/[barcode]/route.ts`, `off-adapter.ts`, and `use-barcode-lookup.ts`**

Validate barcode digits (`^\d{4,18}$`) in `/api/off/[barcode]`, send `User-Agent: MacroAI/1.0`, return `Cache-Control: public, max-age=86400` on `status === 1`. In `lookupBarcodeWaterfall`, check `db.foodsCache` first, call `/api/off/${barcode}`, cache valid hits into `foodsCache`, and return `'missing'` on `status === 0` or `'offline-miss'` on network failure.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/foods/__tests__/off-adapter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/off src/lib/foods/off-adapter.ts src/hooks/use-barcode-lookup.ts src/lib/foods/__tests__/off-adapter.test.ts
git commit -m "feat: add Open Food Facts proxy, kcal normalizer, and offline-first barcode waterfall"
```

---

### Task 8: Live Barcode Camera Scanner & Missing-Barcode Product Creation (Manual + AI Label OCR)

**Files:**
- Create: `src/components/scanner/barcode-scanner-drawer.tsx`
- Create: `src/components/scanner/add-barcode-product-modal.tsx`
- Test: `src/components/scanner/__tests__/add-barcode-product-modal.test.tsx`

**Interfaces:**
- Consumes: `lookupBarcodeWaterfall` (Task 7), `db.foodsCache` & `db.foodLogs` (Task 3), `compressImageToJpeg` (created in Task 10 or extract shared `src/lib/media/image-compress.ts` here!), `/api/ai/label-ocr` (Task 9).
- Note: Create `src/lib/media/image-compress.ts` in this task so both Label OCR and Meal Scanner share one compressor.
- Produces:
  - `compressImageToJpeg(file: Blob, maxWidth?: number, quality?: number): Promise<string>` (`maxWidth = 1024`, `quality = 0.8`).
  - `BarcodeScannerDrawer` (`BarcodeDetector` fast-path + `html5-qrcode` `facingMode: "environment"` fallback + manual input).
  - `AddBarcodeProductModal` pre-populated with missing `barcode`, supporting Manual entry + **Scan Nutrition Label (AI OCR)**, saving `source: 'custom_barcode'` to `foodsCache` and logging initial serving.

- [ ] **Step 1: Write the failing missing-barcode creation & AI OCR fill test**

```tsx
// src/components/scanner/__tests__/add-barcode-product-modal.test.tsx
import 'fake-indexeddb/auto';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { db } from '@/lib/db/macroai-db';
import { AddBarcodeProductModal } from '../add-barcode-product-modal';

test('saves custom barcode product to foodsCache and logs serving immediately', async () => {
  await db.delete(); await db.open();
  render(<AddBarcodeProductModal open barcode="0987654321" date="2026-11-14" mealSlot="snacks" onClose={() => {}} />);
  fireEvent.change(screen.getByLabelText(/product name/i), { target: { value: 'Whey Isolate' } });
  fireEvent.change(screen.getByLabelText(/serving size/i), { target: { value: '30' } });
  fireEvent.change(screen.getByLabelText(/calories/i), { target: { value: '120' } });
  fireEvent.change(screen.getByLabelText(/protein/i), { target: { value: '27' } });
  fireEvent.click(screen.getByRole('button', { name: /save & log/i }));

  await waitFor(async () => expect(await db.foodsCache.where('barcode').equals('0987654321').count()).toBe(1));
  expect(await db.foodLogs.count()).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/scanner/__tests__/add-barcode-product-modal.test.tsx`
Expected: FAIL (`Cannot find module '../add-barcode-product-modal'`).

- [ ] **Step 3: Implement `src/lib/media/image-compress.ts`, `BarcodeScannerDrawer`, and `AddBarcodeProductModal`**

Implement `compressImageToJpeg` using `createImageBitmap` + `<canvas>` resize to max `1024px` width, JPEG `0.8`. In `AddBarcodeProductModal`, normalize serving nutrition to `per100g` when unit is `g` (or `per100ml` when `ml`, `perServing` when `serving`), write to `foodsCache` + `foodLogs` in one Dexie transaction, and wire the "Scan Nutrition Label (AI OCR)" upload button to POST the compressed image to `/api/ai/label-ocr` and populate form fields for review before saving.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/scanner/__tests__/add-barcode-product-modal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/media src/components/scanner
git commit -m "feat: add barcode scanner drawer and missing-barcode manual + AI OCR creator"
```

---

### Task 9: Server-Env OpenAI-Compatible AI Service & Route Handlers (`/api/ai/*`)

**Files:**
- Create: `src/lib/ai/schemas.ts`
- Create: `src/lib/ai/openai-compat.ts`
- Create: `src/app/api/ai/health/route.ts`
- Create: `src/app/api/ai/meal-scan/route.ts`
- Create: `src/app/api/ai/refine/route.ts`
- Create: `src/app/api/ai/label-ocr/route.ts`
- Modify: `src/app/settings/page.tsx`
- Test: `src/lib/ai/__tests__/openai-compat.test.ts`

**Interfaces:**
- Consumes: `process.env.AI_BASE_URL`, `process.env.AI_API_KEY`, `process.env.AI_MODEL`, optional `process.env.AI_CUSTOM_HEADERS` (JSON string).
- Produces:
  - `AiMealItemSchema`, `AiMealScanResponseSchema`, `AiLabelOcrResponseSchema` (Zod schemas).
  - `parseAiJsonResponse<T>(rawText: string, schema: z.ZodType<T>): T` (strips markdown fences, parses JSON, validates strictly).
  - `callVisionChatCompletion(messages: unknown[]): Promise<string>`.
  - Route handlers: `GET /api/ai/health`, `POST /api/ai/meal-scan`, `POST /api/ai/refine`, `POST /api/ai/label-ocr`.

- [ ] **Step 1: Write the failing AI JSON parser & route validation tests**

```ts
// src/lib/ai/__tests__/openai-compat.test.ts
import { parseAiJsonResponse, AiMealScanResponseSchema, AiLabelOcrResponseSchema } from '../schemas';

test('strips markdown code fences and validates non-overlapping meal items', () => {
  const raw = '```json\n{"items":[{"name":"Grilled Chicken Breast","grams":180,"per100g":{"calories":165,"protein":31,"carbs":0,"fat":3.6,"fiber":0}}]}\n```';
  const parsed = parseAiJsonResponse(raw, AiMealScanResponseSchema);
  expect(parsed.items).toHaveLength(1);
  expect(parsed.items[0].grams).toBe(180);
});

test('rejects zero-gram or missing-macro malformed AI payloads', () => {
  expect(() => parseAiJsonResponse('{"items":[{"name":"Plate","grams":0}]}', AiMealScanResponseSchema)).toThrow();
  expect(() => parseAiJsonResponse('not json', AiLabelOcrResponseSchema)).toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/ai/__tests__/openai-compat.test.ts`
Expected: FAIL (`Cannot find module '../schemas'`).

- [ ] **Step 3: Implement `src/lib/ai/schemas.ts`, `openai-compat.ts`, the 4 `/api/ai/*` routes, and Settings "Test AI Connection" card**

Prompt `/api/ai/meal-scan` to decompose composite dishes into non-overlapping ingredients with `per100g` density and estimated `grams` (incorporating user's optional pre-scan context). Prompt `/api/ai/refine` with current JSON draft + user edit instruction. Never return `AI_API_KEY` from `/api/ai/health` (only `{ configured: boolean, model: string, reachable: boolean }`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/ai/__tests__/openai-compat.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai src/app/api/ai src/app/settings/page.tsx
git commit -m "feat: add server-configured OpenAI-compatible AI routes and strict Zod parsers"
```

---

### Task 10: AI Meal Scanner Stage 1 (Pre-Scan Context) & Stage 2 (Interactive HITL Review Sheet)

**Files:**
- Create: `src/components/scanner/ai-meal-scanner-sheet.tsx`
- Create: `src/components/scanner/hitl-ingredient-row.tsx`
- Create: `src/components/scanner/hitl-verification-swap-modal.tsx`
- Test: `src/components/scanner/__tests__/ai-meal-scanner-sheet.test.tsx`

**Interfaces:**
- Consumes: `compressImageToJpeg` (Task 8), `/api/ai/meal-scan` & `/api/ai/refine` (Task 9), `useLoggerStore` (Task 5), `searchStaples`, `searchUsdaFoods`, `db.foodsCache`, `db.foodLogs`.
- Produces:
  - `AiMealScannerSheet` covering Stage 1 (capture/upload + *"Tell what's in the meal"* context prompt) and Stage 2 HITL review (live gram sliders, numeric inputs, `0.5x`/`1x`/`1.5x`/`2x` multipliers, add/delete item, **Verification Swap** keeping adjusted grams, **Conversational "Refine with AI"** bar, and explicit **"Confirm & Log"** button).

- [ ] **Step 1: Write the failing HITL live math, verification swap, and explicit log tests**

```tsx
// src/components/scanner/__tests__/ai-meal-scanner-sheet.test.tsx
import 'fake-indexeddb/auto';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useLoggerStore } from '@/stores/logger-store';
import { db } from '@/lib/db/macroai-db';
import { AiMealScannerSheet } from '../ai-meal-scanner-sheet';

test('updates totals instantaneously on multiplier/gram change, swaps food preserving grams, and logs on confirm', async () => {
  await db.delete(); await db.open();
  useLoggerStore.getState().setAiDraft({
    imageDataUrl: 'data:image/jpeg;base64,abc',
    contextPrompt: 'chicken and rice',
    items: [{ id: '1', name: 'AI Rice', grams: 100, per100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 }, verifiedSource: null }],
  });
  render(<AiMealScannerSheet open date="2026-11-14" mealSlot="lunch" onClose={() => {}} />);

  fireEvent.click(screen.getByRole('button', { name: '1.5x' }));
  expect(screen.getByTestId('hitl-total-calories')).toHaveTextContent('195');
  expect(await db.foodLogs.count()).toBe(0); // never auto-logged

  fireEvent.click(screen.getByRole('button', { name: /confirm & log/i }));
  await waitFor(async () => expect(await db.foodLogs.count()).toBe(1));
  expect((await db.foodLogs.toArray())[0].amount).toBe(150);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/scanner/__tests__/ai-meal-scanner-sheet.test.tsx`
Expected: FAIL (`Cannot find module '../ai-meal-scanner-sheet'`).

- [ ] **Step 3: Implement `AiMealScannerSheet`, `HitlIngredientRow`, and `HitlVerificationSwapModal`**

Keep all Stage 2 slider/numeric/multiplier recalculations strictly local in `useLoggerStore.aiDraft` (zero extra API calls). On Verification Swap, replace `name`, `per100g`, `micronutrientsPer100g`, and `verifiedSource` (`staple` / `usda` / `foodsCache`) while preserving the row's current `grams`. Wire the "Refine with AI" input to `/api/ai/refine`, gracefully retaining user's image/draft if the endpoint errors.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/scanner/__tests__/ai-meal-scanner-sheet.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/scanner
git commit -m "feat: add pre-scan AI meal scanner and interactive HITL review sheet"
```

---

### Task 11: Dashboard Bento Analytics & Micronutrient Breakdown

**Files:**
- Create: `src/lib/nutrition/daily-summary.ts`
- Create: `src/components/dashboard/macro-bento-grid.tsx`
- Create: `src/components/dashboard/micronutrient-panel.tsx`
- Modify: `src/app/page.tsx`
- Test: `src/lib/nutrition/__tests__/daily-summary.test.ts`

**Interfaces:**
- Consumes: `db.foodLogs`, `db.userGoals` (Task 3 & 5), `DEFAULT_RDA_MICROS`.
- Produces:
  - `aggregateDailySummary(logs: FoodLogEntry[], goals: UserGoals): DailySummary` (totals, remaining clamped/unclamped deltas, adherence-neutral status `'under' | 'near' | 'over'`, micronutrient percentages).
  - `MacroBentoGrid` and `MicronutrientPanel` rendered on `src/app/page.tsx` with `tabular-nums` and non-punitive over-target display.

- [ ] **Step 1: Write the failing daily summary & adherence-neutral tests**

```ts
// src/lib/nutrition/__tests__/daily-summary.test.ts
import { aggregateDailySummary } from '../daily-summary';

test('sums macros and micronutrients without punitive state when over target', () => {
  const summary = aggregateDailySummary(
    [{ id: '1', date: '2026-11-14', mealSlot: 'lunch', foodId: 'x', name: 'Steak', source: 'staple', amount: 200, unit: 'g', nutritionSnapshot: { calories: 2200, protein: 190, carbs: 100, fat: 90, fiber: 10, micros: { ironMg: 9 } }, createdAt: 1 }],
    { id: 'active', dailyCalories: 2000, proteinG: 160, carbsG: 200, fatG: 70, fiberG: 30, micronutrientTargets: { ironMg: 18 }, mealSlots: [], updatedAt: 1 }
  );
  expect(summary.calories.consumed).toBe(2200);
  expect(summary.calories.delta).toBe(200);
  expect(summary.calories.status).toBe('over');
  expect(summary.micros.ironMg.percent).toBe(50);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/nutrition/__tests__/daily-summary.test.ts`
Expected: FAIL (`Cannot find module '../daily-summary'`).

- [ ] **Step 3: Implement `daily-summary.ts`, `MacroBentoGrid`, `MicronutrientPanel`, and wire `src/app/page.tsx`**

Use `useLiveQuery` on `db.foodLogs.where('date').equals(selectedDate)` and `db.userGoals.get('active')`. Display neutral `"+200 kcal"` / extended progress bar using existing accent tokens when over target (never red alerts).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/nutrition/__tests__/daily-summary.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/nutrition/daily-summary.ts src/lib/nutrition/__tests__/daily-summary.test.ts src/components/dashboard src/app/page.tsx
git commit -m "feat: add adherence-neutral dashboard bento summary and micronutrient breakdown"
```

---

### Task 12: Fitia-Style Smart Meal Distribution, Custom Recipes & Copy Yesterday

**Files:**
- Create: `src/lib/nutrition/meal-distribution.ts`
- Create: `src/lib/recipes/recipe-builder.ts`
- Create: `src/components/log/meal-slots-view.tsx`
- Create: `src/components/recipes/recipe-builder-modal.tsx`
- Modify: `src/app/log/page.tsx`, `src/app/recipes/page.tsx`
- Test: `src/lib/nutrition/__tests__/meal-distribution.test.ts`

**Interfaces:**
- Consumes: `db.foodLogs`, `db.customRecipes`, `db.userGoals`, `scaleNutrition`.
- Produces:
  - `distributeRemainingMacros(goals: UserGoals, logs: FoodLogEntry[]): Record<string, { calories: number; protein: number; carbs: number; fat: number }>` (distributes `max(0, dailyTarget - loggedSoFar)` proportionally across unlogged meal slots by `weightPct`).
  - `copyYesterdayMeal(targetDate: string, mealSlot: string): Promise<number>` (copies yesterday's entries for that slot with fresh UUIDs).
  - `saveCustomRecipe` & 1-tap recipe logging UI on `/recipes` and `/log`.

- [ ] **Step 1: Write the failing Fitia distribution & copy-yesterday tests**

```ts
// src/lib/nutrition/__tests__/meal-distribution.test.ts
import 'fake-indexeddb/auto';
import { distributeRemainingMacros } from '../meal-distribution';
import { copyYesterdayMeal } from '@/lib/recipes/recipe-builder';
import { db } from '@/lib/db/macroai-db';

test('redistributes remaining macros proportionally across unlogged slots and clamps overages to 0', () => {
  const goals = {
    id: 'active' as const, dailyCalories: 2000, proteinG: 160, carbsG: 200, fatG: 60, fiberG: 30, micronutrientTargets: {}, updatedAt: 1,
    mealSlots: [
      { id: 'breakfast', name: 'Breakfast', weightPct: 25 },
      { id: 'lunch', name: 'Lunch', weightPct: 50 },
      { id: 'dinner', name: 'Dinner', weightPct: 25 },
    ],
  };
  const dist = distributeRemainingMacros(goals, [{ id: '1', date: '2026-11-14', mealSlot: 'breakfast', foodId: 'x', name: 'Oats', source: 'staple', amount: 100, unit: 'g', nutritionSnapshot: { calories: 800, protein: 40, carbs: 110, fat: 20, fiber: 10, micros: {} }, createdAt: 1 }]);
  expect(dist.lunch.calories).toBe(800); // 1200 remaining * (50 / 75)
  expect(dist.dinner.calories).toBe(400); // 1200 remaining * (25 / 75)

  const over = distributeRemainingMacros(goals, [{ id: '2', date: '2026-11-14', mealSlot: 'breakfast', foodId: 'x', name: 'Feast', source: 'staple', amount: 100, unit: 'g', nutritionSnapshot: { calories: 2300, protein: 180, carbs: 220, fat: 80, fiber: 10, micros: {} }, createdAt: 1 }]);
  expect(over.lunch.calories).toBe(0);
});

test('copies yesterday meal slot entries with new UUIDs', async () => {
  await db.delete(); await db.open();
  await db.foodLogs.put({ id: 'old-1', date: '2026-11-13', mealSlot: 'breakfast', foodId: 's:1', name: 'Eggs', source: 'staple', amount: 100, unit: 'g', nutritionSnapshot: { calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5, fiber: 0, micros: {} }, createdAt: 1 });
  const count = await copyYesterdayMeal('2026-11-14', 'breakfast');
  expect(count).toBe(1);
  expect((await db.foodLogs.where('date').equals('2026-11-14').toArray())[0].id).not.toBe('old-1');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/nutrition/__tests__/meal-distribution.test.ts`
Expected: FAIL (`Cannot find module '../meal-distribution'`).

- [ ] **Step 3: Implement `meal-distribution.ts`, `recipe-builder.ts`, `MealSlotsView`, `RecipeBuilderModal`, and wire `/log` & `/recipes`**

Wire per-slot `+` triggers (opening Quick Add / Search / Barcode / AI Scan targeted to that `mealSlot`), Fitia recommended macro chips on unlogged slots, and 1-tap "Copy Yesterday's [Slot]".

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/nutrition/__tests__/meal-distribution.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/nutrition/meal-distribution.ts src/lib/recipes src/components/log src/components/recipes src/app/log src/app/recipes
git commit -m "feat: add Fitia meal distribution, custom recipes, and Copy Yesterday"
```

---

### Task 13: PWA Manifest, Custom `sw.js`, Offline Banner & End-to-End Verification

**Files:**
- Create: `src/app/manifest.ts`
- Create: `public/sw.js`
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`
- Create: `src/components/shell/pwa-register.tsx`
- Modify: `src/app/layout.tsx`
- Test: `src/app/__tests__/manifest.test.ts`

**Interfaces:**
- Consumes: `public/data/staples-2500.json` (Task 6), `AppShell` (Task 2).
- Produces: Valid Next.js Web App Manifest (`display: 'standalone'`, dark theme `#121316`), `public/sw.js` caching app shell + `/data/staples-2500.json` and bypassing `/api/*`, plus an online/offline banner.

- [ ] **Step 1: Write the failing manifest & SW registration test**

```ts
// src/app/__tests__/manifest.test.ts
import manifest from '../manifest';

test('returns standalone PWA manifest for MacroAI', () => {
  const m = manifest();
  expect(m.name).toBe('MacroAI');
  expect(m.display).toBe('standalone');
  expect(m.background_color).toBe('#121316');
  expect(m.icons?.length).toBeGreaterThanOrEqual(2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/__tests__/manifest.test.ts`
Expected: FAIL (`Cannot find module '../manifest'`).

- [ ] **Step 3: Implement `src/app/manifest.ts`, `public/sw.js`, app icons, and `PwaRegister`**

Register `/sw.js` on client mount in `PwaRegister`, render a subtle non-intrusive offline indicator badge when `!navigator.onLine`, and in `public/sw.js` apply network-only for `/api/*`, stale-while-revalidate for Next static assets/pages, and cache-first for `/data/staples-2500.json`.

- [ ] **Step 4: Run full test suite & production build check**

Run:
```bash
npx vitest run
npm run build
```
Expected: All unit/component tests PASS and Next.js build succeeds cleanly with zero TypeScript errors. Verify on mobile HTTPS/localhost that camera permissions (`getUserMedia({ video: { facingMode: 'environment' } })`), offline staples search, and Quick Add work when disconnected.

- [ ] **Step 5: Commit**

```bash
git add src/app/manifest.ts public/sw.js public/icons src/components/shell/pwa-register.tsx src/app/layout.tsx src/app/__tests__/manifest.test.ts
git commit -m "feat: add PWA manifest, offline service worker, and final verification"
```
