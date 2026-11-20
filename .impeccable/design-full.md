---
name: MacroAI
description: Precision obsidian nutrition telemetry with adherence-neutral macro tracking and thumb-zone food logging.
colors:
  cornflower-calories: "#6c8eff"
  coral-protein: "#e56b4e"
  warm-gold-fat: "#e8c547"
  mint-emerald-carbs: "#4caf79"
  lavender-fiber: "#9f85ff"
  neutral-surplus: "#94a3b8"
  obsidian-canvas: "#141416"
  obsidian-card: "#1c1c1f"
  obsidian-well: "#2a2a30"
  obsidian-elevated: "#222226"
  obsidian-hairline: "rgba(255, 255, 255, 0.07)"
  ink-primary: "#f5f5f7"
  ink-muted: "#9a9aa2"
  light-canvas: "#f4f4f6"
  light-card: "#ffffff"
  light-well: "#ebebf0"
  light-ink: "#141416"
typography:
  display:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
    fontFeature: "tabular-nums"
  headline:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
  label:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.06em"
  caption:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.01em"
rounded:
  bar: "3px"
  sm: "0.45rem"
  md: "0.6rem"
  lg: "0.75rem"
  xl: "1rem"
  pill: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.625rem"
  md: "1rem"
  lg: "1.25rem"
  section: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.ink-primary}"
    textColor: "{colors.obsidian-canvas}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.75rem"
  button-primary-hover:
    backgroundColor: "{colors.ink-muted}"
  card-bento:
    backgroundColor: "{colors.obsidian-card}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.xl}"
    padding: "1rem"
  input-search-dock:
    backgroundColor: "{colors.obsidian-card}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.xl}"
    height: "2.75rem"
  nav-fab:
    backgroundColor: "{colors.ink-primary}"
    textColor: "{colors.obsidian-canvas}"
    rounded: "{rounded.pill}"
    size: "2.75rem"
---

# Design System: MacroAI

## Overview

**Creative North Star: "The Calibration Cockpit"**

MacroAI behaves like a calibrated nutrition instrument built for four to eight fast check-ins every day. Rather than greeting the user with loud hero banners, glowing neon gradients, or narrow artificial phone bezels, every view rests on matte obsidian slabs (`#141416` canvas, `#1c1c1f` cards) where typography and clean vector progress tracks carry all visual weight.

Color exists almost exclusively to separate macronutrients cleanly on a single glance: Cornflower Blue for energy, Coral for protein, Warm Gold for fat, and Mint Emerald for carbohydrates. Interface chrome—active toggle pills, quick-action buttons, icons, and navigation tabs—stays strictly monochrome (`#f5f5f7` active on matte charcoal) so data fills stay unmistakable.

**Key Characteristics:**
- Matte obsidian tonal surfaces separated by value step (`#141416` -> `#1c1c1f` -> `#2a2a30`) rather than heavy borders or drop shadows.
- Adherence neutrality across every target state: over-target calories and macros display calm `+delta` labels in cool slate (`#94a3b8`) and never red warning chrome.
- Mobile-first thumb-zone ergonomics (`Search for a food` strip + centered white `+` dock) expanding smoothly into a multi-column `max-w-6xl` bento grid on tablets and laptops.

## Colors

MacroAI pairs a monochrome matte charcoal chrome hierarchy with four distinct, medium-saturation nutrient data hues plus a light-theme fallback.

### Primary
- **Cornflower Calories** (`#6c8eff` dark / `#4f6fe6` light): Daily energy gauge stroke, Calories Today fill bar, 30-day food logging active squares, and AI Meal Scan accent icon.
- **High-Contrast Ivory** (`#f5f5f7` dark / `#141416` light): Active segmented pill fills (`Today`, `Consumed`, filter chips), centered circular `+` FAB, and active navigation tab labels.

