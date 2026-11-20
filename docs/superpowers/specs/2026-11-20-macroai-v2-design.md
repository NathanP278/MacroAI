# MacroAI v2 Comprehensive Overhaul Design Specification

**Date:** 2026-11-20  
**Status:** Ready for user approval (builder check resolved)  
**Target Stack:** Next.js 16 (App Router, Vercel serverless hosting), React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Dexie.js (`MacroAIDB`), Turso (libSQL), Zustand, Custom Service Worker PWA (`public/sw.js`), Vitest

---

## 1. Intent & Why

MacroAI v1 established a fast, offline-first obsidian nutrition logger with USDA/OFF/PH food search, barcode scanning, HITL AI meal scanning, and hybrid IndexedDB + Turso sync. In daily use, however, the app still feels bare-bones: logged entries cannot be edited, search lacks recents/favorites/recipes, targets cannot be directly overridden or cycled across the week, AI scanning requires a photo, analytics are limited to single-day views, and there is no weight-trend or observed-TDEE feedback loop.

MacroAI v2 transforms the app into a complete, MacroFactor-caliber personal nutrition and adaptive-coaching cockpit across **6 well-structured vertical phases**, while keeping the app 100% free, local-first, adherence-neutral, and hosted cleanly on Vercel + Turso without needing a native iOS app (bridging weigh-ins to Apple Health via iOS Shortcuts).

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Frictionless 4–8×/day Mobile & Desktop Logging:** Tap-to-edit entries with notes, unified search with Recents/Frequent/Pinned + Custom Recipes + 1-tap quick-log + multi-add batching, text-only AI meal scan, barcode countable servings, calendar date picker, and selective copy from any past date.
- **Full Nutrient Depth Everywhere:** Track 6 extended nutrients (`sugarG`, `addedSugarG`, `saturatedFatG`, `cholesterolMg`, `caffeineMg`, `alcoholG`) across USDA, Open Food Facts, offline staples backfill, and AI meal scan/refine, plus computed **Net Carbs** (`carbs − fiber`) and **K:Na ratio**.
- **Adaptive Coaching & Analytics (`/trends`):** Daily weigh-ins, EMA Trend Weight, Observed TDEE (rolling 14–21 day adaptive expenditure), optional weekly target check-ins (explicit Accept/Dismiss), Weekly Calorie Bank, 7/14/30/90-day charts, 7-day rolling micronutrients with Top Contributors, interactive shaded 30-day heatmap, direct target overrides, and Weekly Calorie Cycling.
- **Zero-Native Apple Health Weigh-In Bridge:** Expose `GET /api/weight/latest` secured with `Authorization: Bearer ${process.env.SHORTCUT_API_KEY}` returning flat `{ id, date, weight_kg, weight_lb, recorded_at }` JSON with `Cache-Control: no-store` for iOS Personal Automations.
- **AI Meal Ideas ("Fill My Remaining Macros"):** Server-powered AI suggestions grounded in today's remaining calories/protein/carbs/fat that load directly into the existing HITL review sheet.
- **Hardened Vercel + Turso Sync, AI Quota Protection & Offline Integrity:** Optional `SYNC_ACCESS_KEY` HttpOnly cookie / Bearer token auth protecting both `/api/db/sync` and `/api/ai/*`, tombstone-aware offline delete propagation, `/data/ph-foods.json` SW precaching, working Command Palette undo, CSV export, and removal of dead meal-slot & prototype code.

### Non-Goals (Explicitly Excluded by User)
- **Meal timing / eating window analytics** (no time-of-day calorie distributions or fasting window tracking).
- **Hydration & daily habit toggles** (no water card, creatine/multivitamin/steps/workout toggles).
- **Voice input for AI Meal Scan** (photo + text description only; no speech-to-text / Web Speech API).
- **Breakfast / Lunch / Dinner / Snacks meal slots & dynamic per-meal macro distribution** (intentionally removed feature; keep a flat chronological diary and remove unused meal-slot distribution code).
- **Local heuristic pantry combo generator** for remaining macros (use AI meal ideas instead).
- **Native iOS app or multi-user account/auth system** (single-owner personal deployment).

