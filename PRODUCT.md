# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Personal solo user tracking daily calories, macronutrients, and micronutrients across mobile phone (primary high-frequency usage 4–8 times/day) as well as tablet and laptop web browsers.

## Product Purpose

MacroAI is a 100% free, offline-first, zero-subscription calorie and macro tracking Progressive Web App combining structured daily analytics, whole-food & micronutrient depth, fast barcode/staple lookup, dynamic meal macro distribution, and custom OpenAI-compatible AI meal scanning with Human-in-the-Loop controls.

## Positioning

Local-first nutrition tracker stored completely in IndexedDB (`MacroAIDB`) with zero cloud lock-in, non-punitive adherence-neutral analytics (surplus intake is never penalized with red alarms), and full client-side HITL editing over AI food estimates.

## Operating Context

Used on phones throughout the day for rapid meal logging (AI meal scan, barcode scan, staple/USDA search, quick add macros, copy yesterday, custom recipes) and on tablets/laptops for reviewing multi-day nutrition trends, managing targets/backup exports, and detailed food logs.

## Capabilities and Constraints

- Local persistence via Dexie.js (`MacroAIDB`: `foodLogs`, `foodsCache`, `customRecipes`, `userGoals`, `aiSettings`), Zustand UI logger state, and full JSON export/import (`macroai-backup.json`).
- Stateless Next.js App Router proxies for USDA FoodData Central, Open Food Facts, and custom OpenAI-compatible meal scan / label OCR endpoints.
- Dynamic responsive web app: optimized first for mobile phones with thumb-zone search and quick-add controls, adapting seamlessly into multi-column bento workspaces on tablets and laptops.
- Supports both dark-first obsidian UI (primary) and light/system themes.

## Brand Commitments

- **Name:** MacroAI
- **Reference Visual Standard:** Adheres faithfully to the uploaded MacroFactor mobile & desktop dashboard screenshots (Pics 1–4): matte obsidian surfaces (`#141414` / `#1C1C1E`), clean geometric sans typography (`Geist Sans`) with `tabular-nums`, Cornflower Blue calories, Coral protein, Warm Gold fat, Emerald carbs, semicircular open Calorie arc gauge with `[Consumed] [Remaining]` pill toggle, 7-day stacked macro columns, 30-day dot-matrix habit tracker, persistent bottom `Search for a food` bar with barcode/scan icons, and centered white `+` quick-action button.
- **Constraint:** Strict adherence neutrality — never display punitive red error styling or warning banners when exceeding calorie or macro targets.

## Product Principles

1. **Speed to log:** Search, barcode scan, AI photo scan, and quick-add stay one tap away at all times.
2. **Adherence neutrality:** Every above-target state remains calm, analytical, and encouraging.
3. **Device elasticity:** Effortless one-handed phone ergonomics that expand naturally into high-clarity multi-column bento dashboards on tablet and desktop viewports.
4. **Offline & local sovereignty:** Core tracking, staples database, recipes, and cached barcodes operate instantaneously without subscriptions or backend accounts.
