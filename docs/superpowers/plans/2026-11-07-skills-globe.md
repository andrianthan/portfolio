# Skills Globe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Tech Stack / My Skills" home-page section: a rotating sphere of all 30 skills from `profile.skillGroups`, each with an icon and label, depth-dimmed on the far side, like pszostak.pl — with zero new dependencies.

**Architecture:** Pure sphere math lives in `src/lib/skillsGlobe.ts`; icon data in `src/lib/skillIcons.ts` (inlined SVG path data, simple-icons/devicon + hand-drawn glyphs). A React island `SkillsGlobe.tsx` positions DOM nodes per frame (transform + opacity + z-index) over a `<canvas>` wireframe, hydrated `client:idle` via a thin `SkillsGlobe.astro` wrapper. A `Skills.astro` section follows the repo's `.s`/`.sh` section convention and is added to `src/pages/index.astro` after `ProjectCards`.

**Tech Stack:** Astro 7 static, React 19 island (`client:idle`), vanilla TS, Vitest (`renderToStaticMarkup` style tests, no jsdom). No new npm dependencies.

**Spec:** `docs/superpowers/specs/2026-11-07-skills-globe-design.md`

## Global Constraints

- No new npm dependencies. No three.js, no WebGL.
- All 30 skills from `src/data/profile.ts` `skillGroups` appear, keyed by their exact verbatim strings (including `'evals (golden sets, promptfoo, deepeval)'`).
- Brand icons: simple-icons v13 (single-path 24x24, MIT) for 19 skills; devicon for Zustand (and MSSQL if fetchable); hand-drawn stroke glyphs (24x24) for the 10 concepts without honest brand marks. Brand paths stay unmodified.
- Reduced motion: under `prefers-reduced-motion: reduce` render one static frame (fixed angles `ry = -0.6, rx = 0.35`), no rAF loop, no listener.
- rAF loop pauses when off-screen (`IntersectionObserver`) and when `document.hidden`.
- Labels are real DOM text; the animated globe structure is `aria-hidden` with a visually-hidden list of all skills for screen readers.
- Styling via `src/styles/global.css` using tokens from `src/styles/tokens.css` (`--grad-a`, `--grad-b`, `--color-*`); the `My Skills` h2 uses the existing gradient-heading treatment.
- Tests are colocated (`src/lib/*.test.ts`, `src/components/*.test.tsx`) and run with `npm test`; the full `npm run build` must pass the post-build gate (`scripts/check-build.mjs`).
- Commit after each task with conventional-commit messages.

## Review Focus

- **Reduced-motion users must get a usable static view** — every skill still reachable/readable, no animation. Test: Task 3 asserts the static frame renders all items and no rAF is scheduled.
- **Off-screen/tab-hidden CPU burn** — the loop must not run when the section is out of view or the tab is hidden. Test: Task 3 asserts the observer/visibility wiring exists (behavioral assertions where testable; reviewer verifies wiring by reading).
- **Icon completeness drift** — editing `profile.skillGroups` later without an icon must fail the build's tests, not silently drop a skill from the globe. Test: Task 2 completeness test iterates the live `profile.skillGroups`.
- **Small screens / resize** — the globe must re-measure on container resize (ResizeObserver) and stay legible at ~320px width without horizontal scroll. Test: Task 3 ResizeObserver wiring + reviewer visual check.
- **Legend/label contrast in light theme** — depth-dimmed icons at opacity ~0.22 must stay perceivable in both `data-theme` modes; reviewer verifies in both themes (Task 4 verification step).

---

### Task 0: Branch setup

**Files:** none created.

- [ ] **Step 1: Create the branch off main**

```bash
cd /Users/andrianthan/Desktop/projects/portfolio
git checkout main && git checkout -b feat/skills-globe
```

- [ ] **Step 2: Commit the design doc and this plan**

```bash
git add docs/superpowers/specs/2026-11-07-skills-globe-design.md docs/superpowers/plans/2026-11-07-skills-globe.md
git commit -m "docs: skills globe design and plan"
```

### Task 1: Sphere math (`src/lib/skillsGlobe.ts`)

**Files:**
- Create: `src/lib/skillsGlobe.ts`
- Test: `src/lib/skillsGlobe.test.ts`