### Anti-Goals
- Punitive red (`#ef4444`) UI states, warning banners, or shaming language when exceeding targets (strict `DESIGN.md` Adherence Neutrality).
- Silent auto-logging of AI Meal Scan or AI Meal Ideas results (always route through HITL review).
- Auto-mutating calorie/macro targets during weekly coaching check-ins without explicit user Accept.
- Resurrecting offline-deleted records when reconnecting to Turso sync.
- Breaking v1 `macroai-backup.json` imports or losing existing `MacroAIDB` v1 records during Dexie upgrade.
- Bloating the offline PWA bundle with heavy charting dependencies.

---

## 3. Constraints & Architectural Commitments

1. **Vercel Stateless Serverless Hosting + Turso (libSQL):** All API routes (`/api/db/sync`, `/api/weight/latest`, `/api/auth/sync-session`, `/api/ai/*`) must be stateless, read/write via `getLibsqlClient()` (`TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`, falling back to local SQLite in dev), and return `Cache-Control: no-store` on dynamic user data.
2. **Design System Compliance (`DESIGN.md`):** Matte obsidian canvas (`#141416`), flat tonal slabs (`#1c1c1f`), monochrome chrome (`#f5f5f7`/`#141416` inversion), fixed nutrient telemetry tokens (`#6c8eff` calories, `#e56b4e` protein, `#e8c547` fat, `#4caf79` carbs, `#9f85ff` fiber, `#94a3b8` neutral surplus), `tabular-nums` on every number, responsive `max-w-6xl` bento grids on desktop, and full dark/light/system theme parity.
3. **Flat Chronological Diary:** Remove `src/lib/nutrition/meal-distribution.ts`, its test, and all Breakfast/Lunch/Dinner/Snacks UI/distribution logic. Keep `mealSlot` optional/defaulted to `'log'` on `FoodLogEntry` solely for backward schema/backup compatibility.
4. **Separate Explicit Actions:** "Save as Recipe" (from Food Log multi-select or AI HITL review) and "Cooked Weight Override" (inside Recipe Builder) must be explicit, separate optional controls — never forced or hidden inside normal logging.
5. **Turbopack-Safe PWA & Zero Charting Dependencies:** Continue using hand-written `public/sw.js` and custom responsive SVG charts styled with CSS custom properties.

---

## 4. Approaches Considered

- **Monolithic Big-Bang Rewrite (Dropped):** High regression risk across Dexie migrations, Turso sync, and 15+ test suites; contradicts incremental phased verification.
- **Approach C — UI-First, Sync & Backend Hardening Last (Rejected):** Forces rewriting every new store/table (`weightLogs`, `pinnedFoods`, `tombstones`, `userGoals` cycling) twice and keeps offline-delete bugs and Apple Health Shortcuts blocked until the very end.
- **Approach B — Foundation-First 6 Phases + `recharts` (Rejected):** Adds ~150–200 KB gzipped JS to the offline PWA bundle, fights Tailwind v4 CSS variables for dark/light themes, and adds `ResizeObserver` flakiness in Vitest jsdom tests.
- **Approach A — Foundation-First 6-Phase Rollout + Custom Zero-Dep Obsidian SVG Charts (Selected):** Establishes Dexie v2 + Turso schema, sync auth, and tombstones in Phase 1 so every subsequent phase ships complete end-to-end with offline + cloud sync, while keeping charts lean, zero-dep SVG matching `MacroBentoGrid` and `DESIGN.md`.

---

## 5. Phased System Architecture & Module Design

### Phase 1: Data Foundation, Sync Hardening, Cleanup & Exports

