# MacroAI v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade MacroAI from a lean daily logger into a complete, adherence-neutral, offline-first nutrition and adaptive-coaching PWA across 6 vertical phases — adding full diary editing, unified search with Recents/Frequent/Pinned/Recipes, custom foods & cooked-weight recipes, 6 extended nutrients + AI text-only meal scan & AI meal ideas, daily weigh-ins with EMA trend weight + observed TDEE + Apple Health iOS Shortcut pull endpoint, `/trends` custom SVG analytics, weekly calorie cycling, and hardened Turso/AI auth + tombstone sync.

**Architecture:** Foundation-first 6-phase rollout (Approach A). Phase 1 upgrades Dexie (`MacroAIDB` v2) and Turso (`libSQL`) schemas with `weightLogs`, `pinnedFoods`, and `tombstones`, introduces `SYNC_ACCESS_KEY` HttpOnly cookie / Bearer auth across `/api/db/sync` and `/api/ai/*`, upgrades backups to v2 + CSV export, and removes dead meal-slot & prototype code. Phases 2–6 build vertical slices on top of that synced foundation using zero-dependency obsidian SVG charts (`DESIGN.md`) and stateless Next.js 16 Route Handlers on Vercel.

**Tech Stack:** Next.js 16 (App Router, Vercel serverless), React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Dexie.js + `dexie-react-hooks`, `@libsql/client` (Turso/SQLite), Zustand, Zod, `html5-qrcode`, Custom Service Worker (`public/sw.js`), Vitest + `@testing-library/react` + `fake-indexeddb`.

