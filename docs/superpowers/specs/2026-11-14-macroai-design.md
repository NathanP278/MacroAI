# MacroAI Design Specification

**Date:** 2026-11-14  
**Status:** Ready for user approval (builder check resolved)  
**Target Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, Shadcn UI, Lucide Icons, Dexie.js (`MacroAIDB`), Zustand, Custom Service Worker PWA

---

## 1. Intent & Why

Build **MacroAI**, a 100% free, local-first, zero-subscription calorie and macro tracking Progressive Web App (PWA). It combines:

- **MacroFactor's** dark-first, data-dense, adherence-neutral mobile app UX (charcoal/obsidian surfaces, crisp 1px borders, `tabular-nums`, bento tiles, bottom `+` quick-action dock).
- **Cronometer's** micronutrient depth backed by clean whole-food data (USDA Foundation & SR Legacy).
- **MyFitnessPal's** frictionless barcode scanning and quick macro entry.
- **Fitia's** dynamic remaining-macro distribution across unlogged meal slots.
- **Custom OpenAI-Compatible AI Meal & Label Scanning** using a server-configured OpenAI-compatible Vision endpoint (env-configured API key and base URL—no BYOK UI), guarded by strict **Human-in-the-Loop (HITL)** verification so AI never auto-logs unreviewed or double-counted entries.

All user logs, cached foods, recipes, and goals live strictly in the user's browser (`IndexedDB` via `Dexie.js`), giving $0 database/hosting costs, full offline capability, and portable JSON backup ownership, while the personal AI API key stays safely on the Next.js server.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **$0 Infrastructure & Offline-First Core:** All persistence runs locally in `MacroAIDB`. Daily logging, food search (~2,500 bundled staples + cached items), Quick Add, recipes, and macro calculations work completely offline.
- **Adherence-Neutral Analytics:** Distinct vibrant color tokens per nutrient (Calories, Protein, Carbs, Fat, Fiber/Micros). Going over a target renders neutral analytical deltas and extended tracks—never punitive red warnings.
- **Strict HITL AI Accuracy:** Vision meal scans always pause in an interactive review sheet with live gram/multiplier adjustments, database swaps, and conversational refinement before committing to `foodLogs`.
- **Zero-Cost External Data Waterfall:** Local cache first, then Open Food Facts v2 / USDA FoodData Central via stateless proxies, with seamless Manual + AI Nutrition Label OCR creation for missing barcodes.

### Non-Goals
- User accounts, authentication, cloud sync, or multi-device server databases.
- MacroFactor-style daily weigh-in trend smoothing and adaptive TDEE coaching algorithms (excluded for this release; targets use manual entry + onboarding Mifflin-St Jeor TDEE calculator).
- Scraping proprietary commercial food databases.

### Anti-Goals
- Punitive red UI states when exceeding daily targets.
- Silent auto-logging of AI meal scan estimates.
- Double-counting composite dishes (e.g., logging both "chicken rice bowl" and "chicken + rice").
- Mixing Open Food Facts `energy` (kJ) with `energy-kcal_100g`.
- Exposing server AI credentials to browser state or accepting arbitrary client-supplied proxy target URLs.

---

## 3. Constraints & Architectural Decisions