1. **Data Model Extensions (`src/types/nutrition.ts`):**
   - Extend `FoodSource` / `FoodItem.source` with `'custom_food'`.
   - Extend `Micronutrients` (optional numeric keys, automatically propagated by `scaleNutrition`, `calculateRecipeTotals`, and `aggregateDailySummary`):
     - `sugarG`, `addedSugarG`, `saturatedFatG`, `cholesterolMg`, `caffeineMg`, `alcoholG`.
   - Add `WeightLogEntry`:
     - `{ id: string; date: string; weightKg: number; note?: string; source: 'manual' | 'apple_health'; recordedAt: string; createdAt: number; updatedAt: number }`.
   - Add `PinnedFood`:
     - `{ id: string; kind: 'food' | 'recipe'; refId: string; pinnedAt: number }` (`id = "${kind}:${refId}"`).
   - Add `SyncTombstone`:
     - `{ id: string; tableName: CentralTableName; recordId: string; deletedAt: number }` (`id = "${tableName}:${recordId}"`).
   - Extend `CustomRecipe`: add optional `cookedWeightGrams?: number | null`.
   - Extend `UserGoals`:
     - `targetMode?: 'calculator' | 'custom'`
     - `goalDeltaKcal?: number` *(builder-check call: shared top-level cut/maintain/surplus delta defaulting to `profile?.goalDeltaKcal ?? 0`, editable in both Calculator and Custom modes so adaptive check-ins always know the target rate)*
     - `weeklyCyclingEnabled?: boolean`
     - `weeklySchedule?: Record<WeekdayKey, DailyMacroTargets>` (`mon`..`sun`)
     - `weightUnit?: 'kg' | 'lb'` (defaults to `'kg'`)
     - `lastCheckInAt?: number`, `lastCheckInDismissedAt?: number`
     - Keep `mealSlots` optional (default `[]`) for v1 backup compatibility only.
2. **Dexie v2 & Turso Schema (`macroai-db.ts`, `server-db.ts`):**
   - Upgrade `MacroAIDB` to `version(2)` adding `weightLogs`, `pinnedFoods`, and `tombstones` while preserving all v1 tables/data.
   - Add matching SQL tables in `ensureServerSchema()`: `weight_logs` (indexed by `date`, `recorded_at DESC`), `pinned_foods`, `tombstones`.
3. **Tombstone-Aware Offline Sync (`cloud-sync.ts`, `server-db.ts`, `api/db/sync/route.ts`):**
   - On local delete, `CentralSyncMiddleware` writes a `tombstones` row (`deletedAt = Date.now()`) and pushes `{ action: 'mutate', table, op: 'delete', keys, deletedAt }`.
   - On local put (including Undo restore), clear any matching tombstone locally and on server.
   - On `merge` sync, merge tombstones by max `deletedAt`; suppress/delete any row whose `updatedAt`/`createdAt` is older than its tombstone's `deletedAt`. Prune tombstones older than 90 days.
4. **Optional Single-Owner Sync & AI Auth (`SYNC_ACCESS_KEY`):**
   - New route `src/app/api/auth/sync-session/route.ts`:
     - `GET` → `{ authRequired: boolean, authenticated: boolean }`.
     - `POST` `{ passphrase }` → constant-time comparison against `process.env.SYNC_ACCESS_KEY`; sets signed HMAC-SHA256 `HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000` (`Secure` in prod) cookie `macroai_sync_session`.
     - `DELETE` → clears cookie.
   - Whenever `process.env.SYNC_ACCESS_KEY` is non-empty, both `/api/db/sync` and all `/api/ai/*` routes (`meal-scan`, `refine`, `label-ocr`, `meal-ideas`, `health`) enforce either a valid `macroai_sync_session` cookie or `Authorization: Bearer <SYNC_ACCESS_KEY>`, returning `401 { ok: false, error: 'Unauthorized', authRequired: true }` when unauthenticated; when unset (local dev), both stay open for frictionless development.
   - Local offline IndexedDB tracking continues working unblocked when locked; `CentralDbStatusCard` + a subtle dismissible banner prompt to unlock cloud sync, and AI surfaces (`AiMealScannerSheet`, `AiMealIdeasDrawer`, `AddBarcodeProductModal`, `AiHealthStatusCard`) handle `401` responses with an inline passphrase unlock prompt.