**Interfaces:**
- Consumes: nothing (pure module).
- Produces (used by Tasks 3–4):
  - `export interface Vec3 { x: number; y: number; z: number }`
  - `export interface Projected { x: number; y: number; scale: number; z: number }` — screen-space center coords (px), perspective scale factor, and rotated depth `z` normalized to `[-1, 1]`.
  - `export function fibonacciSphere(count: number): Vec3[]` — unit-sphere points, golden-angle distribution.
  - `export function rotate(p: Vec3, angleY: number, angleX: number): Vec3` — rotate around Y then X.
  - `export function project(p: Vec3, opts: { radius: number; fov: number; cx: number; cy: number }): Projected` — caller passes `fov = radius * 2.2`; projection: `scale = fov / (fov - p.z * radius)`, `x = cx + p.x * radius * scale`, `y = cy + p.y * radius * scale`, `z = p.z`.
  - `export function depthOpacity(z: number): number` — `z` in `[-1, 1]`; returns `0.22 + 0.78 * (z + 1) / 2` (front `z = 1` → `1`, back `z = -1` → `0.22`).
  - `export const SKILL_COUNT = 30;`

Convention pinned: the camera looks down the −z axis, so **positive z is toward the viewer** (front icons have `z > 0`, larger `scale`, larger `depthOpacity`).

- [ ] **Step 1: Write the failing test** `src/lib/skillsGlobe.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { SKILL_COUNT, depthOpacity, fibonacciSphere, project, rotate } from './skillsGlobe';

const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

describe('fibonacciSphere', () => {
  it(`returns ${SKILL_COUNT} distinct unit points`, () => {
    const pts = fibonacciSphere(SKILL_COUNT);
    expect(pts).toHaveLength(SKILL_COUNT);
    for (const p of pts) expect(close(Math.hypot(p.x, p.y, p.z), 1)).toBe(true);
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++)
        expect(close(pts[i].x, pts[j].x, 1e-6) && close(pts[i].y, pts[j].y, 1e-6) && close(pts[i].z, pts[j].z, 1e-6)).toBe(false);
  });
  it('evenly covers the sphere (min pairwise separation > 0.2 rad at N=30)', () => {
    const pts = fibonacciSphere(30);
    let minSep = Infinity;
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++)
        minSep = Math.min(minSep, Math.acos(Math.max(-1, Math.min(1, pts[i].x * pts[j].x + pts[i].y * pts[j].y + pts[i].z * pts[j].z))));
    expect(minSep).toBeGreaterThan(0.2); // ~11.5°
  });
});

describe('rotate', () => {
  it('positive angleY maps +x toward −z (camera on −z, front = +z)', () => {
    const r = rotate({ x: 1, y: 0, z: 0 }, Math.PI / 2, 0);
    expect(close(r.x, 0)).toBe(true);
    expect(close(r.y, 0)).toBe(true);
    expect(close(r.z, -1)).toBe(true);
  });
  it('angleX tilts y into z', () => {
    const r = rotate({ x: 0, y: 1, z: 0 }, 0, Math.PI / 2);
    expect(close(r.y, 0)).toBe(true);
    expect(close(r.z, 1)).toBe(true);
  });
});

describe('project', () => {
  const opts = { radius: 100, fov: 220, cx: 300, cy: 300 };
  it('front points (z>0) project larger than back points', () => {
    const front = project({ x: 0, y: 0, z: 1 }, opts);
    const back = project({ x: 0, y: 0, z: -1 }, opts);
    expect(front.scale).toBeGreaterThan(back.scale);
    expect(front.x).toBeCloseTo(300);
    expect(back.scale).toBeLessThan(1);
    expect(front.scale).toBeGreaterThan(1);
  });
  it('depthOpacity is monotonic with the pinned endpoints', () => {
    expect(depthOpacity(1)).toBeCloseTo(1);
    expect(depthOpacity(-1)).toBeCloseTo(0.22);
    expect(depthOpacity(0.5)).toBeGreaterThan(depthOpacity(-0.5));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/skillsGlobe.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/skillsGlobe.ts`**

