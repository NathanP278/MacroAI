# MacroAI Design System (`DESIGN.md`)

**Version:** 1.0.0  
**Inspiration:** MacroFactor App Dark-First UI & Adherence-Neutral Analytics  
**Target:** Mobile PWA Shell (Responsive, Touch-Optimized, Obsidian Dark Palette)

---

## 1. Core Visual DNA & Philosophy

MacroAI is designed for daily, high-frequency nutrition tracking (4–8 sessions/day). Every pixel, color choice, and animation prioritizes:

1. **Adherence Neutrality:** Tracking is an analytical instrument, not a moral judge. Exceeding calorie or macronutrient goals **never** turns red, triggers alarm badges, or shames the user. Surplus intake is represented neutrally with extended visual tracks or neutral delta badges (`+18g over`), preserving psychological safety and honest logging.
2. **Data Density & Instant Scannability:** Clean geometric typography with `tabular-nums` ensuring numeric columns (calories, grams, timestamps) never jitter or misalign.
3. **Obsidian / Charcoal Surface Hierarchy:** Deep near-black background canvases paired with elevated slate tiles and 1px hairline borders (`rgba(255,255,255,0.08)`) that eliminate glare during late-night or early-morning logging.
4. **Ergonomic Bottom Action Dock:** Core logging actions (AI Meal Scan, Barcode Scan, Quick Search, Quick Add) are anchored in the primary mobile thumb zone via an elevated bottom dock with a prominent center `+` action button.

---

## 2. Color Palette & Design Tokens

### 2.1 Surfaces & Elevation (Dark Theme - Primary)

| Token Name | HEX / Value | Purpose |
| :--- | :--- | :--- |
| `--surface-canvas` | `#121316` | Root screen background canvas |
| `--surface-card` | `#1B1D22` | Elevated bento tiles, meal slot cards |
| `--surface-sub` | `#16181D` | Inset backgrounds, search fields, progress track wells |
| `--surface-elevated` | `#252830` | Bottom action dock, sheets, modals, popovers |
| `--border-subtle` | `rgba(255, 255, 255, 0.08)` | 1px hairline card borders & dividers |
| `--border-focus` | `rgba(255, 255, 255, 0.18)` | Active card hover/focus rings |

### 2.2 Text & Contrast Hierarchy

| Token Name | HEX / Value | Purpose |
| :--- | :--- | :--- |
| `--text-primary` | `#F4F5F7` (`rgba(255,255,255,0.96)`) | Hero numbers, meal titles, primary labels |
| `--text-secondary` | `#9CA3AF` (`rgba(255,255,255,0.64)`) | Nutrient sub-labels, unit labels, timestamps |
| `--text-muted` | `#6B7280` (`rgba(255,255,255,0.42)`) | Unlogged placeholders, inactive icons |

### 2.3 Adherence-Neutral Nutrient Accents

Each nutrient has a dedicated, vibrant accent color that remains identical regardless of target status:

| Nutrient | Token Name | Accent HEX | Track Well HEX | Role |
| :--- | :--- | :--- | :--- | :--- |
| **Calories** | `--color-calorie` | `#F59E0B` (Amber) | `rgba(245, 158, 11, 0.15)` | Energy balance & daily expenditure |
| **Protein** | `--color-protein` | `#38BDF8` (Sky Blue) | `rgba(56, 189, 248, 0.15)` | Lean mass preservation & satiety |
| **Carbs** | `--color-carbs` | `#34D399` (Mint Green) | `rgba(52, 211, 153, 0.15)` | Glycogen & daily training energy |
| **Fat** | `--color-fat` | `#FB7185` (Warm Rose) | `rgba(251, 113, 133, 0.15)` | Hormonal health & essential fats |
| **Fiber / Micros** | `--color-fiber` | `#C084FC` (Lavender) | `rgba(192, 132, 252, 0.15)` | Gut health & micronutrient index |

### 2.4 Over-Target State Representation

When intake exceeds a daily target:
- **Calorie Over-Target:** The gauge displays the consumed amount alongside the positive delta (e.g. `2,350 / 2,200 kcal (+150 kcal)`). The gauge fill remains warm amber with a subtle secondary hatch/stripe or neutral pill badge.
- **Macro Over-Target:** The progress bar caps at 100% or renders an extended neutral delta indicator (e.g. `+14g over target`). **Never render red alert borders or negative warning icons.**

### 2.5 Light Theme Tokens (System Fallback)

| Token Name | HEX / Value | Purpose |
| :--- | :--- | :--- |
| `--surface-canvas` | `#F8FAFC` | Light mode canvas |
| `--surface-card` | `#FFFFFF` | Clean card background |
| `--surface-sub` | `#F1F5F9` | Inset backgrounds |
| `--border-subtle` | `rgba(0, 0, 0, 0.08)` | Subtle slate border |
| `--text-primary` | `#0F172A` | Slate 900 text |
| `--text-secondary` | `#475569` | Slate 600 text |