5. **Backup v2 & CSV Exports (`backup.ts`, `backup-panel.tsx`):**
   - Export JSON `version: 2` including `weightLogs` and `pinnedFoods`.
   - Import accepts both `version: 1` and `version: 2` via Zod discriminated union.
   - Add RFC 4180 CSV export downloads (formula-safe quoting) for **Food Logs**, **Daily Summaries**, and **Weigh-Ins**.
6. **Technical Fixes & Cleanup:**
   - Update `public/sw.js`: bump `CACHE_NAME` to `'macroai-v2'`, precache `/trends` and `/data/ph-foods.json`, and serve `/data/ph-foods.json` cache-first alongside `staples-2500.json`.
   - Fix `copyYesterdayLogs` to return cloned entries/IDs so Command Palette (`command-palette.tsx`) Undo deletes the exact cloned entries.
   - Delete `src/app/prototypes/`, `src/components/prototypes/`, `src/lib/nutrition/meal-distribution.ts`, and `src/lib/nutrition/__tests__/meal-distribution.test.ts`. Remove `DEFAULT_MEAL_SLOTS` / `copyYesterdayMeal` dead references.

---

### Phase 2: Navigation Shell & Core Diary QoL

1. **Navigation Redesign (`bottom-nav.tsx`, `app-shell.tsx`, page headers, `quick-action-dock.tsx`):**
   - Bottom navigation bar becomes: `[ Dashboard (/) ] [ Food Log (/log) ]  (+)  [ Trends (/trends) ] [ Recipes (/recipes) ]`.
   - Quick Search Strip remains exclusively on `/` and `/log` (per `DESIGN.md`).
   - Add a consistent top-right `⚙` Settings icon button (`href="/settings"`) to `/`, `/log`, `/trends`, and `/recipes` headers; keep `Go to Settings` in `⌘K` Command Palette alongside new `Go to Trends` and `Log Weight` commands.
   - Add a full-width **Log Weigh-In** action row beneath the 2×2 food-logging grid in `QuickActionDock`.
2. **Tap-to-Edit Logged Entries (`EditLogEntryDrawer`):**
   - Available from expanded entry rows on `/` and `/log`.
   - Edit portion `amount` & `unit` (proportionally re-scaling macros & micros, or offering full `FoodServingOption` switching when the underlying food/recipe is resolvable in `foodsCache`, `customRecipes`, or staples).
   - Direct macro/calorie/fiber override toggle (enabled by default for `quick_add` entries).
   - Move entry to another `date` and add/edit `note` (render non-empty `note` cleanly in the expanded row).
3. **Calendar Date-Picker Popover:**
   - Tapping the date label in `/` and `/log` headers opens an obsidian month calendar popover displaying subtle dots on days with logged entries, month prev/next controls, and a `Today` shortcut.
4. **Selective Copy From Any Date & Multi-Select Mode (`/log`):**
   - Upgrade *Copy Yesterday* into a **Copy From Date** drawer (defaults to Yesterday with 1-tap *Copy All*, plus date picker + individual entry checkboxes + working Undo toast).
   - Add a **Select** mode toggle on `/log` to multi-select entries, revealing a bottom action bar with:
     - **Save as Recipe** (separate explicit option — launches `RecipeBuilderModal` pre-populated with selected entries),
     - **Copy to Date...**,
     - **Delete Selected** (with bulk Undo).

---

### Phase 3: Unified Search, Barcode Parity & Recipes / Custom Foods Overhaul

