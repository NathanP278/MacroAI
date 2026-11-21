---
name: MacroAI
description: Volumetric neutral Liquid Glass nutrition cockpit with adherence-neutral macro telemetry and thumb-zone food logging.
colors:
  cornflower-calories: "#6c8eff"
  coral-protein: "#e56b4e"
  warm-gold-fat: "#e8c547"
  mint-emerald-carbs: "#4caf79"
  lavender-fiber: "#9f85ff"
  neutral-surplus: "#94a3b8"
  slate-canvas: "#1e2229"
  glass-card-dark: "rgba(32, 37, 46, 0.56)"
  glass-well-dark: "rgba(18, 21, 28, 0.52)"
  glass-elevated-dark: "rgba(26, 30, 39, 0.74)"
  glass-edge-light-dark: "rgba(255, 255, 255, 0.22)"
  glass-hairline-dark: "rgba(255, 255, 255, 0.14)"
  ink-primary: "#f4f6fa"
  ink-primary-inverse: "#14171d"
  ink-muted: "#a5aebf"
  alabaster-canvas: "#f2f4f8"
  glass-card-light: "rgba(255, 255, 255, 0.52)"
  glass-well-light: "rgba(228, 233, 241, 0.54)"
  glass-elevated-light: "rgba(255, 255, 255, 0.74)"
  light-ink: "#14171d"
  light-muted: "#525a69"
typography:
  display:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
    fontFeature: "tabular-nums"
  display-md:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.1
    fontFeature: "tabular-nums"
  display-sm:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.1
    fontFeature: "tabular-nums"
  display-long-lg:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 700
    lineHeight: 1.1
    fontFeature: "tabular-nums"
  headline:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  display-long-sm:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.15
    fontFeature: "tabular-nums"
  flank-lg:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.25
    fontFeature: "tabular-nums"
  flank-md:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.25
    fontFeature: "tabular-nums"
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
  button-sm:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 500
    lineHeight: 1.3
  meta:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.3
    fontFeature: "tabular-nums"
  label:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.02em"
  caption:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.01em"
rounded:
  bar: "3px"
  inner: "0.75rem"
  base: "0.875rem"
  tile: "1rem"
  card: "1.25rem"
  sheet: "1.5rem"
  outer: "1.75rem"
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
    textColor: "{colors.ink-primary-inverse}"
    rounded: "{rounded.pill}"
    padding: "0 1rem"
    height: "2.25rem"
  button-glass:
    backgroundColor: "{colors.glass-well-dark}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.pill}"
    padding: "0 1rem"
    height: "2.25rem"
  card-bento:
    backgroundColor: "{colors.glass-card-dark}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.tile}"
    padding: "1rem"
  input-search-dock:
    backgroundColor: "{colors.glass-well-dark}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
    height: "3rem"
  nav-fab:
    backgroundColor: "{colors.ink-primary}"
    textColor: "{colors.ink-primary-inverse}"
    rounded: "{rounded.pill}"
    size: "2.75rem"
---

# Design System: MacroAI

## Overview

**Creative North Star: "The Volumetric Calibration Cockpit"**

MacroAI behaves like a precision optical nutrition instrument built for four to eight fast check-ins every day. Every panel, floating navigation capsule, sunken input cavity, and pill control is sculpted from thick, neutral refractive glass suspended over balanced silver-slate luminous fields in dark mode and soft pearl-mist ambient pools in light mode. The material carries directional specular rims (bright top-left glare, recessed bottom-right edge) and layered inner thickness shadows without collapsing into flat bordered boxes or chromatic glass noise.

Color exists almost exclusively to separate macronutrients cleanly on a single glance: Cornflower Blue for energy, Coral for protein, Warm Gold for fat, Mint Emerald for carbohydrates, and Lavender for fiber. All interface chrome—buttons, segmented pills, sliders, navigation capsules, and sidebar rails—remains strictly neutral monochrome glass so telemetry stays unmistakable and over-target states stay calm and adherence-neutral.

