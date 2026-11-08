# Outside of work section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the "Outside of work" home-page section (Lifting, Swimming, Travel and hiking with a dot world map, Food) with its own nav link.

**Architecture:** A new `Outside.astro` section holds the existing Lifting and Swimming blocks plus two new blocks driven by `src/data/outside.ts`. Travel is a native-`<details>` country list (works without JS) with a small React island that lights the selected country on a pre-generated dot map. Photos are pre-built WebP files under `public/outside/` described by `src/data/outside-photos.json`; both already exist.

**Tech Stack:** Astro 7, React 19 islands, Vitest 4 (SSR markup tests via `renderToStaticMarkup`, no DOM), TypeScript, plain CSS tokens; devDependencies `world-atlas`, `topojson-client`, `d3-geo` for the one-off map script only.

**Spec:** `docs/superpowers/specs/2026-11-08-outside-of-work-design.md`

## Global Constraints

- No GPS or other metadata in any image; never add new photos; use only files already in `public/outside/` and entries already in `src/data/outside-photos.json` (46 photos, kinds `hike`, `travel`, `food`; fields `id kind country area year caption alt width height bytes`).
- Total size of `public/outside/` stays at or under 3,000,000 bytes (a test enforces it).
- No year is shown for: Indonesia, Florida, Washington, Oregon, Point Reyes, Mission Peak, Castle Rock State Park, Pinnacles National Park, Yosemite, Mount Tamalpais.
- Every `<img>` has `alt` (from the manifest), explicit `width` and `height`, `loading="lazy"`, `decoding="async"`.
- Order inside the section: Lifting, Swimming, Travel and hiking, Food. Section id `outside`, eyebrow "Get to know me", heading "Outside of work". Nav label `Outside`.
- Lighthouse mobile ≥ 95 on `/`; no horizontal scroll from 320 px; AA contrast in both themes; no animation (map and gallery are static).
- `npm test` green, `npm run build` ends `check-build: ok`, `npx astro check` stays at the 7 pre-existing errors. Commit trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Never push or merge. Do not read, copy or touch `~/Pictures`, `~/Downloads` or any private photo source.

---

### Task 1: Data module and the dot map

**Files:**
- Create: `src/data/outside.ts`, `src/data/outside.test.ts`, `scripts/build-world-dots.mjs`, `src/data/world-dots.json`
- Modify: `package.json` (devDependencies only)

**Interfaces:**
- Produces from `outside.ts`:
  - `export interface Photo { id: string; kind: 'hike' | 'travel' | 'food'; country: string; area: string; year: number; caption: string; alt: string; width: number; height: number; bytes: number }` and `export const photos: Photo[]` (the manifest, imported from `./outside-photos.json`)
  - `export interface Country { name: string; code: string; years: number[]; areas: string[] }` (`code` is the ISO 3166-1 alpha-3 used by the map) and `export const countries: Country[]` in this order: South Korea (KOR, [2024], Seoul, Busan, Incheon, Jeju), Japan (JPN, [2023,2024,2026], Tokyo, Osaka, Kyoto, Kamakura, Hakone, Lake Kawaguchi (Mt. Fuji)), Vietnam (VNM, [2024], Ho Chi Minh City, Hanoi, Ha Long Bay, Mekong Delta), Taiwan (TWN, [2024], Taipei, Jiufen/Shifen/Yehliu written as `Jiufen, Shifen and Yehliu`), Thailand (THA, [2023,2024], Bangkok, Koh Tao, Koh Phangan, Koh Lanta, Chumphon), Mexico (MEX, [2025], Riviera Maya), Singapore (SGP, [2023], Singapore), Malaysia (MYS, [2023], Kuala Lumpur), Indonesia (IDN, [], areas [])
  - `export const states: string[]` = `['California','Colorado','Florida','New York','Oregon','Washington']`
  - `export interface Trail { name: string; place: string; year?: number }` and `export const trails: Trail[]`: Hwangnyeongsan (Busan, 2024), Jeju Island trail (Jeju, 2024), Ha Long Bay (Vietnam, 2024), Rocky Mountains (Colorado, 2025), Point Lobos (California, 2025), Hawk Hill (Marin Headlands, 2024), Mount Tamalpais (California), Point Reyes (California), Mission Peak (California), Castle Rock State Park (California), Pinnacles National Park (California), Yosemite (California) — no `year` where the constraint says none
  - `export const headline: string` = `9 countries · 6 states`
  - `export const photosFor = (country: string): Photo[]` (travel and hike photos of that country, in manifest order), `export const foodPhotos: Photo[]`, `export const hikePhotos: Photo[]`
  - `export function yearsLabel(years: number[]): string` (`[]` → `''`, `[2024]` → `2024`, `[2023,2024,2026]` → `2023, 2024, 2026`)