### Secondary
- **Coral Protein** (`#e56b4e` dark / `#d45338` light): Protein slim progress bar fill, 7-day stacked column top segment, and Next Meal Allocation protein readout.
- **Warm Gold Fat** (`#e8c547` dark / `#c59610` light): Fat slim progress bar fill, 7-day stacked column middle segment, and Quick Add icon tint.
- **Mint Emerald Carbs** (`#4caf79` dark / `#2e965e` light): Carbohydrate slim progress bar fill, 7-day stacked column base segment, and Quick Search icon tint.

### Tertiary
- **Lavender Fiber** (`#9f85ff` dark / `#7c5ce6` light): Dietary fiber track fill and micronutrient index accents.

### Neutral
- **Obsidian Canvas** (`#141416` dark / `#f4f4f6` light): Root viewport and scroll track canvas (`--background`, `--surface-canvas`).
- **Matte Tile Card** (`#1c1c1f` dark / `#ffffff` light): Primary bento cards, meal log cards, and micronutrient container (`--card`, `--surface-card`).
- **Recessed Well** (`#2a2a30` dark / `#ebebf0` light): Progress bar tracks, unlogged 30-day matrix squares, toggle group wells, and hover targets (`--surface-sub`).
- **Elevated Sheet** (`#222226` dark / `#ffffff` light): Modal overlay docks, undo toast, command palette, and drawers (`--surface-elevated`).
- **Slate Muted Ink** (`#9a9aa2` dark / `#52525b` light): Secondary sublabels, timestamps, and inactive controls (`--muted-foreground`, >= 4.5:1 AA contrast across card and recessed well surfaces).
- **Neutral Surplus Slate** (`#94a3b8` dark / `#64748b` light): Mapped to `--destructive` and `--neutral-over` so no surface renders red target alarms.

### Named Rules
**The Adherence Neutrality Rule.** Nutrient fills keep their assigned hue (`--macro-calories`, `--macro-protein`, `--macro-carbs`, `--macro-fat`) and surplus states use neutral copy (`+N`, `Surplus`) in `--foreground` or `--neutral-over` (`#94a3b8`), never red alerts or punitive badges.

**The Monochrome Chrome Rule.** Interactive buttons, tabs, segmented controls, and navigation indicators use foreground/background inversion (`#f5f5f7` / `#141416` in dark mode) instead of colored UI chrome, reserving chroma for nutrition telemetry.

## Typography

**Display Font:** Geist Sans (`var(--font-geist-sans)` with `ui-sans-serif, system-ui, -apple-system, sans-serif`)
**Body Font:** Geist Sans (`var(--font-geist-sans)`)
**Label/Mono Font:** Geist Mono (`var(--font-geist-mono)`) with strict `tabular-nums` on every numeric metric.

**Character:** Engineered geometric clarity with OpenType alternates (`cv02`, `cv03`, `cv04`, `cv11`) and proportional balance (`text-wrap: balance` on `h1`–`h3`). Numbers never jitter horizontally when toggling between `Consumed` and `Remaining`.

### Hierarchy
- **Display** (`700`, `1.875rem` / `text-3xl`, `line-height: 1.1`, `tracking-tight tabular-nums`): Center Calorie arc counter inside `Daily Nutrition`.
- **Headline** (`700`, `1.5rem`–`1.875rem` / `text-2xl sm:text-3xl`, `line-height: 1.2`): Route title (`Dashboard`) paired with an uppercase muted date line above it.
- **Title** (`700`, `1rem` / `text-base`, `line-height: 1.3`): Bento card headers (`Daily Nutrition`, `Nutrition`, `Habits`, `Logged Entries`, `Micronutrient Targets`).
- **Body** (`400`–`600`, `0.875rem` / `text-sm`, `line-height: 1.4`): Tile titles (`Calories`, `Macros`, `Food Logging`, meal names) and log rows.
- **Label** (`500`–`600`, `0.625rem`–`0.75rem`, `tabular-nums`): Date kicker (`tracking-wider uppercase`), macro fraction strings (`0 / 150g`), and 10px bottom navigation tab captions.

### Named Rules
**The Tabular Lock Rule.** Apply `tabular-nums` to all numeric containers (calories, macro fractions, budgets, micronutrient readouts) so toggling display modes or scrolling meal lists keeps decimal and unit baselines locked.