**Key Characteristics:**
- Volumetric neutral Liquid Glass across dark slate-charcoal (`#1e2229`) and icy alabaster (`#f2f4f8`) themes, backed by GPU-composited dual-layer neutral sub-glass ambient fields and a `440ms` translucent sheen refraction transition on theme switch.
- Strict adherence neutrality across every target state: over-target calories and macros render calm `+delta` / `Surplus` labels in cool slate (`#94a3b8` dark / `#64748b` light) and never red alarms.
- Mobile-first thumb-zone ergonomics (sunken-glass `Search for a food` capsule + floating bottom navigation capsule with centered volumetric `+` pill) expanding smoothly into a `228px` floating glass sidebar rail beside a `max-w-6xl` responsive bento grid on desktop.

## Colors

MacroAI pairs an all-neutral monochrome glass hierarchy (dark-first with full light-mode parity) with five fixed, medium-saturation nutrient telemetry hues.

### Primary
- **Cornflower Calories** (`#6c8eff` dark / `#4f6fe6` light): Daily 240° calorie horseshoe arc stroke, Calories Today target-notch bar, 30-day logging matrix active squares, and logged entry calorie readouts.
- **Platinum Ink** (`#f4f6fa` dark / `#14171d` light): Primary foreground text, active navigation labels, and high-contrast volumetric primary pill fills (`.liquid-pill-primary` using `--glass-primary-gradient` with `#14171d` dark / `#f8fafc` light inverse text).

### Secondary
- **Coral Protein** (`#e56b4e` dark / `#d45338` light): Protein progress bar fill, 7-day stacked column segment, and logged entry `P` readout.
- **Warm Gold Fat** (`#e8c547` dark / `#c59610` light): Fat progress bar fill, 7-day stacked column segment, and logged entry `F` readout.
- **Mint Emerald Carbs** (`#4caf79` dark / `#2e965e` light): Carbohydrate progress bar fill, 7-day stacked column segment, and logged entry `C` readout.

### Tertiary
- **Lavender Fiber** (`#9f85ff` dark / `#7c5ce6` light): Dietary fiber progress track fill and micronutrient index accents.

### Neutral
- **Deep Slate Canvas** (`#1e2229` dark / `#f2f4f8` light): Root viewport, scroll track, and `<meta name="theme-color">` canvas (`--background`, `--surface-canvas`), layered beneath neutral radial luminous pools (`--canvas-ambient`, `--canvas-ambient-secondary`).
- **Refractive Glass Card** (`rgba(32, 37, 46, 0.56)` dark / `rgba(255, 255, 255, 0.52)` light): Primary bento cards, logged entry lists, and micronutrient containers (`--card`, `--surface-card`).
- **Sunken Glass Well** (`rgba(18, 21, 28, 0.52)` dark / `rgba(228, 233, 241, 0.54)` light): Progress bar tracks, recessed segmented-control wells, glass pill fills, and secondary surfaces (`--surface-sub`).
- **Elevated Glass Sheet** (`rgba(26, 30, 39, 0.74)` dark / `rgba(255, 255, 255, 0.74)` light): Floating navigation capsules, `DesktopSidebar`, modal drawers, and popovers (`--surface-elevated`).
- **Directional Specular Rims** (`rgba(255, 255, 255, 0.22)` top/left light edge and `rgba(0, 0, 0, 0.36)` right/bottom dark edge in dark mode; `rgba(255, 255, 255, 0.88)` and `rgba(15, 23, 42, 0.11)` in light mode): Sculpted 1px bevels defining glass thickness.
- **Slate Muted Ink** (`#a5aebf` dark / `#525a69` light): Secondary labels, timestamps, inactive navigation tabs, and unit metadata (`--muted-foreground`).
- **Neutral Surplus Slate** (`#94a3b8` dark / `#64748b` light): Mapped to both `--neutral-over` and `--destructive` so no target state or button ever renders red error chrome.

### Named Rules
**The Adherence Neutrality Rule.** Nutrient fills keep their assigned hue (`--macro-calories`, `--macro-protein`, `--macro-carbs`, `--macro-fat`, `--macro-fiber`) and surplus states use neutral copy (`+N`, `Surplus`) in `--foreground` or `--neutral-over` (`#94a3b8`), never red alerts or punitive badges.