- Produces from `world-dots.json`: `{ "cols": number, "rows": number, "dots": [x, y, code][] }` where `code` is the ISO alpha-3 of the country the land dot falls in (or `""` for land in no listed country); about 3 degree spacing, land only.

- [ ] **Step 1: Failing tests (`outside.test.ts`)**: headline equals `9 countries · 6 states` and equals `${countries.length} countries · ${states.length} states`; every country's `years` is sorted; Indonesia has no years and no areas; `yearsLabel` cases; every `Photo` id in the manifest has a file `public/outside/<id>.webp` (use `fs`); sum of file sizes ≤ 3,000,000; no `.webp` contains the bytes `EXIF` or `XMP`; every photo has non-empty `alt` and `caption`, positive `width`/`height`; `photosFor('Japan')` are all `Japan` and non-food; `foodPhotos` has 19 entries all kind `food`; `hikePhotos` all kind `hike`; trails: the ten no-year places have no `year` and Hwangnyeongsan has 2024; the string `Yosemite` appears with no year; no caption contains a digit other than a 4-digit year; world-dots: every country `code` in `countries` appears among the dots at least once (except IDN, which may be absent) and every dot's x < cols, y < rows
- [ ] **Step 2:** `npx vitest run src/data/outside.test.ts` → FAIL
- [ ] **Step 3:** `npm i -D world-atlas topojson-client d3-geo` (devDependencies only; note the exact versions in the commit message); write `scripts/build-world-dots.mjs` (reads `world-atlas/countries-110m.json`, builds a land grid, assigns the ISO alpha-3 by matching the country's numeric id through a small id→alpha3 table for the nine listed countries; any other land dot gets `""`), run it once to write `src/data/world-dots.json` (aim for under 40 KB), and write `outside.ts`
- [ ] **Step 4:** tests → PASS; `npm test`; commit `feat: Outside of work data and the dot world map`

---

### Task 2: The section and its blocks

**Files:**
- Create: `src/components/Outside.astro`, `src/components/Travel.astro`, `src/components/TravelMap.tsx`, `src/components/TravelMap.test.tsx`, `src/components/Food.astro`, `src/components/outside.css`
- Modify: `src/components/About.astro` (remove `<Lifting />` and `<Swimming />` and their imports), `src/pages/index.astro` (render `<Outside />` after `<About />`)

**Interfaces:**
- Consumes: everything exported by `src/data/outside.ts`, `src/data/world-dots.json`, `Lifting.astro`, `Swimming.astro`
- Produces: `Outside.astro` (`<section class="s" id="outside">` with `<header class="sh"><p class="eyebrow">Get to know me</p><h2>Outside of work</h2></header>`, then `<Lifting />`, `<Swimming />`, `<Travel />`, `<Food />`); `TravelMap.tsx` default export with props `{ selected: string | null }` rendering an `aria-hidden` SVG of the dots, dots of countries in `countries` violet (`var(--color-accent)`), the selected country's dots larger/brighter, other land dim (`var(--color-rule)`); pure helper `dotClass(code, selected)` exported from the same file

- [ ] **Step 1: Failing tests (`TravelMap.test.tsx`, renderToStaticMarkup)**: the SVG is `aria-hidden="true"` and has no `tabindex`; `dotClass` returns distinct classes for visited / selected / other land; with `selected="JPN"` the markup contains more selected-class dots than with `selected={null}` (which has none); dot count equals `world-dots.json` dots length
- [ ] **Step 2:** run → FAIL; **Step 3:** implement `TravelMap.tsx`
- [ ] **Step 4: Build `Travel.astro`**: a block with eyebrow "Travel", the headline from `outside.ts`, the map (`<TravelMap client:visible selected={null} />` is fine for the first version: static map; interactivity via the details below is a progressive enhancement and may be a tiny inline script that sets a `data-selected` attribute on the map wrapper and CSS lights that country with `[data-selected="JPN"] .dot-JPN { … }`; prefer the CSS-only approach if it works), then a list of `<details>` per country: `<summary>` shows country name and `yearsLabel`; the body shows area chips and that country's photos (`photosFor`) as a small grid; then the US states as chips; then a "Trails" list from `trails` (name, place, year if present) with the hike photos grid beneath it
- [ ] **Step 5: Build `Food.astro`**: eyebrow "Food", a CSS grid of `foodPhotos` as `<figure><img …><figcaption>{caption}</figcaption></figure>`, two columns under 640 px, three at 640 to 1023, four at 1024 and up; each figure reserves space with its width/height (use `aspect-ratio` from the manifest to prevent shift)
- [ ] **Step 6:** `outside.css` (tokens only, imported by the `.astro` files that need it); mobile at 320 px must not scroll horizontally (grids use `minmax(0, 1fr)`)
- [ ] **Step 7:** SSR/markup assertions in a new test (`outside.test.tsx` or inside an existing test file) that the built `dist/index.html` is not needed; instead assert via the pure data and via `TravelMap` that nothing is broken; then run `npm test`, `npm run build` (ends `check-build: ok`), and grep `dist/index.html` for `id="outside"`, `Outside of work`, `9 countries · 6 states`, and one `alt=` from the manifest; commit `feat: the Outside of work section`

---

### Task 3: Nav, scroll-spy, agent, and gates

**Files:**
- Modify: `src/components/TopBar.astro`, `src/lib/scrollspy.ts` and its tests only if they hard-code the section list, `src/scripts/nav-spy.ts`, `src/styles/vapor.css` only for the nav grid if six items break it, `src/agent/*` data inputs for a new `about:outside` chunk (find where `about:bio` is built from `src/data/profile.ts`), `src/agent/run.test.ts`, `src/agent/golden.json`, `src/agent/fixtures/snapshot.json` (regenerate with `npm run build` then `cp dist/agent-data.json src/agent/fixtures/snapshot.json`)

- [ ] **Step 1:** add `<a href="#outside" data-spy="outside">Outside</a>` between About and Resume; extend the scroll-spy section list and its tests (the active item follows scroll; the last section still activates when the page bottom is reached: with Outside last, `About` must still be reachable, so check `activeSection`'s atBottom logic and fix the test for the new last section, never loosen it)
- [ ] **Step 2:** the mobile nav is a fixed three-column grid; with six items it must be exactly two rows at 320, 375, 414 px; add or extend a CSS test that pins six cells in three columns
- [ ] **Step 3: Agent**: add an `about:outside` chunk (title "Outside of work") whose text is built from `outside.ts` (countries with years, states, trails, plus one sentence each for lifting and swimming taken from `src/data/lifting.ts` and `src/data/swimming.ts` verbatim facts) and update the tests that pin the chunk list and the golden queries (`where have you travelled`, `do you hike`) with the expected top chunk `about:outside` if the harness can match it; if it cannot (the Micron sub-chunk caveat), pick the strongest check it allows and report it
- [ ] **Step 4:** `npm test`, `npm run build` (ends `check-build: ok`), `npx astro check | tail -5` (7 errors); commit `feat: Outside nav link, scroll-spy and agent chunk`

---

### Task 4 (controller): browser verification

Open `/` at 320, 375 and 1440 in both themes: the section renders in the stated order, the map is visible and not clipped, a country `<details>` opens with its photos, the nav shows `Outside` and highlights it while scrolling, no horizontal scroll, images lazy-load. Report the evidence and fix findings through a subagent.
