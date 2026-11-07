# Skills Globe — Design

Date: 2026-11-07
Branch: `feat/skills-globe` (cut from `main`)

## Intent and why

Add a "Tech Stack / My Skills" section to the home page, modeled on the globe at
pszostak.pl: a slowly rotating sphere of points with technology icons riding its
surface — icons near the front are vivid and legible, icons on the far side are
dimmed — under a "TECH STACK" eyebrow and a gradient "My Skills" heading.

## Goals

- Every skill from `profile.skillGroups` (all 5 groups, 30 items) appears on the globe with an icon and its label.
- Matches the reference look: dark sphere wireframe/dot surface, depth-based opacity, brand-colored or monochrome icons.
- Fits the repo's stated values (`design-reference/portfolio-research.md`): lightweight, recruiter-skimmable, accessible, reduced-motion-safe.

## Non-goals / anti-goals

- No three.js / WebGL. (Verified: pszostak.pl itself does not use it — it is a hand-rolled 3D projection. Adding three.js would mean ~150–200 KB gzip for a decorative element and conflicts with the repo's design guidance.)
- No drag/zoom interaction that traps scroll or keyboard focus.
- Not a navigation element — purely presentational, with real text available elsewhere.

## Constraints

- Astro 7 static output; React islands hydrated `client:idle` are the established island pattern (`HeroGraph.tsx`).
- No Tailwind; styling via `src/styles/global.css` + tokens from `src/styles/tokens.css` (`--grad-a/--grad-b`, `--color-*`).
- `scripts/check-build.mjs` fails on `<img>` without `alt` and broken links — SVG/canvas approach sidesteps this, but any raster fallback must comply.
- `prefers-reduced-motion` must be honored everywhere (existing convention).

## Approach (chosen)

**Vanilla TS canvas globe, zero new dependencies** (~4–6 KB client JS, comparable in spirit to `HeroGraph.tsx` but on `<canvas>`):

- Icons + labels rendered as offscreen sprites / DOM overlays? → **DOM overlay nodes positioned per-frame** (the pszostak approach): real text labels stay selectable/accessible, icons stay crisp SVGs, depth sets `opacity`, `transform: translate(...)` per frame.
- Sphere: Fibonacci distribution (`phi = acos(1 − 2(i+0.5)/N)`, `theta = i·2.39996`), slow Y-rotation (plus slight X tilt), perspective projection (`scale = fov/(fov+z)`), z-based opacity/scale, `z-index` swap for front/back.
- Wireframe: a second canvas layer (or the same canvas under the DOM nodes) draws the faint dotted sphere mesh, matching the reference's subtle grid.
- Pause the rAF loop when off-screen (`IntersectionObserver`) and under `prefers-reduced-motion` (render one static frame, front-facing icons visible).

Rejected alternatives: three.js (too heavy, see anti-goals); pure CSS 3D transforms (no true depth dimming, icons look flat); canvas-only with icons drawn into the canvas (labels not selectable, harder to keep accessible).

## Icon mapping (all 30 skills)

Source: **simple-icons** (MIT) monochrome brand SVGs, inlined as path data; **devicon** for gaps; **hand-drawn minimal glyphs** (same stroke style) for concepts with no brand mark. Verified against simple-icons v13 CDN:

| Group | Skill → icon |
|---|---|
| AI/LLM | LLM agents → glyph (chat bubble + spark); tool calling → glyph (plug); multi-agent orchestration → glyph (network nodes); RAG → glyph (doc + sparkle); evals → glyph (gauge); numeric grounding → glyph (anchor/123) |
| Languages | Python → `python`; TypeScript → `typescript`; JavaScript → `javascript`; SQL → glyph (database) |
| Backend/Frontend | FastAPI → `fastapi`; Flask → `flask`; REST API design → `openapiinitiative`; React → `react`; Vite → `vite`; Zustand → devicon `zustand` |
| Data | DuckDB → `duckdb`; MySQL → `mysql`; MSSQL → devicon `mssql` (fallback: glyph); Vertica → glyph (database+V); ClickHouse → `clickhouse`; Snowflake → `snowflake`; SQLite → `sqlite`; Parquet → `apacheparquet` |
| Infra/tools | Kubernetes → `kubernetes`; Docker → `docker`; GitHub Actions CI/CD → `githubactions`; Git → `git`; Copilot → `githubcopilot`; Power Automate → glyph (flow arrows) |

Brand marks stay unmodified; concepts get neutral glyphs so nothing implies a false brand endorsement. Icon data lives in one TS module (`src/components/skills/icons.ts` or similar) so it is testable and tree-shakeable.

## Placement

New `Skills.astro` section in `src/pages/index.astro` inside `<main>`, **after `ProjectCards`** (timeline → proof → skills → about → how it works). Follows the `.s` / `.sh` eyebrow+h2 section convention.

## Accessibility / reduced motion

- `prefers-reduced-motion`: no rotation; static frame with front-facing skills visible.
- Labels are real DOM text; the globe is `aria-hidden` decorative structure with a visually-hidden list (or definition list) of skills for screen readers.
- Loop pauses when off-screen.

## Testing

- Vitest unit test alongside the component (mirror `HeroGraph.test.tsx`): projection math (point distribution, rotation, depth ordering) and icon map completeness (every `skillGroups` item has an icon).
- `npm run build` must pass the post-build gate.

## Left to the builder

- Exact file layout (`SkillsGlobe.tsx` island vs vanilla script), wireframe rendering detail, exact rotation speed/sizing, mobile scaling, whether group labels appear as section legend chips.