**The Monochrome Liquid Chrome Rule.** All interactive buttons, segmented controls, sliders, navigation pills, and glass surfaces remain strictly neutral monochrome (frosted charcoal/platinum in dark mode, alabaster/obsidian in light mode); chroma is reserved exclusively for nutrition telemetry.

## Typography

**Display Font:** Geist Sans (`var(--font-geist-sans)`, fallback `ui-sans-serif, system-ui, -apple-system, sans-serif`)
**Body Font:** Geist Sans (`var(--font-geist-sans)`)
**Label/Mono Font:** Geist Mono (`var(--font-geist-mono)`, fallback `ui-monospace, SFMono-Regular, monospace`) for keyboard shortcuts (`⌘K`), paired with `tabular-nums` on every numeric metric.

**Character:** Engineered geometric clarity with OpenType stylistic alternates (`cv02`, `cv03`, `cv04`, `cv11`), `text-wrap: balance` on `h1`–`h3`, and `text-wrap: pretty` on `p` and `li`. Numbers stay horizontally locked when toggling `Consumed` and `Remaining`.

### Hierarchy
- **Display (Container-Responsive Hero):** Weight `700`, `tracking-tight`, `tabular-nums` inside `.hero-container` (`container: hero / inline-size`). Scales by card inline width: `1.75rem` / `1.1` default (`1.375rem` / `1.15` for `data-digits="long"`), `1.875rem` at `>= 340px`, and `2.25rem` / `1.05` at `>= 420px` (`1.625rem` / `1.1` for long digits). Flanking hero metrics scale `1rem` → `1.125rem` → `1.25rem`; hero macro readouts scale `0.6875rem` → `0.75rem`.
- **Headline:** Weight `700`, `1.5rem` mobile / `1.875rem` `sm+` (`text-2xl sm:text-3xl`), `line-height: 1.2`, `tracking-tight`. Top-level route title (`Dashboard`).
- **Title:** Weight `700`, `1rem` (`text-base`), `line-height: 1.3`, `tracking-tight`. Bento section headers (`Daily Nutrition`, `Logged Entries`, modal headings).
- **Body:** Weight `400`–`600`, `0.875rem` (`text-sm`), `line-height: 1.4`. Logged meal titles, sidebar navigation links, and default button labels.
- **Label:** Weight `500`–`600`, `0.6875rem`–`0.75rem` (`11px`–`12px`), `tabular-nums`. Date selector pill, macro fraction readouts, and compact pill controls.
- **Caption:** Weight `500`, `0.625rem` (`10px`, `sm: 11px`), `tracking-tight`. Mobile bottom navigation labels and `⌘K` keycap badges.

### Named Rules
**The Tabular Lock Rule.** Apply `tabular-nums` to every numeric container (calories, macro fractions, 7-day averages, micronutrient readouts, entry counts) so mode switches and live updates never jitter horizontally.

## Layout

MacroAI expands fluidly across viewports on every route (`/`, `/log`, `/trends`, `/recipes`, `/settings`) without trapping desktop screens in a narrow phone frame:
- **Outer Workspace (`AppShell`):** Flex row on `lg+` pairing the sticky `DesktopSidebar` (`lg:w-[228px]`, `lg:m-3`, `lg:h-[calc(100dvh-1.5rem)]`) beside a `flex-1 min-w-0 max-w-6xl mx-auto` workspace with safe-area insets and route-aware bottom dock clearance (`pb-[calc(9.5rem+env(safe-area-inset-bottom))]` on `/` and `/log*`, `pb-[calc(6.25rem+env(safe-area-inset-bottom))]` elsewhere, collapsing to `lg:pb-8` on desktop).
- **Dashboard Bento Grid (`src/app/page.tsx`):** Single-column mobile stack (`gap-5 px-4 pt-3 pb-8`) expanding at `md` (`>= 768px`) to a 12-column bento grid (`md:col-span-6` / `lg:col-span-5` for `MacroBentoGrid` beside `md:col-span-6` / `lg:col-span-7` for `HabitsAnalyticsGrid`), above a second 12-column row pairing `Quick Tools` + `Logged Entries` (`lg:col-span-7`) beside `MicronutrientPanel` (`lg:col-span-5`).
- **Size-Aware Hero (`@container hero`):** Horseshoe arc box (`128×116px` → `152×138px` @ `340px` → `172×156px` @ `420px`) and 7-day weekly summary (`1-col` stacked → `2-col` split @ `360px`) adapt to card inline width rather than viewport width alone.
- **Touch Ergonomics:** Coarse pointers (`@media (pointer: coarse)`) enforce `>= 44×44px` hit areas via `.touch-target::after` and `font-size: max(16px, 1rem)` on text inputs to prevent iOS auto-zoom.