1. **Unified Food Search (`food-search-drawer.tsx`):**
   - Empty query displays segmented tabs: **Recents** (most recently logged unique foods/recipes with last-used portion), **Frequent** (most logged over last 60 days), and **Pinned** (`db.pinnedFoods`).
   - Active queries search and rank across **Custom Recipes** (badged `RECIPE`), **Custom Foods & Barcodes**, **Cached Foods**, **Offline Staples + PH Foods**, and streamed **USDA + Open Food Facts**.
   - Row controls: Pin/unpin icon button, **1-tap `+` quick-log** button (logs default/last portion immediately with haptic + Undo toast), and tapping a row opens the portion selector.
   - **Multi-Add Staging Mode:** Optional "Stage / Add Another" action builds a visible bottom tray (`N items · X kcal · [Log All]`) committed in one atomic `bulkAdd` transaction.
2. **Barcode Scanner Parity (`barcode-scanner-drawer.tsx`):**
   - Switch hit view from raw `scaleNutrition` to `getServingOptionsForFood` + `scaleFoodByOption` so parsed household units (`1 pack`, `1 bottle`, `1 pc`) and metric units match `FoodSearchDrawer`.
   - Add an **Edit Product** trigger when a barcode matches a `custom_barcode` item in `foodsCache`.
3. **Recipes & Custom Foods Library (`/recipes`, `recipe-builder-modal.tsx`):**
   - Segmented tabs at top of `/recipes`: **Recipes** | **Custom Foods & Barcodes**.
   - **Recipes tab:**
     - Tapping **Log** opens a **Recipe Portion Picker** sheet/popover (`0.5x`, `1x`, `1.5x`, `2x` servings, or custom grams for `per100g` recipes) with live scaled macros before committing.
     - `RecipeBuilderModal` upgrades:
       - Accepts optional `initialIngredients` (used by Food Log multi-select and AI HITL *Save as Recipe*).
       - Ingredient search queries `foodsCache` (`custom_food` / `custom_barcode` / cached), offline staples + PH foods, AND online USDA + OFF.
       - Manual ingredient form includes `Fiber (g)`.
       - **Separate optional toggle: "Override Cooked Weight"** — lets the user specify final cooked yield (`cookedWeightGrams`), displays yield % (`cooked / raw`), and scales `per100g` nutrition using cooked weight without losing raw ingredient weights.
   - **Custom Foods & Barcodes tab:**
     - Lists all `custom_food` and `custom_barcode` items from `foodsCache` with search, 1-tap Log, Pin, Edit, and Delete (with Undo).
     - **Create / Edit Custom Food modal**: supports standalone custom foods (optional barcode) + optional AI Label OCR auto-fill + macros + optional extended nutrients + serving size/unit/gram weight.

---

### Phase 4: Extended Nutrients & AI Suite Upgrade

1. **Extended Nutrients Across All Sources:**
   - **USDA Adapter (`usda-adapter.ts`) & `scripts/build-staples.ts`:** Map USDA nutrient IDs `2000`/`1063` (`sugarG`), `1235` (`addedSugarG`), `1258` (`saturatedFatG`), `1253` (`cholesterolMg`), `1057` (`caffeineMg`), `1018` (`alcoholG`). Include them in `TRACKED_MICRONUTRIENT_KEYS` in `staples-search.ts` for AI staple enrichment backfill, and backfill `public/data/staples-2500.json` where source data permits (or enrich cleanly via build script without regressing existing staples).
   - **OFF Adapter (`off-adapter.ts`):** Parse `sugars_*`, `added-sugars_*`, `saturated-fat_*`, `cholesterol_*` (g → mg), `caffeine_*` (g → mg), `alcohol_*` across `100g`/`100ml`/`serving`.
   - **Label OCR (`/api/ai/label-ocr` + `AddBarcodeProductModal`):** Optionally extract `sugarG`, `addedSugarG`, `saturatedFatG`, `cholesterolMg` alongside existing label fields.
   - **Daily Summary (`daily-summary.ts`):** Add metadata (`category: 'extended'`) for all 6 stored extended nutrients plus computed readouts `netCarbsG = Math.max(0, round1(carbs - fiber))` and `potassiumSodiumRatio = sodiumMg > 0 ? round2(potassiumMg / sodiumMg) : null`.
