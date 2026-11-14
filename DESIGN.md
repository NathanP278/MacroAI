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
  obsidian-elevated: "#28282d"
  obsidian-hairline: "rgba(255, 255, 255, 0.06)"
  ink-primary: "#f5f5f7"
  ink-muted: "#8e8e93"
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
- **Elevated Sheet** (`#28282d` dark / `#ffffff` light): Modal overlay docks and drawers (`--surface-elevated`).
- **Slate Muted Ink** (`#8e8e93` dark / `#5c5c64` light): Secondary sublabels, timestamps, and inactive controls (`--muted-foreground`).
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

MacroAI expands fluidly across screen sizes instead of trapping desktop screens inside a narrow fake phone frame:
- **Outer Workspace Container:** `w-full max-w-6xl mx-auto min-h-screen pb-36` with `px-4 sm:px-6 pt-5 sm:pt-7 space-y-6`.
- **Mobile (`< 640px`):** Single-column flow for Hero (`Daily Nutrition`), compact 2-column sub-grids for `Nutrition` (`Calories` + `Macros`) and `Habits` (`Food Logging` + `Next Meal`), and stacked `Logged Entries` + `Micronutrient Targets`. Grid tracks inside narrow macro columns enforce `minmax(0, 1fr)` / `min-w-0` and `<progress>` `min-inline-size: 0` so 390px viewports never overflow horizontally.
- **Desktop (`>= 1024px`, `lg`):** 12-column responsive bento workspace (`lg:grid-cols-12 gap-4 items-start`): top row pairs `MacroBentoGrid` (`lg:col-span-5`) beside `HabitsAnalyticsGrid` (`lg:col-span-7`); bottom row pairs `Logged Entries` (`lg:col-span-7`) beside `MicronutrientPanel` (`lg:col-span-5`).
- **Fixed Bottom Chrome:** Centered within `max-w-2xl mx-auto`, leaving breathing room (`pb-36`) on main content and respecting `env(safe-area-inset-bottom)`.

## Elevation & Depth

Surfaces communicate hierarchy almost entirely through dark tonal stepping (`#141416` base -> `#1c1c1f` card -> `#2a2a30` inset track) with hairlines only where floating overlays meet scrolling content. Bento cards rely on solid tonal contrast with `bg-card` on `bg-background` rather than heavy box shadows.

### Shadow Vocabulary
- **Floating Search Pill (`BottomNav` quick strip):** `box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28)` paired with `backdrop-filter: blur(12px)` so the search pill lifts cleanly above scrolling meal cards.
- **Modal Overlay Dock (`QuickActionDock`):** Heavy elevation shadow (`0 25px 50px -12px rgba(0, 0, 0, 0.25)`) over a `bg-black/60 backdrop-blur-sm` scrim.

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
- **Style:** Floating quick-search launcher strip (`h-11`, `rounded-2xl`, `bg-surface-card/95 backdrop-blur-md`, hairline `border-border rgba(255,255,255,0.06)`), combining Search icon trigger on the left with Barcode (`ScanBarcode`) and AI Scan (`Sparkles` in `#6c8eff`) icon actions on the right.
- **Focus:** `outline-ring/50` (`#6c8eff`) focus treatment and high-contrast text hover transitions.

### Navigation
- **Style:** Full-width fixed bottom bar (`bg-surface-card/95 backdrop-blur-md`, `border-t border-border`) housing an inner `max-w-2xl mx-auto` row with two left destinations (`Dashboard`, `Food Log`), centered white `+` FAB, and two right destinations (`Recipes`, `Settings`), scoped with the floating quick-search strip only on logging views (`/` and `/log*`).
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
