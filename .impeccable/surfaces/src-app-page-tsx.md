---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/components/shell/app-shell.tsx","src/components/shell/bottom-nav.tsx","src/components/dashboard/macro-bento-grid.tsx"]
---

# Dashboard Surface Brief (`src/app/page.tsx`)

Scope: Dashboard (`/`), shared responsive AppShell & BottomNav (`src/components/shell/*`), and MacroFactor-aligned design tokens (`src/app/globals.css`).
Visitor mode: Operate.
Audience & job: Solo user tracking daily nutrition 4-8 times/day on phone and reviewing multi-day trends/logging on tablets and laptops.

## Direction contract

- **THESIS:** Precision daily nutrition cockpit modelled faithfully on Pics 1-4: calm matte charcoal surfaces without noisy bordered box stacks, crisp Geist Sans typography with `tabular-nums`, and immediate swipe/toggle telemetry paired with thumb-zone food logging.
- **OWN-WORLD:** Matte obsidian canvas (`#141414`), elevated dark cards (`#1C1C1E`), recessed pills/tracks (`#262629`) with 1px subtle hairlines (`rgba(255,255,255,0.06)`), Cornflower Blue (`#6C8EFF`) calories, Coral (`#E56B4E`) protein, Warm Gold (`#E8C547`) fat, Emerald (`#4CAF79`) carbs, white active toggle pills, white centered `+` action FAB, and light-theme semantic equivalents.
- **STORY:** User lands on today's date (`FRIDAY, NOVEMBER 15` / `Dashboard`), reads Remaining / Consumed / Target calories in the horseshoe arc and Protein / Fat / Carbs progress bars immediately (or flips to 7-day Nutrition & Targets), glances at 30-day Food Logging habits and 7-day stacked macros in the responsive bento grid, and logs via persistent bottom `Search for a food` bar or white `+`.
- **FIRST VIEWPORT:** Mobile opens directly to uppercase date, bold `Dashboard`, interactive `Daily Nutrition` arc card (`[Consumed] [Remaining]` pill toggle + pagination dots to 7-day columns), `Insights & Habits` 2-col tiles, and docked `Search for a food` + bottom nav. Tablet/laptop opens to responsive multi-column bento workspace (`max-w-5xl` / `max-w-6xl`) with side-by-side Hero + Bento Analytics/Habits + Today's Meals without empty side voids.
- **FORM:** Code-led Operate screen pinned whole (`seed: none (pinned)`, user words: `"i want you to adhere to pics 1-4"` + dynamic responsive mobile/tablet/laptop + hybrid Pic 1 + Pic 3/4 + overwrite `DESIGN.md`).
- **FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