**Spec:** [docs/superpowers/specs/2026-11-20-macroai-v2-design.md](file:///d:/Coding/MacroAI/docs/superpowers/specs/2026-11-20-macroai-v2-design.md)

## Global Constraints

- **Adherence Neutrality (`DESIGN.md`):** Never use punitive red (`#ef4444`) alerts or shaming banners when exceeding calorie, macro, or nutrient targets; use `#94a3b8` (`--neutral-over`) for neutral surplus indicators and fixed nutrient hues (`#6c8eff`, `#e56b4e`, `#e8c547`, `#4caf79`, `#9f85ff`).
- **Obsidian Monochrome Chrome:** Matte `#141416` canvas, flat `#1c1c1f` tonal slabs, `tabular-nums` on every numeric readout, full dark/light/system parity, responsive `max-w-6xl` bento layout on desktop. Quick Search Strip appears ONLY on `/` and `/log` (never on `/trends`, `/recipes`, `/settings`).
- **Zero Charting Dependencies & Turbopack-Safe PWA:** Do not add `recharts` or any charting library; keep all `/trends` visualizations lightweight responsive SVG styled with CSS variables and keep hand-written `public/sw.js`.
- **Stateless Vercel Serverless Routes:** All API routes read/write through `getLibsqlClient()` and return `Cache-Control: no-store` on dynamic data. Never store secrets in client state.
- **Strict HITL AI:** Neither AI Meal Scan (photo or text) nor AI Meal Ideas may auto-log entries; all AI outputs flow into Stage 3 HITL review first. No voice/microphone UI.
- **Flat Chronological Diary & Explicit Exclusions:** No Breakfast/Lunch/Dinner/Snacks slots or meal-distribution UI, no meal-timing/eating-window analytics, and no hydration/daily-habit toggles. Keep `mealSlot` optional/defaulted to `'log'` on `FoodLogEntry` for backward compatibility only.
- **Separate Explicit Actions:** *Save as Recipe* (Food Log multi-select & AI HITL) and *Override Cooked Weight* (Recipe Builder) must remain explicit separate optional controls.
- **Git on this machine:** Run git commands with `git -c safe.directory=D:/Coding/MacroAI ...` to avoid Windows dubious-ownership errors without modifying global git config.

## Review Focus

- **Offline delete vs. Undo restore during Turso merge sync:** Deleting an entry while offline must create a tombstone that suppresses server resurrection on reconnect, whereas immediately undoing/re-putting the same ID must clear its tombstone so the restored row survives sync — pinned in Task 2 tests.
- **Partial logging days & multi-day weigh-in gaps in Adaptive TDEE:** Days logged below 40% of the resolved calorie target must be excluded from average intake, and multi-day gaps between weigh-ins must apply time-adjusted EMA `alphaEff = 1 - Math.pow(1 - 0.1, deltaDays)` so sparse input never produces wild expenditure spikes — pinned in Task 14 tests.
- **Weekly Calorie Cycling + Adaptive Check-In + Settings persistence:** Accepting a Weekly Check-In when `weeklyCyclingEnabled` is true must rebase all 7 Mon–Sun rows (and top-level baseline) while clamping `±200 kcal` against the 7-day average, and saving `weightUnit`, cycling, `goalDeltaKcal`, or custom micro targets in Settings later must never silently overwrite accepted coached calories back to Mifflin-St Jeor — pinned in Tasks 14 & 18 tests.
- **CSV formula injection & v1 backup backward compatibility:** Exporting food names or notes beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` must prefix/quote safely to neutralize spreadsheet formula execution, and importing a legacy `version: 1` backup (without `weightLogs`/`pinnedFoods`, with `mealSlots`) must succeed atomically — pinned in Task 3 tests.
- **Fail-closed Vercel API auth & empty weigh-in safety for iOS Shortcuts:** When `SYNC_ACCESS_KEY` is set, both `/api/db/sync` and all `/api/ai/*` routes must reject unauthenticated callers with `401`; `/api/weight/latest` must verify `SHORTCUT_API_KEY` in constant time (`503` if unset, `401` if wrong) and return `404` when no weigh-ins exist so iOS Shortcuts never logs `0 kg` to Apple Health — pinned in Tasks 2 & 13 tests.

---

## File Structure Map

### Phase 1 — Data Foundation, Sync Hardening, Cleanup & Exports
- **Modify:** `src/types/nutrition.ts`, `src/lib/db/macroai-db.ts`, `src/lib/nutrition/goals.ts`, `src/lib/motion.ts`, `src/stores/logger-store.ts`, `src/lib/recipes/recipe-builder.ts`, `src/lib/db/server-db.ts`, `src/lib/db/cloud-sync.ts`, `src/app/api/db/sync/route.ts`, `src/app/api/ai/meal-scan/route.ts`, `src/app/api/ai/refine/route.ts`, `src/app/api/ai/label-ocr/route.ts`, `src/app/api/ai/health/route.ts`, `src/lib/db/backup.ts`, `src/components/settings/backup-panel.tsx`, `src/components/settings/central-db-status-card.tsx`, `src/components/settings/ai-health-status-card.tsx`, `src/components/shell/command-palette.tsx`, `public/sw.js`, `.env.example`
- **Create:** `src/lib/auth/sync-auth.ts`, `src/app/api/auth/sync-session/route.ts`, `src/components/auth/sync-unlock-modal.tsx`, `src/lib/db/csv-export.ts`, `src/lib/recipes/__tests__/recipe-builder.test.tsx`, `src/lib/db/__tests__/csv-export.test.ts`
- **Delete:** `src/app/prototypes/page.tsx`, `src/app/prototypes/__tests__/prototypes.test.tsx`, `src/components/prototypes/mock-data.ts`, `src/components/prototypes/variant-bars.tsx`, `src/components/prototypes/variant-bento.tsx`, `src/components/prototypes/variant-timeline.tsx`, `src/lib/nutrition/meal-distribution.ts`, `src/lib/nutrition/__tests__/meal-distribution.test.ts`

### Phase 2 — Navigation Shell & Core Diary QoL
- **Create:** `src/app/trends/page.tsx`, `src/components/logging/edit-log-entry-drawer.tsx`, `src/components/log/date-picker-popover.tsx`, `src/components/log/copy-from-date-drawer.tsx`, `src/components/logging/__tests__/edit-log-entry-drawer.test.tsx`, `src/components/log/__tests__/diary-qol.test.tsx`
- **Modify:** `src/components/shell/bottom-nav.tsx`, `src/components/shell/quick-action-dock.tsx`, `src/components/shell/app-shell.tsx`, `src/app/page.tsx`, `src/app/log/page.tsx`, `src/app/recipes/page.tsx`, `src/components/log/meal-slots-view.tsx`, `src/components/recipes/recipe-builder-modal.tsx`

### Phase 3 — Unified Search, Barcode Parity & Recipes / Custom Foods Overhaul
- **Create:** `src/lib/foods/search-history.ts`, `src/components/recipes/custom-food-modal.tsx`, `src/components/recipes/recipe-portion-picker-modal.tsx`, `src/components/scanner/__tests__/barcode-parity.test.tsx`
- **Modify:** `src/components/logging/food-search-drawer.tsx`, `src/components/scanner/barcode-scanner-drawer.tsx`, `src/components/scanner/add-barcode-product-modal.tsx`, `src/lib/recipes/recipe-builder.ts`, `src/components/recipes/recipe-builder-modal.tsx`, `src/app/recipes/page.tsx`

### Phase 4 — Extended Nutrients & AI Suite Upgrade
- **Create:** `src/app/api/ai/meal-ideas/route.ts`, `src/components/scanner/ai-meal-ideas-drawer.tsx`, `src/lib/ai/__tests__/meal-ideas.test.tsx`
- **Modify:** `src/lib/foods/usda-adapter.ts`, `src/lib/foods/off-adapter.ts`, `src/lib/foods/staples-search.ts`, `src/lib/nutrition/daily-summary.ts`, `src/lib/ai/schemas.ts`, `src/app/api/ai/meal-scan/route.ts`, `src/app/api/ai/refine/route.ts`, `src/app/api/ai/label-ocr/route.ts`, `src/components/scanner/ai-meal-scanner-sheet.tsx`, `src/components/shell/app-shell.tsx`, `src/components/shell/command-palette.tsx`

### Phase 5 — Weigh-Ins, Apple Health Shortcuts Bridge & Adaptive TDEE Engine
- **Create:** `src/components/weight/weigh-in-drawer.tsx`, `src/app/api/weight/latest/route.ts`, `src/app/api/weight/status/route.ts`, `src/components/settings/apple-health-shortcut-card.tsx`, `src/lib/nutrition/adaptive-tdee.ts`, `src/app/api/weight/__tests__/weight-latest.test.ts`, `src/components/weight/__tests__/weigh-in-drawer.test.tsx`, `src/lib/nutrition/__tests__/adaptive-tdee.test.ts`
- **Modify:** `src/lib/db/server-db.ts`, `src/components/shell/app-shell.tsx`, `src/app/settings/page.tsx`

### Phase 6 — `/trends` Analytics Workspace, Targets & Calorie Cycling
- **Create:** `src/lib/nutrition/analytics.ts`, `src/components/trends/weight-trend-chart.tsx`, `src/components/trends/tdee-chart.tsx`, `src/components/trends/intake-trend-chart.tsx`, `src/components/trends/weekly-checkin-card.tsx`, `src/components/trends/weight-history-list.tsx`, `src/components/dashboard/nutrient-contributors-sheet.tsx`, `src/lib/nutrition/__tests__/analytics.test.ts`, `src/components/dashboard/__tests__/micronutrient-and-heatmap.test.tsx`, `src/app/trends/__tests__/trends.test.tsx`
- **Modify:** `src/components/dashboard/micronutrient-panel.tsx`, `src/components/dashboard/habits-analytics-grid.tsx`, `src/app/trends/page.tsx`, `src/app/page.tsx`, `src/components/log/meal-slots-view.tsx`, `src/components/settings/goals-calculator-form.tsx`

---

## Phase 1: Data Foundation, Sync Hardening, Cleanup & Exports

### Task 1: Core v2 Types, Dexie v2 Schema, Date-Resolved Goals & Dead-Code Cleanup

**Files:**
- Modify: `src/types/nutrition.ts`, `src/lib/db/macroai-db.ts`, `src/lib/nutrition/goals.ts`, `src/lib/motion.ts`, `src/stores/logger-store.ts`, `src/lib/recipes/recipe-builder.ts`, `src/components/settings/goals-calculator-form.tsx`
- Modify tests: `src/lib/db/__tests__/macroai-db.test.ts`, `src/components/logging/__tests__/quick-add-drawer.test.tsx`, `src/components/settings/__tests__/goals-calculator-form.test.tsx`
- Create: `src/lib/recipes/__tests__/recipe-builder.test.tsx` (migrate non-meal-slot tests from `meal-distribution.test.ts`)
- Delete: `src/app/prototypes/page.tsx`, `src/app/prototypes/__tests__/prototypes.test.tsx`, `src/components/prototypes/*`, `src/lib/nutrition/meal-distribution.ts`, `src/lib/nutrition/__tests__/meal-distribution.test.ts`

**Interfaces:**
- Consumes: Existing `MacroAIDB` v1 schema (`foodLogs`, `foodsCache`, `customRecipes`, `userGoals`).
- Produces:
  - `src/types/nutrition.ts`:
    - `FoodSource` & `FoodItem['source']` include `'custom_food'`
    - `Micronutrients` adds optional `sugarG`, `addedSugarG`, `saturatedFatG`, `cholesterolMg`, `caffeineMg`, `alcoholG`
    - `WeightLogEntry`: `{ id: string; date: string; weightKg: number; note?: string; source: 'manual' | 'apple_health'; recordedAt: string; createdAt: number; updatedAt: number }`
    - `PinnedFood`: `{ id: string; kind: 'food' | 'recipe'; refId: string; pinnedAt: number }`
    - `SyncTombstone`: `{ id: string; tableName: CentralTableName; recordId: string; deletedAt: number }`
    - `WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'`
    - `DailyMacroTargets = { calories: number; proteinG: number; carbsG: number; fatG: number; fiberG: number }`
    - `CustomRecipe.cookedWeightGrams?: number | null`
    - `UserGoals` adds `targetMode?: 'calculator' | 'custom'`, `goalDeltaKcal?: number`, `weeklyCyclingEnabled?: boolean`, `weeklySchedule?: Record<WeekdayKey, DailyMacroTargets>`, `weightUnit?: 'kg' | 'lb'`, `lastCheckInAt?: number`, `lastCheckInDismissedAt?: number`; `mealSlots?: MealSlotConfig[]`
  - `src/lib/db/macroai-db.ts`: `MacroAIDB` v2 tables `weightLogs: 'id, date, createdAt, updatedAt'`, `pinnedFoods: 'id, kind, pinnedAt'`, `tombstones: 'id, tableName, deletedAt'`
  - `src/lib/nutrition/goals.ts`: `getWeekdayKey(isoDate: string): WeekdayKey`, `resolveGoalsForDate(goals: UserGoals, isoDate: string): UserGoals`, `computeWeeklyScheduleAverage(schedule: Record<WeekdayKey, DailyMacroTargets>): DailyMacroTargets`, `buildCyclingPreset(base: DailyMacroTargets, preset: 'even' | 'weekend_plus_250' | 'training_split'): Record<WeekdayKey, DailyMacroTargets>`
  - `src/lib/recipes/recipe-builder.ts`: `copyLogsFromDate(sourceDate: string, targetDate: string, entryIds?: string[]): Promise<{ count: number; insertedIds: string[] }>`

- [ ] **Step 1: Write failing tests for Dexie v2 tables, `resolveGoalsForDate`, and `copyLogsFromDate`**

```ts
// Add to src/lib/db/__tests__/macroai-db.test.ts
it('persists weightLogs, pinnedFoods, and tombstones in Dexie v2', async () => {
  await db.weightLogs.put({
    id: 'w-1', date: '2026-11-20', weightKg: 76.5, source: 'manual',
    recordedAt: '2026-11-20T08:00:00.000Z', createdAt: 100, updatedAt: 100,
  });
  await db.pinnedFoods.put({ id: 'food:staple:1', kind: 'food', refId: 'staple:1', pinnedAt: 100 });
  await db.tombstones.put({ id: 'foodLogs:log-1', tableName: 'foodLogs', recordId: 'log-1', deletedAt: 200 });
  expect((await db.weightLogs.get('w-1'))?.weightKg).toBe(76.5);
  expect((await db.pinnedFoods.get('food:staple:1'))?.refId).toBe('staple:1');
  expect((await db.tombstones.get('foodLogs:log-1'))?.deletedAt).toBe(200);
});

it('resolves weekday-specific targets via resolveGoalsForDate when weeklyCyclingEnabled is true', () => {
  const schedule = buildCyclingPreset({ calories: 2000, proteinG: 160, carbsG: 200, fatG: 62, fiberG: 28 }, 'weekend_plus_250');
  const goals: UserGoals = {
    id: 'active', dailyCalories: 2000, proteinG: 160, carbsG: 200, fatG: 62, fiberG: 28,
    micronutrientTargets: {}, updatedAt: 1, weeklyCyclingEnabled: true, weeklySchedule: schedule,
  };
  // 2026-11-21 is Saturday
  const sat = resolveGoalsForDate(goals, '2026-11-21');
  expect(sat.dailyCalories).toBe(schedule.sat.calories);
  expect(sat.dailyCalories).toBeGreaterThan(2000);
  const mon = resolveGoalsForDate(goals, '2026-11-16');
  expect(mon.dailyCalories).toBe(schedule.mon.calories);
  expect(computeWeeklyScheduleAverage(schedule).calories).toBeCloseTo(2000, -1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/db/__tests__/macroai-db.test.ts`
Expected: FAIL (`db.weightLogs` undefined / `resolveGoalsForDate` not exported).

- [ ] **Step 3: Implement v2 types, Dexie v2 schema, `resolveGoalsForDate`, `copyLogsFromDate`, and remove dead meal-slot & prototype code**

Update `src/types/nutrition.ts` and `src/lib/db/macroai-db.ts` (`version(1)` kept intact + `version(2)` adding `weightLogs`, `pinnedFoods`, `tombstones`). Implement `getWeekdayKey`, `resolveGoalsForDate`, `computeWeeklyScheduleAverage`, and `buildCyclingPreset` in `src/lib/nutrition/goals.ts` and remove `DEFAULT_MEAL_SLOTS` (seed `mealSlots: []`, `targetMode: 'calculator'`, `goalDeltaKcal: 0`, `weightUnit: 'kg'`). Remove `getSmartMealSlot` from `src/lib/motion.ts`; default `activeMealSlot` in `src/stores/logger-store.ts` to `'log'`. Implement `copyLogsFromDate` in `src/lib/recipes/recipe-builder.ts` (keep `copyYesterdayLogs` calling it and returning `count`), and remove `copyYesterdayMeal`. Migrate the still-relevant `RecipeBuilderModal`, `RecipesPage`, `MealSlotsView`, `LogPage`, and `copyYesterdayLogs` tests from `src/lib/nutrition/__tests__/meal-distribution.test.ts` into `src/lib/recipes/__tests__/recipe-builder.test.tsx`, update `quick-add-drawer.test.tsx` and `goals-calculator-form.test.tsx` to remove `DEFAULT_MEAL_SLOTS` imports, then delete `src/app/prototypes/`, `src/components/prototypes/`, `src/lib/nutrition/meal-distribution.ts`, and `src/lib/nutrition/__tests__/meal-distribution.test.ts`.

- [ ] **Step 4: Run test suite to verify Task 1 passes with zero regressions**

Run: `npm test`
Expected: PASS (all migrated + existing tests green; zero references to deleted meal-slot/prototype files).

- [ ] **Step 5: Commit**

```powershell
git -c safe.directory=D:/Coding/MacroAI add -A
git -c safe.directory=D:/Coding/MacroAI commit -m "feat(db): add MacroAI v2 types, Dexie v2 schema, cycling helpers, and remove dead slot/prototype code"
```

---

### Task 2: Turso v2 Schema, Tombstone-Aware Sync & `SYNC_ACCESS_KEY` Auth (Sync + All `/api/ai/*`)

**Files:**
- Create: `src/lib/auth/sync-auth.ts`, `src/app/api/auth/sync-session/route.ts`, `src/components/auth/sync-unlock-modal.tsx`
- Modify: `src/lib/db/server-db.ts`, `src/lib/db/cloud-sync.ts`, `src/app/api/db/sync/route.ts`, `src/app/api/ai/meal-scan/route.ts`, `src/app/api/ai/refine/route.ts`, `src/app/api/ai/label-ocr/route.ts`, `src/app/api/ai/health/route.ts`, `src/stores/logger-store.ts`, `src/components/settings/central-db-status-card.tsx`, `src/components/settings/ai-health-status-card.tsx`, `.env.example`
- Test: `src/lib/db/__tests__/central-db.test.ts`

**Interfaces:**
- Consumes: `WeightLogEntry`, `PinnedFood`, `SyncTombstone`, `db.weightLogs`, `db.pinnedFoods`, `db.tombstones` (Task 1).
- Produces:
  - `src/lib/auth/sync-auth.ts`: `SYNC_SESSION_COOKIE = 'macroai_sync_session'`, `isSyncAuthConfigured(): boolean`, `verifyPassphrase(candidate: string): boolean`, `createSyncSessionToken(): string`, `verifySyncSessionToken(token: string): boolean`, `requireSyncAuth(request: Request): NextResponse | null`
  - `src/app/api/auth/sync-session/route.ts`: `GET` → `{ authRequired, authenticated }`, `POST` `{ passphrase }` → sets `HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000` (`Secure` in prod) cookie, `DELETE` → clears cookie
  - `src/lib/db/server-db.ts`: `CentralTableName = 'foodLogs' | 'foodsCache' | 'customRecipes' | 'userGoals' | 'weightLogs' | 'pinnedFoods'`; tombstone-aware `applyTableMutation` & `syncCentralTables` (with 90-day pruning); `getLatestWeightLog(): Promise<WeightLogEntry | null>`
  - `src/lib/db/cloud-sync.ts`: `SyncAuthError`, tombstone recording on delete + clearing on put/Undo, `syncWithCentralDb` sets `useLoggerStore.getState().setSyncAuthLocked(true)` on `401`
  - `src/components/auth/sync-unlock-modal.tsx`: `SyncUnlockCard({ onUnlocked?: () => void, compact?: boolean })`

- [ ] **Step 1: Write failing tests for tombstones, Undo-after-delete, and `SYNC_ACCESS_KEY` gating on `/api/db/sync` and `/api/ai/*`**

```ts
// Add to src/lib/db/__tests__/central-db.test.ts
it('propagates offline delete tombstones without resurrecting rows, and clears tombstone on Undo re-put', async () => {
  await syncCentralTables({ foodLogs: [makeLog('del-1', 'Oats'), makeLog('keep-1', 'Eggs')] }, 'replace');
  // Simulate offline delete tombstone newer than createdAt
  const merged = await syncCentralTables({
    foodLogs: [makeLog('keep-1', 'Eggs')],
    tombstones: [{ id: 'foodLogs:del-1', tableName: 'foodLogs', recordId: 'del-1', deletedAt: Date.now() + 1000 }],
  }, 'merge');
  expect(merged.tables.foodLogs.map((l) => l.id)).toEqual(['keep-1']);

  // Undo restores del-1 with newer put clearing tombstone
  await applyTableMutation({ table: 'foodLogs', op: 'put', values: [{ ...makeLog('del-1', 'Oats'), createdAt: Date.now() + 5000 }] });
  const afterUndo = await getAllCentralTables();
  expect(afterUndo.tables.foodLogs.map((l) => l.id)).toContain('del-1');
});

it('rejects unauthenticated /api/db/sync and /api/ai/* when SYNC_ACCESS_KEY is set, and accepts valid session cookie or Bearer token', async () => {
  process.env.SYNC_ACCESS_KEY = 'secret-passphrase';
  const unauthSync = await syncGetRoute(new Request('http://localhost/api/db/sync'));
  expect(unauthSync.status).toBe(401);
  const unauthAi = await mealScanPost(new Request('http://localhost/api/ai/meal-scan', { method: 'POST', body: '{}' }));
  expect(unauthAi.status).toBe(401);

  const authSync = await syncGetRoute(new Request('http://localhost/api/db/sync', {
    headers: { Authorization: 'Bearer secret-passphrase' },
  }));
  expect(authSync.status).toBe(200);
  delete process.env.SYNC_ACCESS_KEY;
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/db/__tests__/central-db.test.ts`
Expected: FAIL (tombstones ignored / `syncGetRoute` returns `200` without auth).

- [ ] **Step 3: Implement `sync-auth.ts`, `/api/auth/sync-session`, tombstone-aware `server-db.ts` + `cloud-sync.ts`, gate `/api/db/sync` & `/api/ai/*`, and add `SyncUnlockCard`**

Use Node `crypto.createHmac('sha256', key)` + `crypto.timingSafeEqual` in `src/lib/auth/sync-auth.ts`. Add `weight_logs`, `pinned_foods`, `tombstones` SQL tables in `ensureServerSchema()`. In `CentralSyncMiddleware`: on `delete` write local `tombstones` + push `deletedAt`; on `add`/`put` delete matching local tombstone + server clears matching tombstone on `put`. In `syncCentralTables(..., 'merge')`: merge tombstones by max `deletedAt`, delete any row whose `Math.max(updatedAt ?? 0, createdAt ?? 0, pinnedAt ?? 0)` `< tombstone.deletedAt`, and prune tombstones older than `90 * 86_400_000` ms. Gate `/api/db/sync` (`GET`/`POST`) and `/api/ai/{meal-scan,refine,label-ocr,health}` via `requireSyncAuth(request)`. Update `CentralDbStatusCard`, `AiHealthStatusCard`, and `.env.example` (`SYNC_ACCESS_KEY=`, `SHORTCUT_API_KEY=`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/db/__tests__/central-db.test.ts src/lib/ai/__tests__/openai-compat.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -c safe.directory=D:/Coding/MacroAI add src/lib/auth src/app/api/auth src/components/auth src/lib/db src/app/api/db src/app/api/ai src/stores/logger-store.ts src/components/settings .env.example
git -c safe.directory=D:/Coding/MacroAI commit -m "feat(sync): add Turso v2 tables, tombstone-aware offline sync, and SYNC_ACCESS_KEY auth"
```

---

### Task 3: Backup v2, Formula-Safe CSV Exports, SW PH Precache & Command Palette Undo

**Files:**
- Create: `src/lib/db/csv-export.ts`, `src/lib/db/__tests__/csv-export.test.ts`
- Modify: `src/lib/db/backup.ts`, `src/components/settings/backup-panel.tsx`, `public/sw.js`, `src/components/shell/command-palette.tsx`
- Test: `src/lib/db/__tests__/backup.test.ts`, `src/lib/db/__tests__/csv-export.test.ts`, `src/app/__tests__/manifest.test.ts`, `src/components/settings/__tests__/backup-panel.test.tsx`

**Interfaces:**
- Consumes: `db.weightLogs`, `db.pinnedFoods`, `copyLogsFromDate` (Task 1), `syncWithCentralDb` (Task 2).
- Produces:
  - `src/lib/db/backup.ts`: `MacroAIBackupSchema` (discriminated union accepting `version: 1` and `version: 2`), `exportBackupJson()` outputs `version: 2` with `weightLogs` & `pinnedFoods`, `importBackupJson` returns counts including `weightLogs` & `pinnedFoods`
  - `src/lib/db/csv-export.ts`: `escapeCsvCell(value: unknown): string`, `buildFoodLogsCsv(logs: FoodLogEntry[]): string`, `buildDailySummaryCsv(logs: FoodLogEntry[], goals: UserGoals): string`, `buildWeightLogsCsv(weights: WeightLogEntry[]): string`

- [ ] **Step 1: Write failing tests for Backup v2 + v1 import compat, CSV formula neutralization, SW `ph-foods.json` precache, and Command Palette Undo**

```ts
// src/lib/db/__tests__/csv-export.test.ts
it('escapes RFC 4180 quotes/commas and neutralizes leading spreadsheet formula characters', () => {
  expect(escapeCsvCell('=SUM(A1:A2)')).toBe('"\'=SUM(A1:A2)"');
  expect(escapeCsvCell('+cmd|calc')).toBe('"\'+cmd|calc"');
  expect(escapeCsvCell('Chicken, "Grilled"')).toBe('"Chicken, ""Grilled"""');
});

// Add to src/lib/db/__tests__/backup.test.ts
it('exports version 2 with weightLogs/pinnedFoods and imports legacy version 1 backups cleanly', async () => {
  const v1Payload = JSON.stringify({
    version: 1, exportedAt: 100,
    tables: { foodLogs: [], foodsCache: [], customRecipes: [], userGoals: [] },
  });
  await expect(importBackupJson(v1Payload, 'merge')).resolves.toMatchObject({ importedCounts: { foodLogs: 0 } });
  const exported = JSON.parse(await exportBackupJson());
  expect(exported.version).toBe(2);
  expect(exported.tables).toHaveProperty('weightLogs');
  expect(exported.tables).toHaveProperty('pinnedFoods');
});
```
Also assert in `src/app/__tests__/manifest.test.ts` that `public/sw.js` contains `macroai-v2`, `'/trends'`, and `'/data/ph-foods.json'` in both `PRECACHE_ASSETS` and cache-first routing.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/db/__tests__/csv-export.test.ts src/lib/db/__tests__/backup.test.ts src/app/__tests__/manifest.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement Backup v2, `csv-export.ts`, `BackupPanel` CSV buttons, `public/sw.js` v2, and Command Palette Undo**

Update `src/lib/db/backup.ts` to export `version: 2` and accept `z.discriminatedUnion('version', [MacroAIBackupV1Schema, MacroAIBackupV2Schema])` on import. Implement `src/lib/db/csv-export.ts` and add 3 download buttons (*Food Logs CSV*, *Daily Summary CSV*, *Weigh-Ins CSV*) to `src/components/settings/backup-panel.tsx`. Update `public/sw.js` to `CACHE_NAME = 'macroai-v2'`, add `'/trends'` and `'/data/ph-foods.json'` to `PRECACHE_ASSETS`, and match both `/data/staples-2500.json` and `/data/ph-foods.json` in the cache-first branch. Fix `src/components/shell/command-palette.tsx` so *Copy Yesterday's Logs* uses `copyLogsFromDate` and Undo deletes `insertedIds` via `db.foodLogs.bulkDelete(insertedIds)`, and add `Go to Trends` (`/trends`) and `Log Weight` commands.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/db/__tests__/csv-export.test.ts src/lib/db/__tests__/backup.test.ts src/app/__tests__/manifest.test.ts src/components/settings/__tests__/backup-panel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -c safe.directory=D:/Coding/MacroAI add src/lib/db/backup.ts src/lib/db/csv-export.ts src/lib/db/__tests__ src/components/settings/backup-panel.tsx src/components/settings/__tests__/backup-panel.test.tsx public/sw.js src/app/__tests__/manifest.test.ts src/components/shell/command-palette.tsx
git -c safe.directory=D:/Coding/MacroAI commit -m "feat(data): add backup v2, formula-safe CSV exports, SW PH precache, and Command Palette undo"
```

---

## Phase 2: Navigation Shell & Core Diary QoL

### Task 4: Navigation Redesign (`Trends` Bottom Tab, Header `⚙` Settings & `Log Weigh-In` Dock Action)

**Files:**
- Create: `src/app/trends/page.tsx` (Phase 2 shell placeholder replaced with full workspace in Phase 6)
- Modify: `src/stores/logger-store.ts`, `src/components/shell/bottom-nav.tsx`, `src/components/shell/quick-action-dock.tsx`, `src/components/shell/app-shell.tsx`, `src/app/page.tsx`, `src/app/log/page.tsx`, `src/app/recipes/page.tsx`
- Test: `src/components/shell/__tests__/app-shell.test.tsx`

**Interfaces:**
- Consumes: `SyncUnlockCard` (Task 2).
- Produces:
  - `LogSheetType = 'ai-scan' | 'barcode' | 'search' | 'quick-add' | 'weight' | 'meal-ideas'`
  - `useLoggerStore`: adds `editingEntry: FoodLogEntry | null`, `setEditingEntry`, `syncAuthLocked: boolean`, `setSyncAuthLocked`, `recipeSeedIngredients: CustomRecipeIngredient[] | null`, `openRecipeBuilderWithIngredients`
  - Bottom nav links: `/` (`Dashboard`), `/log` (`Food Log`), center `+`, `/trends` (`Trends`), `/recipes` (`Recipes`)
  - Consistent header Settings icon (`<Link href="/settings" aria-label="Settings">`) on `/`, `/log`, `/trends`, `/recipes`.

- [ ] **Step 1: Write failing navigation & QuickActionDock tests**

```tsx
// Update src/components/shell/__tests__/app-shell.test.tsx
it('renders Dashboard, Food Log, Trends, Recipes in bottom nav and Log Weigh-In in quick actions dock', () => {
  render(<AppShell><div>Body</div></AppShell>);
  const nav = screen.getByTestId('bottom-nav');
  expect(nav).toHaveTextContent(/dashboard/i);
  expect(nav).toHaveTextContent(/food log/i);
  expect(nav).toHaveTextContent(/trends/i);
  expect(nav).toHaveTextContent(/recipes/i);
  expect(nav).not.toHaveTextContent(/settings/i);

  fireEvent.click(screen.getByRole('button', { name: /open quick actions/i }));
  expect(screen.getByRole('button', { name: /log weigh-in/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/shell/__tests__/app-shell.test.tsx`
Expected: FAIL (`Trends` missing, `Settings` still in bottom nav, `Log Weigh-In` missing).

- [ ] **Step 3: Implement bottom nav swap, header `⚙` Settings links, `Log Weigh-In` dock row, `/trends` route shell, and `AppShell` unlock banner**

Update `NAV_ITEMS_RIGHT` in `src/components/shell/bottom-nav.tsx` to `[{ label: "Trends", href: "/trends", icon: TrendingUp }, { label: "Recipes", href: "/recipes", icon: UtensilsCrossed }]`. Add a sleek full-width `Log Weigh-In` button beneath the 2×2 grid in `src/components/shell/quick-action-dock.tsx` (`QuickActionType` includes `'weight'`). Add top-right `⚙` `Link` (`href="/settings"`) to `/`, `/log`, `/recipes`, and the new `src/app/trends/page.tsx`. In `src/components/shell/app-shell.tsx`, render a non-blocking dismissible banner when `syncAuthLocked` is true offering 1-tap `Unlock Cloud Sync`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/shell/__tests__/app-shell.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -c safe.directory=D:/Coding/MacroAI add src/stores/logger-store.ts src/components/shell src/app/page.tsx src/app/log/page.tsx src/app/recipes/page.tsx src/app/trends/page.tsx
git -c safe.directory=D:/Coding/MacroAI commit -m "feat(nav): promote Trends to bottom nav, move Settings to header icon, and add Log Weigh-In dock action"
```

---

### Task 5: Tap-to-Edit Logged Entries (`EditLogEntryDrawer`) & Notes Display

**Files:**
- Create: `src/components/logging/edit-log-entry-drawer.tsx`, `src/components/logging/__tests__/edit-log-entry-drawer.test.tsx`
- Modify: `src/components/shell/app-shell.tsx`, `src/app/page.tsx`, `src/components/log/meal-slots-view.tsx`

**Interfaces:**
- Consumes: `useLoggerStore.editingEntry` / `setEditingEntry` (Task 4), `getServingOptionsForFood` & `scaleFoodByOption` (`src/lib/nutrition/scaling.ts`).
- Produces:
  - `EditLogEntryDrawer({ entry: FoodLogEntry | null; onClose: () => void })`: updates `db.foodLogs.put(updated)` and triggers Undo toast restoring previous snapshot.

- [ ] **Step 1: Write failing tests for portion rescaling, date move, Quick Add direct macro edit, and note persistence**

```tsx
// src/components/logging/__tests__/edit-log-entry-drawer.test.tsx
it('rescales macros and micros proportionally when amount changes, moves date, and saves note', async () => {
  const entry = makeEntry({ id: 'e-1', date: '2026-11-20', amount: 100, calories: 200, protein: 20, sodiumMg: 100 });
  await db.foodLogs.put(entry);
  render(<EditLogEntryDrawer entry={entry} onClose={vi.fn()} />);

  fireEvent.change(screen.getByLabelText(/portion amount/i), { target: { value: '150' } });
  fireEvent.change(screen.getByLabelText(/log date/i), { target: { value: '2026-11-19' } });
  fireEvent.change(screen.getByLabelText(/note/i), { target: { value: 'Post-workout' } });
  fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

  await waitFor(async () => {
    const saved = await db.foodLogs.get('e-1');
    expect(saved?.amount).toBe(150);
    expect(saved?.date).toBe('2026-11-19');
    expect(saved?.note).toBe('Post-workout');
    expect(saved?.nutritionSnapshot.calories).toBe(300);
    expect(saved?.nutritionSnapshot.micros.sodiumMg).toBe(150);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/logging/__tests__/edit-log-entry-drawer.test.tsx`
Expected: FAIL (`Cannot find module`).

- [ ] **Step 3: Implement `EditLogEntryDrawer` and wire Edit + Note display on `/` and `/log`**

In `src/components/logging/edit-log-entry-drawer.tsx`, attempt to resolve `entry.foodId` from `db.foodsCache`, `db.customRecipes`, or `loadStaples()` to enable `FoodServingOption` unit pills when available; otherwise rescale `nutritionSnapshot` proportionally by `newAmount / entry.amount` (guarding `entry.amount === 0`). Include an *"Edit macros directly"* toggle (default ON for `entry.source === 'quick_add'`) with editable name, calories, P, C, F, fiber, plus date input and optional note textarea. Mount `EditLogEntryDrawer` inside `AppShell`. Add an `Edit` button beside `Log Again` and render `entry.note` inside the expanded entry accordion on both `src/app/page.tsx` and `src/components/log/meal-slots-view.tsx`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/logging/__tests__/edit-log-entry-drawer.test.tsx src/lib/nutrition/__tests__/daily-summary.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -c safe.directory=D:/Coding/MacroAI add src/components/logging/edit-log-entry-drawer.tsx src/components/logging/__tests__/edit-log-entry-drawer.test.tsx src/components/shell/app-shell.tsx src/app/page.tsx src/components/log/meal-slots-view.tsx
git -c safe.directory=D:/Coding/MacroAI commit -m "feat(log): add tap-to-edit logged entries drawer with portion scaling, date move, and notes"
```

---

### Task 6: Calendar Date-Picker Popover, Selective Copy From Date & Multi-Select `/log` (*Save as Recipe*)

**Files:**
- Create: `src/components/log/date-picker-popover.tsx`, `src/components/log/copy-from-date-drawer.tsx`, `src/components/log/__tests__/diary-qol.test.tsx`
- Modify: `src/app/page.tsx`, `src/app/log/page.tsx`, `src/components/log/meal-slots-view.tsx`, `src/components/recipes/recipe-builder-modal.tsx`

**Interfaces:**
- Consumes: `copyLogsFromDate` (Task 1), `useLoggerStore.setActiveDate` & `showUndoToast`.
- Produces:
  - `DatePickerPopover({ activeDate: string; onSelectDate: (iso: string) => void; trigger: React.ReactNode })`
  - `CopyFromDateDrawer({ open: boolean; targetDate: string; onClose: () => void })`
  - `RecipeBuilderModalProps` adds `initialIngredients?: CustomRecipeIngredient[] | null` (converting logged entries cleanly without mutating saved recipes).

- [ ] **Step 1: Write failing tests for Calendar Date Picker, Selective Copy From Date with Undo, and Multi-Select *Save as Recipe***

```tsx
// src/components/log/__tests__/diary-qol.test.tsx
it('copies only checked entries from any past date and undoes exact cloned IDs', async () => {
  await db.foodLogs.bulkPut([makeEntry('a', '2026-11-10', 'Oats'), makeEntry('b', '2026-11-10', 'Eggs')]);
  render(<CopyFromDateDrawer open targetDate="2026-11-20" onClose={vi.fn()} />);
  fireEvent.change(screen.getByLabelText(/source date/i), { target: { value: '2026-11-10' } });
  await waitFor(() => expect(screen.getByText('Oats')).toBeInTheDocument());
  fireEvent.click(screen.getByLabelText(/select eggs/i)); // uncheck Eggs
  fireEvent.click(screen.getByRole('button', { name: /copy selected/i }));
  await waitFor(async () => {
    const target = await db.foodLogs.where('date').equals('2026-11-20').toArray();
    expect(target).toHaveLength(1);
    expect(target[0].name).toBe('Oats');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/log/__tests__/diary-qol.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `DatePickerPopover`, `CopyFromDateDrawer`, `RecipeBuilderModal.initialIngredients`, and `/log` multi-select mode**

Build `DatePickerPopover` querying `db.foodLogs.where('date').between(monthStart, monthEnd, true, true)` to render Cornflower dots on logged days, wired onto the date trigger in both `src/app/page.tsx` and `src/app/log/page.tsx`. Build `CopyFromDateDrawer` defaulting to `offsetIsoDate(targetDate, -1)` with 1-tap *Copy All* plus date picker + per-entry checkboxes + Undo toast calling `db.foodLogs.bulkDelete(insertedIds)`. Add `initialIngredients` prop support in `src/components/recipes/recipe-builder-modal.tsx`. On `src/components/log/meal-slots-view.tsx`, add a `Select` toggle enabling checkboxes on entries and a sticky action bar with separate explicit **Save as Recipe** (opens `RecipeBuilderModal` seeded with selected entries), **Copy to Date...**, and **Delete Selected** (with bulk Undo).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/log/__tests__/diary-qol.test.tsx src/lib/recipes/__tests__/recipe-builder.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -c safe.directory=D:/Coding/MacroAI add src/components/log src/app/page.tsx src/app/log/page.tsx src/components/recipes/recipe-builder-modal.tsx
git -c safe.directory=D:/Coding/MacroAI commit -m "feat(log): add calendar date picker, selective copy from date, and multi-select save as recipe"
```

---

## Phase 3: Unified Search, Barcode Parity & Recipes / Custom Foods Overhaul

### Task 7: Unified Food Search (`Recents | Frequent | Pinned`, Custom Recipes, 1-Tap `+`, Multi-Add Staging)

**Files:**
- Create: `src/lib/foods/search-history.ts`
- Modify: `src/components/logging/food-search-drawer.tsx`
- Test: `src/components/logging/__tests__/food-search-drawer.test.tsx`

**Interfaces:**
- Consumes: `db.foodLogs`, `db.foodsCache`, `db.customRecipes`, `db.pinnedFoods` (Task 1), `logCustomRecipe` (`src/lib/recipes/recipe-builder.ts`).
- Produces:
  - `src/lib/foods/search-history.ts`:
    - `SearchableEntry = { kind: 'food'; food: FoodItem; lastAmount?: number; lastUnit?: string } | { kind: 'recipe'; recipe: CustomRecipe; lastAmount?: number; lastUnit?: string }`
    - `computeRecentEntries(logs: FoodLogEntry[], foodsById: Map<string, FoodItem>, recipesById: Map<string, CustomRecipe>, limit?: number): SearchableEntry[]`
    - `computeFrequentEntries(logs: FoodLogEntry[], foodsById: Map<string, FoodItem>, recipesById: Map<string, CustomRecipe>, windowDays?: number, limit?: number): SearchableEntry[]`
    - `togglePinEntry(kind: 'food' | 'recipe', refId: string): Promise<boolean>`

- [ ] **Step 1: Write failing tests for Recents/Frequent/Pinned tabs, Custom Recipe in unified search, 1-tap `+` quick-log, and Multi-Add staging**

```tsx
// Add to src/components/logging/__tests__/food-search-drawer.test.tsx
it('shows Recents, Frequent, and Pinned tabs on empty query and finds Custom Recipes in unified search', async () => {
  await saveCustomRecipe({ name: 'Protein Overnight Oats', ingredients: [sampleIngredient], basis: 'perServing', defaultServings: 1 });
  render(<FoodSearchDrawer open date="2026-11-20" onClose={vi.fn()} />);
  expect(screen.getByRole('tab', { name: /recents/i })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /frequent/i })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /pinned/i })).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/search foods/i), { target: { value: 'Overnight Oats' } });
  await waitFor(() => expect(screen.getByText('Protein Overnight Oats')).toBeInTheDocument());
  expect(screen.getByText(/recipe/i)).toBeInTheDocument();
});

it('supports 1-tap quick log (+) and multi-add staging tray logging multiple foods atomically', async () => {
  // Verify 1-tap + logs directly and shows Undo toast; verify Stage/Add Another accumulates tray and Log All writes bulkAdd.
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/logging/__tests__/food-search-drawer.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `search-history.ts` and upgrade `FoodSearchDrawer`**

Implement `src/lib/foods/search-history.ts`. Update `src/components/logging/food-search-drawer.tsx` to load `customRecipes`, `pinnedFoods`, and recent 60-day `foodLogs` alongside staples & `foodsCache`. Render `Recents | Frequent | Pinned` segmented tabs when `query.trim() === ''`, include `CustomRecipe` items (badged `RECIPE`) in unified search results, add per-row Pin star button and 1-tap `+` quick-log button (logs last-used or default serving immediately + Undo toast), and add a **"Stage & Add Another"** button on the portion screen with a sticky multi-add tray (`N items · X kcal · [Log All]`) committing via `db.foodLogs.bulkAdd`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/logging/__tests__/food-search-drawer.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -c safe.directory=D:/Coding/MacroAI add src/lib/foods/search-history.ts src/components/logging/food-search-drawer.tsx src/components/logging/__tests__/food-search-drawer.test.tsx
git -c safe.directory=D:/Coding/MacroAI commit -m "feat(search): add Recents/Frequent/Pinned tabs, unified recipes, 1-tap quick-log, and multi-add staging"
```

---

### Task 8: Barcode Countable Servings Parity & Standalone Custom Food / Barcode Editor

**Files:**
- Create: `src/components/recipes/custom-food-modal.tsx`, `src/components/scanner/__tests__/barcode-parity.test.tsx`
- Modify: `src/components/scanner/barcode-scanner-drawer.tsx`, `src/components/scanner/add-barcode-product-modal.tsx`

**Interfaces:**
- Consumes: `getServingOptionsForFood`, `scaleFoodByOption` (`src/lib/nutrition/scaling.ts`), `FoodItem` with `source: 'custom_food' | 'custom_barcode'` (Task 1).
- Produces:
  - `CustomFoodModal({ open: boolean; initialFood?: FoodItem | null; defaultBarcode?: string; logOnSave?: boolean; date?: string; onClose: () => void; onSaved?: (item: FoodItem) => void })`

- [ ] **Step 1: Write failing tests for barcode countable serving pills (`1 pack` / `g`) and creating/editing standalone `custom_food` items**

```tsx
// src/components/scanner/__tests__/barcode-parity.test.tsx
it('displays countable serving options (pack vs g) on barcode hit and scales via scaleFoodByOption', async () => {
  await db.foodsCache.put({
    id: 'off:480001', barcode: '480001', source: 'off', name: 'SkyFlakes Crackers',
    basis: 'per100g', servingSize: 100, servingUnit: 'g', servingWeightGrams: 25,
    servingOptions: [
      { id: 'pack', label: 'pack (25g)', unit: 'pack', grams: 25, defaultAmount: 1 },
      { id: 'g', label: 'g', unit: 'g', grams: 1, defaultAmount: 100 },
    ],
    nutrientsPerBasis: { calories: 480, protein: 8, carbs: 72, fat: 16, fiber: 4 },
    micronutrientsPerBasis: { sodiumMg: 600 }, updatedAt: 1,
  });
  render(<BarcodeScannerDrawer open date="2026-11-20" onClose={vi.fn()} />);
  fireEvent.change(screen.getByLabelText(/^barcode$/i), { target: { value: '480001' } });
  fireEvent.click(screen.getByRole('button', { name: /look up/i }));
  await waitFor(() => expect(screen.getByRole('button', { name: /pack \(25g\)/i })).toBeInTheDocument());
  expect(screen.getByText(/120 kcal/i)).toBeInTheDocument(); // 1 pack = 25g = 120 kcal
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/scanner/__tests__/barcode-parity.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `CustomFoodModal` and upgrade `BarcodeScannerDrawer` & `AddBarcodeProductModal`**

Refactor `src/components/scanner/barcode-scanner-drawer.tsx` hit view to compute `getServingOptionsForFood(hit.item)` and `scaleFoodByOption(hit.item, parsedAmount, activeOption)` with serving option pills and an **Edit Product** button when `hit.item.source === 'custom_barcode'`. Build `src/components/recipes/custom-food-modal.tsx` supporting standalone `custom_food` (no barcode required) OR `custom_barcode`, optional AI Label OCR auto-fill (with `401` unlock support), optional `servingWeightGrams` for countable serving switching, and collapsible optional extended nutrients (`sugarG`, `addedSugarG`, `saturatedFatG`, `cholesterolMg`, `caffeineMg`, `alcoholG`). Keep `AddBarcodeProductModal` backward-compatible with all existing tests.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/scanner/__tests__/barcode-parity.test.tsx src/components/scanner/__tests__/add-barcode-product-modal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -c safe.directory=D:/Coding/MacroAI add src/components/recipes/custom-food-modal.tsx src/components/scanner
git -c safe.directory=D:/Coding/MacroAI commit -m "feat(scanner): add countable serving parity to barcode hits and standalone CustomFoodModal"
```

---

### Task 9: Recipes & Custom Foods Library (`/recipes`), Portion Picker & Optional Cooked Weight Override

**Files:**
- Create: `src/components/recipes/recipe-portion-picker-modal.tsx`
- Modify: `src/lib/recipes/recipe-builder.ts`, `src/components/recipes/recipe-builder-modal.tsx`, `src/app/recipes/page.tsx`
- Test: `src/lib/recipes/__tests__/recipe-builder.test.tsx`

**Interfaces:**
- Consumes: `CustomFoodModal` (Task 8), `searchUsdaFoods`, `searchOffFoods`, `db.foodsCache`, `togglePinEntry` (Task 7).
- Produces:
  - `saveCustomRecipe`: accepts optional `cookedWeightGrams?: number | null`; when `basis === 'per100g'` and `cookedWeightGrams > 0`, computes `nutrientsPerBasis` / `micronutrientsPerBasis` using `100 / cookedWeightGrams` while preserving raw `totalGrams`
  - `RecipePortionPickerModal({ recipe: CustomRecipe | null; date: string; onClose: () => void; onLogged?: () => void })`

- [ ] **Step 1: Write failing tests for cooked-weight override scaling, manual ingredient fiber, recipe portion picker, and Custom Foods & Barcodes tab**

```tsx
// Add to src/lib/recipes/__tests__/recipe-builder.test.tsx
it('scales per100g nutrition using cookedWeightGrams when cooked-weight override is enabled while preserving raw totalGrams', async () => {
  const saved = await saveCustomRecipe({
    name: 'Grilled Chicken Batch',
    basis: 'per100g',
    defaultServings: 4,
    cookedWeightGrams: 750, // 25% moisture loss from 1000g raw
    ingredients: [{
      foodId: 's:chicken', name: 'Raw Chicken Breast', amount: 1000, unit: 'g', gramWeight: 1000,
      nutritionSnapshot: { calories: 1200, protein: 225, carbs: 0, fat: 26, fiber: 0, micros: {} },
    }],
  });
  expect(saved.totalGrams).toBe(1000);
  expect(saved.cookedWeightGrams).toBe(750);
  expect(saved.nutrientsPerBasis.calories).toBe(160); // 1200 / 750 * 100
  expect(saved.nutrientsPerBasis.protein).toBe(30);   // 225 / 750 * 100
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/recipes/__tests__/recipe-builder.test.tsx`
Expected: FAIL (`cookedWeightGrams` ignored; calories = `120` instead of `160`).

- [ ] **Step 3: Implement cooked-weight override, full DB ingredient search + manual fiber in `RecipeBuilderModal`, `RecipePortionPickerModal`, and 2-tab `/recipes` page**

Update `saveCustomRecipe` and `logCustomRecipe` in `src/lib/recipes/recipe-builder.ts`. In `src/components/recipes/recipe-builder-modal.tsx`: upgrade ingredient search to search `foodsCache` + offline staples/PH + streamed USDA/OFF, add `Fiber (g)` input to manual ingredient form, and add a separate optional toggle *"Override Cooked Weight (meal prep yield)"* with gram input and yield `%` readout. Create `src/components/recipes/recipe-portion-picker-modal.tsx` (`0.5x`, `1x`, `1.5x`, `2x` servings or custom grams for `per100g`). Update `src/app/recipes/page.tsx` with segmented tabs **Recipes** | **Custom Foods & Barcodes** (wiring `Log` on recipe cards to `RecipePortionPickerModal`, and listing all `custom_food`/`custom_barcode` items with search, Create, 1-tap Log, Pin, Edit, Delete+Undo).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/recipes/__tests__/recipe-builder.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -c safe.directory=D:/Coding/MacroAI add src/lib/recipes src/components/recipes src/app/recipes/page.tsx
git -c safe.directory=D:/Coding/MacroAI commit -m "feat(recipes): add portion picker, cooked-weight override, full DB ingredient search, and Custom Foods tab"
```

---

## Phase 4: Extended Nutrients & AI Suite Upgrade

### Task 10: Extended Nutrients Across USDA, Open Food Facts, Label OCR, Staples & Daily Summary

**Files:**
- Modify: `src/lib/foods/usda-adapter.ts`, `src/lib/foods/off-adapter.ts`, `src/lib/foods/staples-search.ts`, `src/lib/nutrition/daily-summary.ts`, `src/lib/ai/schemas.ts`, `src/app/api/ai/label-ocr/route.ts`
- Test: `src/lib/foods/__tests__/usda-and-staples.test.ts`, `src/lib/foods/__tests__/off-adapter.test.ts`, `src/lib/nutrition/__tests__/daily-summary.test.ts`

**Interfaces:**
- Consumes: Extended keys on `Micronutrients` (Task 1).
- Produces:
  - `src/lib/nutrition/daily-summary.ts`:
    - `EXTENDED_NUTRIENT_METADATA` (`sugarG`, `addedSugarG`, `saturatedFatG`, `cholesterolMg`, `caffeineMg`, `alcoholG` with `category: 'extended'`)
    - `MicroMetric['category'] = 'mineral' | 'vitamin' | 'extended'`
    - `DailySummary` adds `netCarbsG: number` (`Math.max(0, round1(carbs.consumed - fiber.consumed))`) and `potassiumSodiumRatio: number | null` (`sodiumMg > 0 ? round2(potassiumMg / sodiumMg) : null`)
  - `src/lib/ai/schemas.ts`: `AiMicronutrientsSchema` and `AiLabelOcrResponseSchema` accept the 6 extended nutrient keys.

- [ ] **Step 1: Write failing tests for USDA/OFF extended nutrient parsing and DailySummary Net Carbs & K:Na ratio**

```ts
// Add to src/lib/foods/__tests__/usda-and-staples.test.ts
it('maps USDA sugar, added sugar, saturated fat, cholesterol, caffeine, and alcohol IDs', () => {
  const item = mapUsdaFoodToFoodItem({
    fdcId: 999, description: 'Iced Coffee Mocha',
    foodNutrients: [
      { nutrientId: 2000, value: 14 }, { nutrientId: 1235, value: 10 },
      { nutrientId: 1258, value: 2.5 }, { nutrientId: 1253, value: 15 },
      { nutrientId: 1057, value: 95 }, { nutrientId: 1018, value: 0 },
    ],
  });
  expect(item.micronutrientsPerBasis).toMatchObject({
    sugarG: 14, addedSugarG: 10, saturatedFatG: 2.5, cholesterolMg: 15, caffeineMg: 95, alcoholG: 0,
  });
});

// Add to src/lib/nutrition/__tests__/daily-summary.test.ts
it('computes netCarbsG, potassiumSodiumRatio, and extended nutrient metrics', () => {
  const summary = aggregateDailySummary([makeEntryWithMicros({ carbs: 50, fiber: 12, potassiumMg: 1500, sodiumMg: 1000, caffeineMg: 120 })]);
  expect(summary.netCarbsG).toBe(38);
  expect(summary.potassiumSodiumRatio).toBe(1.5);
  expect(summary.micros.caffeineMg.consumed).toBe(120);
  expect(summary.micros.caffeineMg.category).toBe('extended');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/foods/__tests__/usda-and-staples.test.ts src/lib/foods/__tests__/off-adapter.test.ts src/lib/nutrition/__tests__/daily-summary.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement extended nutrient mapping across USDA, OFF, Label OCR, Staples backfill & DailySummary**

Map USDA IDs (`2000`/`1063`, `1235`, `1258`, `1253`, `1057`, `1018`) in `usda-adapter.ts` and OFF fields (`sugars_*`, `added-sugars_*`, `saturated-fat_*`, `cholesterol_*` × 1000, `caffeine_*` × 1000, `alcohol_*`) in `off-adapter.ts`. Extend `TRACKED_MICRONUTRIENT_KEYS` in `staples-search.ts`, `AiMicronutrientsSchema` + `AiLabelOcrResponseSchema` in `src/lib/ai/schemas.ts`, and `label-ocr/route.ts`. Add `EXTENDED_NUTRIENT_METADATA`, `DEFAULT_EXTENDED_TARGETS` (optional reference bounds: `saturatedFatG: 20`, `addedSugarG: 50`, `cholesterolMg: 300`, `caffeineMg: 400`, `sugarG: 0`, `alcoholG: 0`), `netCarbsG`, and `potassiumSodiumRatio` to `src/lib/nutrition/daily-summary.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/foods/__tests__/usda-and-staples.test.ts src/lib/foods/__tests__/off-adapter.test.ts src/lib/nutrition/__tests__/daily-summary.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -c safe.directory=D:/Coding/MacroAI add src/lib/foods src/lib/nutrition/daily-summary.ts src/lib/nutrition/__tests__/daily-summary.test.ts src/lib/ai/schemas.ts src/app/api/ai/label-ocr/route.ts
git -c safe.directory=D:/Coding/MacroAI commit -m "feat(nutrition): add 6 extended nutrients, Net Carbs, and K:Na ratio across USDA, OFF, OCR, and summary"
```

---

### Task 11: Text-Only AI Meal Scan, Extended Nutrient AI Estimates & Separate *Save as Recipe*

**Files:**
- Modify: `src/app/api/ai/meal-scan/route.ts`, `src/app/api/ai/refine/route.ts`, `src/components/scanner/ai-meal-scanner-sheet.tsx`
- Test: `src/lib/ai/__tests__/openai-compat.test.ts`, `src/components/scanner/__tests__/ai-meal-scanner-sheet.test.tsx`

**Interfaces:**
- Consumes: Extended `AiMicronutrientsSchema` (Task 10), `requireSyncAuth` & `SyncUnlockCard` (Task 2), `RecipeBuilderModal.initialIngredients` (Task 6).
- Produces:
  - `POST /api/ai/meal-scan`: accepts `{ imageDataUrl?: string; contextPrompt?: string }` (valid if valid `imageDataUrl` OR non-empty `contextPrompt`), returns extended nutrient estimates inside `microsPer100g`
  - `AiMealScannerSheet`: Stage 1 **Photo | Describe Meal (Text)** toggle (no voice UI); Stage 3 displays extended nutrients + separate **Save as Recipe** button + inline `401` unlock card.

- [ ] **Step 1: Write failing tests for text-only `/api/ai/meal-scan`, extended nutrient retention, and Stage 3 *Save as Recipe***

```tsx
// Add to src/components/scanner/__tests__/ai-meal-scanner-sheet.test.tsx
it('supports Describe Meal (Text) without uploading a photo and renders separate Save as Recipe action in Stage 3', async () => {
  // Switch to "Describe Meal" tab, type "2 boiled eggs and 150g white rice", click Analyze Meal -> POST /api/ai/meal-scan without imageDataUrl -> Stage 3 shows items + Save as Recipe button.
});
```
Also test in `openai-compat.test.ts` that `POST /api/ai/meal-scan` accepts `{ contextPrompt: "200g chicken adobo with 150g rice" }` with no `imageDataUrl`, returns `400` when BOTH are empty, and preserves `sugarG`/`saturatedFatG`/`caffeineMg` in response items.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/scanner/__tests__/ai-meal-scanner-sheet.test.tsx src/lib/ai/__tests__/openai-compat.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement text-only scan route, extended nutrient AI prompts, and Stage 1/3 UI upgrades**

Update `src/app/api/ai/meal-scan/route.ts` and `src/app/api/ai/refine/route.ts` prompts to request non-zero extended nutrients (`sugarG`, `addedSugarG`, `saturatedFatG`, `cholesterolMg`, `caffeineMg`, `alcoholG`) in `microsPer100g`. In `meal-scan/route.ts`, allow text-only requests (sending text-only `messages` when `imageDataUrl` is omitted). In `src/components/scanner/ai-meal-scanner-sheet.tsx`, add a `Photo | Describe Meal` segmented control in Stage 1 (Photo mode offers separate *Take Photo* and *Upload Photo* buttons; Describe Meal mode shows a text prompt + *Analyze Meal*, strictly no voice UI). In Stage 3, include extended nutrients in the collapsible nutrients accordion, handle `401` with inline `SyncUnlockCard`, and render a separate **Save as Recipe** button opening `RecipeBuilderModal` pre-populated with finalized HITL items.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/scanner/__tests__/ai-meal-scanner-sheet.test.tsx src/lib/ai/__tests__/openai-compat.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -c safe.directory=D:/Coding/MacroAI add src/app/api/ai/meal-scan/route.ts src/app/api/ai/refine/route.ts src/components/scanner/ai-meal-scanner-sheet.tsx src/components/scanner/__tests__/ai-meal-scanner-sheet.test.tsx src/lib/ai/__tests__/openai-compat.test.ts
git -c safe.directory=D:/Coding/MacroAI commit -m "feat(ai): add text-only meal scan, extended nutrient estimates, and separate Save as Recipe action"
```

---

### Task 12: AI Meal Ideas ("Fill My Remaining Macros")

**Files:**
- Create: `src/app/api/ai/meal-ideas/route.ts`, `src/components/scanner/ai-meal-ideas-drawer.tsx`, `src/lib/ai/__tests__/meal-ideas.test.tsx`
- Modify: `src/lib/ai/schemas.ts`, `src/components/shell/app-shell.tsx`, `src/components/shell/command-palette.tsx`

**Interfaces:**
- Consumes: `requireSyncAuth` & `SyncUnlockCard` (Task 2), `resolveGoalsForDate` (Task 1), `callVisionChatCompletion` (`src/lib/ai/openai-compat.ts`), `enrichMealItemsWithStaples` (`src/lib/foods/staples-search.ts`), `useLoggerStore.setAiDraft` + `openSheet('ai-scan')`.
- Produces:
  - `AiMealIdeaSchema`, `AiMealIdeasResponseSchema` in `src/lib/ai/schemas.ts`
  - `POST /api/ai/meal-ideas` → `{ ideas: AiMealIdea[] }` (3–4 ideas with `title`, `prepMinutes`, `summary`, `items[]`)
  - `AiMealIdeasDrawer({ open: boolean; date: string; onClose: () => void })`

- [ ] **Step 1: Write failing tests for `/api/ai/meal-ideas` auth/schema and `AiMealIdeasDrawer` loading chosen idea into HITL review**

```tsx
// src/lib/ai/__tests__/meal-ideas.test.tsx
it('returns structured meal ideas fitting remaining macros and hands selected idea to HITL review without auto-logging', async () => {
  // Mock /api/ai/meal-ideas returning 2 ideas; click Generate, click "Review & Log" on idea 1 -> assert useLoggerStore.getState().activeSheet === 'ai-scan', aiDraft.items populated, and db.foodLogs remains empty.
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/ai/__tests__/meal-ideas.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `AiMealIdeasResponseSchema`, `/api/ai/meal-ideas`, and `AiMealIdeasDrawer`**

Add `AiMealIdeaSchema` (`title`, `prepMinutes`, `summary`, `items: z.array(AiMealItemSchema).min(1)`) and `AiMealIdeasResponseSchema` to `src/lib/ai/schemas.ts`. Implement `POST /api/ai/meal-ideas` gated by `requireSyncAuth`, enriching each idea's `items` via `enrichMealItemsWithStaples`. Build `src/components/scanner/ai-meal-ideas-drawer.tsx` computing today's remaining macros via `resolveGoalsForDate`, displaying an optional preference input, handling `401` with `SyncUnlockCard`, rendering returned ideas with macro totals, and wiring **Review & Log** to populate `useLoggerStore.setAiDraft` and open `'ai-scan'` Stage 3. Mount inside `AppShell` and add an `AI Meal Ideas` command to `CommandPalette`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/ai/__tests__/meal-ideas.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -c safe.directory=D:/Coding/MacroAI add src/lib/ai/schemas.ts src/app/api/ai/meal-ideas src/components/scanner/ai-meal-ideas-drawer.tsx src/lib/ai/__tests__/meal-ideas.test.tsx src/components/shell/app-shell.tsx src/components/shell/command-palette.tsx
git -c safe.directory=D:/Coding/MacroAI commit -m "feat(ai): add Fill My Remaining Macros AI meal ideas feeding into HITL review"
```

---

## Phase 5: Weigh-Ins, Apple Health Shortcuts Bridge & Adaptive TDEE Engine

### Task 13: Weigh-In Drawer, Apple Health Shortcuts API (`/api/weight/latest`) & Setup Card

**Files:**
- Create: `src/components/weight/weigh-in-drawer.tsx`, `src/app/api/weight/latest/route.ts`, `src/app/api/weight/status/route.ts`, `src/components/settings/apple-health-shortcut-card.tsx`, `src/app/api/weight/__tests__/weight-latest.test.ts`, `src/components/weight/__tests__/weigh-in-drawer.test.tsx`
- Modify: `src/components/shell/app-shell.tsx`, `src/app/settings/page.tsx`

**Interfaces:**
- Consumes: `db.weightLogs`, `WeightLogEntry` (Task 1), `getLatestWeightLog` (`src/lib/db/server-db.ts`, Task 2).
- Produces:
  - `GET /api/weight/latest`: `Authorization: Bearer ${process.env.SHORTCUT_API_KEY}` (`timingSafeEqual`), `503` if unset, `401` if invalid, `404` if empty, `200` with `Cache-Control: no-store` returning flat `{ id, date, weight_kg, weight_lb, recorded_at }`
  - `GET /api/weight/status`: `{ configured: boolean }` (non-secret)
  - `WeighInDrawer({ open: boolean; initialEntry?: WeightLogEntry | null; defaultDate?: string; onClose: () => void })`
  - `AppleHealthShortcutCard` rendered in `/settings`.

- [ ] **Step 1: Write failing tests for `/api/weight/latest` auth/empty/payload contract and `WeighInDrawer` kg/lb conversion**

```ts
// src/app/api/weight/__tests__/weight-latest.test.ts
it('enforces SHORTCUT_API_KEY, returns 404 when empty, and returns flat Apple Shortcuts JSON when present', async () => {
  delete process.env.SHORTCUT_API_KEY;
  expect((await GET(new Request('http://localhost/api/weight/latest'))).status).toBe(503);

  process.env.SHORTCUT_API_KEY = 'shortcut-secret';
  expect((await GET(new Request('http://localhost/api/weight/latest', { headers: { Authorization: 'Bearer wrong' } }))).status).toBe(401);
  expect((await GET(new Request('http://localhost/api/weight/latest', { headers: { Authorization: 'Bearer shortcut-secret' } }))).status).toBe(404);

  await applyTableMutation({
    table: 'weightLogs', op: 'put',
    values: [{ id: 'w_104', date: '2026-11-20', weightKg: 76.5, source: 'manual', recordedAt: '2026-11-20T08:00:00.000Z', createdAt: 1000, updatedAt: 1000 }],
  });
  const okRes = await GET(new Request('http://localhost/api/weight/latest', { headers: { Authorization: 'Bearer shortcut-secret' } }));
  expect(okRes.status).toBe(200);
  expect(okRes.headers.get('cache-control')).toMatch(/no-store/i);
  expect(await okRes.json()).toEqual({
    id: 'w_104', date: '2026-11-20', weight_kg: 76.5, weight_lb: 168.65, recorded_at: '2026-11-20T08:00:00.000Z',
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/app/api/weight/__tests__/weight-latest.test.ts src/components/weight/__tests__/weigh-in-drawer.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `/api/weight/latest`, `/api/weight/status`, `WeighInDrawer`, and `AppleHealthShortcutCard`**

Implement `GET /api/weight/latest` and `GET /api/weight/status` with `export const dynamic = 'force-dynamic'` and `Cache-Control: no-store`. Implement `WeighInDrawer` converting display `lb` (`kg * 2.20462`) back to canonical `weightKg` rounded to 2 decimals, supporting create + edit modes and writing `recordedAt: new Date().toISOString()` to `db.weightLogs`. Mount `WeighInDrawer` in `AppShell` (`activeSheet === 'weight'`). Build `AppleHealthShortcutCard` showing live URL (`${origin}/api/weight/latest`), server `SHORTCUT_API_KEY` status, latest weigh-in JSON preview from Dexie, and copyable 4-step iOS Shortcut + iCloud `.txt` deduplication instructions, mounted on `src/app/settings/page.tsx`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/app/api/weight/__tests__/weight-latest.test.ts src/components/weight/__tests__/weigh-in-drawer.test.tsx src/app/settings/__tests__/settings.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -c safe.directory=D:/Coding/MacroAI add src/app/api/weight src/components/weight src/components/settings/apple-health-shortcut-card.tsx src/components/shell/app-shell.tsx src/app/settings/page.tsx
git -c safe.directory=D:/Coding/MacroAI commit -m "feat(weight): add WeighInDrawer, Apple Health Shortcuts /api/weight/latest endpoint, and setup guide"
```

---

### Task 14: EMA Trend Weight, Observed TDEE Solver & Weekly Check-In Proposal Engine

**Files:**
- Create: `src/lib/nutrition/adaptive-tdee.ts`, `src/lib/nutrition/__tests__/adaptive-tdee.test.ts`

**Interfaces:**
- Consumes: `WeightLogEntry`, `FoodLogEntry`, `UserGoals`, `resolveGoalsForDate`, `computeWeeklyScheduleAverage` (Task 1).
- Produces:
  - `DailyWeightPoint = { date: string; scaleKg: number; trendKg: number; entryId: string }`
  - `TdeeSeriesPoint = { date: string; observedTdee: number; avgCalories: number }`
  - `AdaptiveTdeeResult = { status: 'calibrating' | 'ready'; loggedFoodDays: number; requiredFoodDays: 10; weighInDays: number; requiredWeighInDays: 4; spanDays: number; requiredSpanDays: 10; latestScaleKg: number | null; latestTrendKg: number | null; weeklyRateKg: number | null; observedTdee: number | null; mifflinEstimate: number | null; weightSeries: DailyWeightPoint[]; tdeeSeries: TdeeSeriesPoint[] }`
  - `WeeklyCheckInProposal = { eligible: boolean; observedTdee: number; weeklyRateKg: number; currentBaselineCalories: number; proposedCalories: number; deltaCalories: number; proposedMacros: DailyMacroTargets; proposedSchedule?: Record<WeekdayKey, DailyMacroTargets>; preservesCycling: boolean }`
  - `resolveDailyWeights`, `computeEmaTrendSeries`, `computeAdaptiveTdee`, `buildWeeklyCheckInProposal`, `applyWeeklyCheckInToGoals`

- [ ] **Step 1: Write failing tests covering EMA gap handling, `< 40%` partial-day exclusion, calibration gates, `±200 kcal` clamp, custom `goalDeltaKcal`, and cycling schedule rebasing**

```ts
// src/lib/nutrition/__tests__/adaptive-tdee.test.ts
it('applies time-adjusted EMA across multi-day gaps and excludes <40% partial food days from Observed TDEE', () => {
  // 15 days at 2200 kcal + 1 partial day at 400 kcal (<40% of 2000 target), trend weight steady at 75.0 kg -> observedTdee ~ 2200 (not dragged down by 400 kcal day).
});

it('clamps weekly check-in within ±200 kcal of 7-day weeklySchedule average and rebases all Mon-Sun rows on Accept', () => {
  // Observed TDEE = 2700, goalDeltaKcal = 0, current cycling avg = 2000 -> proposed avg clamped to 2200 (+200).
  // applyWeeklyCheckInToGoals keeps weeklyCyclingEnabled === true, targetMode unchanged, shifts every weekday by +200 kcal, and sets lastCheckInAt.
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/nutrition/__tests__/adaptive-tdee.test.ts`
Expected: FAIL (`Cannot find module`).

- [ ] **Step 3: Implement `src/lib/nutrition/adaptive-tdee.ts`**

Implement the exact math pinned by the spec: latest `createdAt` per `date` for `resolveDailyWeights`; time-adjusted EMA `alphaEff = 1 - Math.pow(1 - 0.1, deltaDays)`; trailing 21-day calibration gate (`≥ 10` complete food days with `dayKcal >= 0.4 * resolvedTarget` AND `≥ 4` weigh-ins spanning `≥ 10` calendar days); `observedTdee = clamp(avgDailyCalories - (deltaTrendKg / spanDays) * 7700, 1000, 6000)`; `buildWeeklyCheckInProposal` reading `goals.goalDeltaKcal ?? goals.profile?.goalDeltaKcal ?? 0`, clamping `±200 kcal` vs current 7-day cycling avg (when `weeklyCyclingEnabled`) or `dailyCalories`, and `applyWeeklyCheckInToGoals` rebasing both top-level targets and Mon–Sun `weeklySchedule` rows while keeping `weeklyCyclingEnabled` and `targetMode` intact.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/nutrition/__tests__/adaptive-tdee.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -c safe.directory=D:/Coding/MacroAI add src/lib/nutrition/adaptive-tdee.ts src/lib/nutrition/__tests__/adaptive-tdee.test.ts
git -c safe.directory=D:/Coding/MacroAI commit -m "feat(coaching): add EMA trend weight, observed TDEE solver, and cycling-safe weekly check-in engine"
```

---

## Phase 6: `/trends` Analytics Workspace, Targets & Calorie Cycling

### Task 15: Range Analytics Helpers & Custom Zero-Dep Obsidian SVG Charts

**Files:**
- Create: `src/lib/nutrition/analytics.ts`, `src/lib/nutrition/__tests__/analytics.test.ts`, `src/components/trends/weight-trend-chart.tsx`, `src/components/trends/tdee-chart.tsx`, `src/components/trends/intake-trend-chart.tsx`

**Interfaces:**
- Consumes: `DailyWeightPoint`, `TdeeSeriesPoint`, `AdaptiveTdeeResult` (Task 14), `resolveGoalsForDate` (Task 1), `aggregateDailySummary` (Task 10).
- Produces:
  - `src/lib/nutrition/analytics.ts`:
    - `computeRangeAnalytics(logs: FoodLogEntry[], goals: UserGoals, endDate: string, rangeDays: 7 | 14 | 30 | 90, latestWeightKg?: number | null)` → `{ days, avgCalories, avgProtein, avgCarbs, avgFat, avgFiber, avgTargetCalories, weeklyNetBalance, macroPct: { protein, carbs, fat }, proteinPerKg, fiberPer1000Kcal, rolling7dSummary }`
    - `computeNutrientContributors(logs: FoodLogEntry[], nutrientKey: string, limit?: number): Array<{ name: string; foodId: string; amount: number; sharePct: number; count: number }>`
    - `computeLoggingStreak(dots: Array<{ date: string; hasLogs: boolean }>): { currentStreak: number; loggedCount: number; consistencyPct: number }`
  - Zero-dep responsive SVG components: `WeightTrendChart`, `TdeeChart`, `IntakeTrendChart` (interactive pointer/touch scrub tooltips, `tabular-nums`, theme CSS tokens, zero external chart libraries).

- [ ] **Step 1: Write failing tests for `computeRangeAnalytics`, `computeNutrientContributors`, and `computeLoggingStreak`**

```ts
// src/lib/nutrition/__tests__/analytics.test.ts
it('computes weekly calorie bank, macro % split, protein g/kg, fiber per 1000 kcal, and ranked nutrient contributors', () => {
  // Verify exact weekly net balance, macro calorie %, g/kg using latest trend weight fallback to profile.weightKg, and top Sodium contributors sorted descending with sharePct summing to 100%.
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/nutrition/__tests__/analytics.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `analytics.ts` and the 3 custom obsidian SVG charts**

Implement `src/lib/nutrition/analytics.ts`. Build `WeightTrendChart` (raw scale dots + smooth EMA polyline + `kg`/`lb` display formatting + hover/touch scrub readout), `TdeeChart` (observed TDEE polyline + dashed Mifflin-St Jeor reference line, or calm calibration progress bar when `status === 'calibrating'`), and `IntakeTrendChart` (7D/14D/30D/90D calorie or stacked macro columns with per-day cycling target notches).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/nutrition/__tests__/analytics.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -c safe.directory=D:/Coding/MacroAI add src/lib/nutrition/analytics.ts src/lib/nutrition/__tests__/analytics.test.ts src/components/trends/weight-trend-chart.tsx src/components/trends/tdee-chart.tsx src/components/trends/intake-trend-chart.tsx
git -c safe.directory=D:/Coding/MacroAI commit -m "feat(trends): add range analytics helpers and custom zero-dep obsidian SVG charts"
```

---

### Task 16: Upgraded Micronutrients Panel (`Today | 7D Avg`, Extended Tab, Top Contributors) & Interactive Heatmap

**Files:**
- Create: `src/components/dashboard/nutrient-contributors-sheet.tsx`, `src/components/dashboard/__tests__/micronutrient-and-heatmap.test.tsx`
- Modify: `src/components/dashboard/micronutrient-panel.tsx`, `src/components/dashboard/habits-analytics-grid.tsx`

**Interfaces:**
- Consumes: `computeNutrientContributors`, `computeLoggingStreak` (Task 15), `DailySummary` with `netCarbsG` & `potassiumSodiumRatio` (Task 10).
- Produces:
  - `MicronutrientPanel`: accepts optional `weeklyMicros?: Record<string, MicroMetric>`, `netCarbsG?: number`, `weeklyNetCarbsG?: number`, `potassiumSodiumRatio?: number | null`, `weeklyPotassiumSodiumRatio?: number | null`, `todayLogs?: FoodLogEntry[]`, `weeklyLogs?: FoodLogEntry[]`, `defaultWindow?: 'today' | '7d'`; renders `All | Minerals | Vitamins | Extended`, `Today | 7D Avg` toggle, Net Carbs & K:Na strip, and clickable rows opening `NutrientContributorsSheet`.
  - `HabitsAnalyticsGrid`: shaded 30-day heatmap (`none` / `partial < 50% target` / `logged`), streak + 30-day `%`, every dot clickable via `onSelectDate(dot.date)`.

- [ ] **Step 1: Write failing tests for `Extended` tab, `Today | 7D Avg` switch, Top Contributors sheet on row click, and clickable shaded 30-day heatmap**

```tsx
// src/components/dashboard/__tests__/micronutrient-and-heatmap.test.tsx
it('switches to Extended tab, toggles 7D Avg, and opens Top Contributors sheet when clicking a nutrient row', () => {
  render(<MicronutrientPanel micros={todaySummary.micros} weeklyMicros={weekSummary.micros} netCarbsG={38} potassiumSodiumRatio={1.5} todayLogs={logs} weeklyLogs={logs} />);
  expect(screen.getByText(/38g/i)).toBeInTheDocument();
  expect(screen.getByText(/1\.5/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /extended/i }));
  fireEvent.click(screen.getByRole('button', { name: /caffeine/i }));
  expect(screen.getByRole('dialog', { name: /top contributors/i })).toBeInTheDocument();
});

it('calls onSelectDate when clicking any dot in the 30-day heatmap and shows streak', () => {
  const onSelectDate = vi.fn();
  render(<HabitsAnalyticsGrid summary={todaySummary} weeklyDays={weekly} thirtyDayDots={dots} onSelectDate={onSelectDate} />);
  fireEvent.click(screen.getByRole('button', { name: /2026-11-18/i }));
  expect(onSelectDate).toHaveBeenCalledWith('2026-11-18');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/dashboard/__tests__/micronutrient-and-heatmap.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `NutrientContributorsSheet`, upgrade `MicronutrientPanel`, and upgrade `HabitsAnalyticsGrid`**

Ensure `HabitsAnalyticsGrid`'s Food Logging card no longer wraps the 30-day dots inside a single `<Link>` (use a header link to `/trends` or `/log`, and make every dot an individual `<button type="button">` calling `onSelectDate(dot.date)` with opacity/fill shading for partial vs complete days, plus current streak and 30-day consistency `%`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/dashboard/__tests__/micronutrient-and-heatmap.test.tsx src/lib/nutrition/__tests__/daily-summary.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -c safe.directory=D:/Coding/MacroAI add src/components/dashboard
git -c safe.directory=D:/Coding/MacroAI commit -m "feat(dashboard): add Extended/7D micros, Top Contributors sheet, and interactive shaded 30-day heatmap"
```

---

### Task 17: Full `/trends` Workspace, Weekly Check-In Card & Dashboard Telemetry Refinements

**Files:**
- Create: `src/components/trends/weekly-checkin-card.tsx`, `src/components/trends/weight-history-list.tsx`, `src/app/trends/__tests__/trends.test.tsx`
- Modify: `src/app/trends/page.tsx`, `src/app/page.tsx`

**Interfaces:**
- Consumes: `WeightTrendChart`, `TdeeChart`, `IntakeTrendChart`, `computeRangeAnalytics` (Task 15), `computeAdaptiveTdee`, `buildWeeklyCheckInProposal`, `applyWeeklyCheckInToGoals` (Task 14), `MicronutrientPanel`, `NutrientContributorsSheet` (Task 16), `WeighInDrawer` (Task 13), `AiMealIdeasDrawer` (Task 12).
- Produces:
  - Complete responsive 12-column obsidian `/trends` workspace (`7D | 14D | 30D | 90D`)
  - Dashboard (`src/app/page.tsx`) resolved daily targets via `resolveGoalsForDate`, compact adherence-neutral **AI Meal Ideas** & **Latest Weight Trend** triggers, and full 7-day rolling micros + contributors wiring.

- [ ] **Step 1: Write failing integration tests for `/trends` range switching, Weekly Check-In Accept/Dismiss, and weight history deletion with Undo**

```tsx
// src/app/trends/__tests__/trends.test.tsx
it('renders /trends range controls, Weekly Calorie Bank, charts, and applies Weekly Check-In on Accept', async () => {
  // Seed 14 days of foodLogs + 6 weigh-ins + active UserGoals -> render TrendsPage -> verify 7D/14D/30D/90D switch, Observed TDEE visible, click Accept on WeeklyCheckInCard -> verify db.userGoals updated & lastCheckInAt set.
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/trends/__tests__/trends.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `WeeklyCheckInCard`, `WeightHistoryList`, full `src/app/trends/page.tsx`, and Dashboard refinements in `src/app/page.tsx`**

Query 90-day `foodLogs`, all `weightLogs`, and `userGoals` via `useLiveQuery` on `/trends`. Wire `+ Weigh In` to open `WeighInDrawer`, and `Edit` on `WeightHistoryList` rows to open `WeighInDrawer` in edit mode. On `src/app/page.tsx`, resolve active date goals via `resolveGoalsForDate(activeGoals, activeDate)`, compute 7-day rolling micros for `MicronutrientPanel`, and add sleek monochrome pills/triggers for **AI Meal Ideas** (`openSheet('meal-ideas')`) and **Latest Weight Trend** (linking to `/trends` or quick weigh-in).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/app/trends/__tests__/trends.test.tsx src/lib/nutrition/__tests__/daily-summary.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -c safe.directory=D:/Coding/MacroAI add src/components/trends src/app/trends src/app/page.tsx
git -c safe.directory=D:/Coding/MacroAI commit -m "feat(trends): build /trends analytics workspace, Weekly Check-In card, and Dashboard integrations"
```

---

### Task 18: Direct Custom Targets, Weekly Calorie Cycling, Custom Micro Targets & Final Verification

**Files:**
- Modify: `src/components/settings/goals-calculator-form.tsx`, `src/components/log/meal-slots-view.tsx`
- Test: `src/components/settings/__tests__/goals-calculator-form.test.tsx`

**Interfaces:**
- Consumes: `resolveGoalsForDate`, `computeWeeklyScheduleAverage`, `buildCyclingPreset` (Task 1), `EXTENDED_NUTRIENT_METADATA` (Task 10), `UserGoals` v2 fields (Task 1).
- Produces:
  - Complete Settings target controller supporting **Calculator | Custom Targets**, shared top-level `goalDeltaKcal`, `weightUnit` (`kg | lb`), **Preserve Coached Targets** save semantics, collapsible **Weekly Calorie Cycling** Mon–Sun editor with live weekly avg & presets, and collapsible **Custom Micronutrient & Extended Targets** editor with reset-to-RDA.

- [ ] **Step 1: Write failing tests for Custom target overrides, Weekly Calorie Cycling editor, Custom Micro targets, and preserving coached targets on preference save**

```tsx
// Add to src/components/settings/__tests__/goals-calculator-form.test.tsx
it('saves direct custom targets, weekly calorie cycling, and custom micronutrient targets without overwriting coached targets when saving preferences', async () => {
  // Seed coached goals (dailyCalories: 2350, lastCheckInAt: Date.now()) -> render form -> toggle Weight Unit to lb and click Save Preferences -> assert db.userGoals.get('active').dailyCalories is STILL 2350 (not reverted to Mifflin-St Jeor!).
  // Switch to Custom Targets -> set dailyCalories 2150, enable Weekly Calorie Cycling, edit Sodium target to 2000 -> save -> verify persisted in Dexie.
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/settings/__tests__/goals-calculator-form.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Upgrade `GoalsCalculatorForm` and wire `resolveGoalsForDate` in `MealSlotsView`**

Upgrade `src/components/settings/goals-calculator-form.tsx` with:
- Mode toggle (`Calculator` | `Custom Targets`),
- Shared **Goal Rate (`goalDeltaKcal`)** selector visible in both modes,
- `Weight Display Unit` (`kg | lb`) segmented control,
- Explicit **"Recalculate from Mifflin-St Jeor"** action vs **"Save Targets & Preferences"** so toggling `weightUnit`, `weeklyCyclingEnabled`, `goalDeltaKcal`, or custom micro targets never clobbers an accepted Adaptive Check-In,
- Collapsible **Weekly Calorie Cycling** (Mon–Sun editable calories/macros + *Even* / *Higher Weekend +250 Fri/Sat* / *Training Split* preset helpers + live Weekly Average banner),
- Collapsible **Custom Micronutrient Targets** (all 12 RDAs + optional extended bounds `saturatedFatG`, `addedSugarG`, `cholesterolMg`, `caffeineMg` + *Reset to Adult RDA Defaults*).
Update `src/components/log/meal-slots-view.tsx` to resolve today's goals via `resolveGoalsForDate(activeGoals, activeDate)`.

- [ ] **Step 4: Run full verification suite (tests, lint, production build)**

Run:
```powershell
npm test
npm run lint
npm run build
```
Expected: All Vitest suites PASS, ESLint exits 0 with zero errors, and Next.js 16 production build succeeds cleanly.

- [ ] **Step 5: Commit**

```powershell
git -c safe.directory=D:/Coding/MacroAI add src/components/settings src/components/log/meal-slots-view.tsx
git -c safe.directory=D:/Coding/MacroAI commit -m "feat(settings): add direct target overrides, weekly calorie cycling, custom micro targets, and coached-target preservation"
```