## Layout

MacroAI expands fluidly across screen sizes on **every route** (`/`, `/log`, `/recipes`, `/settings`) instead of trapping desktop screens inside a single-column stack or fake phone frame:
- **Outer Workspace Container:** Unified `w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-8 space-y-6` across every route (`AppShell` adjusts bottom dock clearance per route).
- **Mobile (`< 640px`):** Single-column flow for Hero (`Daily Nutrition`), compact 2-column sub-grids for `Nutrition` (`Calories` + `Macros`), `Habits` (`Food Logging` + `Daily Balance`), and Settings `Target Daily Nutrition` (`grid-cols-2 sm:grid-cols-4`). Grid tracks inside narrow macro columns enforce `minmax(0, 1fr)` / `min-w-0` and `<progress>` `min-inline-size: 0` so 360px viewports never overflow horizontally.
- **Size-Aware Hero (`MacroBentoGrid`):** Marked with `@container hero` (`container: hero / inline-size`) so horseshoe arc size, center calorie figure, flanking numbers, macro readouts, and the 7-day stacked column matrix scale with card inline width rather than viewport breakpoints alone.
- **Tablet (`>= 768px`, `md`) & Desktop (`>= 1024px`, `lg`):** 12-column responsive bento workspace (`gap-4 items-start`):
  - **Dashboard (`/`):** Tablets (`md`) pair top row `6/6` and bottom row `7/5`; desktops (`lg`) pair `MacroBentoGrid` (`lg:col-span-5`) beside `HabitsAnalyticsGrid` (`lg:col-span-7`) above `Logged Entries` (`lg:col-span-7`) and `MicronutrientPanel` (`lg:col-span-5`).
  - **Food Log (`/log`):** Sticky `Daily Consumed` summary rail (`lg:col-span-4 lg:sticky lg:top-6`) beside a unified chronological `Logged Entries` stream (`lg:col-span-8`).
  - **Recipes (`/recipes`):** Full-width rounded search bar above a 1/2/3-column responsive recipe grid (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`).
  - **Settings (`/settings`):** Primary `GoalsCalculatorForm` (`lg:col-span-7`) beside a responsive right rail (`lg:col-span-5`, `grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4`) housing `Theme & Appearance`, `AiHealthStatusCard`, `BackupPanel`, `CentralDbStatusCard`, and adherence-neutral privacy notes.
- **Drawers & Modals (`QuickActionDock`, `QuickAddDrawer`, `FoodSearchDrawer`, `BarcodeScannerDrawer`, `AiMealScannerSheet`, `RecipeBuilderModal`):** Adaptive mobile bottom-sheet (`rounded-t-3xl` with drag-handle grabber pills) transitioning to centered desktop modals (`sm:max-w-lg`, `sm:rounded-3xl`, `dvh` height caps, `overscroll-contain`) on `bg-surface-elevated`.
- **Fixed Bottom Chrome:** Centered within `max-w-2xl mx-auto` with `env(safe-area-inset-*)` horizontal/bottom padding and matching `html` `scroll-padding-bottom` / `scroll-padding-top`.

## Motion, Physics & Tactile Ergonomics

Calm calibrated instrument motion paired with strict reduced-motion accessibility:
- **Easing & Tactile Press (`src/app/globals.css`):** `--ease-out-quart` (`cubic-bezier(0.22, 1, 0.36, 1)`) and `--ease-out-quint` (`cubic-bezier(0.16, 1, 0.3, 1)`), with `.tactile-press` (`scale(0.97)` on active controls) and flat tonal `.macro-card-interactive` cards (border shift only, zero hover self-translation).
- **Stacked Hero & Sliding Segmented Controls:** `MacroBentoGrid` switches `Today` and `7-Day` inside a stacked `[grid-area:1/1]` stage (`.hero-panel-slide`: `220ms` opacity + translateX in full motion; `120ms` pure opacity cross-dissolve under reduced motion). `SegmentedControl` tracks active buttons via `ResizeObserver` (`.segmented-thumb`, `220ms`) and substitutes stationary per-button `.segmented-pill-reduce` opacity cross-dissolves under `prefers-reduced-motion: reduce`.
- **Compositor Data & Disclosures:** Horizontal/vertical macro bars animate via `scaleX`/`scaleY` (`.macro-bar-fill`, `.macro-bar-fill-y`), calorie arc via `stroke-dashoffset` (`.macro-arc-transition`), expandable micronutrient/entry details via CSS Grid `.accordion-grid`, day navigation via directional `date-stage` View Transitions pinned over static `bottom-chrome`, and `UndoToast` via a depleting `.undo-toast-bar` that pauses on hover/focus.
- **Coarse-Pointer Touch Targets (`.touch-target`):** Under `@media (pointer: coarse)`, expands interactive hit areas to at least `44x44px` (`width: max(100%, 44px); height: max(100%, 44px)`) without bloating compact visual chrome.

## Elevation & Depth

Surfaces communicate hierarchy almost entirely through dark tonal stepping (`#141416` base -> `#1c1c1f` card -> `#2a2a30` inset track) with subtle `1px` hairlines (`--border-hairline`, `rgba(255, 255, 255, 0.07)`) only where cards or floating overlays meet canvas/scrolling content. Bento cards rely on flat tonal contrast (`bg-card` on `bg-background`) with zero drop shadows at rest.

### Shadow Vocabulary
- **Floating Search & Navigation Bars (`.surface-floating-bar`):** `--shadow-ambient` (`0 16px 40px -8px rgba(0, 0, 0, 0.55), 0 2px 10px -2px rgba(0, 0, 0, 0.35)`) paired with translucent `backdrop-filter: blur(16px)` and `1px` hairline (`--border-hairline`).
- **Elevated Sheets, Docks & Modals (`.surface-elevated-sheet`):** `--shadow-floating` (`0 24px 56px -12px rgba(0, 0, 0, 0.7), 0 4px 16px -4px rgba(0, 0, 0, 0.45)`) over a blurred dimmed backdrop (`bg-black/60 backdrop-blur-sm`).

### Named Rules
**The Tonal Slab Rule.** Dashboard cards rest flat on `#141416` using `#1c1c1f` fill alone; reserve blurs and drop shadows exclusively for pinned bottom strips and modal sheets.

## Shapes

- **Primary Bento Cards & Panels:** `1rem` (`rounded-2xl` / `--radius-2xl` scale at `16px`) for clean, soft-technical blocks across hero summaries, bento tiles, meal rows, and search strip.
- **Modal Sheets:** `1.5rem` top corners (`rounded-t-3xl`) for mobile thumb-sheet ergonomics.
- **Toggles, Badges & Action Buttons:** Full capsules (`9999px` / `rounded-full`) for segmented controls (`[Today]`/`[7-Day]`, `[Consumed]`/`[Remaining]`, `[All]`/`[Minerals]`/`[Vitamins]`), header date navigation circles (`36px`), meal add circles (`32px`), and the centered bottom `+` FAB (`44px`).
- **Data Marks:** `3px` micro-corners (`rounded-[3px]`) on 30-day logging matrix dots and 7-day stacked column segments; `9999px` rounded caps (`strokeLinecap="round"`) on the 240° calorie horseshoe arc and `progress.macro-progress` tracks.

## Components

### Buttons
- **Shape:** Full capsule (`9999px`) across navigation actions, filter pills, and date steppers.
- **Primary (`+` FAB & Save CTA):** High-contrast foreground fill (`#f5f5f7` in dark mode, `#141416` in light mode) with inverted background text/icon (`#141416` / `#ffffff`); FAB is `44px x 44px` (`w-11 h-11`), subtle `active:scale-95` press feedback.
- **Hover / Focus:** `hover:opacity-90` or `bg-surface-sub` -> `bg-surface-elevated`; visible keyboard ring `ring-2 ring-ring (#6c8eff)` offset by canvas color.
- **Secondary Icon Circle:** `32px`–`36px` circular button on `bg-surface-sub` (`#2a2a30`) or `bg-card` (`#1c1c1f`) stepping up one tonal stop on hover.

### Chips / Segmented Pills
- **Style:** Recessed well (`#2a2a30`, `rounded-full`, `p-0.5` or `p-1`) holding capsule segments.
- **State:** Selected pill switches to `bg-foreground text-background font-semibold` (`#f5f5f7` pill with `#141416` dark text); unselected pill remains transparent with `text-muted-foreground`.

### Cards / Containers
- **Corner Style:** `16px` (`rounded-2xl`).
- **Background:** `#1c1c1f` (`--surface-card`), interactive link cards shift toward `#2a2a30/60` on hover.
- **Shadow Strategy:** Flat tonal contrast at rest (no shadow).
- **Internal Padding:** `14px` (`p-3.5`) for compact bento tiles, `16px`–`20px` (`p-4 sm:p-5`) for hero and micronutrient containers.

### Inputs / Fields
- **Style:** Floating quick-search launcher strip (`h-11`, `rounded-2xl`, `.surface-floating-bar` translucent card backdrop with `--border-hairline` `rgba(255, 255, 255, 0.07)`), combining Search icon trigger on the left with Barcode (`ScanBarcode`) and AI Scan (`Sparkles` in `#6c8eff`) icon actions on the right.
- **Focus:** `2px solid var(--ring)` (`#6c8eff`, `2px` offset via `:focus-visible`) focus treatment and high-contrast text hover transitions.

### Navigation
- **Style:** Full-width fixed bottom bar (`.surface-floating-bar`, `border-t`) housing an inner `max-w-2xl mx-auto` row with two left destinations (`Dashboard`, `Food Log`), centered white `+` FAB, and two right destinations (`Recipes`, `Settings`), scoped with the floating quick-search strip only on logging views (`/` and `/log*`).
- **Active State:** Monochrome shift to `--foreground` (`#f5f5f7`) with heavier Lucide `stroke-[2.25]` vs inactive `stroke-[1.75]`.

### Daily Nutrition Horseshoe Gauge (Signature Component)
- A 240° open semicircular SVG arc (`viewBox="0 0 168 168"`, `strokeWidth: 9`, rounded linecaps) in Cornflower Blue (`#6c8eff`) over a `#2a2a30` matte track, centered between tabular `Remaining`/`Surplus` and `Target` readouts, paired with a 3-column `Protein` / `Fat` / `Carbs` `<progress class="macro-progress">` grid, subtle centered `Fiber` count, and bottom `[Consumed]`/`[Remaining]` segmented toggle + `Today`/`7-Day` switcher.

## Do's and Don'ts

### Do:
- **Do** enforce **The Adherence Neutrality Rule**: render over-target values with neutral `+N` / `Surplus` labels and slate accents (`#94a3b8`), keeping nutrient colors steady.
- **Do** enforce **The Tabular Lock Rule**: include `tabular-nums` on every numeric KPI, macro fraction, calorie total, and budget readout.
- **Do** set `min-w-0` on horizontal grid/flex children and `min-inline-size: 0` on native `<progress>` controls so multi-column macro strips never overflow 390px viewports.
- **Do** pair monochrome active UI (`#f5f5f7` pills & FAB) exclusively with matte `#141416` / `#1c1c1f` / `#2a2a30` surfaces on primary tracking screens.

### Don't:
- **Don't** turn calories, progress tracks, badges, or borders red (`#ef4444` / destructive alarms) when a user logs above daily targets.
- **Don't** constrain desktop viewports inside a narrow vertical phone box (`430px` centered frame); allow the `max-w-6xl` 12-column bento grid to expand naturally.
- **Don't** invent custom gradients, colored glow halos, or eyebrow kickers on cards where flat tonal contrast and clean type suffice.
- **Don't** render the floating `Search for a food` bottom strip over non-logging settings screens (`/settings`, `/recipes`).
