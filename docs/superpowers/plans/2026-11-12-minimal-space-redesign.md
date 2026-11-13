# Minimal Space Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the feature-heavy portfolio with a minimal single-column site over a layered, animated, cursor-parallax space scene, with an Experience page and a ⌘K command menu.

**Architecture:** Astro 7 static site with React islands, rebuilt in place on branch `redesign/minimal`. The scene is procedural CSS (stars, drifting nebula blobs, flyers) plus two generated opaque images; behavior lives in small pure libs (`stars`, `parallax`, `flyers`, `scramble`, `contributions`, `commands`) that are unit tested, with thin DOM drivers. Tokens keep their names with dark values so work pages, demos, and the terminal inherit the look.

**Tech Stack:** Astro 7, React 19, TypeScript, Vitest 4 (node environment, `renderToStaticMarkup` for components, no jsdom), plain CSS.

**Spec:** `docs/superpowers/specs/2026-11-12-minimal-space-redesign-design.md`

## Global Constraints

- Repo root: `/Users/andrianthan/Desktop/projects/portfolio`. Branch `redesign/minimal`. Baseline before this plan: `npm test` = 32 files, 360 tests, all passing.
- Dark-only. `color-scheme: dark`. No light theme, no `data-theme`, no theme toggle.
- Column width on home: 640px (`--measure: 40rem`). Side gutters 24px on mobile.
- Motion: only `transform` and `opacity` animate in the scene. Everything is off under `prefers-reduced-motion: reduce`. Max 3 concurrent flyers. Parallax max shift 14px.
- `npm run build` runs `scripts/check-build.mjs`. It requires: a `/terminal` route and a link `href="/terminal"` in built HTML; no `[to confirm` text anywhere in `dist`; no `<img>` without `alt`; no broken local `href`/`src`; no body text of non-cleared entries in `dist`; valid `agent-data.json`.
- Only `cleared: true` work entries (Hanna Center, Blue Dome) get `/work/<slug>` pages. Tesla and Micron are listed but not cleared: never link to them, never print their bodies.
- Never fabricate data. If the contributions fetch fails, omit the card.
- Commit after every task. Commit messages end with: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`
- Do not touch: `src/agent/*` except where a task says so, `src/content/work/*.md`, `src/components/{hanna,qa,imgsearch,guide}/**`, `scripts/**`, `vercel.json`.
- Test command: `npm test`. Single file: `npx vitest run <path>`.

---

### Task 1: Dark-only tokens, Base layout, Detail layout

**Files:**
- Modify: `src/styles/tokens.css` (full rewrite)
- Modify: `src/layouts/Base.astro`
- Modify: `src/layouts/Detail.astro`
- Create: `src/styles/tokens.test.ts`

**Interfaces:**
- Produces: tokens `--font-serif`, `--scene-deep`, `--scene-mid`, `--scene-bright`, `--scene-glow` plus every existing token name (`--color-bg`, `--color-fg`, `--color-muted`, `--color-rule`, `--color-accent`, `--color-num`, `--color-chip`, `--color-card`, `--color-dot`, `--color-glow`, `--color-logo-bg`, `--color-glass`, `--color-mask`, `--grad-a`, `--grad-b`, `--space-*`, `--measure`, `--font-sans`, `--font-mono`).
- Produces: `Base.astro` props `scene?: boolean` (default `true`) and `menu?: boolean` (default `true`). Later tasks hang `<Background />` (Task 3) and `<CommandMenu />` (Task 8) off these.

- [ ] **Step 1: Write the failing test**

Create `src/styles/tokens.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');

function hex(name: string): string {
  const m = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  if (!m) throw new Error(`missing hex token --${name}`);
  return m[1].toLowerCase();
}

function luminance(h: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('tokens', () => {
  it('is dark only', () => {
    expect(css).toContain('color-scheme: dark');
    expect(css).not.toContain('data-theme');
    expect(css).not.toContain('prefers-color-scheme');
  });

  it('keeps every token name the rest of the site reads', () => {
    for (const name of [
      'font-sans', 'font-serif', 'font-mono', 'color-bg', 'color-fg', 'color-muted', 'color-rule',
      'color-accent', 'color-num', 'color-chip', 'color-card', 'color-dot', 'color-glow',
      'color-logo-bg', 'color-glass', 'color-mask', 'grad-a', 'grad-b', 'space-sm', 'space-md',
      'space-lg', 'space-xl', 'measure', 'scene-deep', 'scene-mid', 'scene-bright', 'scene-glow',
    ]) {
      expect(css, `--${name}`).toMatch(new RegExp(`--${name}:`));
    }
  });

  it('keeps text readable against the brightest expected scene color', () => {
    const bright = hex('scene-bright');
    expect(contrast(hex('color-fg'), bright)).toBeGreaterThanOrEqual(7);
    expect(contrast(hex('color-muted'), bright)).toBeGreaterThanOrEqual(4.5);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/styles/tokens.test.ts`
Expected: FAIL (`color-scheme: dark` missing).

- [ ] **Step 3: Rewrite `src/styles/tokens.css`**

```css
:root {
  color-scheme: dark;
  --font-sans: Inter, ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Instrument Serif", ui-serif, Georgia, serif;
  --font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;

  --color-bg: #07050f; --color-fg: #f4f3fb; --color-muted: #b8b8d0; --color-rule: rgba(255, 255, 255, .14);
  --color-accent: #b9a4ff; --color-num: #c4b2ff; --color-chip: rgba(255, 255, 255, .07);
  --color-card: rgba(14, 11, 28, .72); --color-dot: rgba(255, 255, 255, .06);
  --color-glow: rgba(139, 92, 246, .25); --color-logo-bg: #ffffff;
  --color-glass: rgba(255, 255, 255, .07); --color-mask: #000;
  --grad-a: #a78bfa; --grad-b: #f472b6;

  --scene-deep: #07050f; --scene-mid: #1b1140; --scene-bright: #3b2c7d; --scene-glow: #7c4dff;

  --space-sm: 8px; --space-md: 16px; --space-lg: 32px; --space-xl: 96px;
  --measure: 40rem;
}
```

- [ ] **Step 4: Edit `src/layouts/Base.astro`**

Change the Props line and destructure to add `scene` and `menu`:

```astro
interface Props { title: string; description?: string; ogImage?: string; path?: string; scene?: boolean; menu?: boolean }
const { title, description = 'Andrian Than, software engineer building AI agents.', ogImage = '/og.png', path = Astro.url.pathname, scene = true, menu = true } = Astro.props;
```

Replace the Google Fonts `<link href=...>` with one that adds Instrument Serif italic:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@1&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

Replace the inline script with (theme logic removed, `js` class kept):

```html
<script is:inline>document.documentElement.classList.add('js');</script>
```

Leave `<slot />`, `<Analytics />`, and the two script imports as they are for now (Task 9 removes them). `scene` and `menu` are destructured but unused until Tasks 3 and 8.

- [ ] **Step 5: Edit `src/layouts/Detail.astro`**

Remove the line `import ThemeToggle from '../components/ThemeToggle.tsx';` and change the header line to:

```astro
<div class="wide"><header class="bar"><a href={backHref}>← {backLabel}</a></header></div>
```

- [ ] **Step 6: Run tests and build**

Run: `npx vitest run src/styles/tokens.test.ts` → PASS.
Run: `npm test` → all pass (some old CSS still references removed light tokens; no test reads them).
Run: `npm run build` → `check-build: ok`.

- [ ] **Step 7: Commit**

```bash
git add src/styles/tokens.css src/styles/tokens.test.ts src/layouts/Base.astro src/layouts/Detail.astro
git commit -m "feat: dark-only tokens and layouts without the theme toggle

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Scene logic libs (stars, parallax, flyers, scramble)

**Files:**
- Create: `src/lib/stars.ts`, `src/lib/stars.test.ts`
- Create: `src/lib/parallax.ts`, `src/lib/parallax.test.ts`
- Create: `src/lib/flyers.ts`, `src/lib/flyers.test.ts`
- Create: `src/lib/scramble.ts`, `src/lib/scramble.test.ts`

**Interfaces (all pure, no DOM):**
- `stars.ts`: `mulberry32(seed: number): () => number`; `starShadows(count: number, seed: number, width?: number, height?: number, color?: string): string` (CSS `box-shadow` list).
- `parallax.ts`: `interface Pointer { x: number; y: number }` (each -1..1); `MAX_SHIFT_PX = 14`; `normalizePointer(clientX, clientY, width, height): Pointer`; `ease(current: Pointer, target: Pointer, k?: number): Pointer`; `settled(a: Pointer, b: Pointer, eps?: number): boolean`; `shiftPx(p: Pointer): { x: number; y: number }`.
- `flyers.ts`: `type FlyerKind = 'shooting-star' | 'comet' | 'ship'`; `interface Flyer { kind; topPct: number; durationMs: number; fromLeft: boolean; scale: number }`; `MAX_FLYERS = 3`; `nextSpawnDelay(rand): number`; `makeFlyer(rand): Flyer`.
- `scramble.ts`: `scrambleFrame(target: string, progress: number, rand: () => number): string`.

- [ ] **Step 1: Write the four failing test files**

`src/lib/stars.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mulberry32, starShadows } from './stars';

describe('stars', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    expect(starShadows(20, 7)).toBe(starShadows(20, 7));
    expect(starShadows(20, 7)).not.toBe(starShadows(20, 8));
  });

  it('emits exactly count shadows inside the box', () => {
    const out = starShadows(50, 3, 1000, 600, '#fff');
    const parts = out.split(', ');
    expect(parts).toHaveLength(50);
    for (const part of parts) {
      const [x, y, color] = part.split(' ');
      expect(parseInt(x, 10)).toBeGreaterThanOrEqual(0);
      expect(parseInt(x, 10)).toBeLessThan(1000);
      expect(parseInt(y, 10)).toBeGreaterThanOrEqual(0);
      expect(parseInt(y, 10)).toBeLessThan(600);
      expect(color).toBe('#fff');
    }
  });

  it('mulberry32 yields values in [0, 1)', () => {
    const rand = mulberry32(42);
    for (let i = 0; i < 200; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
```

`src/lib/parallax.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { MAX_SHIFT_PX, ease, normalizePointer, settled, shiftPx } from './parallax';

describe('parallax', () => {
  it('normalizes the pointer to -1..1 and clamps', () => {
    expect(normalizePointer(0, 0, 100, 200)).toEqual({ x: -1, y: -1 });
    expect(normalizePointer(100, 200, 100, 200)).toEqual({ x: 1, y: 1 });
    expect(normalizePointer(50, 100, 100, 200)).toEqual({ x: 0, y: 0 });
    expect(normalizePointer(500, -500, 100, 200)).toEqual({ x: 1, y: -1 });
  });

  it('returns the origin for a zero-sized viewport', () => {
    expect(normalizePointer(10, 10, 0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('eases toward the target and eventually settles', () => {
    let p = { x: 0, y: 0 };
    const target = { x: 1, y: -1 };
    p = ease(p, target, 0.5);
    expect(p).toEqual({ x: 0.5, y: -0.5 });
    for (let i = 0; i < 80; i++) p = ease(p, target);
    expect(settled(p, target)).toBe(true);
  });

  it('maps the pointer to a pixel shift capped at the maximum', () => {
    expect(shiftPx({ x: 1, y: -1 })).toEqual({ x: MAX_SHIFT_PX, y: -MAX_SHIFT_PX });
    expect(shiftPx({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(MAX_SHIFT_PX).toBe(14);
  });
});
```

`src/lib/flyers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { MAX_FLYERS, makeFlyer, nextSpawnDelay } from './flyers';

const fixed = (v: number) => () => v;

describe('flyers', () => {
  it('spawns between 2.5s and 9s apart', () => {
    expect(nextSpawnDelay(fixed(0))).toBe(2500);
    expect(nextSpawnDelay(fixed(0.999999))).toBeLessThan(9000);
    expect(nextSpawnDelay(fixed(0.999999))).toBeGreaterThan(8900);
  });

  it('picks the kind from the roll: mostly shooting stars, then comets, then ships', () => {
    expect(makeFlyer(fixed(0.1)).kind).toBe('shooting-star');
    expect(makeFlyer(fixed(0.7)).kind).toBe('comet');
    expect(makeFlyer(fixed(0.9)).kind).toBe('ship');
  });

  it('keeps every flyer in the upper part of the sky with a sane duration and scale', () => {
    for (const roll of [0, 0.3, 0.6, 0.85, 0.999]) {
      const f = makeFlyer(fixed(roll));
      expect(f.topPct).toBeGreaterThanOrEqual(4);
      expect(f.topPct).toBeLessThanOrEqual(60);
      expect(f.scale).toBeGreaterThanOrEqual(0.7);
      expect(f.scale).toBeLessThanOrEqual(1.3);
      expect(f.durationMs).toBeGreaterThan(0);
    }
  });

  it('shooting stars are fast and ships are slow', () => {
    expect(makeFlyer(fixed(0.1)).durationMs).toBeLessThan(2000);
    expect(makeFlyer(fixed(0.9)).durationMs).toBeGreaterThan(20000);
  });

  it('caps concurrency at 3', () => {
    expect(MAX_FLYERS).toBe(3);
  });
});
```

`src/lib/scramble.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { scrambleFrame } from './scramble';

const rand = () => 0.5;

describe('scrambleFrame', () => {
  const target = "Hey, I'm Andrian";

  it('returns the target at full progress', () => {
    expect(scrambleFrame(target, 1, rand)).toBe(target);
  });

  it('keeps the length and the spaces and punctuation at zero progress', () => {
    const out = scrambleFrame(target, 0, rand);
    expect(out).toHaveLength(target.length);
    for (let i = 0; i < target.length; i++) {
      if (/[\s,.'’]/.test(target[i])) expect(out[i]).toBe(target[i]);
      else expect(out[i]).not.toBe(target[i]);
    }
  });

  it('settles the leading characters first', () => {
    const out = scrambleFrame(target, 0.5, rand);
    expect(out.slice(0, 8)).toBe(target.slice(0, 8));
  });

  it('clamps progress outside 0..1', () => {
    expect(scrambleFrame(target, 5, rand)).toBe(target);
    expect(scrambleFrame(target, -5, rand)).toHaveLength(target.length);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/stars.test.ts src/lib/parallax.test.ts src/lib/flyers.test.ts src/lib/scramble.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement the libs**

`src/lib/stars.ts`:

```ts
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A CSS box-shadow list that paints `count` stars on a width x height tile. */
export function starShadows(count: number, seed: number, width = 2560, height = 1600, color = '#fff'): string {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, () => `${Math.floor(rand() * width)}px ${Math.floor(rand() * height)}px ${color}`).join(', ');
}
```

`src/lib/parallax.ts`:

```ts
export interface Pointer { x: number; y: number }