## Elevation & Depth

Depth is expressed through volumetric refractive glass rather than flat borders or unlit drop shadows. Every translucent plane sits over a dual-layer fixed neutral ambient field (`body::before` radial silver-slate pools + `body::after` blurred `42px` secondary sheen) so backdrop blur always has subtle luminance to refract.

### Shadow Vocabulary
- **Primary Glass Card (`--shadow-glass-card` / `--shadow-glass-card-hover`):** Layered inner specular highlights + diffuse ambient drop paired with `backdrop-filter: blur(24px) saturate(160%)`. Theme-aware Light Mode hover tokens preserve soft alabaster depth without dark shadows. Interactive cards lift `-3px` on hover with `--shadow-glass-card-interactive-hover`.
- **Floating Chrome Bar (`--shadow-ambient`):** Deeper specular rim + ambient lift with `blur(26px) saturate(165%)` for `BottomNav`, floating search strip, and `DesktopSidebar`.
- **Elevated Sheet & Modal (`--shadow-floating`):** Highest optical separation with `blur(28px) saturate(165%)` for adaptive bottom sheets, dialogs, and `QuickActionDock`.
- **Sunken Glass Cavity (`--shadow-glass-well`):** Inverted bevel (dark top/left, light bottom/right) with `blur(20px) saturate(155%)` for inputs, search bars, and segmented-control tracks.
- **Volumetric Primary Pill (`--shadow-glass-primary` / `--shadow-glass-primary-hover`):** Convex top highlight, bottom thickness shadow, and theme-aware lift for primary CTA pills and the center `+` FAB.

### Named Rules
**The Volumetric Refraction Rule.** Glass containers must combine backdrop blur (`18px`–`28px`, `saturate(155%–165%)`), directional specular borders (lit top/left, recessed bottom/right; inverted for sunken cavities), and paired theme-aware inner/outer shadows—never flat single-pixel bordered boxes.

## Shapes

- **Concentric Surface Scale:** Base `--radius` (`0.875rem` / `14px`), nested inner elements `--radius-inner` (`0.75rem` / `12px`), primary bento tiles (`1rem` / `rounded-2xl`), volumetric cards `--radius-card` (`1.25rem` / `20px`), desktop sidebar and modal sheets (`1.5rem` / `rounded-3xl`), and outer shells `--radius-outer` (`1.75rem` / `28px`).
- **Full Capsules (`9999px` / `rounded-full`):** Universal silhouette for all `Button` variants, `SegmentedControl` tracks and gliding thumbs, floating `BottomNav` capsule, `Search for a food` dock, header date pills, and the `44×44px` center `+` FAB.
- **Data Marks:** `3px` micro-corners on 30-day logging matrix dots and 7-day stacked column bars; `9999px` rounded caps on the 240° calorie horseshoe arc and slim macro progress bars.

## Components

### Buttons (`src/components/ui/button.tsx`)
Tactile, convex neutral glass capsules built on `@base-ui/react/button`.
- **Shape:** Full capsule (`9999px`) across all variants and sizes.
- **Primary (`default` / `.liquid-pill-primary`):** Sculpted light-platinum gradient in dark mode (`#ffffff → #e6ebf2 → #d2dae6` with `#14171d` ink) and obsidian gradient in light mode (`#323844 → #1e2229 → #14171d` with `#f8fafc` ink).
- **Secondary / Outline / Destructive (`.liquid-pill-glass`):** Translucent neutral glass capsule (`--surface-sub` + `--glass-pill-gradient`, `blur(18px) saturate(160%)`). Destructive actions stay adherence-neutral monochrome rather than red.
- **Sizes:** `xs` (`h-6 px-2.5 text-xs`), `sm` (`h-8 px-3 text-[0.8rem]`), `default` (`h-9 px-4 text-sm`), `lg` (`h-10 px-5 text-sm`), plus square icon circles `icon-xs` (`24px`), `icon-sm` (`32px`), `icon` (`36px`), `icon-lg` (`40px`).
- **Hover / Active / Focus:** Tactile hover swell (`translateY(-1px) scale(1.02)` under `@media (hover: hover)`), depressed active press (`scale(0.97)`), and `2px` neutral `--ring` focus outline. All transforms disable under `prefers-reduced-motion: reduce`.