Fibonacci sphere: for `i` in `[0, count)`: `phi = Math.acos(1 - 2 * (i + 0.5) / count)`, `theta = i * 2.39996322972865332` (golden angle); `x = Math.sin(phi) * Math.cos(theta)`, `y = Math.cos(phi)`, `z = Math.sin(phi) * Math.sin(theta)`. Rotation: Y-rotate first (`x' = x·cosθ + z·sinθ`, `z' = −x·sinθ + z·cosθ`), then X-rotate (`y' = y·cosφ − z·sinφ`, `z' = y·sinφ + z·cosφ`). `project` and `depthOpacity` exactly as specified in Interfaces.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/skillsGlobe.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/skillsGlobe.ts src/lib/skillsGlobe.test.ts
git commit -m "feat: skills globe sphere math"
```

### Task 2: Icon map (`src/lib/skillIcons.ts`)

**Files:**
- Create: `src/lib/skillIcons.ts`
- Test: `src/lib/skillIcons.test.ts`

**Interfaces:**
- Consumes: `profile.skillGroups` from `src/data/profile.ts` (read-only).
- Produces (used by Tasks 3–4):
  - `export type SkillIcon = { kind: 'brand' | 'glyph'; path?: string; svg?: string }` — `path` is a single SVG `d` string for a 24x24 viewBox (simple-icons); `svg` is a complete inline `<svg>…</svg>` string (devicon multi-element or glyph markup).
  - `export const SKILL_ICONS: Record<string, SkillIcon>` — keyed by the exact `skillGroups` item strings.
  - `export function iconForSkill(skill: string): SkillIcon | undefined`
  - `export const GLOBE_SKILLS: { label: string; group: string }[]` — flattened from `profile.skillGroups` in group order (30 entries), used to seed the globe.

Icon assignment (verified against simple-icons v13 CDN, 2026-11-07):

- **simple-icons** (`https://cdn.jsdelivr.net/npm/simple-icons@13/icons/<slug>.svg`, take the single `d="…"` path): `python`, `typescript`, `javascript`, `fastapi`, `flask`, `openapiinitiative` (REST API design), `react`, `vite`, `duckdb`, `mysql`, `clickhouse`, `snowflake`, `sqlite`, `apacheparquet` (Parquet), `kubernetes`, `docker`, `githubactions` (GitHub Actions CI/CD), `git`, `githubcopilot` (Copilot).
- **devicon** (`https://cdn.jsdelivr.net/gh/devicons/devicon/icons/<name>/<name>-original.svg`): `zustand/zustand-original` for Zustand (inline as `svg`). MSSQL: try `mssql/mssql-original` — if it 404s/403s, fall back to the glyph.
- **Hand-drawn glyphs** (stroke-based, 24x24, drawn to match the repo's minimal icon style — one per entry, `kind: 'glyph'`): `LLM agents` (chat bubble + spark), `tool calling` (plug), `multi-agent orchestration` (three connected nodes), `RAG` (document + sparkle), `evals (golden sets, promptfoo, deepeval)` (gauge), `numeric grounding` (anchor over 123 strokes), `SQL` (database cylinder), `Vertica` (database cylinder + V), `Power Automate` (flow arrows), and `MSSQL` fallback (layered database).

- [ ] **Step 1: Write the failing test** `src/lib/skillIcons.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { profile } from '../data/profile';
import { GLOBE_SKILLS, SKILL_ICONS, iconForSkill } from './skillIcons';

describe('SKILL_ICONS', () => {
  it('covers every skill in profile.skillGroups', () => {
    for (const group of profile.skillGroups)
      for (const item of group.items)
        expect(SKILL_ICONS[item], `missing icon for "${item}"`).toBeDefined();
  });
  it('every entry is a usable 24x24 icon', () => {
    for (const [key, icon] of Object.entries(SKILL_ICONS)) {
      if (icon.kind === 'brand') expect(icon.path?.length ?? 0, key).toBeGreaterThan(20);
      else expect(icon.svg ?? icon.path, key).toBeTruthy();
    }
  });
  it('GLOBE_SKILLS flattens the groups in order with 30 entries', () => {
    expect(GLOBE_SKILLS).toHaveLength(30);
    expect(GLOBE_SKILLS[0]).toEqual({ label: profile.skillGroups[0].items[0], group: profile.skillGroups[0].label });
    expect(iconForSkill('Python')?.kind).toBe('brand');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/skillIcons.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Vendor icon path data and implement `src/lib/skillIcons.ts`**

Fetch each simple-icons slug listed above (curl the CDN URL, extract the `d` attribute; note the exact `d` value in the module as a `path`). Fetch the devicon Zustand SVG (and try MSSQL). Write the glyph SVGs by hand. Build `SKILL_ICONS` keyed by the 30 exact strings from `profile.skillGroups`; derive `GLOBE_SKILLS` from `profile.skillGroups` at module scope (do not hardcode the list — derive it, so the completeness test stays meaningful).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/skillIcons.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/skillIcons.ts src/lib/skillIcons.test.ts
git commit -m "feat: skill icon map for the skills globe"
```

### Task 3: Globe island (`src/components/SkillsGlobe.tsx` + `SkillsGlobe.astro`)

**Files:**
- Create: `src/components/SkillsGlobe.tsx`
- Create: `src/components/SkillsGlobe.astro`
- Test: `src/components/SkillsGlobe.test.tsx`

**Interfaces:**
- Consumes: `fibonacciSphere`, `rotate`, `project`, `depthOpacity`, `SKILL_COUNT` from `src/lib/skillsGlobe`; `iconForSkill` from `src/lib/skillIcons`.
- Produces (used by Task 4):
  - `export interface GlobeItem { label: string; group: string }`
  - `export default function SkillsGlobe({ items }: { items: GlobeItem[] })` — renders the animated globe; `items` comes from `GLOBE_SKILLS` (Task 4 passes it).
  - `SkillsGlobe.astro` takes no props; it imports `GLOBE_SKILLS` itself and renders `<SkillsGlobeIsland client:idle items={GLOBE_SKILLS} />` inside `<div class="globe">` (mirror `HeroGraph.astro`).

**Markup contract (what the static render must contain — this is what the test pins):**

```html
<div class="globe">
  <canvas class="globe-wire" aria-hidden="true"></canvas>
  <div class="globe-nodes" aria-hidden="true">
    <!-- one per item, in items order: -->
    <div class="globe-node"><svg viewBox="0 0 24 24" …>…</svg><span class="globe-label">LABEL</span></div>
  </div>
  <ul class="sr-only">
    <!-- one <li> per item, "label (group)" -->
  </ul>
</div>
```

**Behavior contract (client-side, verified by reading in review — not unit-testable without jsdom):**

- On mount: measure the container (`ResizeObserver` + `devicePixelRatio`-aware canvas sizing; radius = `min(w, h) * 0.42`, `fov = radius * 2.2`, center = container center).
- Build the node list from `fibonacciSphere(items.length)`, one point per item in order.
- rAF loop: advance `angleY` by `0.00035 * dt` (ms) — about one revolution per 5 minutes; fixed `angleX = 0.35`. For each item: `rotate` → `project` → set `node.style.transform = translate(x px, y px) translate(-50%, -50%) scale(clamp(scale, 0.6, 1.3))`, `node.style.opacity = depthOpacity(z)`, `node.style.zIndex = z > 0 ? '2' : '1'`.
- Canvas wireframe: 140 fibonacci dots at alpha 0.15 plus 4 latitude rings and 6 longitude rings stroked at alpha 0.08, using the same rotate/project pipeline and `--color-rule`-ish stroke color (read from CSS var once per resize).
- Pause: `IntersectionObserver` on the container (render one frame then stop when off-screen; resume on re-entry) and `visibilitychange` (stop when `document.hidden`).
- Reduced motion: if `matchMedia('(prefers-reduced-motion: reduce)').matches`, render exactly one static frame at `ry = -0.6, rx = 0.35` and attach no loop or observers beyond one resize handler.

- [ ] **Step 1: Write the failing test** `src/components/SkillsGlobe.test.tsx`

Follow the `HeroGraph.test.tsx` style: `renderToStaticMarkup`, count occurrences.

```tsx
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import SkillsGlobe from './SkillsGlobe';
import { GLOBE_SKILLS } from '../lib/skillIcons';

const html = renderToStaticMarkup(<SkillsGlobe items={GLOBE_SKILLS} />);
const count = (needle: string) => html.split(needle).length - 1;

describe('SkillsGlobe static markup', () => {
  it('renders one node per item with its label', () => {
    expect(count('class="globe-node"')).toBe(GLOBE_SKILLS.length);
    for (const item of GLOBE_SKILLS) expect(html).toContain(item.label);
  });
  it('renders an icon svg in every node', () => {
    expect(count('<svg')).toBe(GLOBE_SKILLS.length);
  });
  it('keeps the animated structure aria-hidden and exposes a plain list', () => {
    expect(count('aria-hidden="true"')).toBeGreaterThanOrEqual(2);
    expect(count('<li>')).toBe(GLOBE_SKILLS.length);
    expect(html).toContain('sr-only');
  });
  it('renders the wireframe canvas', () => {
    expect(count('<canvas class="globe-wire"')).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/SkillsGlobe.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `SkillsGlobe.tsx` and `SkillsGlobe.astro`**

Follow the contract above. Keep all animation logic in `useEffect`; the static render is only the markup contract. Icon per node: `const icon = iconForSkill(item.label)` → `kind === 'brand'` renders `<svg viewBox="0 0 24 24"><path d={icon.path}/></svg>`, else injects `icon.svg` via `dangerouslySetInnerHTML`. Label: uppercase via CSS (`text-transform`), rendered as the item's exact string in markup.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/SkillsGlobe.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/SkillsGlobe.tsx src/components/SkillsGlobe.astro src/components/SkillsGlobe.test.tsx
git commit -m "feat: skills globe island"
```

### Task 4: Section, styles, wiring (`src/components/Skills.astro`, `global.css`, `index.astro`)

**Files:**
- Create: `src/components/Skills.astro`
- Modify: `src/styles/global.css` (append a `/* skills globe */` block)
- Modify: `src/pages/index.astro:5-21` (import + insert)

**Interfaces:**
- Consumes: `SkillsGlobe.astro` (Task 3), `GLOBE_SKILLS` (Task 2), section classes `.s`/`.sh`/`.eyebrow` and heading gradient treatment from `global.css`.
- Produces: the `<Skills />` section on the home page.

**Section markup (pin):**

```astro
---
import SkillsGlobe from './SkillsGlobe.astro';
const groups = [...new Set(GLOBE_SKILLS.map((s) => s.group))];  // import GLOBE_SKILLS from '../lib/skillIcons'
---
<section class="s" id="skills">
  <header class="sh">
    <p class="eyebrow">Tech Stack</p>
    <h2>My <span class="grad">Skills</span></h2>
  </header>
  <SkillsGlobe />
  <p class="skills-legend">
    {groups.map((g) => <span class="skills-legend-chip">{g}</span>)}
  </p>
</section>
```

**Styles to add to `global.css` (pin behavior, let the implementer write the exact rules):**

- `.globe` — centered, `width: min(560px, 92vw)`, `aspect-ratio: 1`, `position: relative`, `margin-inline: auto`.
- `.globe-wire` — absolute, fills the container; canvas sized by the island's ResizeObserver with dPR scaling.
- `.globe-node` — absolute at `0 0` (positioned entirely by JS transform), `display: flex; flex-direction: column; align-items: center; gap: 6px; pointer-events: none; will-change: transform, opacity;`
- `.globe-node svg` — `width: clamp(22px, 4.5vw, 34px)`; brand paths `fill: currentColor`; glyph `svg` keeps its own strokes.
- `.globe-label` — `font: 500 10px var(--font-mono); letter-spacing: .12em; text-transform: uppercase; color: var(--color-fg);`
- `.skills-legend-chip` — reuse the existing chip styling pattern from the home page.
- Add a `.sr-only` utility (the repo has none): visually hidden but screen-reader accessible.
- Mobile: at `max-width: 640px` shrink the globe and hide labels behind the front hemisphere is NOT required — instead let labels scale down and overlap gracefully; no horizontal scroll.

- [ ] **Step 1: Write the failing test** `src/components/Skills.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Skills section', () => {
  const astro = readFileSync(new URL('./Skills.astro', import.meta.url), 'utf8');
  it('follows the section convention and wires the globe', () => {
    expect(astro).toContain('<section class="s" id="skills">');
    expect(astro).toContain('class="eyebrow"');
    expect(astro).toContain('<SkillsGlobe />');
    expect(astro).toContain('class="grad"');
  });
  it('is wired into the home page after ProjectCards', () => {
    const index = readFileSync(new URL('../pages/index.astro', import.meta.url), 'utf8');
    expect(index.indexOf('<ProjectCards />')).toBeLessThan(index.indexOf('<Skills />'));
    expect(index).toContain("import Skills from '../components/Skills.astro'");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/Skills.test.tsx`
Expected: FAIL (Skills.astro missing).

- [ ] **Step 3: Implement `Skills.astro`, the CSS block, and the `index.astro` wiring**

As pinned above.

- [ ] **Step 4: Run the full suite and the build gate**

Run: `npm test`
Expected: PASS (all pre-existing tests still pass).

Run: `npm run build`
Expected: PASS, including `scripts/check-build.mjs` (no broken links, no uncleared content).

- [ ] **Step 5: Visual check in both themes**

Run: `npm run dev`, open the home page, scroll to `#skills`. Verify: globe rotates slowly, front icons vivid + back icons dimmed, labels legible, no horizontal scroll at 320px width, light AND dark `data-theme` modes both readable, reduced-motion emulation (`prefers-reduced-motion: reduce` in devtools) shows a static frame.

- [ ] **Step 6: Commit**

```bash
git add src/components/Skills.astro src/components/Skills.test.tsx src/styles/global.css src/pages/index.astro
git commit -m "feat: skills globe section on the home page"
```