export const MAX_SHIFT_PX = 14;

const clamp1 = (n: number) => Math.max(-1, Math.min(1, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

export function normalizePointer(clientX: number, clientY: number, width: number, height: number): Pointer {
  if (!width || !height) return { x: 0, y: 0 };
  return { x: clamp1((clientX / width) * 2 - 1), y: clamp1((clientY / height) * 2 - 1) };
}

export function ease(current: Pointer, target: Pointer, k = 0.08): Pointer {
  return { x: current.x + (target.x - current.x) * k, y: current.y + (target.y - current.y) * k };
}

export function settled(a: Pointer, b: Pointer, eps = 0.001): boolean {
  return Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps;
}

export function shiftPx(p: Pointer): { x: number; y: number } {
  return { x: round2(p.x * MAX_SHIFT_PX), y: round2(p.y * MAX_SHIFT_PX) };
}
```

`src/lib/flyers.ts`:

```ts
export type FlyerKind = 'shooting-star' | 'comet' | 'ship';

export interface Flyer {
  kind: FlyerKind;
  topPct: number;
  durationMs: number;
  fromLeft: boolean;
  scale: number;
}

export const MAX_FLYERS = 3;

export function nextSpawnDelay(rand: () => number): number {
  return 2500 + Math.floor(rand() * 6500);
}

export function makeFlyer(rand: () => number): Flyer {
  const roll = rand();
  const kind: FlyerKind = roll < 0.55 ? 'shooting-star' : roll < 0.8 ? 'comet' : 'ship';
  const durationMs =
    kind === 'shooting-star' ? 900 + Math.floor(rand() * 700)
    : kind === 'comet' ? 14000 + Math.floor(rand() * 8000)
    : 22000 + Math.floor(rand() * 14000);
  return {
    kind,
    topPct: Math.round((4 + rand() * 56) * 10) / 10,
    durationMs,
    fromLeft: rand() < 0.5,
    scale: Math.round((0.7 + rand() * 0.6) * 100) / 100,
  };
}
```

`src/lib/scramble.ts`:

```ts
const GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789#%&*+=?';
const KEEP = /[\s,.'’]/;

/** One frame of the greeting scramble: the first `progress` share of the text has settled. */
export function scrambleFrame(target: string, progress: number, rand: () => number): string {
  const p = Math.max(0, Math.min(1, progress));
  const settledCount = Math.floor(target.length * p);
  return Array.from(target)
    .map((ch, i) => {
      if (i < settledCount || KEEP.test(ch)) return ch;
      let g = GLYPHS[Math.floor(rand() * GLYPHS.length)];
      if (g === ch.toLowerCase()) g = g === '#' ? '%' : '#';
      return g;
    })
    .join('');
}
```

Note: the scramble test uses `rand = () => 0.5` which picks one fixed glyph (`GLYPHS[21]` = `v`). Target letters that happen to equal that glyph would collide, which is why the `g === ch.toLowerCase()` guard swaps it. Keep the guard.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/stars.test.ts src/lib/parallax.test.ts src/lib/flyers.test.ts src/lib/scramble.test.ts`
Expected: PASS (all four files).

- [ ] **Step 5: Commit**

```bash
git add src/lib/stars.ts src/lib/stars.test.ts src/lib/parallax.ts src/lib/parallax.test.ts src/lib/flyers.ts src/lib/flyers.test.ts src/lib/scramble.ts src/lib/scramble.test.ts
git commit -m "feat: pure libs for the scene (stars, parallax, flyers, scramble)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Scene component, CSS, driver, wired into Base

**Files:**
- Create: `src/components/Background.astro`
- Create: `src/styles/scene.css`
- Create: `src/styles/scene.test.ts`
- Create: `src/scripts/scene.ts`
- Modify: `src/layouts/Base.astro`
- Modify: `src/pages/terminal.astro` (pass `scene={false} menu={false}`)

**Interfaces:**
- Consumes: `starShadows` (Task 2), `normalizePointer`, `ease`, `settled`, `shiftPx` (Task 2), `makeFlyer`, `nextSpawnDelay`, `MAX_FLYERS` (Task 2), `Base` props `scene`/`menu` (Task 1).
- Produces: DOM root `.scene` with CSS vars `--px`/`--py` set by the driver; layer elements carry `--depth`; flyer elements get class `flyer <kind>` and vars `--top --dur --x0 --x1 --rot --s`; a `.flyers` container.

- [ ] **Step 1: Write the failing CSS test**

Create `src/styles/scene.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/scene.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

function block(text: string, start: number): string {
  const open = text.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return text.slice(open + 1, i);
  }
  throw new Error('unterminated block');
}

describe('scene css', () => {
  it('animates only transform and opacity in every keyframe', () => {
    const re = /@keyframes\s+[\w-]+\s*\{/g;
    let m: RegExpExecArray | null;
    let seen = 0;
    while ((m = re.exec(css))) {
      seen++;
      const body = block(css, m.index);
      const props = [...body.matchAll(/([a-z-]+)\s*:/g)].map((x) => x[1]);
      for (const prop of props) expect(['transform', 'opacity'], `${prop} in a keyframe`).toContain(prop);
    }
    expect(seen).toBeGreaterThanOrEqual(5);
  });

  it('switches every animation and the parallax off under reduced motion', () => {
    const start = css.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(start).toBeGreaterThan(-1);
    const body = block(css, start);
    expect(body).toContain('animation: none');
    expect(body).toContain('.flyers');
    expect(body).toMatch(/\.layer[^{]*\{[^}]*transform:\s*none/);
  });

  it('shifts layers opposite to the pointer, scaled by depth', () => {
    expect(css).toContain('calc(var(--px) * var(--depth) * -1)');
    expect(css).toContain('calc(var(--py) * var(--depth) * -1)');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/styles/scene.test.ts` → FAIL (file missing).

- [ ] **Step 3: Create `src/styles/scene.css`**

```css
/* The scene: fixed, behind everything. Layers back to front: sky, far stars, mid stars, nebula blobs,
   near stars, flyers, horizon, vignette. Only transform and opacity animate. */
.scene {
  position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none;
  background: radial-gradient(120% 80% at 50% 0%, var(--scene-mid) 0%, var(--scene-deep) 70%), var(--scene-deep);
  --px: 0px; --py: 0px;
}
.scene .layer {
  position: absolute; inset: -24px; will-change: transform;
  transform: translate3d(calc(var(--px) * var(--depth) * -1), calc(var(--py) * var(--depth) * -1), 0);
}

.stars { position: absolute; left: 0; top: 0; border-radius: 50%; animation: twinkle var(--tw, 6s) ease-in-out infinite alternate; }
.s-far { width: 1px; height: 1px; --tw: 7s; }
.s-mid { width: 2px; height: 2px; --tw: 5s; }
.s-near { width: 3px; height: 3px; --tw: 4s; }
@keyframes twinkle { from { opacity: .45; } to { opacity: 1; } }

.nebula { position: absolute; border-radius: 50%; }
.n1 { width: 70vmax; height: 50vmax; left: -10vmax; top: -8vmax; background: radial-gradient(closest-side, rgba(124, 77, 255, .5), transparent); animation: drift-a 90s ease-in-out infinite alternate; }
.n2 { width: 60vmax; height: 40vmax; right: -15vmax; top: 10vh; background: radial-gradient(closest-side, rgba(236, 72, 153, .32), transparent); animation: drift-b 120s ease-in-out infinite alternate; }
.n3 { width: 80vmax; height: 45vmax; left: 15vw; bottom: -20vmax; background: radial-gradient(closest-side, rgba(56, 189, 248, .22), transparent); animation: drift-a 150s ease-in-out infinite alternate-reverse; }
@keyframes drift-a { from { transform: translate3d(0, 0, 0); } to { transform: translate3d(6vw, 4vh, 0); } }
@keyframes drift-b { from { transform: translate3d(0, 0, 0); } to { transform: translate3d(-8vw, 6vh, 0); } }

.flyers { position: absolute; inset: 0; }
.flyer { position: absolute; left: 0; top: var(--top); will-change: transform, opacity; }
.flyer.shooting-star { width: 120px; height: 2px; border-radius: 2px; background: linear-gradient(90deg, rgba(255, 255, 255, 0), #fff); animation: shoot var(--dur) linear forwards; }
.flyer.comet { width: 5px; height: 5px; border-radius: 50%; background: #cfe8ff; box-shadow: 0 0 10px 2px rgba(180, 210, 255, .7), -60px -4px 40px 6px rgba(160, 190, 255, .25); animation: glide var(--dur) linear forwards; }
.flyer.ship { width: 10px; height: 3px; border-radius: 2px; background: #9fb4ff; box-shadow: 0 0 8px 2px rgba(159, 180, 255, .5); animation: glide var(--dur) linear forwards; }
.flyer.ship::after { content: ""; position: absolute; right: -2px; top: 0; width: 3px; height: 3px; border-radius: 50%; background: #ff6b6b; animation: blink 1.2s steps(2, jump-none) infinite; }
@keyframes shoot {
  from { transform: translate3d(var(--x0), 0, 0) rotate(var(--rot)) scale(var(--s)); opacity: 0; }
  10% { opacity: 1; }
  to { transform: translate3d(var(--x1), 30vh, 0) rotate(var(--rot)) scale(var(--s)); opacity: 0; }
}
@keyframes glide {
  from { transform: translate3d(var(--x0), 0, 0) scale(var(--s)); opacity: 0; }
  8% { opacity: 1; }
  92% { opacity: 1; }
  to { transform: translate3d(var(--x1), 8vh, 0) scale(var(--s)); opacity: 0; }
}
@keyframes blink { from { opacity: 1; } to { opacity: .15; } }

.horizon { position: absolute; left: 0; right: 0; bottom: 0; height: 40vh; background: radial-gradient(120% 70% at 50% 120%, rgba(124, 77, 255, .45), transparent 60%); }

.scene::after {
  content: ""; position: absolute; inset: 0;
  background: radial-gradient(70% 60% at 50% 30%, rgba(7, 5, 15, .35), transparent 100%), linear-gradient(transparent 60%, rgba(7, 5, 15, .5));
}

@media (prefers-reduced-motion: reduce) {
  .stars, .nebula, .flyer, .flyer::after { animation: none; }
  .flyers { display: none; }
  .scene .layer { transform: none; will-change: auto; }
}
```

The reduced-motion test needs the literal text `animation: none` and a `.layer` rule with `transform: none`. Both are present above.

- [ ] **Step 4: Run the CSS test**

Run: `npx vitest run src/styles/scene.test.ts` → PASS.

- [ ] **Step 5: Create `src/components/Background.astro`**

```astro
---
import { starShadows } from '../lib/stars';
const far = starShadows(140, 11);
const mid = starShadows(70, 23);
const near = starShadows(28, 37);
---
<div class="scene" aria-hidden="true">
  <div class="layer" style="--depth: .22"><div class="stars s-far" style={`box-shadow: ${far}`}></div></div>
  <div class="layer" style="--depth: .4"><div class="stars s-mid" style={`box-shadow: ${mid}`}></div></div>
  <div class="layer" style="--depth: .55">
    <div class="nebula n1"></div><div class="nebula n2"></div><div class="nebula n3"></div>
  </div>
  <div class="layer" style="--depth: .7"><div class="stars s-near" style={`box-shadow: ${near}`}></div></div>
  <div class="flyers"></div>
  <div class="layer" style="--depth: .85"><div class="horizon"></div></div>
</div>
```

- [ ] **Step 6: Create `src/scripts/scene.ts`**

```ts
import { ease, normalizePointer, settled, shiftPx, type Pointer } from '../lib/parallax';
import { MAX_FLYERS, makeFlyer, nextSpawnDelay } from '../lib/flyers';

const root = document.querySelector<HTMLElement>('.scene');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

if (root && !reduced.matches) {
  startParallax(root);
  startFlyers(root.querySelector<HTMLElement>('.flyers'));
}

function startParallax(scene: HTMLElement): void {
  let current: Pointer = { x: 0, y: 0 };
  let target: Pointer = { x: 0, y: 0 };
  let frame = 0;

  const tick = () => {
    frame = 0;
    current = ease(current, target);
    const shift = shiftPx(current);
    scene.style.setProperty('--px', `${shift.x}px`);
    scene.style.setProperty('--py', `${shift.y}px`);
    if (!settled(current, target)) frame = requestAnimationFrame(tick);
  };

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch' || document.hidden) return;
    target = normalizePointer(event.clientX, event.clientY, window.innerWidth, window.innerHeight);
    if (!frame) frame = requestAnimationFrame(tick);
  }, { passive: true });
}

function startFlyers(container: HTMLElement | null): void {
  if (!container) return;
  const spawn = () => {
    if (!document.hidden && container.children.length < MAX_FLYERS) addFlyer(container);
    setTimeout(spawn, nextSpawnDelay(Math.random));
  };
  setTimeout(spawn, nextSpawnDelay(Math.random));
}

function addFlyer(container: HTMLElement): void {
  const f = makeFlyer(Math.random);
  const el = document.createElement('span');
  el.className = `flyer ${f.kind}`;
  const x0 = f.fromLeft ? '-15vw' : '110vw';
  const x1 = f.fromLeft ? '110vw' : '-15vw';
  el.style.setProperty('--top', `${f.topPct}%`);
  el.style.setProperty('--dur', `${f.durationMs}ms`);
  el.style.setProperty('--x0', x0);
  el.style.setProperty('--x1', x1);
  el.style.setProperty('--rot', f.fromLeft ? '20deg' : '160deg');
  el.style.setProperty('--s', String(f.scale));
  el.addEventListener('animationend', (event) => {
    if (event.target === el) el.remove();
  });
  container.appendChild(el);
}
```

- [ ] **Step 7: Wire into `src/layouts/Base.astro`**

Add imports in the frontmatter:

```astro
import '../styles/scene.css';
import Background from '../components/Background.astro';
```

Inside `<body>`, before `<slot />`: `{scene && <Background />}`. After the existing two `<script>` lines add: `<script>import '../scripts/scene.ts';</script>`.

- [ ] **Step 8: Opt the terminal page out**

In `src/pages/terminal.astro` change the opening tag to include `scene={false} menu={false}`:

```astro
<Base
  title="terminal · Andrian Than"
  description="A deterministic agent that answers from this portfolio's published content: rules and retrieval, no LLM."
  path="/terminal"
  scene={false}
  menu={false}
>
```

- [ ] **Step 9: Verify**

Run: `npm test` → all pass. Run: `npm run build` → `check-build: ok`. Run: `grep -c "class=\"scene\"" dist/index.html dist/terminal/index.html` → `1` for index, `0` for terminal.

- [ ] **Step 10: Commit**

```bash
git add src/components/Background.astro src/styles/scene.css src/styles/scene.test.ts src/scripts/scene.ts src/layouts/Base.astro src/pages/terminal.astro
git commit -m "feat: layered animated space scene with cursor parallax and flyers

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Contribution grid (lib + card)

**Files:**
- Create: `src/lib/contributions.ts`, `src/lib/contributions.test.ts`
- Create: `src/components/ContributionCard.astro`

**Interfaces:**
- Produces: `interface ContributionDay { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }`; `interface ContributionGrid { total: number; weeks: (ContributionDay | null)[][] }` (each week has 7 slots, Sunday first, `null` pads the first week); `parseApi(json: unknown): ContributionDay[] | null`; `buildGrid(days: ContributionDay[]): ContributionGrid`; `fetchContributions(user: string, fetchImpl?: typeof fetch): Promise<ContributionGrid | null>`.
- Produces: `ContributionCard.astro` props `{ grid: ContributionGrid | null; handle: string; href: string }`; renders nothing when `grid` is null.

- [ ] **Step 1: Check the public API shape before coding**

Run: `curl -s "https://github-contributions-api.jogruber.de/v4/andrianthan?y=last" | head -c 400`
Expected: JSON with a `contributions` array of `{ "date": "YYYY-MM-DD", "count": n, "level": 0-4 }`. If the shape differs (different key names), adjust only `parseApi` and its test to the real shape. Do not invent fields.

- [ ] **Step 2: Write the failing test**

Create `src/lib/contributions.test.ts` (the data below is synthetic test input, never displayed):

```ts
import { describe, it, expect } from 'vitest';
import { buildGrid, fetchContributions, parseApi, type ContributionDay } from './contributions';

// 2024-01-03 is a Wednesday (weekday 3).
const days: ContributionDay[] = Array.from({ length: 12 }, (_, i) => ({
  date: `2024-01-${String(3 + i).padStart(2, '0')}`,
  count: i,
  level: (i % 5) as 0 | 1 | 2 | 3 | 4,
}));

describe('parseApi', () => {
  it('reads a contributions array', () => {
    expect(parseApi({ contributions: [{ date: '2024-01-03', count: 2, level: 1 }] })).toEqual([
      { date: '2024-01-03', count: 2, level: 1 },
    ]);
  });

  it('rejects anything malformed', () => {
    expect(parseApi(null)).toBeNull();
    expect(parseApi({})).toBeNull();
    expect(parseApi({ contributions: [{ date: 5 }] })).toBeNull();
    expect(parseApi({ contributions: [] })).toBeNull();
  });
});

describe('buildGrid', () => {
  it('sums the total and pads the first week to its weekday', () => {
    const grid = buildGrid(days);
    expect(grid.total).toBe(days.reduce((a, d) => a + d.count, 0));
    expect(grid.weeks[0].slice(0, 3)).toEqual([null, null, null]);
    expect(grid.weeks[0][3]?.date).toBe('2024-01-03');
  });

  it('chunks into weeks of seven, last week may be short of days but keeps 7 slots', () => {
    const grid = buildGrid(days);
    for (const week of grid.weeks) expect(week).toHaveLength(7);
    expect(grid.weeks.flat().filter(Boolean)).toHaveLength(days.length);
  });

  it('sorts unordered input', () => {
    const grid = buildGrid([...days].reverse());
    expect(grid.weeks[0][3]?.date).toBe('2024-01-03');
  });
});

describe('fetchContributions', () => {
  it('returns a grid on success', async () => {
    const f = (async () => new Response(JSON.stringify({ contributions: days }))) as typeof fetch;
    const grid = await fetchContributions('someone', f);
    expect(grid?.total).toBeGreaterThan(0);
  });

  it('returns null on a failed request, a bad status, or bad JSON', async () => {
    expect(await fetchContributions('x', (async () => { throw new Error('down'); }) as typeof fetch)).toBeNull();
    expect(await fetchContributions('x', (async () => new Response('no', { status: 500 })) as typeof fetch)).toBeNull();
    expect(await fetchContributions('x', (async () => new Response('not json')) as typeof fetch)).toBeNull();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run src/lib/contributions.test.ts` → FAIL (module missing).

- [ ] **Step 4: Implement `src/lib/contributions.ts`**

```ts
export type Level = 0 | 1 | 2 | 3 | 4;

export interface ContributionDay { date: string; count: number; level: Level }
export interface ContributionGrid { total: number; weeks: (ContributionDay | null)[][] }

const isLevel = (n: unknown): n is Level => n === 0 || n === 1 || n === 2 || n === 3 || n === 4;

export function parseApi(json: unknown): ContributionDay[] | null {
  const list = (json as { contributions?: unknown } | null)?.contributions;
  if (!Array.isArray(list) || list.length === 0) return null;
  const out: ContributionDay[] = [];
  for (const item of list) {
    const d = item as { date?: unknown; count?: unknown; level?: unknown };
    if (typeof d.date !== 'string' || typeof d.count !== 'number' || !isLevel(d.level)) return null;
    out.push({ date: d.date, count: d.count, level: d.level });
  }
  return out;
}

export function buildGrid(days: ContributionDay[]): ContributionGrid {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const total = sorted.reduce((sum, d) => sum + d.count, 0);
  const lead = sorted.length ? new Date(`${sorted[0].date}T00:00:00Z`).getUTCDay() : 0;
  const slots: (ContributionDay | null)[] = [...Array<null>(lead).fill(null), ...sorted];
  while (slots.length % 7 !== 0) slots.push(null);
  const weeks: (ContributionDay | null)[][] = [];
  for (let i = 0; i < slots.length; i += 7) weeks.push(slots.slice(i, i + 7));
  return { total, weeks };
}

/** Last year of contributions for a public GitHub user, or null on any failure. Never invents data. */
export async function fetchContributions(user: string, fetchImpl: typeof fetch = fetch): Promise<ContributionGrid | null> {
  try {
    const res = await fetchImpl(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(user)}?y=last`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const days = parseApi(await res.json());
    return days ? buildGrid(days) : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Run the test**

Run: `npx vitest run src/lib/contributions.test.ts` → PASS.

- [ ] **Step 6: Create `src/components/ContributionCard.astro`**

```astro
---
import type { ContributionGrid } from '../lib/contributions';
interface Props { grid: ContributionGrid | null; handle: string; href: string }
const { grid, handle, href } = Astro.props;
const total = grid ? grid.total.toLocaleString('en-US') : '';
---
{grid && (
  <section class="gh-card" aria-label="GitHub contributions">
    <header class="gh-head">
      <span>{total} contributions in the past year</span>
      <a href={href} rel="noopener">@{handle} <span aria-hidden="true">↗</span></a>
    </header>
    <div class="gh-grid" role="img" aria-label={`${total} contributions in the past year`}>
      {grid.weeks.map((week) => week.map((day) => <i class={`d l${day ? day.level : 'x'}`}></i>))}
    </div>
  </section>
)}
```

(Its styles land in `home.css` in Task 5.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/contributions.ts src/lib/contributions.test.ts src/components/ContributionCard.astro
git commit -m "feat: contribution grid lib and glass card

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Home page (intro copy, Hero, TopBar, Footer, home.css, scramble driver)

**Files:**
- Modify: `src/data/profile.ts` (add `intro`), `src/data/profile.test.ts`
- Rewrite: `src/components/Hero.astro`, `src/components/TopBar.astro`, `src/components/Footer.astro`
- Rewrite: `src/pages/index.astro`
- Create: `src/styles/home.css`
- Create: `src/scripts/scramble.ts`
- Modify: `src/layouts/Base.astro` (import `home.css`)

**Interfaces:**
- Consumes: `scrambleFrame` (Task 2), `ContributionCard` + `fetchContributions` (Task 4), `renderBold` from `src/lib/content.ts`.
- Produces: `profile.intro: string[]` (each line uses `**bold**`); `TopBar` prop `current?: 'home' | 'experience'` (default `'home'`); class names `.home`, `.topbar`, `.greeting`, `.intro`, `.gh-card`, `.gh-grid`, `.foot`, `.cmdk-*` reserved for Task 8.

- [ ] **Step 1: Write the failing profile test**

Append to `src/data/profile.test.ts`, inside the existing `describe('profile', ...)` block before its closing `});`:

```ts
  it('has a short intro: five lines, each bolding at least one name, none a draft', () => {
    expect(profile.intro).toHaveLength(5);
    for (const line of profile.intro) {
      expect(line.length).toBeLessThanOrEqual(160);
      expect(line).toMatch(/\*\*[^*]+\*\*/);
      expect(line.toLowerCase()).not.toContain(DRAFT_MARKER);
    }
  });
```

Run: `npx vitest run src/data/profile.test.ts` → FAIL (`profile.intro` undefined).

- [ ] **Step 2: Add `intro` to `src/data/profile.ts`**

In `interface ProfileData` add `intro: string[];`. In the `profile` object add, before `about`:

```ts
  intro: [
    'Building LLM agents as an AI software engineer intern at **Tesla**.',
    'Computer science at **San Jose State**.',
    'Before that, I built a wafer analysis agent at **Micron** and Q&A and image-search tools at **Blue Dome**.',
    'I also built grant-research and reporting agents at **Hanna Center**.',
    'Outside of work I lead in **Alpha Kappa Psi** and **Spartan Analytics**.',
  ],
```

Run: `npx vitest run src/data/profile.test.ts` → PASS. Tell the user in your report that this copy is a draft derived from the work entries and `profile.about`, for them to edit.

- [ ] **Step 3: Create `src/scripts/scramble.ts`**

```ts
import { scrambleFrame } from '../lib/scramble';

const DURATION = 600;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el) => {
  const target = el.dataset.scramble ?? el.textContent ?? '';
  if (reduced || !target) return;
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / DURATION);
    el.textContent = scrambleFrame(target, t, Math.random);
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = target;
  };
  requestAnimationFrame(step);
});
```

- [ ] **Step 4: Rewrite the components**

`src/components/Hero.astro`:

```astro
---
import { profile } from '../data/profile';
import { renderBold } from '../lib/content';
---
<header class="hero" id="about">
  <h1 class="greeting" aria-label="Hey, I'm Andrian"><span aria-hidden="true" data-scramble="Hey, I'm Andrian">Hey, I'm Andrian</span></h1>
  <div class="intro">
    {profile.intro.map((line) => <p set:html={renderBold(line)} />)}
  </div>
</header>
<script>import '../scripts/scramble.ts';</script>
```

`src/components/TopBar.astro`:

```astro
---
import { profile } from '../data/profile';
interface Props { current?: 'home' | 'experience' }
const { current = 'home' } = Astro.props;
const { email, github, linkedin } = profile.contact;
---
<header class="topbar">
  <nav aria-label="Primary">
    <span class="icons">
      <a href={`mailto:${email}`} aria-label="Email"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg></a>
      <a href={github} rel="noopener" aria-label="GitHub"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg></a>
      <a href={linkedin} rel="noopener" aria-label="LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg></a>
    </span>
    <span class="sep" aria-hidden="true"></span>
    {current === 'home'
      ? <a href="/experience">Experience <span aria-hidden="true">→</span></a>
      : <a href="/"><span aria-hidden="true">←</span> Home</a>}
  </nav>
</header>
```

`src/components/Footer.astro`:

```astro
---
import { profile } from '../data/profile';
---
<footer class="foot" id="contact">
  <span>© Andrian Than</span>
  <span class="foot-links">
    <a href="/terminal">Terminal</a>
    <a href={profile.contact.resume}>Resume</a>
  </span>
  <span class="foot-hint">⌘K Command menu</span>
</footer>
```

`src/pages/index.astro`:

```astro
---
import Base from '../layouts/Base.astro';
import TopBar from '../components/TopBar.astro';
import Hero from '../components/Hero.astro';
import ContributionCard from '../components/ContributionCard.astro';
import Footer from '../components/Footer.astro';
import { profile } from '../data/profile';
import { fetchContributions } from '../lib/contributions';

const handle = profile.contact.github.split('/').filter(Boolean).pop() ?? 'andrianthan';
const grid = await fetchContributions(handle);
---
<Base title="Andrian Than · Software Engineer" description="Andrian Than is a computer science student at San Jose State building LLM agents with numeric grounding, evals, and guardrails.">
  <div class="inner home">
    <TopBar />
    <main>
      <Hero />
      <ContributionCard grid={grid} handle={handle} href={profile.contact.github} />
    </main>
    <Footer />
  </div>
</Base>
```

- [ ] **Step 5: Create `src/styles/home.css`**

```css
.home { min-height: 100svh; display: flex; flex-direction: column; padding-bottom: 72px; }
.home main { flex: 1; }

.topbar { display: flex; justify-content: flex-end; padding: 28px 0 0; }
.topbar nav { display: flex; align-items: center; gap: 18px; font: 500 15px var(--font-sans); }
.topbar .icons { display: flex; gap: 14px; }
.topbar a { display: inline-flex; align-items: center; gap: 6px; color: var(--color-muted); transition: color .15s; }
.topbar a:hover { color: var(--color-fg); text-decoration: none; }
.topbar svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.topbar .sep { width: 1px; height: 16px; background: var(--color-rule); }

.greeting { font: italic 400 clamp(36px, 6vw, 48px)/1.1 var(--font-serif); letter-spacing: -.01em; margin: 44px 0 20px; color: var(--color-fg); }
.intro p { margin: 0 0 14px; font-size: 17px; line-height: 1.6; color: rgba(244, 243, 251, .92); }
.intro b { font-weight: 600; color: #fff; }

.gh-card { margin-top: 28px; padding: 12px 14px 14px; border: 1px solid var(--color-rule); border-radius: 12px; background: var(--color-glass); backdrop-filter: blur(14px) saturate(1.3); -webkit-backdrop-filter: blur(14px) saturate(1.3); }
.gh-head { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 10px; font: 400 12px var(--font-mono); color: var(--color-muted); }
.gh-head a { color: var(--color-muted); white-space: nowrap; }
.gh-head a:hover { color: var(--color-fg); text-decoration: none; }
.gh-grid { display: grid; grid-auto-flow: column; grid-template-rows: repeat(7, 1fr); grid-auto-columns: 1fr; gap: 2px; aspect-ratio: 53 / 7; }
.gh-grid .d { border-radius: 2px; background: rgba(255, 255, 255, .06); }
.gh-grid .lx { visibility: hidden; }
.gh-grid .l1 { background: #4b2f8f; }
.gh-grid .l2 { background: #7c4dff; }
.gh-grid .l3 { background: #b46bff; }
.gh-grid .l4 { background: #f0abfc; }

.foot { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px 24px; padding: 40px 0 0; font: 400 13px var(--font-mono); color: var(--color-muted); }
.foot a { color: var(--color-muted); }
.foot a:hover { color: var(--color-fg); text-decoration: none; }
.foot-links { display: flex; gap: 20px; }

@media (max-width: 480px) { .topbar { padding-top: 18px; } .greeting { margin-top: 32px; } }
```

In `src/layouts/Base.astro` add `import '../styles/home.css';` after the `scene.css` import.

- [ ] **Step 6: Verify**

Run: `npm test` → all pass. Run: `npm run build` → `check-build: ok`. Run: `grep -o 'href="/terminal"' dist/index.html | head -1` → `href="/terminal"`.

- [ ] **Step 7: Commit**

```bash
git add src/data/profile.ts src/data/profile.test.ts src/components/Hero.astro src/components/TopBar.astro src/components/Footer.astro src/pages/index.astro src/styles/home.css src/scripts/scramble.ts src/layouts/Base.astro
git commit -m "feat: minimal home page over the scene

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Experience page

**Files:**
- Modify: `src/lib/content.ts` (add `experienceRows`), `src/lib/content.test.ts`
- Create: `src/pages/experience.astro`
- Modify: `src/styles/home.css` (append experience styles)

**Interfaces:**
- Produces: `interface ExperienceRow { id: string; company: string; title: string; dates: string; summaryHtml: string; href: string | null; current: boolean }`; `experienceRows(roles): ExperienceRow[]` — listed entries in `order`, `href` is `/work/<id>` only when `data.cleared`, `summaryHtml` is `renderBold(data.summary)`.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/content.test.ts` (add `experienceRows` to its existing import from `./content`):

```ts
describe('experienceRows', () => {
  const role = (id: string, order: number, over: Record<string, unknown> = {}) => ({
    id,
    data: {
      company: `Co ${id}`, title: 'Engineer', dates: 'Jan 2025 – Feb 2025', summary: 'Built **x** & y',
      current: false, listed: true, cleared: false, order, ...over,
    },
  });

  it('orders listed entries and drops unlisted ones', () => {
    const rows = experienceRows([role('b', 2), role('a', 1), role('c', 3, { listed: false })]);
    expect(rows.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('links only cleared entries', () => {
    const rows = experienceRows([role('a', 1, { cleared: true }), role('b', 2)]);
    expect(rows[0].href).toBe('/work/a');
    expect(rows[1].href).toBeNull();
  });

  it('escapes the summary and renders bold', () => {
    expect(experienceRows([role('a', 1)])[0].summaryHtml).toBe('Built <b>x</b> &amp; y');
  });
});
```

Run: `npx vitest run src/lib/content.test.ts` → FAIL (`experienceRows` not exported).

- [ ] **Step 2: Implement in `src/lib/content.ts`** (append)

```ts
export interface ExperienceRow {
  id: string; company: string; title: string; dates: string;
  summaryHtml: string; href: string | null; current: boolean;
}

type RoleLike = Gated & {
  id: string;
  data: Gated['data'] & { company: string; title: string; dates: string; summary: string; current: boolean };
};

export function experienceRows(roles: RoleLike[]): ExperienceRow[] {
  return listed(roles).map((r) => ({
    id: r.id,
    company: r.data.company,
    title: r.data.title,
    dates: r.data.dates,
    summaryHtml: renderBold(r.data.summary),
    href: r.data.cleared ? `/work/${r.id}` : null,
    current: r.data.current,
  }));
}
```

Run: `npx vitest run src/lib/content.test.ts` → PASS.

- [ ] **Step 3: Create `src/pages/experience.astro`**

```astro
---
import { getCollection } from 'astro:content';
import Base from '../layouts/Base.astro';
import TopBar from '../components/TopBar.astro';
import Footer from '../components/Footer.astro';
import { experienceRows } from '../lib/content';

const rows = experienceRows(await getCollection('work'));
---
<Base title="Experience · Andrian Than" description="Where Andrian Than has worked: Tesla, Hanna Center, Blue Dome Technologies, and Micron." path="/experience">
  <div class="inner home">
    <TopBar current="experience" />
    <main>
      <h1 class="greeting">Experience</h1>
      <ol class="xp">
        {rows.map((r) => (
          <li class="xp-row">
            <p class="xp-dates">{r.dates}{r.current && <span class="xp-now"> · now</span>}</p>
            <div class="xp-body">
              <h2 class="xp-co">
                {r.href ? <a href={r.href}>{r.company} <span aria-hidden="true">→</span></a> : r.company}
              </h2>
              <p class="xp-role">{r.title}</p>
              <p class="xp-sum" set:html={r.summaryHtml} />
            </div>
          </li>
        ))}
      </ol>
    </main>
    <Footer />
  </div>
</Base>
```

- [ ] **Step 4: Append to `src/styles/home.css`**

```css
.xp { list-style: none; margin: 0; padding: 0; }
.xp-row { display: grid; grid-template-columns: 9.5rem minmax(0, 1fr); gap: 4px 24px; padding: 22px 0; border-top: 1px solid var(--color-rule); }
.xp-row:last-child { border-bottom: 1px solid var(--color-rule); }
.xp-dates { margin: 3px 0 0; font: 400 12px var(--font-mono); color: var(--color-muted); }
.xp-now { color: var(--color-num); }
.xp-co { display: block; margin: 0; font: 600 18px/1.3 var(--font-sans); letter-spacing: -.01em; color: var(--color-fg); text-transform: none; }
.xp-co::after { display: none; }
.xp-co a { color: var(--color-fg); }
.xp-co a:hover { text-decoration: none; color: #fff; }
.xp-co a span { display: inline-block; transition: transform .15s; }
.xp-co a:hover span { transform: translateX(3px); }
.xp-role { margin: 2px 0 8px; font-size: 15px; color: var(--color-muted); }
.xp-sum { margin: 0; font-size: 15px; line-height: 1.55; color: rgba(244, 243, 251, .8); }
.xp-sum b { font-weight: 600; color: #fff; }
@media (max-width: 560px) { .xp-row { grid-template-columns: minmax(0, 1fr); } }
@media (prefers-reduced-motion: reduce) { .xp-co a span { transition: none; } }
```

- [ ] **Step 5: Verify**

Run: `npm test` → pass. Run: `npm run build` → `check-build: ok`. Run: `grep -c "work/tesla\|work/micron" dist/experience/index.html` → `0`. Run: `grep -o 'href="/work/hanna"' dist/experience/index.html | head -1` → `href="/work/hanna"`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/content.ts src/lib/content.test.ts src/pages/experience.astro src/styles/home.css
git commit -m "feat: minimal experience page

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Retarget agent navigation and back links

**Files:**
- Modify: `src/agent/navigate.ts`, `src/agent/navigate.test.ts`
- Modify: `src/agent/snapshot.ts:22`, `src/agent/snapshot.test.ts` (lines asserting `/#experience`)
- Modify: `src/pages/work/[slug].astro:82-83`, `src/pages/projects/[slug].astro:26`

**Interfaces:**
- Produces: `NAV_TARGETS` = `{ experience: { href: '/experience', label: 'experience' }, about: { href: '/#about', label: 'about' }, contact: { href: '/#contact', label: 'contact' } }` (no `projects`). Work chunks get `url: '/experience'`; project chunks get `url: '/'`.

- [ ] **Step 1: Update the tests first**

In `src/agent/navigate.test.ts` change expectations (keep their structure):
- `nav('/experience')` → `{ href: '/experience', label: 'experience' }`
- `nav('/projects')` → `null` (no section on the page; the agent answers in place)
- `nav('/about')` → `{ href: '/#about', label: 'about' }`
- `nav('/contact')` → `{ href: '/#contact', label: 'contact' }`
- `nav('tesla')` → `{ href: '/experience', label: 'experience' }`
- `nav('what did you do at tesla')?.href` → `'/experience'`
- `navTarget('experience')?.href` → `'/experience'`

In `src/agent/snapshot.test.ts` change the two assertions at lines ~87 and ~122 from `'/#experience'` to `'/experience'`.

Run: `npx vitest run src/agent/navigate.test.ts src/agent/snapshot.test.ts` → FAIL.

- [ ] **Step 2: Implement**

`src/agent/navigate.ts`, replace `NAV_TARGETS` with:

```ts
export const NAV_TARGETS: Partial<Record<Intent, NavTarget>> = {
  experience: { href: '/experience', label: 'experience' },
  about: { href: '/#about', label: 'about' },
  contact: { href: '/#contact', label: 'contact' },
};
```

Also update the comment above it: projects now answer in place because the home page has no projects section.

`src/agent/snapshot.ts:22` →

```ts
const ANCHOR_BY_COLLECTION: Record<'work' | 'projects', string> = { work: '/experience', projects: '/' };
```

`src/pages/work/[slug].astro` → `backHref="/experience"` (keep `backLabel="experience"`).
`src/pages/projects/[slug].astro:26` → `backHref="/"`.

- [ ] **Step 3: Run the whole agent suite**

Run: `npx vitest run src/agent` → PASS. If another agent test fails only because it hardcodes `/#projects` or `/#experience` for a *derived* url (not a static fixture), update that expectation. Do not edit `src/agent/fixtures/*` or `golden.json`.

- [ ] **Step 4: Verify the build**

Run: `npm test` → pass. Run: `npm run build` → `check-build: ok`.

- [ ] **Step 5: Commit**

```bash
git add src/agent src/pages/work src/pages/projects
git commit -m "refactor: agent navigation and back links follow the new routes

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: ⌘K command menu

**Files:**
- Create: `src/lib/commands.ts`, `src/lib/commands.test.ts`
- Create: `src/components/MenuPanel.tsx`, `src/components/MenuPanel.test.tsx`
- Create: `src/components/CommandMenu.tsx`, `src/components/CommandMenu.test.tsx`
- Modify: `src/layouts/Base.astro`
- Modify: `src/styles/home.css` (append menu styles)

**Interfaces:**
- Consumes: `ContactLinks` from `src/data/profile.ts`; `runAgent(snapshot, query)` from `src/agent/run.ts` returning `AgentResult` (`answer: { text: string; sources: Source[] }`, `refused: boolean`, optional `effects?.navigate: NavTarget`); `getSnapshot(): Promise<Snapshot>` from `src/components/terminal/useTerminal.ts`.
- Produces in `commands.ts`: `interface MenuItem { id: string; label: string; group: 'Go to' | 'Contact'; href: string; external?: boolean; keywords?: string }`; `interface MenuRow { id: string; label: string; group: 'Go to' | 'Contact' | 'Ask'; href?: string; external?: boolean }`; `menuItems(contact: ContactLinks): MenuItem[]`; `filterItems(items: MenuItem[], query: string): MenuItem[]`; `buildRows(items: MenuItem[], query: string): MenuRow[]` (filtered items, then an `ask` row labelled `Ask: <query>` when the trimmed query is non-empty).
- Produces in `MenuPanel.tsx`: default export `MenuPanel` with props `{ query: string; rows: MenuRow[]; active: number; answer: PanelAnswer | null; busy: boolean; onQuery(v: string): void; onPick(row: MenuRow): void; onClose(): void; inputRef?: React.Ref<HTMLInputElement> }`; `interface PanelAnswer { text: string; refused: boolean; sources: { title: string; url: string }[]; open?: { href: string; label: string } }`.
- Produces: `CommandMenu` default export with props `{ contact: ContactLinks }`.

- [ ] **Step 1: Write the failing `commands` test**

`src/lib/commands.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildRows, filterItems, menuItems } from './commands';

const contact = { email: 'a@b.co', linkedin: 'https://l/in', github: 'https://g/h', resume: '/resume.pdf' };
const items = menuItems(contact);

describe('menuItems', () => {
  it('lists the pages and the contact links', () => {
    expect(items.map((i) => i.id)).toEqual(['home', 'experience', 'terminal', 'email', 'github', 'linkedin', 'resume']);
    expect(items.find((i) => i.id === 'email')?.href).toBe('mailto:a@b.co');
    expect(items.find((i) => i.id === 'terminal')?.href).toBe('/terminal');
    expect(items.find((i) => i.id === 'github')?.external).toBe(true);
  });
});

describe('filterItems', () => {
  it('returns everything for an empty query', () => {
    expect(filterItems(items, '  ')).toHaveLength(items.length);
  });

  it('matches case-insensitively on label and keywords, all tokens required', () => {
    expect(filterItems(items, 'EXP').map((i) => i.id)).toEqual(['experience']);
    expect(filterItems(items, 'agent').map((i) => i.id)).toEqual(['terminal']);
    expect(filterItems(items, 'git hub')).toEqual([]);
  });
});

describe('buildRows', () => {
  it('has no ask row for an empty query', () => {
    expect(buildRows(items, '').some((r) => r.group === 'Ask')).toBe(false);
  });

  it('puts the ask row last, labelled with the trimmed query', () => {
    const rows = buildRows(items, ' what did you do at tesla ');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'ask', group: 'Ask', label: 'Ask: what did you do at tesla' });
  });

  it('keeps matching items before the ask row', () => {
    const rows = buildRows(items, 'exp');
    expect(rows.map((r) => r.id)).toEqual(['experience', 'ask']);
  });
});
```

Run: `npx vitest run src/lib/commands.test.ts` → FAIL.

- [ ] **Step 2: Implement `src/lib/commands.ts`**

```ts
import type { ContactLinks } from '../data/profile';

export interface MenuItem {
  id: string; label: string; group: 'Go to' | 'Contact'; href: string; external?: boolean; keywords?: string;
}
export interface MenuRow {
  id: string; label: string; group: 'Go to' | 'Contact' | 'Ask'; href?: string; external?: boolean;
}

export function menuItems(contact: ContactLinks): MenuItem[] {
  return [
    { id: 'home', label: 'Home', group: 'Go to', href: '/' },
    { id: 'experience', label: 'Experience', group: 'Go to', href: '/experience', keywords: 'work jobs' },
    { id: 'terminal', label: 'Terminal', group: 'Go to', href: '/terminal', keywords: 'agent chat' },
    { id: 'email', label: 'Email', group: 'Contact', href: `mailto:${contact.email}`, external: true, keywords: 'contact mail' },
    { id: 'github', label: 'GitHub', group: 'Contact', href: contact.github, external: true, keywords: 'code' },
    { id: 'linkedin', label: 'LinkedIn', group: 'Contact', href: contact.linkedin, external: true },
    { id: 'resume', label: 'Resume', group: 'Contact', href: contact.resume, keywords: 'cv pdf' },
  ];
}

export function filterItems(items: MenuItem[], query: string): MenuItem[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return items;
  return items.filter((item) => {
    const hay = `${item.label} ${item.keywords ?? ''}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });
}

export function buildRows(items: MenuItem[], query: string): MenuRow[] {
  const rows: MenuRow[] = filterItems(items, query).map(({ id, label, group, href, external }) => ({ id, label, group, href, external }));
  const q = query.trim();
  if (q) rows.push({ id: 'ask', label: `Ask: ${q}`, group: 'Ask' });
  return rows;
}
```

Run: `npx vitest run src/lib/commands.test.ts` → PASS.

- [ ] **Step 3: Write the failing `MenuPanel` test**

`src/components/MenuPanel.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import MenuPanel from './MenuPanel';
import type { MenuRow } from '../lib/commands';

const rows: MenuRow[] = [
  { id: 'home', label: 'Home', group: 'Go to', href: '/' },
  { id: 'github', label: 'GitHub', group: 'Contact', href: 'https://g/h', external: true },
  { id: 'ask', label: 'Ask: hi', group: 'Ask' },
];
const noop = () => {};
const base = { query: '', rows, active: 1, answer: null, busy: false, onQuery: noop, onPick: noop, onClose: noop };

describe('MenuPanel', () => {
  const html = renderToStaticMarkup(<MenuPanel {...base} />);

  it('is a labelled modal dialog with a combobox input', () => {
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-label="Command menu"');
    expect(html).toContain('role="combobox"');
  });

  it('renders one option per row and marks only the active one selected', () => {
    expect((html.match(/role="option"/g) ?? []).length).toBe(3);
    expect((html.match(/aria-selected="true"/g) ?? []).length).toBe(1);
    expect(html).toContain('aria-activedescendant="cmdk-opt-github"');
  });

  it('links external rows safely and shows group headings', () => {
    expect(html).toContain('href="https://g/h"');
    expect(html).toContain('rel="noopener"');
    expect(html).toContain('Go to');
    expect(html).toContain('Contact');
  });

  it('shows an answer with sources in a polite live region', () => {
    const out = renderToStaticMarkup(
      <MenuPanel {...base} answer={{ text: 'Built a copilot.', refused: false, sources: [{ title: 'Tesla', url: '/experience' }], open: { href: '/experience', label: 'experience' } }} />,
    );
    expect(out).toContain('aria-live="polite"');
    expect(out).toContain('Built a copilot.');
    expect(out).toContain('href="/experience"');
    expect(out).toContain('Tesla');
  });

  it('shows a thinking state while busy', () => {
    expect(renderToStaticMarkup(<MenuPanel {...base} busy />)).toContain('Thinking');
  });
});
```

Run: `npx vitest run src/components/MenuPanel.test.tsx` → FAIL.

- [ ] **Step 4: Implement `src/components/MenuPanel.tsx`**

```tsx
import type { Ref } from 'react';
import type { MenuRow } from '../lib/commands';

export interface PanelAnswer {
  text: string;
  refused: boolean;
  sources: { title: string; url: string }[];
  open?: { href: string; label: string };
}

interface Props {
  query: string;
  rows: MenuRow[];
  active: number;
  answer: PanelAnswer | null;
  busy: boolean;
  onQuery: (value: string) => void;
  onPick: (row: MenuRow) => void;
  onClose: () => void;
  inputRef?: Ref<HTMLInputElement>;
}

export default function MenuPanel({ query, rows, active, answer, busy, onQuery, onPick, onClose, inputRef }: Props) {
  let last = '';
  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Command menu" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="cmdk-input"
          role="combobox"
          aria-expanded="true"
          aria-controls="cmdk-list"
          aria-activedescendant={rows[active] ? `cmdk-opt-${rows[active].id}` : undefined}
          aria-label="Search or ask"
          placeholder="Search, or ask about Andrian…"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
        <ul className="cmdk-list" id="cmdk-list" role="listbox">
          {rows.map((row, i) => {
            const heading = row.group !== last ? row.group : null;
            last = row.group;
            return (
              <li key={row.id} role="presentation">
                {heading && <p className="cmdk-group">{heading}</p>}
                <div
                  id={`cmdk-opt-${row.id}`}
                  role="option"
                  aria-selected={i === active}
                  className={`cmdk-opt${i === active ? ' on' : ''}`}
                  onClick={() => onPick(row)}
                >
                  {row.href ? (
                    <a href={row.href} rel={row.external ? 'noopener' : undefined} tabIndex={-1} onClick={(e) => e.stopPropagation()}>{row.label}</a>
                  ) : (
                    <span>{row.label}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="cmdk-answer" aria-live="polite">
          {busy && <p className="cmdk-muted">Thinking…</p>}
          {answer && !busy && (
            <>
              <p className={answer.refused ? 'cmdk-muted' : undefined}>{answer.text}</p>
              {answer.sources.length > 0 && (
                <p className="cmdk-sources">
                  {answer.sources.map((s) => <a key={`${s.title}-${s.url}`} href={s.url}>{s.title}</a>)}
                </p>
              )}
              {answer.open && <p className="cmdk-sources"><a href={answer.open.href}>Open {answer.open.label} →</a></p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

Run: `npx vitest run src/components/MenuPanel.test.tsx` → PASS.

- [ ] **Step 5: Write the failing `CommandMenu` test**

`src/components/CommandMenu.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CommandMenu from './CommandMenu';

const contact = { email: 'a@b.co', linkedin: 'https://l/in', github: 'https://g/h', resume: '/resume.pdf' };

describe('CommandMenu (closed, as server-rendered)', () => {
  const html = renderToStaticMarkup(<CommandMenu contact={contact} />);

  it('renders only the pill, labelled and with the shortcut', () => {
    expect(html).toContain('aria-label="Open command menu"');
    expect(html).toContain('⌘K');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toContain('role="dialog"');
  });
});
```

Run: `npx vitest run src/components/CommandMenu.test.tsx` → FAIL.

- [ ] **Step 6: Implement `src/components/CommandMenu.tsx`**

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ContactLinks } from '../data/profile';
import { runAgent } from '../agent/run';
import { buildRows, menuItems, type MenuRow } from '../lib/commands';
import { getSnapshot } from './terminal/useTerminal';
import MenuPanel, { type PanelAnswer } from './MenuPanel';

export default function CommandMenu({ contact }: { contact: ContactLinks }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [answer, setAnswer] = useState<PanelAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);

  const items = useMemo(() => menuItems(contact), [contact]);
  const rows = useMemo(() => buildRows(items, query), [items, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActive(0);
    setAnswer(null);
    pillRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      } else if (event.key === 'Escape') {
        setOpen((value) => {
          if (value) pillRef.current?.focus();
          return false;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const ask = useCallback(async (question: string) => {
    setBusy(true);
    setAnswer(null);
    try {
      const result = runAgent(await getSnapshot(), question);
      const nav = result.effects?.navigate;
      setAnswer({
        text: result.answer.text,
        refused: result.refused,
        sources: result.answer.sources,
        open: nav ? { href: nav.href, label: nav.label } : undefined,
      });
    } catch {
      setAnswer({ text: 'The agent data could not be loaded. Try the terminal page instead.', refused: true, sources: [] });
    } finally {
      setBusy(false);
    }
  }, []);

  const pick = useCallback((row: MenuRow) => {
    if (row.group === 'Ask') void ask(query.trim());
    else if (row.href) window.location.assign(row.href);
  }, [ask, query]);

  const onPanelKey = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((i) => Math.min(i + 1, rows.length - 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (event.key === 'Enter' && rows[active]) { event.preventDefault(); pick(rows[active]); }
  };

  return (
    <>
      <button ref={pillRef} type="button" className="cmdk-pill" aria-label="Open command menu" aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <kbd>⌘K</kbd>
      </button>
      {open && (
        <div onKeyDown={onPanelKey}>
          <MenuPanel
            query={query}
            rows={rows}
            active={Math.min(active, Math.max(rows.length - 1, 0))}
            answer={answer}
            busy={busy}
            onQuery={(value) => { setQuery(value); setActive(0); setAnswer(null); }}
            onPick={pick}
            onClose={close}
            inputRef={inputRef}
          />
        </div>
      )}
    </>
  );
}
```

Run: `npx vitest run src/components/CommandMenu.test.tsx` → PASS.

- [ ] **Step 7: Wire into `src/layouts/Base.astro`**

Add to the frontmatter: `import CommandMenu from '../components/CommandMenu.tsx';` and `import { profile } from '../data/profile';`. Inside `<body>` after `<slot />`: `{menu && <CommandMenu client:load contact={profile.contact} />}`.

- [ ] **Step 8: Append menu styles to `src/styles/home.css`**

```css
.cmdk-pill { position: fixed; right: 20px; bottom: 20px; z-index: 20; display: inline-flex; align-items: center; gap: 8px; padding: 10px 12px; border: 1px solid var(--color-rule); border-radius: 12px; background: rgba(10, 8, 20, .72); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); color: var(--color-muted); font: 500 12px var(--font-mono); cursor: pointer; transition: color .15s, border-color .15s; }
.cmdk-pill:hover { color: var(--color-fg); border-color: var(--color-muted); }
.cmdk-pill svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
.cmdk-pill kbd { font: inherit; border: 1px solid var(--color-rule); border-radius: 5px; padding: 1px 6px; }

.cmdk-overlay { position: fixed; inset: 0; z-index: 30; display: grid; place-items: start center; padding: 16svh 16px 16px; background: rgba(5, 3, 12, .55); animation: cmdk-in .15s ease-out; }
.cmdk { width: min(560px, 100%); max-height: 70svh; overflow: auto; border: 1px solid var(--color-rule); border-radius: 14px; background: rgba(14, 11, 28, .86); backdrop-filter: blur(22px) saturate(1.3); -webkit-backdrop-filter: blur(22px) saturate(1.3); box-shadow: 0 30px 80px -20px rgba(0, 0, 0, .6); }
.cmdk-input { width: 100%; box-sizing: border-box; padding: 16px 18px; border: 0; border-bottom: 1px solid var(--color-rule); background: transparent; color: var(--color-fg); font: 400 16px var(--font-sans); }
.cmdk-input:focus { outline: none; }
.cmdk-input::placeholder { color: var(--color-muted); }
.cmdk-list { list-style: none; margin: 0; padding: 6px; }
.cmdk-group { margin: 8px 10px 4px; font: 500 11px var(--font-mono); letter-spacing: .1em; text-transform: uppercase; color: var(--color-muted); }
.cmdk-opt { padding: 9px 12px; border-radius: 8px; color: var(--color-fg); font-size: 15px; cursor: pointer; }
.cmdk-opt a { color: inherit; display: block; }
.cmdk-opt a:hover { text-decoration: none; }
.cmdk-opt.on { background: var(--color-chip); }
.cmdk-answer { padding: 0 18px 14px; font-size: 15px; line-height: 1.55; }
.cmdk-answer:empty { display: none; }
.cmdk-answer p { margin: 10px 0 0; }
.cmdk-muted { color: var(--color-muted); font-style: italic; }
.cmdk-sources { display: flex; flex-wrap: wrap; gap: 6px 14px; font: 500 13px var(--font-mono); }
@keyframes cmdk-in { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .cmdk-overlay { animation: none; } .cmdk-pill { transition: none; } }
```

- [ ] **Step 9: Verify**

Run: `npm test` → pass. Run: `npm run build` → `check-build: ok`. Run: `grep -c "cmdk-pill" dist/index.html dist/terminal/index.html` → `>=1` for index, `0` for terminal.

- [ ] **Step 10: Commit**

```bash
git add src/lib/commands.ts src/lib/commands.test.ts src/components/MenuPanel.tsx src/components/MenuPanel.test.tsx src/components/CommandMenu.tsx src/components/CommandMenu.test.tsx src/layouts/Base.astro src/styles/home.css
git commit -m "feat: command menu with keyboard nav and an inline agent answer

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Prune dead code and home-only CSS

**Files:**
- Delete: `src/components/{SkillsGlobe.astro,SkillsGlobe.tsx,SkillsGlobe.test.tsx,Skills.astro,Skills.test.tsx,StatStrip.astro,Timeline.astro,RoleEntry.astro,About.astro,ProjectCards.astro,ThemeToggle.tsx}`
- Delete: `src/components/terminal/IntroTerminal.tsx`, `src/components/terminal/IntroTerminal.test.tsx`
- Delete: `src/scripts/cursor-field.ts`, `src/scripts/enhance.ts`
- Delete: `src/lib/skillIcons.ts`, `src/lib/skillIcons.test.ts`, `src/lib/skillsGlobe.ts`, `src/lib/skillsGlobe.test.ts`, `src/data/stats.ts`
- Delete: `src/styles/skills.test.ts`
- Modify: `src/styles/global.css` (prune), `src/layouts/Base.astro` (remove the two old script tags)
- Create: `src/styles/global.test.ts`

**Interfaces:** none new. After this task, nothing may import a deleted file.

- [ ] **Step 1: Write the failing CSS test**

`src/styles/global.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/global.css'), 'utf8');

describe('global.css after the redesign', () => {
  it('has dropped every home-only rule', () => {
    for (const gone of ['body::before', 'body::after', '.hero', '.chat', '.intro-', '.topics', '.stat', '.job', '.prow', '.plist', '.globe', '.skills-legend', '#theme-toggle', '.reveal', '.tl', '.about', '.bar-nav', '.avatar', 'cursor']) {
      expect(css, gone).not.toContain(gone);
    }
  });

  it('keeps the rules the work and project pages still use', () => {
    for (const kept of ['.detail', '.prose', '.flow', '.node', '.dec', '.facts', '.next', '.meta', '.kicker', '.lede', 'header.ph', '.shot', '.bar']) {
      expect(css, kept).toContain(kept);
    }
  });
});
```

Run: `npx vitest run src/styles/global.test.ts` → FAIL.

- [ ] **Step 2: Check what the deleted classes touch before deleting anything**

Run:

```bash
grep -rnE "class(Name)?=\"[^\"]*\b(logo|org|tag|more|stack|eyebrow|sh|s|reveal|sr-only)\b" src --include=*.astro --include=*.tsx | grep -vE "src/components/(SkillsGlobe|Skills|StatStrip|Timeline|RoleEntry|About|ProjectCards)\."
```

For every class this prints that is used by a file that is **not** being deleted, keep that class's rules in `global.css`. Expected: `.eyebrow` (demo CSS and `/work/[slug]`), `.sr-only` only if non-deleted files use it, `.s`/`.stack` only via `.detail` rules. Keep `h1`, `h2`, `h2::after`, `a`, `a:hover`, `a:focus-visible`, `.inner`, `.wide`, and `.stack` base rules if referenced.

- [ ] **Step 3: Prune `src/styles/global.css`**

Delete these blocks entirely (the rest stays as is):
- Both `body::before`/`body::after` cursor-field blocks, the `@supports (mask-composite…)` block, `html:hover body::after`, `html:not(.js) body::after`, and the final `@media (hover: none)` block. Keep the `html, body { overflow-x: clip; }` and `html { scroll-behavior: smooth; }` lines and a `body` rule, rewritten to: `body { margin: 0; background: var(--color-bg); color: var(--color-fg); font: 400 17px/1.65 var(--font-sans); -webkit-font-smoothing: antialiased; }`
- Top bar: `.bar-nav*`, `.bar-right`, `.bar .btn*`, `#theme-toggle*`, the `.bar .brand` rule. **Keep** `.bar`, `.bar a`, `.bar a:hover` (Detail pages use `header.bar` for the back link).
- Hero and home: `.hero*`, `.hero-in`, `.avatar`, `h1 .w*`, `h1 .grad`, `@keyframes bi`, `@keyframes grad-drift`, `.status`, `.chat*`, `.intro-*`, `@keyframes intro-*`, `.topics*`, `.js .intro-*`.
- Sections: `.stats`, `.stat*`, `.sh*`, `.tl*`, `.job*`, `.logo*` (unless Step 2 shows a kept file uses it), `.org`, `.tag`, `.more*`, `.plist`, `.prow*`, `a.prow:hover*`, the gradient-ramp `@supports`/`forced-colors` blocks, `.job:hover, .prow:hover`, `.about*`, `footer*` rules (the new footer is `.foot` in `home.css`), `.reveal*`, the `#experience/#projects/#about` stagger rules, the whole `/* ---- skills globe ---- */` block.
- Responsive and reduced-motion blocks: remove every selector in them that targets a deleted class (`.about`, `.tl`, `.job`, `.logo`, `.prow`, `.chat`, `.stats`, `.stat`, `.avatar`, `h1` size, `.status`, `.intro-out`, `.topics`, `.reveal`, `.more span`, `#theme-toggle`, `.job:hover`, etc.). Keep the `:root { --space-xl: 64px; }` line and the `.meta`, `.flow`, `.node`, `.dec`, `.facts`, `.detail` responsive rules. Keep `@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }`.

The test above forbids the substrings `.job`, `.stat`, `.about`, `.tl`, `cursor`, etc. anywhere in the file, comments included. Reword any comment that contains them.

- [ ] **Step 4: Delete the dead files**

```bash
git rm src/components/SkillsGlobe.astro src/components/SkillsGlobe.tsx src/components/SkillsGlobe.test.tsx \
  src/components/Skills.astro src/components/Skills.test.tsx src/components/StatStrip.astro \
  src/components/Timeline.astro src/components/RoleEntry.astro src/components/About.astro \
  src/components/ProjectCards.astro src/components/ThemeToggle.tsx \
  src/components/terminal/IntroTerminal.tsx src/components/terminal/IntroTerminal.test.tsx \
  src/scripts/cursor-field.ts src/scripts/enhance.ts \
  src/lib/skillIcons.ts src/lib/skillIcons.test.ts src/lib/skillsGlobe.ts src/lib/skillsGlobe.test.ts \
  src/data/stats.ts src/styles/skills.test.ts
```

In `src/layouts/Base.astro` remove the two lines `<script>import '../scripts/enhance.ts';</script>` and `<script>import '../scripts/cursor-field.ts';</script>`.

- [ ] **Step 5: Find any leftover reference**

Run: `grep -rnE "SkillsGlobe|StatStrip|Timeline|RoleEntry|ProjectCards|ThemeToggle|IntroTerminal|cursor-field|enhance\.ts|skillIcons|skillsGlobe|data/stats" src scripts`
Expected: no output. If anything prints, fix that reference (the file is not supposed to need a deleted module).

- [ ] **Step 6: Verify**

Run: `npm test` → all pass (the count drops: deleted test files; no new failures).
Run: `npm run build` → `check-build: ok`.
Run: `grep -rnE "class=\"[^\"]*\b(reveal|globe|chat|topics|stats|job|prow)\b" dist --include=*.html | head -3` → no output.

- [ ] **Step 7: Commit**

```bash
git add -A src
git commit -m "refactor: remove the globe, stats, timeline, project cards, home terminal, and light theme

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Generate the background art (interactive, main session, not delegated)

This task needs the user's eyes. Run it in the main session with the `banana-squad` skill, not in a subagent.

**Files:**
- Create: `public/scene/sky.webp`, `public/scene/horizon.webp`
- Modify: `src/components/Background.astro`, `src/styles/scene.css`

**Interfaces:**
- Consumes: scene layers from Task 3 (`.scene`, `.layer` with `--depth`, `.horizon`).
- Produces: classes `.sky` (opaque nebula, behind the stars) and an image on `.horizon`.

- [ ] **Step 1: Generate sky options**

Invoke `/banana-squad` (Skill tool, `skill: "banana-squad"`). Brief: "Original illustrated deep-space nebula background, 16:9, deep indigo to violet with soft magenta and cyan wisps, a few tiny faint stars only, calm and minimal, painterly, dark enough that white text reads over every part (no bright core), no text, no people, no planets, no hard horizon." Produce 3-4 options and show them to the user. Do not mimic any existing artist's or site's artwork.

- [ ] **Step 2: Generate horizon options**

Same pipeline. Brief: "Bottom-of-frame foreground for a space scene: the curved limb of a dark planet with a thin violet atmosphere glow, or a silhouetted ridge under a starry sky, wide 4:1 crop, dark, subtle, no text, no people." Keep the subject in the lower half with empty dark space above it. Show 3 options.

- [ ] **Step 3: User picks one of each. Stop and wait for the choice.**

- [ ] **Step 4: Convert and size**

Check for `cwebp` (`which cwebp`); if absent use `npx -y sharp-cli`. Produce `public/scene/sky.webp` resized to 2560 wide, quality ~78, and `public/scene/horizon.webp` 2560 wide, quality ~80. Targets: sky ≤ 250KB, horizon ≤ 150KB. Check with `ls -l public/scene`. Lower the quality until both fit.

- [ ] **Step 5: Wire the sky**

In `src/components/Background.astro`, add as the **first** child of `.scene`:

```astro
<div class="layer" style="--depth: .1"><div class="sky"></div></div>
```

Append to `src/styles/scene.css` (before the reduced-motion block):

```css
.sky { position: absolute; inset: 0; background: url('/scene/sky.webp') center / cover no-repeat; opacity: .9; }
```

- [ ] **Step 6: Wire the horizon**

Replace the `.horizon` rule in `src/styles/scene.css` with:

```css
.horizon { position: absolute; left: 0; right: 0; bottom: 0; height: 40vh; background: url('/scene/horizon.webp') center bottom / cover no-repeat; -webkit-mask-image: linear-gradient(to top, #000 55%, transparent); mask-image: linear-gradient(to top, #000 55%, transparent); }
```

- [ ] **Step 7: Verify**

Run: `npx vitest run src/styles/scene.test.ts` → PASS (no new keyframes). Run: `npm run build` → `check-build: ok`. Run: `du -ch public/scene/* | tail -1` → total ≤ 400K.

- [ ] **Step 8: Commit**

```bash
git add public/scene src/components/Background.astro src/styles/scene.css
git commit -m "feat: generated nebula sky and horizon art

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Browser verification and preview

Main session, with the dev server and the Chrome tools (`claude-in-chrome` skill) or the `run` skill. No new code unless a check fails.

- [ ] **Step 1: Run the full gate**

Run: `npm test && npm run build`. Expected: all tests pass, `check-build: ok`.

- [ ] **Step 2: Start the dev server and check desktop (1440x900)**

Run `npm run dev` in the background. Open `/`. Check and record:
- The greeting scrambles for about 600ms and settles to "Hey, I'm Andrian".
- Moving the mouse shifts the scene: read `getComputedStyle(document.querySelector('.scene')).getPropertyValue('--px')` before and after a move; it must change and stay within ±14px.
- After about 12 seconds at least one `.flyer` has existed (`document.querySelectorAll('.flyer').length` sampled over time, never above 3).
- The GitHub card renders with the grid and a count (or is absent if the fetch failed, with no empty frame).
- The three icons look right (envelope, GitHub, LinkedIn). Fix the SVG paths in `TopBar.astro` if any renders wrong.
- ⌘K (or Ctrl+K) opens the menu. Esc closes it. Typing "exp" and Enter goes to `/experience`. Typing "what did you do at tesla" and Enter shows an answer with sources.

- [ ] **Step 3: Check mobile (390x844)**

Resize the window. Confirm: no horizontal scroll, 24px gutters, the card and the pill do not overlap the text, the menu fits.

- [ ] **Step 4: Check the other pages**

Open `/experience` (Tesla and Micron are plain text, Hanna and Blue Dome link). Open `/work/hanna` and `/work/bluedome`: text must be readable over the scene (add a translucent panel behind `.detail .inner` in `home.css` if not: `background: rgba(8, 6, 18, .6); backdrop-filter: blur(10px); border-radius: 14px; padding: 8px 24px`), demos render, and the back link goes to `/experience`. Open `/terminal`: no scene, no pill, unchanged look.

- [ ] **Step 5: Check contrast on the real art**

Take a screenshot of `/` and `/experience`. Sample the lightest area behind body text. Body text must stay readable. If any area is too bright, darken the vignette in `scene.css` (`.scene::after` alpha) and re-check.

- [ ] **Step 6: Check reduced motion**

In the browser's rendering settings emulate `prefers-reduced-motion: reduce` (or confirm via the CSS test plus code review of `scene.ts` and `scramble.ts`, both of which return early). Reload: nothing animates, no flyers, no parallax, greeting is static.

- [ ] **Step 7: Weight check**

Run: `du -ch dist/scene/* dist/_astro/*.css | tail -1` and `ls -l dist/scene`. Scene images ≤ 400K total.

- [ ] **Step 8: Fix anything found, re-run Step 1, commit**

```bash
git add -A
git commit -m "fix: polish found in browser verification

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

(Skip the commit if nothing changed.)

- [ ] **Step 9: Stop and hand back**

Report to the user: what passed, what was fixed, the preview path. Do not push or deploy. Ask whether to push `redesign/minimal` and open a Vercel preview.