---

## 3. Typography & Numerical Formatting

1. **Font Families:**
   - Primary: Inter / Geist Sans (`--font-sans`)
   - Numerics: JetBrains Mono / Geist Mono / `tabular-nums`
2. **Numeric Precision Rule:**
   - Calories: Rounded to integer (`2,140 kcal`).
   - Macros (Protein, Carbs, Fat, Fiber): Integers in summaries (`165g`), 1 decimal place in detailed food item view (`34.2g`).
   - Tabular alignment: Every number container strictly utilizes `tabular-nums` to guarantee vertical baseline alignment across meal logs.
3. **Type Scale:**
   - **Hero Metric:** `text-3xl font-extrabold tracking-tight tabular-nums` (Calorie Hat / Balance)
   - **Bento Tile Numbers:** `text-xl font-bold tabular-nums` (Macro Grams)
   - **Section Headers:** `text-xs font-semibold uppercase tracking-wider text-muted-foreground`
   - **Food Item Title:** `text-sm font-semibold text-foreground`
   - **Food Item Meta / Grams:** `text-xs text-muted-foreground tabular-nums`

---

## 4. Layout Ergonomics & Mobile Shell

1. **Max Mobile Viewport:** Centered max-width of `430px` on desktop with rounded corners and device bezel preview; full viewport on mobile PWA (`100dvh`).
2. **Bottom Quick-Action Dock:**
   - 4 primary navigation tabs: Dashboard, Food Log, Strategy/Goals, Settings.
   - Center elevated circular action button (`+`) with 56px touch target.
   - Tapping `+` opens the unified modal: AI Meal Scan, Barcode Scan, Search Database, Quick Add Macros.
3. **Haptic & Visual Feedback:**
   - Tap state: `active:scale-[0.98]` transition on cards and buttons.
   - 120ms ease-out transitions for tab and modal switches.

---

## 5. Three Prototype Variants Evaluated

### Variant A: "Bento Dashboard" (`variant-bento.tsx`)
- **Key Characteristics:** 
  - Top "Hat" summary with dual-ring calorie gauge and calorie budget countdown.
  - 3-column / 2x2 modular Bento grid displaying Protein, Carbs, and Fat with arc gauges and remaining gram countdowns.
  - Collapsible meal slots (Breakfast, Lunch, Dinner, Snacks) with food item pills and one-tap `+` log triggers.
- **Best For:** Users who love high visual hierarchy and instant glanceable status.

### Variant B: "Macro Bars" (`variant-bars.tsx`) — SELECTED PRODUCTION LAYOUT
- **Canonical Choice:** Selected as MacroAI's primary dashboard layout (`/`), locking in:
  - Compact top header (`TrendingUp` accent glyph + **MacroAI**, right-aligned `Target Mode: Active` mono status, plus date switcher pill).
  - **Daily Energy Target** hero bar card (`bg-card`, `rounded-2xl`) showing large consumed kcal `/ target`, right-aligned amber remaining or neutral surplus pill, and full-width `h-2.5` horizontal calorie progress bar.
  - **Macronutrient Breakdown** bento module listing Calories (amber), Protein (sky), Carbohydrates (emerald), Fat (rose), and Fiber (lavender) as stacked horizontal progress rows with bordered `%` pill badges, `consumed / target` right-aligned figures, `h-2` `<progress>` bars, and `% fulfilled` + `left` / `+over target` adherence-neutral footers.
  - Inset **Remaining Meal Allocation** card (`bg-surface-sub`) powered by `distributeRemainingMacros` showing the upcoming unlogged meal budget across 4 compact macro columns (`Calories`, `Protein`, `Carbs`, `Fat`).
  - **Logged Entries** stacked dark meal-slot cards (`bg-card`, `rounded-xl`) with slot name, item count/meta, amber `{kcal} kcal`, `P · C · F` summary, expandable logged food items, and 1-tap `+` quick log button.
  - **High-density horizontal bar progress** with native semantic `<progress>` tracks respecting `prefers-reduced-motion` and full light/dark theme tokens.

### Variant C: "Timeline Feed" (`variant-timeline.tsx`)
- **Key Characteristics:**
  - Chronological vertical timeline feed with timestamp badges (08:15 AM, 12:30 PM, etc.).
  - Interleaved dynamic budget suggestion pills ("Fitia-style" meal allocations for remaining slots).
  - Compact sticky top HUD with mini macro rings.
- **Best For:** Fast-paced intermittent fasters and time-stamped food loggers.