### Segmented Control (`src/components/ui/segmented-control.tsx`)
Sunken glass trough housing a spring-gliding liquid-globule active thumb (`layoutId`, `SPRING_PILL`).
- **Track:** `rounded-full liquid-input-well p-1 bg-surface-sub`.
- **Active Thumb:** `.liquid-glass-active-pill` over `bg-foreground` with `text-background font-semibold`.

### Cards / Containers
- **Material:** `.bg-card` / `.surface-glass-card` (`blur(24px) saturate(160%)`, `--glass-sheen`, directional specular bevels, `--shadow-glass-card`).
- **Interactive State:** `.macro-card-interactive` lifts `-3px` on hover with `--glass-rim-strong` top/left bloom and theme-aware `--shadow-glass-card-interactive-hover`.

### Inputs / Fields & Sliders
- **Sunken Glass Cavity (`.liquid-input-well` & global `input`/`textarea`/`select`):** `--glass-input-well`, `blur(20px) saturate(155%)`, inverted bevels, and `--shadow-glass-well`. Focus radiates a neutral bottom-edge specular glow (`--glass-focus-edge`, `--glass-focus-glow`).
- **Range Sliders:** `8px` sunken glass track (`rounded-full`) with a `22×22px` spherical liquid-globule thumb (`--glass-primary-gradient`).

### Navigation (`DesktopSidebar` & `BottomNav`)
- **Desktop Rail (`lg+`, `228px`):** Sticky floating `rounded-3xl surface-floating-bar` housing brand mark, `Log Food` primary pill, `Search foods` sunken well (`⌘K`), `Barcode` + `AI Scan` glass pills, 5 destinations (`Dashboard`, `Food Log`, `Trends`, `Recipes`, `Settings`), and `Command Menu` footer.
- **Mobile Bottom Chrome (`< lg`):** Single continuous bottom scrim housing the floating `rounded-full surface-floating-bar` capsule (`h-[62px]`, `max-w-2xl mx-auto`) with 4 tabs (`Dashboard`, `Food Log` | centered `44×44px` `.liquid-pill-primary` `+` FAB | `Trends`, `Recipes`) and, on `/` and `/log*`, the floating `48px` sunken-glass `Search for a food` capsule directly above it.

## Do's and Don'ts

### Do:
- **Do** enforce **The Adherence Neutrality Rule**: render over-target values with calm `+N` / `Surplus` copy in `--foreground` or `--neutral-over` (`#94a3b8` dark / `#64748b` light), keeping nutrient hues steady.
- **Do** enforce **The Monochrome Liquid Chrome Rule**: build all buttons, chips, sliders, and navigation chrome from neutral glass tokens (`liquid-pill-primary`, `liquid-pill-glass`, `liquid-input-well`, `surface-floating-bar`).
- **Do** enforce **The Tabular Lock Rule**: apply `tabular-nums` to every numeric KPI, macro fraction, calorie readout, and entry count.
- **Do** respect reduced motion: disable hover/active transforms, spring glides, and the `440ms` theme-switch sheen under `prefers-reduced-motion: reduce`.

### Don't:
- **Don't** turn calories, progress bars, badges, or borders red (`#ef4444` / destructive alarms) when a user logs above daily targets.
- **Don't** tint glass containers, buttons, or ambient background pools with chromatic accents—keep sub-glass pools and chrome strictly neutral so nutrient telemetry stays unmistakable.
- **Don't** constrain desktop viewports inside a narrow vertical phone box (`430px` centered frame); allow the `228px` sidebar rail and `max-w-6xl` bento grid to expand naturally.
- **Don't** render the floating `Search for a food` strip over non-logging screens (`/trends`, `/recipes`, `/settings`).