2. **AI Meal Scan — Text-Only Mode + Extended Nutrient Estimates + Save as Recipe:**
   - `/api/ai/meal-scan` accepts `{ imageDataUrl?: string; contextPrompt?: string }`, requiring at least one valid image OR non-empty text description.
   - Both `/api/ai/meal-scan` and `/api/ai/refine` prompts & Zod schemas (`schemas.ts`) include `sugarG`, `addedSugarG`, `saturatedFatG`, `cholesterolMg`, `caffeineMg`, and `alcoholG` inside `microsPer100g` (omitting zero values to keep token latency low, while server staple enrichment backfills whole foods).
   - `AiMealScannerSheet` Stage 1 offers a clean segmented toggle: **Photo** (with separate *Take Photo* and *Upload Photo* actions so mobile isn't locked into camera-only) vs **Describe Meal (Text)** (text-only prompt → same Stage 3 HITL Review Sheet). No voice/microphone UI.
   - Stage 3 HITL Review Sheet exposes a **separate "Save as Recipe"** button alongside *Confirm & Log* that opens `RecipeBuilderModal` pre-populated with the finalized HITL items.
3. **AI Meal Ideas ("Fill My Remaining Macros"):**
   - New route `POST /api/ai/meal-ideas` reading server AI config (`AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, fallback keys/models), accepting `{ remaining: { calories, protein, carbs, fat, fiber }, preference?: string }`.
   - Returns Zod-validated JSON array of 3–4 meal ideas, each with `title`, `prepMinutes`, `summary`, and `items[]` (compatible with `AiDraftItem`, enriched with staples micros server-side).
   - `AiMealIdeasDrawer` accessible from Dashboard (Daily Balance / hero area) and `⌘K`: displays today's remaining budget, optional quick preference input (e.g. *"PH-friendly, high protein, under 15 mins"*), generates ideas, and lets the user tap **Review & Log** on any idea to load its items into `AiMealScannerSheet` Stage 3 (strict HITL — never auto-logs).

---

### Phase 5: Weigh-Ins, Apple Health Shortcuts Bridge & Adaptive TDEE Engine

1. **Weigh-In Logging UI (`WeighInDrawer`):**
   - Triggered from `+` Quick Action Dock, Dashboard compact weight pill/card, and `/trends`.
   - Inputs: Weight (`kg` or `lb` per `userGoals.weightUnit`, stored canonically as `weightKg`), date (defaults to today), optional note.
   - Saving writes to `db.weightLogs` (`source: 'manual'`, `recordedAt: new Date().toISOString()`) and syncs immediately to Turso `weight_logs` via `CentralSyncMiddleware`.
   - History list on `/trends` supports inline edit and delete (with Undo toast + tombstone sync).
2. **Apple Health iOS Shortcuts API (`src/app/api/weight/latest/route.ts` & `/api/weight/status/route.ts`):**
   - `GET /api/weight/latest`:
     - Auth: checks `Authorization: Bearer <token>` against `process.env.SHORTCUT_API_KEY` using `crypto.timingSafeEqual`. Returns `503` if `SHORTCUT_API_KEY` is unset, `401` if invalid/missing.
     - Queries latest row from Turso `weight_logs` (`ORDER BY date DESC, created_at DESC LIMIT 1`).
     - Returns `Cache-Control: no-store` and flat top-level JSON for effortless iOS Shortcut `Get Dictionary Value` parsing:
       ```json
       {
         "id": "w_...",
         "date": "2026-11-20",
         "weight_kg": 76.5,
         "weight_lb": 168.65,
         "recorded_at": "2026-11-20T08:00:00.000Z"
       }
       ```
     - Returns `404 { "error": "No weigh-ins found" }` when empty so iOS Shortcuts never logs `0 kg`.
   - `GET /api/weight/status` (non-secret): returns `{ configured: boolean }` so Settings can display whether `SHORTCUT_API_KEY` is active on Vercel without leaking the secret.
   - **Apple Health Shortcut Setup Card** in `/settings`: displays live endpoint URL, server key status, latest weigh-in JSON preview, and copyable step-by-step iOS Shortcut + Personal Automation instructions (including the iCloud Drive `.txt` `id` deduplication pattern).
3. **EMA Trend Weight & Adaptive TDEE Engine (`src/lib/nutrition/adaptive-tdee.ts`):**
   - **Daily Weight Resolution:** Uses latest `createdAt` entry per calendar `date`.
   - **EMA Trend Weight:** Time-adjusted exponential smoothing (`alpha = 0.1` per day, `alphaEff = 1 - Math.pow(1 - 0.1, deltaDays)`) across ordered weigh-in dates, producing daily scale + trend series and rolling 7d/14d/30d rate of change (`kg/wk`).
   - **Observed TDEE Solver:**
     - Calibration gate: requires **≥ 10 logged food days** (excluding obvious partial days `< 40%` of calorie target) AND **≥ 4 weigh-ins spanning ≥ 10 calendar days** within the trailing 21-day window; otherwise reports `status: 'calibrating'` with exact progress counts.
     - Formula: `observedTdee = avgDailyCalories - ((deltaTrendWeightKg / spanDays) * 7700)`, smoothed gently over the window and clamped safely to `[1000, 6000] kcal`.
   - **Optional Weekly Check-In Proposal:**
     - Eligible once calibrated and ≥ 7 days since `Math.max(lastCheckInAt ?? 0, lastCheckInDismissedAt ?? 0)`.
     - Reads `goalDeltaKcal` from top-level `UserGoals.goalDeltaKcal ?? profile?.goalDeltaKcal ?? 0` *(builder-check call)*.
     - Baseline target for clamping (`±200 kcal` max weekly shift) is the current 7-day `weeklySchedule` average when `weeklyCyclingEnabled` is true, or `dailyCalories` otherwise *(builder-check call)*.
     - Computes `proposedCalories = roundTo10(observedTdee + goalDeltaKcal)`, clamped within `±200 kcal` of that baseline.
     - Preserves protein (`weightKg * proteinPerKg` in calculator mode or current protein ratio in custom mode), maintains healthy fat minimum, allocates remainder to carbs, and updates fiber (`14g / 1000 kcal`).
     - On **Accept**: updates top-level `dailyCalories` / macros / fiber AND, when `weeklyCyclingEnabled` is true, shifts each Mon–Sun entry in `weeklySchedule` by the proposed daily calorie delta (preserving each weekday's relative calorie offset, clamping safely, and recomputing weekday carbs/fat/fiber around protein), keeping `weeklyCyclingEnabled` active and leaving `targetMode` unchanged *(builder-check call)*.
     - UI card shows observed TDEE, trend rate, current (and weekly avg if cycling) vs. proposed targets, and explicit **Accept** / **Dismiss** buttons.

---

### Phase 6: `/trends` Analytics Workspace, Targets & Calorie Cycling

1. **Dedicated `/trends` Page (`src/app/trends/page.tsx` + `src/components/trends/*`):**
   - Range switcher (`7D | 14D | 30D | 90D`), `+ Weigh In` button, and top-right `⚙` Settings icon.
   - **Custom Zero-Dep Obsidian SVG Charts** (all responsive `viewBox`, theme-token styled, interactive pointer/touch scrub tooltips, `tabular-nums`, accessible summaries):
     - **Weight & EMA Trend Chart:** Muted raw scale dots + smooth trend polyline + weekly slope readout.
     - **Observed TDEE Chart:** Observed expenditure polyline vs. dashed Mifflin-St Jeor reference line (or calm calibration progress bar until ready), paired with the optional Weekly Check-In card.
     - **Intake vs. Target Chart:** 7D/14D/30D/90D calorie & stacked macro columns with daily target markers (reflecting per-weekday targets when Weekly Calorie Cycling is on).
   - **Weekly Calorie Bank & Averages Card:** Rolling average calories/P/C/F/fiber vs. target, adherence-neutral net weekly calorie balance, macro `% P / % C / % F` split bar, protein `g/kg` (using latest trend weight or `profile.weightKg`), and fiber per `1,000 kcal`.
   - **Upgraded Micronutrients & Extended Nutrients Panel (`micronutrient-panel.tsx`, shared on `/` and `/trends`):**
     - Category tabs: `All | Minerals | Vitamins | Extended`.
     - Window toggle: `Today | 7D Avg`.
     - Compact derived strip showing **Net Carbs** and **K:Na Ratio**.
     - Every nutrient row (and macro metrics on `/trends`) is clickable to open a **Top Contributors Sheet** ranking the logged foods that drove that nutrient over Today or the last 7 days (`amount`, `unit`, `%` share).
   - **Interactive 30-Day Heatmap (`habits-analytics-grid.tsx` + `/trends`):**
     - Shaded subtly by logging completeness (`none` / `partial < 50% target` / `logged`), displays current streak + 30-day logging %, and every dot is an interactive button that jumps directly to that date.
2. **Targets, Weekly Calorie Cycling & Custom Micro Targets (`goals-calculator-form.tsx` + `resolveGoalsForDate`):**
   - Add pure `resolveGoalsForDate(goals, isoDate)` used consistently across `/`, `/log`, `/trends`, and AI Meal Ideas.
   - Mode toggle: **Mifflin-St Jeor Calculator** vs **Direct Custom Targets** (editable calories, P, C, F, fiber with non-blocking 4-4-9 readout) + shared **Goal Rate (`goalDeltaKcal`)** selector visible in both modes + `Weight Display Unit (kg | lb)` *(builder-check call)*.
   - **Preserve Coached Targets in Settings:** Saving `weightUnit`, `weeklyCyclingEnabled`/`weeklySchedule`, `goalDeltaKcal`, or custom micronutrient targets preserves the currently stored `dailyCalories`/macro targets unless the user explicitly clicks *"Recalculate from Mifflin-St Jeor"* or edits the Custom target fields directly (preventing silent reversion after an accepted Adaptive Check-In) *(builder-check call)*.
   - **Weekly Calorie Cycling:** Optional toggle with Mon–Sun editable daily calorie/macro rows, quick preset helpers (e.g., *Higher Weekend +250 Fri/Sat*), and a live **Weekly Average** summary so total weekly energy stays transparent.
   - **Custom Micronutrient Targets:** Collapsible editor for all 12 RDAs + optional reference bounds for extended nutrients (`saturatedFatG`, `addedSugarG`, `cholesterolMg`, `caffeineMg`), plus *Reset to Adult RDA Defaults*.
3. **Dashboard Refinements (`src/app/page.tsx`):**
   - Add compact, adherence-neutral triggers for **AI Meal Ideas** (near Daily Balance / hero) and **Latest Weight Trend** (linking to `/trends` or quick weigh-in) while keeping the MacroFactor obsidian bento hierarchy clean and uncrowded.

---

## 6. Left to the Builder

- Exact component file paths and helper decomposition under `src/components/` and `src/lib/`.
- Exact SVG chart padding, tick formatting, and touch-scrubbing hit-target ergonomics (while adhering strictly to `DESIGN.md` tokens and responsive `max-w-6xl` bento layout).
- Exact Vision/Text LLM prompt phrasing and JSON repair fallbacks for `/api/ai/meal-scan`, `/api/ai/refine`, and `/api/ai/meal-ideas`.
- Exact Vitest unit/component test files and coverage layout for each of the 6 phases.
- Whether `staples-2500.json` is regenerated via `scripts/build-staples.ts` against USDA dumps or backfilled via an offline-safe script during Phase 4 (builder verifies network/USDA availability at implementation time).
