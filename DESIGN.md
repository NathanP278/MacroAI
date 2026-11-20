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

<!-- impeccable:design-map -->
Name: MacroAI
Colors: #6c8eff cal; #e56b4e pro; #e8c547 fat; #4caf79 carb; #9f85ff fib; #94a3b8 surplus; #f5f5f7 ink (+10 in sidecar)
Fonts: Geist Sans (display..caption)
Spacing: xs 0.25rem..section 1.5rem
Radius: bar 3px..pill 9999px
North Star: "The Calibration Cockpit"
Rules:
- Adherence Neutrality: fixed nutrient hues; neutral `+N`/`Surplus` in `#94a3b8`, no red alarms.
- Monochrome Chrome: `#f5f5f7`/`#141416` UI inversion; reserve chroma for telemetry.
- Tabular Lock: `tabular-nums` on every numeric readout.
- Tonal Slab: flat `#1c1c1f` cards on `#141416`; blur/shadows only on bars & modals.
Elevation: `.surface-floating-bar` (`--shadow-ambient`); `.surface-elevated-sheet` (`--shadow-floating`).
Don't:
- No red (`#ef4444`) over-target alerts.
- No 430px desktop phone box; use `max-w-6xl` bento grids.
- No gradients, glow halos, or eyebrow kickers on flat cards.
- No floating search strip on `/settings` or `/recipes`.
Map: src/app/globals.css
Full: .impeccable/design-full.md (read a section when you need its detail)
