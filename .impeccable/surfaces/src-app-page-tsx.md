---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/components/shell/app-shell.tsx","src/components/shell/bottom-nav.tsx","src/components/shell/desktop-sidebar.tsx","src/components/dashboard/macro-bento-grid.tsx","src/app/globals.css"]
---

# Dashboard Surface Brief (`src/app/page.tsx`)

Scope: Application-wide visual identity transformation across Dashboard (`/`), Food Log (`/log`), Trends (`/trends`), Recipes (`/recipes`), Settings (`/settings`), shared responsive AppShell, DesktopSidebar, BottomNav, overlays/drawers/modals, and design tokens (`src/app/globals.css`).
Visitor mode: Operate.
Audience & job: Solo user tracking daily nutrition 4-8 times/day on phone and reviewing multi-day trends/logging on tablets and laptops.

## Direction contract

- **THESIS:** Volumetric, sculpted Monochrome Liquid Glass applied across the entire MacroAI nutrition cockpit: every panel, floating bar, sunken input cavity, and pill control behaves as thick refractive glass over balanced neutral luminous fields, preserving MacroFactor-level scan density and zero-alarm adherence neutrality while refusing flat bordered cards and chromatic chrome noise.
- **OWN-WORLD:** Deep slate-charcoal dark canvas (`#1E2229`) with balanced all-neutral silver-slate/pewter sub-glass luminous pools, paired with icy alabaster light canvas (`#F2F4F8`–`#FBFBFD`) and soft pearl-mist ambient blobs. Every container carries `blur(24px) saturate(160%)`, sculpted directional specular rims (bright top-left glare, recessed bottom-right edge), deep inner thickness shadows, and layered diffuse ambient drop shadows. All buttons, chips, toggles, sliders, and navigation pills are neutral-colored sculpted glass (frosted platinum/charcoal/obsidian) with tactile hover swell (`scale: 1.02`) and depressed active glass states; inputs are glossy sunken cavities with neutral bottom-edge focus glow; nutrient telemetry (`#6C8EFF` cal, `#E56B4E` pro, `#E8C547` fat, `#4CAF79` carb, `#9F85FF` fib, `#94A3B8` surplus) remains the sole chromatic voice.
- **STORY:** User lands on today's date and `Dashboard`, reads Remaining / Consumed / Target calories in the horseshoe arc and Protein / Fat / Carbs progress bars immediately (or flips to 7-day Nutrition & Targets), inspects 30-day Food Logging habits, 7-day stacked macros, quick tools, and micronutrient progress in the responsive bento grid, logs via the sunken glass search bar or volumetric `+` pill, and switches smoothly between Dark and Light modes with a 0.4s translucent sheen refraction transition.
- **FIRST VIEWPORT:** Mobile opens directly to uppercase date, bold `Dashboard`, volumetric Liquid Glass `Daily Nutrition` arc card (`[Consumed] [Remaining]` liquid-globule segmented toggle + 7-day toggle), `Insights & Habits` 2-col tiles, and docked sunken-glass `Search for a food` + floating capsule bottom nav with volumetric `+` button. Desktop opens to floating Liquid Glass sidebar rail (`220px`) beside the `max-w-6xl` responsive bento grid without empty side voids.
- **FORM:** Code-led Operate surface pinned whole (`seed: none (pinned)`, user words: `"Transform the entire visual identity of the web application into a high-fidelity 'Liquid Glass' theme"` + `"all neutral colors please"` + `"Refresh DESIGN.md, keeping adherence-neutral rules while replacing visual tokens and component specs"`).
- **FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