1. **Hosting Model (Personal / Self-Hosted Next.js Hybrid):** Intended for personal localhost use or a private/single-owner Vercel free-tier deployment. Three thin, stateless Route Handler groups operate alongside the offline client shell:
   - `/api/off/[barcode]` — Required because browsers forbid setting custom `User-Agent` headers (`MacroAI/1.0`) in client-side `fetch()`. Sets edge/HTTP `Cache-Control` on valid responses.
   - `/api/usda/[...path]` — Injects server-side `USDA_API_KEY` (or `DEMO_KEY` fallback in local dev) when querying `api.nal.usda.gov/fdc/v1`, with `Cache-Control` caching for identical queries.
   - `/api/ai/*` (`meal-scan`, `refine`, `label-ocr`, `health`) — Server-only OpenAI-compatible AI adapter reading `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, and optional `AI_CUSTOM_HEADERS` from `.env.local` / server environment variables. No BYOK client credential storage, no browser CORS issues, and zero open-proxy SSRF surface.
2. **Design Reference Constraint (`/riff` Adaptation):** `/riff` (`extract.mjs`) captures public web pages, not native mobile apps. Because the user targets the **MacroFactor App UI** (not `macrofactor.com`), Phase 1 adapts `/riff` using public MacroFactor App UI references (`help.macrofactorapp.com`, App Store screenshots, or user-supplied screenshots), skipping the web-DOM motion/feel check and instead generating **2–3 interactive mobile PWA prototype variants** in the browser to lock the design system (`DESIGN.md` + tokens) before building feature logic.
3. **Turbopack-Safe PWA:** Uses `app/manifest.ts` and a hand-written `public/sw.js` (instead of Webpack-coupled `@serwist/next`) so Next.js Turbopack dev/build works without bundler conflicts.

---

## 4. Approaches Considered

- **Full Server Database (Dropped):** Violates the $0 hosting and local-first privacy mandate.
- **100% Static Client-Only Export (Dropped):** Cannot set custom `User-Agent` for Open Food Facts from browser `fetch()`, cannot keep server-provided `USDA_API_KEY` and `AI_API_KEY` out of client bundles, and loses server-side AI routing.
- **Approach B — Serwist + Server-Aggregated Food Gateway + `@zxing/browser` (Rejected):** Couples Next.js builds to Webpack via Serwist and moves food normalization server-side, adding unnecessary round-trips for offline-capable lookups.
- **Approach A — Client-Reactive Shell + Lightweight `sw.js` + Client Normalizers (Selected):** `Dexie.js` + `useLiveQuery` drives reactive UI directly from IndexedDB; Zustand manages transient HITL/logger staging state; client adapters normalize staples, USDA, Open Food Facts, and AI OCR into one unified `FoodItem` schema cached in `foodsCache`; native `BarcodeDetector` fast-path with `html5-qrcode` fallback handles camera scanning.

---

## 5. System Architecture & Module Design

### 5.1 Phased Delivery Overview

1. **Phase 1 — Visual Design System & Mobile PWA Shell:**
   - Capture MacroFactor App visual DNA (charcoal `#121316`-range dark canvas, elevated `#1B1D22` bento cards, 1px subtle borders, `tabular-nums`, high-contrast typography, adherence-neutral nutrient accents for Calories/Protein/Carbs/Fat, light/system theme tokens).
   - Build 2–3 interactive mobile PWA UI prototype variants (covering Dashboard bento summary, Macro/Calorie breakdown, Food Log timeline, and `+` Quick-Action Dock) for user selection.
   - Lock chosen design system in `DESIGN.md` and scaffold Next.js + Tailwind + Shadcn UI layout shell, bottom navigation, theme provider, and `+` quick-action dock (`AI Meal Scan`, `Barcode Scan`, `Quick Search`, `Quick Add Macros`).

2. **Phase 2 — `MacroAIDB`, Backup Utility, Goals & Quick Add:**
   - **IndexedDB Schema (`MacroAIDB` via Dexie v1):**
     - `foodLogs`: `id (UUID), date, mealSlot, foodId, createdAt` — stores immutable `nutritionSnapshot` (`calories, protein, carbs, fat, fiber, micronutrients`) scaled to logged `amount` (`grams` / `ml` / `servings`), `source`, and optional `note`. Historical logs never mutate if a cached food is edited later.
     - `foodsCache`: `id, *barcode, source, name, brand, basis ('per100g' | 'per100ml' | 'perServing'), servingSize, servingUnit, nutrientsPerBasis, micronutrientsPerBasis, updatedAt` — unified store for cached Open Food Facts products, USDA details, and user-created barcode items. Uses `per100g` whenever gram weight exists, cleanly falling back to `per100ml` or `perServing` for beverages, bars, or single-count items lacking gram weights *(builder-check call)*.
     - `customRecipes`: `id (UUID), name, ingredients[], basis ('per100g' | 'perServing'), totalGrams, nutrientsPerBasis, micronutrientsPerBasis, defaultServings, createdAt`.
     - `userGoals`: `id ('active'), dailyCalories, proteinG, carbsG, fatG, fiberG, micronutrientTargets, mealSlots[], profile, updatedAt` — configured via manual entry or built-in Mifflin-St Jeor TDEE + macro split calculator, with adult RDA micronutrient presets.
   - **Zustand Staging Store (`useLoggerStore`):** Holds transient AI meal scan drafts, active target `date` and `mealSlot`, and open drawer/modal state.
   - **JSON Backup (`macroai-backup.json`):** Versioned export (`{ version: 1, exportedAt, tables: { foodLogs, foodsCache, customRecipes, userGoals } }`) with transactional import supporting **Replace All** or **Merge**. Because `foodLogs` and `customRecipes` use `crypto.randomUUID()` keys, Merge safely upserts by `id` without cross-device ID collisions or broken `foodId` recipe links, and resolves the `userGoals` singleton via `updatedAt`-wins *(builder-check call)*.
   - **Quick Add Calories & Macros:** Fast drawer accessible from both the `+` dock and individual meal slots. Supports raw `Calories`, `Protein (g)`, `Carbs (g)`, `Fat (g)`, and optional label/note. Entering macros auto-computes `4P + 4C + 9F` unless the user explicitly overrides the Calories field.

3. **Phase 3 — Offline Staples, USDA Proxy, Barcode Scanner & Missing-Barcode OCR:**
   - **Offline Staples (`public/data/staples-2500.json`):** ~2,500 clean USDA Foundation/SR Legacy whole-food staples pre-processed into normalized `per100g` + micronutrient records for zero-latency offline search.
   - **USDA FoodData Central Proxy (`/api/usda/[...path]`):** Proxies `/foods/search` (filtering `Foundation,SR Legacy`) and `/food/{fdcId}` using server `USDA_API_KEY`. Client caches fetched `fdcId` records into `foodsCache`.
   - **Barcode Scanner:** Rear-camera (`facingMode: "environment"`) scanner using native `BarcodeDetector` when available with `html5-qrcode` fallback, plus manual barcode text input.
   - **Lookup Waterfall:**
     1. `MacroAIDB.foodsCache` lookup by `barcode` (instant, works offline).
     2. `/api/off/[barcode]` → Open Food Facts `/api/v2/product/${barcode}.json` with `User-Agent: MacroAI/1.0`. Checks `data.status === 0` explicitly and reads `energy-kcal_100g` (never `energy` in kJ; falls back to `per100ml` or `energy-kcal_serving` with `basis: 'perServing'` when `100g` is absent). Valid results cache into `foodsCache`.
     3. **Missing Barcode Flow ("Add Barcode Product"):** Pre-linked modal carrying the scanned `barcode`. User either fills fields manually (`name`, `brand`, `servingSize`, `servingUnit` g/ml/serving, calories, protein, carbs, fat, optional micros) OR captures a nutrition label photo for **AI OCR** via `/api/ai/label-ocr` (using the server-configured Vision LLM) to auto-populate the form (normalizing to `per100g` when serving grams exist, else `per100ml` or `perServing`). Saving writes to `foodsCache` (`source: 'custom_barcode'`) and immediately logs the serving.

4. **Phase 4 — Server-Configured AI Meal Scanner + Interactive HITL Review Sheet:**
   - **Server AI Provider Integration:** Reads `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, and optional `AI_CUSTOM_HEADERS` from server `.env.local` (OpenAI-compatible `/chat/completions`). Settings screen displays non-secret provider/model status with a **"Test AI Connection"** button calling `/api/ai/health`.
   - **Stage 1 — Pre-Scan Context:** Camera capture or file upload compressed client-side via `<canvas>` (max `1024px` width, JPEG `0.8`), paired with an optional prompt input (*"Tell what's in the meal"* for cooking oils, sauces, weights, or regional dish names).
   - **Stage 2 — Post-Scan HITL Review Sheet:**
     - `/api/ai/meal-scan` prompts the Vision LLM for strict JSON decomposing the plate into non-overlapping ingredients with `grams` and `per100g` (`calories`, `protein`, `carbs`, `fat`, `fiber`), validated via Zod with clean fence-stripping and retry/error recovery.
     - **Client-Side Instant Controls:** Per-ingredient gram slider, direct numeric gram input, multiplier chips (`0.5x`, `1x`, `1.5x`, `2x`), delete item, add item, and **Verification Swap** (tap an AI ingredient to search staples/USDA/`foodsCache` and replace its nutrition profile while preserving adjusted grams).
     - **Conversational "Refine with AI" Bar:** `/api/ai/refine` sends current draft JSON + user correction text to return a patched ingredient array without losing context.
     - **Explicit Commit:** User taps **"Log Meal"** to write finalized items to `MacroAIDB.foodLogs`.

5. **Phase 5 — Micronutrients, Smart Meal Distribution, Recipes & PWA Readiness:**
   - **Micronutrient Breakdown:** Expandable daily summary & per-food inspector tracking Fiber, Sodium, Potassium, Calcium, Iron, Magnesium, Zinc, and Vitamins A, C, D, B6, B12, Folate against `userGoals.micronutrientTargets`.
   - **Fitia-Style Smart Meal Distribution:** Customizable meal slots (`Breakfast`, `Lunch`, `Dinner`, `Snacks`, editable weights). Unlogged slots dynamically show recommended macro budgets = `max(0, dailyTarget - loggedSoFar)` allocated proportionally across unlogged slots' weights.
   - **Custom Recipes & Copy Yesterday:** Multi-ingredient recipe builder persisted in `customRecipes`, plus 1-tap "Copy Yesterday's [Meal Slot]".
   - **PWA & Verification:** `app/manifest.ts`, `public/sw.js` precaching core shell + `staples-2500.json`, offline status indicator, and mobile camera/HTTPS verification checklist.

---

## 6. Left to the Builder

- Exact component directory layout and file naming under `src/`.
- Visual composition of the 2–3 Phase 1 UI prototypes prior to user selection.
- Exact Vision LLM system/user prompts, JSON repair heuristics, and Zod schemas.
- Build/seed script details for extracting the ~2,500 USDA whole-food staples JSON.
- Automated unit/component test structure and verification commands during implementation.
