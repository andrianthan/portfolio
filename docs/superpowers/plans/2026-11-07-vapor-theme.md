# Vapor Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the whole portfolio as a purple "vapor" theme: glowing hero title, a space-system backdrop (orbit rings, parallax stars, nebula, scanlines), an ASCII agent-network graph, and a chip-plus-input Ask bar, with the page still one scroll.

**Architecture:** Tokens first (`tokens.css` gets a vapor palette as the default and keeps the light palette as the alternate). A fixed `.vb` backdrop layer in `Base.astro` carries stars, nebula, vignette and scanlines, shifted by two unitless pointer variables (`--nx`, `--ny`) that `cursor-field.ts` publishes. A new `vapor.css` holds the hero, nav, chat panel, heading and card treatment. The ASCII graph is a pure module (`graph.ts`, unit-tested) drawn by a small React canvas island. No three.js.

**Tech Stack:** Astro 7, React 19 islands, Vitest 4, TypeScript, plain CSS, `@fontsource-variable/orbitron` and `@fontsource/silkscreen` (self-hosted).

**Spec:** `docs/superpowers/specs/2026-11-07-vapor-theme-design.md` (branch `feat/vapor-theme`, worktree `/Users/andrianthan/Desktop/projects/portfolio-worktrees/vapor-theme`).

## Global Constraints

- Work only on branch `feat/vapor-theme`. Never push or merge to `main`; Andrian has not decided whether to adopt the theme.
- Lighthouse 95 or higher on mobile for `/` and `/work/tesla`. Two font files at most (Orbitron variable latin, Silkscreen 400). No new JS library.
- No horizontal scroll from 320 px up, in the page and in the demo windows.
- AA contrast (4.5:1) for body text, muted text and links against `--color-bg` and `--color-card` in both themes. The test in Task 1 enforces it.
- All motion respects `prefers-reduced-motion`; nothing animates while off-screen or while the tab is hidden. Backdrop and orbit motion uses `transform` and `opacity` only.
- Palette is purple: violet, lavender, indigo-black. No pink.
- Decorative layers (`.vb`, orbits, ASCII graph) are `aria-hidden` and not focusable.
- Section headings and labels use the pixel face; paragraphs keep the readable sans (Inter). Pixel face never below 11 px.
- No face or portrait on the hero. No mic, no "Conversation mode".
- Content, the cleared/listed gate and the agent's answers are unchanged. Existing tests are updated, never deleted, when a change invalidates them.
- Do not change `src/styles/terminal.css` or the `/terminal` page (own scoped palette; out of scope).
- Commit message trailer on every commit: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Rulings made while planning

- Nav order follows the page's scroll order: HOME, EXPERIENCE, PROJECTS, ABOUT, RESUME (the spec listed Projects first; the page has Experience first).
- The existing four route links under the chat (Experience, Projects, About, Contact) stay as the no-JS navigation path and keep their test; they are restyled as a quiet "jump to" row. The new suggestion chips are separate, JS-only question buttons.
- Fonts: Orbitron (title) and Silkscreen (pixel) are provisional until compared against the reference screenshot in Task 9. Alternates if wrong: `@fontsource/audiowide`, `@fontsource/michroma` for the title; `@fontsource/vt323` for the pixel face.
- `/terminal` keeps its warm palette (spec is silent; changing it would churn `terminal.test.ts`). Flag to Andrian in the handoff.
- The legacy stored theme value `dark` maps to `vapor`.

## File structure

| File | Responsibility |
|---|---|
| `src/lib/theme.ts` (+test) | Pure theme resolution: stored value, OS preference, next theme |
| `src/lib/pointer.ts` (+test) | Pure pointer normalization to -1..1 |
| `src/lib/scrollspy.ts` (+test) | Pure active-section choice |
| `src/styles/tokens.css` (+`tokens.test.ts`) | Vapor palette (default) and light palette; AA contrast test |
| `src/styles/vapor.css` (+`vapor.test.ts`) | Backdrop, hero, nav, chat panel, headings, cards; constraint tests |
| `src/components/ascii/graph.ts` (+test) | Graph build, 3D rotate/project, frame render to cells, text export |
| `src/components/ascii/AsciiGraph.tsx` (+test) | Canvas island: draw loop, pause rules, reduced motion, `<pre>` fallback |
| `src/components/Orbits.astro` | Decorative orbit rings (CSS 3D) |
| `src/components/Hero.astro` | Title, tagline, scene (orbits + graph), chat, terminal link |
| `src/components/TopBar.astro` | Vapor nav with scroll-spy hooks and theme control |
| `src/scripts/nav-spy.ts` | Sets `aria-current` on the active nav link |
| `src/scripts/cursor-field.ts` | Also publishes `--nx` / `--ny` |
| `src/components/terminal/suggestions.ts` (+test) | Question pool, rotation, every question answerable |
| `src/components/terminal/IntroTerminal.tsx` (+test) | Suggestion chips, refresh, arrow markers on answers |
| `src/components/ThemeToggle.tsx` (+test) | "vapor / light" control |
| `src/layouts/Base.astro` | Fonts, theme script, `.vb` backdrop markup |
| `src/styles/global.css` | Remove the old cursor field and hero rules (vapor.css is imported from `Base.astro`, after it) |

---

### Task 0: Baseline

**Files:** none changed.

- [ ] **Step 1: Install and record the baseline**

Run (from the worktree root):

```bash
npm ci
npm test 2>&1 | tail -6
npm run build 2>&1 | tail -3
npm run typecheck 2>&1 | tail -4
```

Expected: tests pass (54 files / 580 tests at plan time), build ends `check-build: ok`, typecheck shows 7 errors (3 in `src/components/tesla/admin/admin.test.ts`, 4 in `src/agent/guide/retrieve.ts` and `src/components/terminal/useTerminal.ts`; all pre-existing). Write the three numbers into the ledger as the baseline. Later tasks must not raise the typecheck count.

- [ ] **Step 2: Confirm the branch**

Run: `git branch --show-current` → `feat/vapor-theme`.

---

### Task 1: Theme resolution, tokens, toggle

**Files:**
- Create: `src/lib/theme.ts`, `src/lib/theme.test.ts`, `src/styles/tokens.test.ts`, `src/components/ThemeToggle.test.tsx`
- Modify: `src/styles/tokens.css` (full rewrite), `src/components/ThemeToggle.tsx`, `src/layouts/Base.astro` (inline theme script only)

**Interfaces:**
- Produces: `type Theme = 'vapor' | 'light'`; `parseStored(value: string | null): Theme | null`; `currentTheme(stored: string | null, prefersLight: boolean): Theme`; `nextTheme(stored: string | null, prefersLight: boolean): Theme`.
- Produces CSS tokens (both themes): every token the site already uses, plus `--color-star`, `--color-neb-a`, `--color-neb-b`, `--color-scan`, `--color-vig`, `--title-fill`, `--title-glow`, `--title-shadow`; theme-independent `--font-title`, `--font-pixel`.

- [ ] **Step 1: Write the failing tests**

`src/lib/theme.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseStored, currentTheme, nextTheme } from './theme';

describe('theme resolution', () => {
  it('parses stored values and maps the legacy dark value to vapor', () => {
    expect(parseStored('light')).toBe('light');
    expect(parseStored('vapor')).toBe('vapor');
    expect(parseStored('dark')).toBe('vapor');
    expect(parseStored('banana')).toBeNull();
    expect(parseStored(null)).toBeNull();
  });
  it('uses the stored choice over the OS preference', () => {
    expect(currentTheme('vapor', true)).toBe('vapor');
    expect(currentTheme('light', false)).toBe('light');
  });
  it('defaults to vapor, and to light only for a light OS with no saved choice', () => {
    expect(currentTheme(null, false)).toBe('vapor');
    expect(currentTheme(null, true)).toBe('light');
  });
  it('flips to the other theme', () => {
    expect(nextTheme('vapor', false)).toBe('light');
    expect(nextTheme('light', false)).toBe('vapor');
    expect(nextTheme(null, true)).toBe('vapor');
    expect(nextTheme(null, false)).toBe('light');
  });
});
```

`src/styles/tokens.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

function block(header: string): string {
  const start = css.indexOf(header);
  if (start === -1) throw new Error(`missing ${header}`);
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i);
  }
  throw new Error('unterminated');
}
function token(body: string, name: string): string {
  const m = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(body);
  if (!m) throw new Error(`missing --${name}`);
  return m[1].toLowerCase();
}
function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const themes: [string, string][] = [
  ['vapor', ':root {'],
  ['light', ':root[data-theme="light"]'],
];

describe.each(themes)('%s palette', (_name, header) => {
  const body = block(header);
  it.each([['fg', 'bg'], ['muted', 'bg'], ['accent', 'bg'], ['num', 'bg'], ['fg', 'card'], ['muted', 'card']])(
    '%s on %s is AA',
    (fg, bg) => {
      expect(ratio(token(body, `color-${fg}`), token(body, `color-${bg}`))).toBeGreaterThanOrEqual(4.5);
    },
  );
});

describe('palette hue', () => {
  it('has no pink: the vapor accent and gradient stops are violet or lavender', () => {
    const body = block(':root {');
    for (const name of ['color-accent', 'color-num', 'grad-a', 'grad-b']) {
      const hex = token(body, name);
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      expect(b).toBeGreaterThan(r); // blue leads red: purple side of magenta
      expect(b).toBeGreaterThan(g);
    }
  });
});
```

`src/components/ThemeToggle.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ThemeToggle from './ThemeToggle';

describe('ThemeToggle', () => {
  it('is labelled vapor / light', () => {
    const html = renderToStaticMarkup(<ThemeToggle />);
    expect(html).toContain('id="theme-toggle"');
    expect(html).toContain('vapor / light');
    expect(html).toContain('aria-label="vapor / light theme"');
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/lib/theme.test.ts src/styles/tokens.test.ts src/components/ThemeToggle.test.tsx`
Expected: FAIL (module missing, tokens missing, label wrong).

- [ ] **Step 3: Implement `src/lib/theme.ts`**

```ts
export type Theme = 'vapor' | 'light';

/** A stored theme value, or null when it is missing or unknown. The old `dark` value means vapor. */
export function parseStored(value: string | null): Theme | null {
  if (value === 'light') return 'light';
  if (value === 'vapor' || value === 'dark') return 'vapor';
  return null;
}

/** The theme in effect: the saved choice, else the OS preference, else vapor. */
export function currentTheme(stored: string | null, prefersLight: boolean): Theme {
  return parseStored(stored) ?? (prefersLight ? 'light' : 'vapor');
}

export function nextTheme(stored: string | null, prefersLight: boolean): Theme {
  return currentTheme(stored, prefersLight) === 'light' ? 'vapor' : 'light';
}
```

- [ ] **Step 4: Rewrite `src/styles/tokens.css`**

```css
/* Vapor is the default theme. Light is the alternate: chosen with the toggle, or
   used when the OS prefers light and nothing is saved. */
:root {
  --font-sans: Inter, ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
  --font-title: "Orbitron Variable", Orbitron, var(--font-sans);
  --font-pixel: Silkscreen, var(--font-mono);
  --space-sm: 8px; --space-md: 16px; --space-lg: 32px; --space-xl: 96px;
  --measure: 56rem;

  --color-bg: #0b0a1a; --color-fg: #ece9ff; --color-muted: #a39fc4; --color-rule: #2a2552;
  --color-accent: #b9a4ff; --color-num: #a78bfa; --color-chip: #15122e; --color-card: #100e26;
  --color-dot: #231f48; --color-glow: rgba(139, 92, 246, .28); --color-logo-bg: #ffffff;
  --color-glass: rgba(24, 20, 56, .55); --color-mask: #000; --grad-a: #8b5cf6; --grad-b: #d8b4fe;
  --color-star: rgba(226, 220, 255, .9); --color-neb-a: rgba(109, 61, 240, .30);
  --color-neb-b: rgba(56, 40, 150, .28); --color-scan: rgba(0, 0, 0, .18); --color-vig: rgba(3, 2, 12, .55);
  --title-fill: #f3efff; --title-glow: rgba(167, 139, 250, .65); --title-shadow: #4a2fb5;
}
:root[data-theme="light"] {
  --color-bg: #f7f6fb; --color-fg: #1a1a24; --color-muted: #5c5c70; --color-rule: #dcdbe6;
  --color-accent: #5b3fd1; --color-num: #6d3df0; --color-chip: #ecebf4; --color-card: #ffffff;
  --color-dot: #d4d3e0; --color-glow: rgba(109, 61, 240, .12); --color-logo-bg: #ffffff;
  --color-glass: rgba(255, 255, 255, .4); --color-mask: #000; --grad-a: #6d3df0; --grad-b: #b724c9;
  --color-star: rgba(91, 63, 209, .35); --color-neb-a: rgba(109, 61, 240, .10);
  --color-neb-b: rgba(183, 36, 201, .06); --color-scan: rgba(0, 0, 0, 0); --color-vig: rgba(255, 255, 255, 0);
  --title-fill: #2a1a7a; --title-glow: rgba(109, 61, 240, .25); --title-shadow: #b9a8f5;
}
@media (prefers-color-scheme: light) {
  :root:not([data-theme]) {
    --color-bg: #f7f6fb; --color-fg: #1a1a24; --color-muted: #5c5c70; --color-rule: #dcdbe6;
    --color-accent: #5b3fd1; --color-num: #6d3df0; --color-chip: #ecebf4; --color-card: #ffffff;
    --color-dot: #d4d3e0; --color-glow: rgba(109, 61, 240, .12); --color-logo-bg: #ffffff;
    --color-glass: rgba(255, 255, 255, .4); --color-mask: #000; --grad-a: #6d3df0; --grad-b: #b724c9;
    --color-star: rgba(91, 63, 209, .35); --color-neb-a: rgba(109, 61, 240, .10);
    --color-neb-b: rgba(183, 36, 201, .06); --color-scan: rgba(0, 0, 0, 0); --color-vig: rgba(255, 255, 255, 0);
    --title-fill: #2a1a7a; --title-glow: rgba(109, 61, 240, .25); --title-shadow: #b9a8f5;
  }
}
```

- [ ] **Step 5: Update `ThemeToggle.tsx`**

```tsx
import { useCallback } from 'react';
import { nextTheme } from '../lib/theme';

export default function ThemeToggle() {
  const toggle = useCallback(() => {
    const root = document.documentElement;
    const next = nextTheme(root.getAttribute('data-theme'), matchMedia('(prefers-color-scheme: light)').matches);
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch {}
  }, []);

  return (
    <button id="theme-toggle" type="button" aria-label="vapor / light theme" onClick={toggle}>
      vapor / light
    </button>
  );
}
```

- [ ] **Step 6: Update the inline script in `Base.astro`** (replace the `try { ... } catch` line; keep the `classList.add('js')` line):

```js
try { var t = localStorage.getItem('theme'); if (t === 'dark') t = 'vapor'; if (t === 'light' || t === 'vapor') document.documentElement.setAttribute('data-theme', t); } catch (e) {}
```

- [ ] **Step 7: Run tests, then the full suite**

Run: `npx vitest run src/lib/theme.test.ts src/styles/tokens.test.ts src/components/ThemeToggle.test.tsx` → PASS. Then `npm test` → all green. If a contrast assertion fails, adjust that one token (not the threshold) and re-run.

- [ ] **Step 8: Commit**

```bash
git add src/lib/theme.ts src/lib/theme.test.ts src/styles/tokens.css src/styles/tokens.test.ts src/components/ThemeToggle.tsx src/components/ThemeToggle.test.tsx src/layouts/Base.astro
git commit -m "feat: vapor palette as the default theme, light as the alternate

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Fonts

**Files:**
- Modify: `package.json`, `package-lock.json`, `src/layouts/Base.astro`
- Create: `src/styles/fonts.test.ts`

**Interfaces:** Consumes `--font-title`, `--font-pixel` from Task 1. Produces the two loaded families "Orbitron Variable" and "Silkscreen".

- [ ] **Step 1: Failing test** `src/styles/fonts.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const base = fs.readFileSync(path.join(root, 'src/layouts/Base.astro'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

describe('vapor fonts', () => {
  it('self-hosts exactly the title and pixel faces through fontsource', () => {
    expect(pkg.dependencies['@fontsource-variable/orbitron']).toBeTruthy();
    expect(pkg.dependencies['@fontsource/silkscreen']).toBeTruthy();
    expect(base).toContain("import '@fontsource-variable/orbitron/index.css'");
    expect(base).toContain("import '@fontsource/silkscreen/400.css'");
  });
  it('does not pull the vapor faces from a third-party host', () => {
    expect(base).not.toMatch(/fonts\.googleapis\.com[^"]*(Orbitron|Silkscreen)/);
  });
});
```

- [ ] **Step 2: Run to confirm it fails.** `npx vitest run src/styles/fonts.test.ts` → FAIL.

- [ ] **Step 3: Install**

```bash
npm install @fontsource-variable/orbitron @fontsource/silkscreen
```

If either package name does not resolve, run `npm view <name> version` for the alternates listed in the plan's rulings, choose one, and record the choice in the ledger.

- [ ] **Step 4: Import in `Base.astro` frontmatter** (after the existing imports):

```astro
import '@fontsource-variable/orbitron/index.css';
import '@fontsource/silkscreen/400.css';
```

Leave the Inter and JetBrains Mono Google link as is.

- [ ] **Step 5: Verify.** `npx vitest run src/styles/fonts.test.ts` → PASS. `npm run build 2>&1 | tail -3` → `check-build: ok`. Then `ls dist/_astro | grep -i -E "orbitron|silkscreen"` shows woff2 files (note the sizes in the ledger).

- [ ] **Step 6: Commit** `feat: self-host the vapor title and pixel fonts`.

---

### Task 3: Pointer variables

**Files:**
- Create: `src/lib/pointer.ts`, `src/lib/pointer.test.ts`
- Modify: `src/scripts/cursor-field.ts`

**Interfaces:** Produces `normalize(x, y, w, h): { nx: number; ny: number }` (each clamped to -1..1; zero size returns 0,0). Produces root CSS variables `--nx`, `--ny` (unitless, 3 decimals), set per animation frame and removed on `clear()`.

- [ ] **Step 1: Failing test** `src/lib/pointer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalize } from './pointer';

describe('normalize', () => {
  it('maps the viewport centre to 0,0 and the corners to -1 and 1', () => {
    expect(normalize(500, 400, 1000, 800)).toEqual({ nx: 0, ny: 0 });
    expect(normalize(0, 0, 1000, 800)).toEqual({ nx: -1, ny: -1 });
    expect(normalize(1000, 800, 1000, 800)).toEqual({ nx: 1, ny: 1 });
  });
  it('clamps positions outside the viewport', () => {
    expect(normalize(-50, 9999, 1000, 800)).toEqual({ nx: -1, ny: 1 });
  });
  it('returns 0,0 for a zero-size viewport', () => {
    expect(normalize(10, 10, 0, 0)).toEqual({ nx: 0, ny: 0 });
  });
});
```

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: `src/lib/pointer.ts`**

```ts
const clamp = (v: number): number => Math.max(-1, Math.min(1, v));

/** The pointer as -1..1 from the viewport centre. The backdrop multiplies this by a per-layer distance. */
export function normalize(x: number, y: number, w: number, h: number): { nx: number; ny: number } {
  if (w <= 0 || h <= 0) return { nx: 0, ny: 0 };
  return { nx: clamp((x / w) * 2 - 1), ny: clamp((y / h) * 2 - 1) };
}
```

- [ ] **Step 4: Edit `cursor-field.ts`.** Add `import { normalize } from '../lib/pointer';` at the top. In `paint()` after the two existing `setProperty` calls add:

```ts
  const n = normalize(x, y, window.innerWidth, window.innerHeight);
  root.style.setProperty('--nx', n.nx.toFixed(3));
  root.style.setProperty('--ny', n.ny.toFixed(3));
```

In `clear()` after the two existing `removeProperty` calls add `root.style.removeProperty('--nx'); root.style.removeProperty('--ny');`. Update the file's header comment to say it also publishes the unitless pair read by the backdrop.

- [ ] **Step 5: Run `npm test` → green. Commit** `feat: publish unitless pointer variables for the backdrop`.

---

### Task 4: Backdrop layer and the old field removed

**Files:**
- Create: `src/styles/vapor.css` (backdrop section only in this task), `src/styles/vapor.test.ts`
- Modify: `src/layouts/Base.astro` (markup, and the `vapor.css` import after `global.css`), `src/styles/global.css`

**Interfaces:** Consumes tokens `--color-star`, `--color-neb-a/b`, `--color-scan`, `--color-vig`, and `--nx`/`--ny`. Produces `.vb` and its four children (`.vb-neb`, `.vb-far`, `.vb-mid`, `.vb-near`).

- [ ] **Step 1: Failing test** `src/styles/vapor.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const vapor = read('src/styles/vapor.css');
const global = read('src/styles/global.css');

describe('vapor backdrop', () => {
  it('moves layers with transform only', () => {
    const layers = vapor.match(/\.vb-(neb|far|mid|near)\s*\{[^}]*\}/g) ?? [];
    expect(layers.length).toBe(4);
    for (const rule of layers) {
      expect(rule).toContain('transform:');
      expect(rule).not.toMatch(/\b(top|left|margin)\s*:/);
    }
  });
  it('keeps the backdrop behind content and out of the pointer path', () => {
    expect(vapor).toMatch(/\.vb\s*\{[^}]*position:\s*fixed[^}]*z-index:\s*-1[^}]*pointer-events:\s*none/);
  });
  it('has a reduced-motion block that stills the layers', () => {
    expect(vapor).toContain('@media (prefers-reduced-motion: reduce)');
  });
  it('loads after global.css (so its rules win ties) and the old cursor field is gone', () => {
    const base = fs.readFileSync(path.join(process.cwd(), 'src/layouts/Base.astro'), 'utf8');
    expect(base).toContain("import '../styles/vapor.css'");
    expect(base.indexOf("import '../styles/global.css'")).toBeGreaterThanOrEqual(0);
    expect(base.indexOf("import '../styles/global.css'")).toBeLessThan(base.indexOf("import '../styles/vapor.css'"));
    expect(global).not.toContain('vapor.css');
    expect(global).not.toContain('body::before');
    expect(global).not.toContain('html:hover body::after');
    expect(global).not.toContain('(hover: none)');
  });
});
```

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Create `src/styles/vapor.css`** with the backdrop:

```css
/* ---- backdrop: a space system behind everything ---- */
.vb { position: fixed; inset: 0; z-index: -1; pointer-events: none; overflow: hidden; }
.vb i { position: absolute; inset: -4%; display: block; will-change: transform; }
.vb-neb {
  background:
    radial-gradient(ellipse 60% 50% at 18% 12%, var(--color-neb-a), transparent 70%),
    radial-gradient(ellipse 55% 45% at 85% 70%, var(--color-neb-b), transparent 72%);
  transform: translate3d(calc(var(--nx, 0) * -4px), calc(var(--ny, 0) * -3px), 0);
}
.vb-far {
  background-image:
    radial-gradient(1px 1px at 14px 22px, var(--color-star), transparent),
    radial-gradient(1px 1px at 96px 71px, var(--color-star), transparent),
    radial-gradient(1px 1px at 151px 133px, var(--color-star), transparent);
  background-size: 173px 157px; opacity: .55;
  transform: translate3d(calc(var(--nx, 0) * -8px), calc(var(--ny, 0) * -6px), 0);
}
.vb-mid {
  background-image:
    radial-gradient(1px 1px at 40px 60px, var(--color-star), transparent),
    radial-gradient(1.2px 1.2px at 180px 150px, var(--color-star), transparent),
    radial-gradient(1px 1px at 120px 20px, var(--color-star), transparent);
  background-size: 241px 223px; opacity: .8;
  transform: translate3d(calc(var(--nx, 0) * -16px), calc(var(--ny, 0) * -12px), 0);
}
.vb-near {
  background-image:
    radial-gradient(1.6px 1.6px at 70px 90px, var(--color-star), transparent),
    radial-gradient(1.4px 1.4px at 260px 200px, var(--color-star), transparent);
  background-size: 331px 307px;
  transform: translate3d(calc(var(--nx, 0) * -30px), calc(var(--ny, 0) * -22px), 0);
}
/* the vignette and the scanlines sit over the stars and under the content */
.vb::before { content: ""; position: absolute; inset: 0; background: radial-gradient(ellipse 75% 65% at 50% 38%, transparent 55%, var(--color-vig)); }
.vb::after { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(to bottom, transparent 0 2px, var(--color-scan) 2px 3px); }

@media (prefers-reduced-motion: reduce) {
  .vb i { will-change: auto; transform: none; }
}
```

- [ ] **Step 4: Markup in `Base.astro`:** immediately after `<body>` add

```astro
<div class="vb" aria-hidden="true"><i class="vb-neb"></i><i class="vb-far"></i><i class="vb-mid"></i><i class="vb-near"></i></div>
```

- [ ] **Step 5: Edit `global.css` with a one-shot script** (run, then `git diff --stat src/styles/global.css` to eyeball it):

```bash
python3 -I - <<'EOF'
p = 'src/styles/global.css'
s = open(p).read()

def cut(s, start, end, keep_end=True):
    a = s.index(start)
    b = s.index(end, a)
    b = b + (len(end) if keep_end else 0)
    return s[:a] + s[b:]

# 1. the old cursor field: from its comment to the no-JS line
s = cut(s, '/* the cursor field:', 'html:not(.js) body::after { opacity: 1; transition: none; }\n')
# 2. the reduced-motion freeze of that field
s = cut(s, '  /* the field is frozen:', "mask-image: none; }\n")
# 3. the touch-screen fallback at the end of the file
a = s.index('/* a touch screen has no cursor to follow:')
s = s[:a].rstrip() + '\n'
open(p, 'w').write(s)
EOF
grep -n "body::before\|body::after\|hover: none" src/styles/global.css || echo clean
```

Expected: `clean`. Then in `Base.astro` frontmatter add `import '../styles/vapor.css';` on the line right after `import '../styles/global.css';`. It must NOT be an `@import` inside `global.css`: an import there is hoisted above global.css's own rules, so every same-specificity override in `vapor.css` would lose to the older rule. Keep `html { scroll-behavior: smooth; }` and the body rule; add `scroll-padding-top: 72px;` to the `html` rule (the sticky nav in Task 7 needs it).

- [ ] **Step 6: Run `npx vitest run src/styles` then `npm test` → green; `npm run build` → `check-build: ok`.**

- [ ] **Step 7: Commit** `feat: space-system backdrop layer replaces the dot field`.

---

### Task 5: ASCII graph logic

**Files:**
- Create: `src/components/ascii/graph.ts`, `src/components/ascii/graph.test.ts`

**Interfaces — Produces:**
`interface Vec3 { x: number; y: number; z: number }`
`interface Graph { nodes: Vec3[]; edges: [number, number][]; hub: number }`
`interface Cell { col: number; row: number; ch: string; level: number }` (level 0..1)
`const RAMP = ' .:-=+*#%@'`
`mulberry32(seed: number): () => number`
`buildGraph(seed?: number): Graph`
`rotate(v: Vec3, yaw: number, pitch: number): Vec3`
`project(v: Vec3, cols: number, rows: number): { col: number; row: number; depth: number }`
`interface FrameOptions { t: number; yaw: number; pitch: number; cols: number; rows: number; focus?: { col: number; row: number } | null }`
`renderFrame(graph: Graph, o: FrameOptions): Cell[]`
`toText(cells: Cell[], cols: number, rows: number): string`

- [ ] **Step 1: Failing tests** `graph.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildGraph, rotate, project, renderFrame, toText, RAMP } from './graph';

const COLS = 72, ROWS = 30;
const base = { t: 0, yaw: 0.4, pitch: 0.2, cols: COLS, rows: ROWS };

describe('buildGraph', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    expect(buildGraph(7)).toEqual(buildGraph(7));
    expect(buildGraph(7).nodes).not.toEqual(buildGraph(8).nodes);
  });
  it('has a hub at the origin and valid, unique edges', () => {
    const g = buildGraph();
    expect(g.nodes[g.hub]).toEqual({ x: 0, y: 0, z: 0 });
    expect(g.nodes.length).toBeGreaterThanOrEqual(15);
    const seen = new Set<string>();
    for (const [a, b] of g.edges) {
      expect(a).not.toBe(b);
      expect(a).toBeGreaterThanOrEqual(0); expect(b).toBeLessThan(g.nodes.length);
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
  it('connects every node to the hub through some path', () => {
    const g = buildGraph();
    const reach = new Set([g.hub]);
    for (let i = 0; i < g.nodes.length; i++)
      for (const [a, b] of g.edges) { if (reach.has(a)) reach.add(b); if (reach.has(b)) reach.add(a); }
    expect(reach.size).toBe(g.nodes.length);
  });
});

describe('rotate and project', () => {
  it('leaves the origin at the centre of the grid', () => {
    const p = project(rotate({ x: 0, y: 0, z: 0 }, 1.1, 0.6), COLS, ROWS);
    expect(p.col).toBeCloseTo(COLS / 2, 5);
    expect(p.row).toBeCloseTo(ROWS / 2, 5);
  });
  it('makes nearer points larger: the same x lands farther from centre when z is bigger', () => {
    const far = project({ x: 0.5, y: 0, z: -0.8 }, COLS, ROWS);
    const near = project({ x: 0.5, y: 0, z: 0.8 }, COLS, ROWS);
    expect(near.col - COLS / 2).toBeGreaterThan(far.col - COLS / 2);
    expect(near.depth).toBeGreaterThan(far.depth);
  });
});

describe('renderFrame', () => {
  const g = buildGraph();
  it('returns only in-bounds cells with ramp characters and levels in 0..1', () => {
    const cells = renderFrame(g, base);
    expect(cells.length).toBeGreaterThan(40);
    for (const c of cells) {
      expect(c.col).toBeGreaterThanOrEqual(0); expect(c.col).toBeLessThan(COLS);
      expect(c.row).toBeGreaterThanOrEqual(0); expect(c.row).toBeLessThan(ROWS);
      expect(RAMP.includes(c.ch)).toBe(true);
      expect(c.level).toBeGreaterThanOrEqual(0); expect(c.level).toBeLessThanOrEqual(1);
    }
  });
  it('has one cell per grid position', () => {
    const cells = renderFrame(g, base);
    const keys = new Set(cells.map((c) => `${c.col},${c.row}`));
    expect(keys.size).toBe(cells.length);
  });
  it('is stable for identical input (the reduced-motion frame)', () => {
    expect(renderFrame(g, base)).toEqual(renderFrame(g, base));
  });
  it('changes when the graph is turned', () => {
    expect(renderFrame(g, { ...base, yaw: 1.4 })).not.toEqual(renderFrame(g, base));
  });
  it('moves the pulses with time', () => {
    const stars = (t: number) => renderFrame(g, { ...base, t }).filter((c) => c.ch === '*').map((c) => `${c.col},${c.row}`).join('|');
    expect(stars(0).length).toBeGreaterThan(0);
    expect(stars(0.4)).not.toBe(stars(0));
  });
  it('brightens cells near the focus point', () => {
    const plain = renderFrame(g, base);
    const hot = plain.find((c) => c.level < 0.7)!;
    const focused = renderFrame(g, { ...base, focus: { col: hot.col, row: hot.row } });
    const same = focused.find((c) => c.col === hot.col && c.row === hot.row)!;
    expect(same.level).toBeGreaterThan(hot.level);
  });
});

describe('toText', () => {
  it('produces rows lines of cols characters', () => {
    const text = toText(renderFrame(buildGraph(), base), COLS, ROWS);
    const lines = text.split('\n');
    expect(lines.length).toBe(ROWS);
    for (const l of lines) expect(l.length).toBe(COLS);
    expect(text).toContain('@'); // the hub
  });
});
```

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement `graph.ts`**

```ts
export interface Vec3 { x: number; y: number; z: number }
export interface Graph { nodes: Vec3[]; edges: [number, number][]; hub: number }
export interface Cell { col: number; row: number; ch: string; level: number }
export interface FrameOptions { t: number; yaw: number; pitch: number; cols: number; rows: number; focus?: { col: number; row: number } | null }

export const RAMP = ' .:-=+*#%@';

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

const dist = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** A hub with three rings of nodes (5, 8, 6), wired outward. Same seed, same graph. */
export function buildGraph(seed = 7): Graph {
  const rand = mulberry32(seed);
  const nodes: Vec3[] = [{ x: 0, y: 0, z: 0 }];
  const ring = (count: number, radius: number, spread: number): number[] => {
    const ids: number[] = [];
    const phase = rand() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const a = phase + (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.35;
      nodes.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius * 0.8, z: (rand() - 0.5) * spread });
      ids.push(nodes.length - 1);
    }
    return ids;
  };
  const A = ring(5, 0.45, 0.4);
  const B = ring(8, 0.8, 0.8);
  const C = ring(6, 1.0, 1.2);

  const seen = new Set<string>();
  const edges: [number, number][] = [];
  const link = (a: number, b: number) => {
    if (a === b) return;
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push([a, b]);
  };
  const nearest = (from: number, among: number[]) =>
    among.reduce((best, id) => (dist(nodes[from], nodes[id]) < dist(nodes[from], nodes[best]) ? id : best), among[0]);

  for (const a of A) link(0, a);
  B.forEach((b, i) => { link(b, nearest(b, A)); link(b, B[(i + 1) % B.length]); });
  for (const c of C) link(c, nearest(c, B));
  return { nodes, edges, hub: 0 };
}

export function rotate(v: Vec3, yaw: number, pitch: number): Vec3 {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const x1 = v.x * cy + v.z * sy;
  const z1 = -v.x * sy + v.z * cy;
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  return { x: x1, y: v.y * cp - z1 * sp, z: v.y * sp + z1 * cp };
}

/** Perspective onto a character grid. Cells are taller than wide, so rows scale by a different factor. */
export function project(v: Vec3, cols: number, rows: number): { col: number; row: number; depth: number } {
  const d = 3.2;
  const s = d / (d - v.z);
  return {
    col: cols / 2 + v.x * s * cols * 0.3,
    row: rows / 2 + v.y * s * rows * 0.4,
    depth: Math.max(0, Math.min(1, (v.z + 1.2) / 2.4)),
  };
}

const charFor = (level: number) => RAMP[Math.min(RAMP.length - 1, Math.max(1, Math.floor(level * RAMP.length)))];

interface Slot { level: number; ch?: string }

export function renderFrame(graph: Graph, o: FrameOptions): Cell[] {
  const { cols, rows } = o;
  const pts = graph.nodes.map((n) => project(rotate(n, o.yaw, o.pitch), cols, rows));
  const slots = new Map<string, Slot & { col: number; row: number }>();
  const put = (colF: number, rowF: number, level: number, ch?: string) => {
    const col = Math.round(colF), row = Math.round(rowF);
    if (col < 0 || col >= cols || row < 0 || row >= rows) return;
    const key = `${col},${row}`;
    const prev = slots.get(key);
    if (prev && prev.level >= level) return;
    slots.set(key, { col, row, level, ch });
  };

  graph.edges.forEach(([a, b], e) => {
    const p = pts[a], q = pts[b];
    const steps = Math.max(Math.abs(q.col - p.col), Math.abs(q.row - p.row));
    for (let i = 1; i < steps; i++) {
      const f = i / steps;
      put(p.col + (q.col - p.col) * f, p.row + (q.row - p.row) * f, 0.2 + 0.3 * (p.depth + (q.depth - p.depth) * f));
    }
    const phase = (o.t * 0.35 + e * 0.137) % 1;
    put(p.col + (q.col - p.col) * phase, p.row + (q.row - p.row) * phase, 0.95, '*');
  });
  graph.nodes.forEach((_, i) => {
    const p = pts[i];
    if (i === graph.hub) put(p.col, p.row, 1, '@');
    else put(p.col, p.row, 0.6 + 0.4 * p.depth, '#');
  });

  const cells: Cell[] = [];
  for (const s of slots.values()) {
    let level = s.level;
    if (o.focus) {
      const d = Math.hypot(s.col - o.focus.col, (s.row - o.focus.row) * 1.8);
      if (d < 7) level = Math.min(1, level + 0.3 * (1 - d / 7));
    }
    cells.push({ col: s.col, row: s.row, ch: s.ch ?? charFor(level), level });
  }
  return cells;
}

export function toText(cells: Cell[], cols: number, rows: number): string {
  const grid = Array.from({ length: rows }, () => Array<string>(cols).fill(' '));
  for (const c of cells) grid[c.row][c.col] = c.ch;
  return grid.map((r) => r.join('')).join('\n');
}
```

Note: the `'*'` pulse and node glyphs are in `RAMP`; `charFor` never returns a space.

- [ ] **Step 4: Run `npx vitest run src/components/ascii/graph.test.ts` → PASS.** If the focus test fails because the first dim cell is a fixed glyph (`ch` set), that is fine: only `level` is asserted. If the "pulses move" test fails because a pulse landed on a node at both times, change the second `t` in the test to `0.55`; do not weaken the assertion.

- [ ] **Step 5: Commit** `feat: ASCII agent-graph logic`.

---

### Task 6: AsciiGraph island and the orbits

**Files:**
- Create: `src/components/ascii/AsciiGraph.tsx`, `src/components/ascii/AsciiGraph.test.tsx`, `src/components/Orbits.astro`
- Modify: `src/styles/vapor.css` (append scene, ascii, orbit sections), `src/styles/vapor.test.ts` (append orbit assertions)

**Interfaces:** Consumes `buildGraph`, `renderFrame`, `toText` (Task 5) and `--nx`/`--ny` (Task 3). Produces `<AsciiGraph />` (default export) and `<Orbits />`; CSS classes `.hero-scene`, `.ascii`, `.ascii-canvas`, `.ascii-fallback`, `.orbits`, `.orbit-plane`, `.ring`, `.planet`.

- [ ] **Step 1: Failing tests.** `AsciiGraph.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AsciiGraph from './AsciiGraph';

const html = renderToStaticMarkup(<AsciiGraph />);

describe('AsciiGraph', () => {
  it('is decorative: aria-hidden wrapper, a canvas, and a static text fallback', () => {
    expect(html).toContain('class="ascii" aria-hidden="true"');
    expect(html).toContain('<canvas');
    expect(html).toContain('class="ascii-fallback"');
  });
  it('the fallback carries the drawn graph, hub included', () => {
    const pre = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/)?.[1] ?? '';
    expect(pre).toContain('@');
    expect(pre.split('\n').length).toBe(30);
  });
});
```

Append to `vapor.test.ts`:

```ts
describe('vapor scene', () => {
  it('moves the orbit rings with transform only and stills them under reduced motion', () => {
    expect(vapor).toMatch(/@keyframes orbit\s*\{\s*to\s*\{\s*transform:/);
    // later tasks append more reduced-motion blocks, so read all of them
    const rm = vapor.split('@media (prefers-reduced-motion: reduce)').slice(1).join('\n');
    expect(rm).toMatch(/\.ring\s*\{[^}]*animation:\s*none/);
  });
  it('shows the text fallback only without JavaScript', () => {
    expect(vapor).toMatch(/\.js \.ascii-fallback\s*\{\s*display:\s*none/);
  });
});
```

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: `AsciiGraph.tsx`**

```tsx
import { useEffect, useRef } from 'react';
import { buildGraph, renderFrame, toText } from './graph';

const COLS = 72;
const ROWS = 30;
const graph = buildGraph();
const staticText = toText(renderFrame(graph, { t: 0, yaw: 0.5, pitch: 0.2, cols: COLS, rows: ROWS }), COLS, ROWS);

/** The agent network, drawn in characters. Decorative: the text is for no-JS and screen-off cases. */
export default function AsciiGraph() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const root = document.documentElement;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let color = getComputedStyle(root).getPropertyValue('--color-num').trim() || '#a78bfa';
    let cellW = 8, cellH = 14;
    let focus: { col: number; row: number } | null = null;
    let visible = true;
    let raf = 0;
    let last = 0;
    const t0 = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cellW = rect.width / COLS;
      cellH = rect.height / ROWS;
      ctx.font = `${Math.max(8, cellH * 0.9)}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
    };

    const draw = (now: number) => {
      const t = reduce.matches ? 0 : (now - t0) / 1000;
      const nx = parseFloat(root.style.getPropertyValue('--nx')) || 0;
      const ny = parseFloat(root.style.getPropertyValue('--ny')) || 0;
      const yaw = reduce.matches ? 0.5 : 0.5 + t * 0.12 + nx * 0.5;
      const pitch = reduce.matches ? 0.2 : 0.2 - ny * 0.25;
      const cells = renderFrame(graph, { t, yaw, pitch, cols: COLS, rows: ROWS, focus: reduce.matches ? null : focus });
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = color;
      for (const c of cells) {
        ctx.globalAlpha = 0.15 + 0.85 * c.level;
        ctx.fillText(c.ch, c.col * cellW + cellW / 2, c.row * cellH + cellH / 2);
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      raf = 0;
      if (!visible || document.hidden || reduce.matches) return;
      if (now - last >= 33) { last = now; draw(now); }
      raf = requestAnimationFrame(loop);
    };
    const start = () => { if (!raf && visible && !document.hidden && !reduce.matches) raf = requestAnimationFrame(loop); };
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const r = canvas.getBoundingClientRect();
      focus = { col: ((e.clientX - r.left) / r.width) * COLS, row: ((e.clientY - r.top) / r.height) * ROWS };
    };
    const onLeave = () => { focus = null; };
    const onVisibility = () => (document.hidden ? stop() : start());
    const onMotion = () => { if (reduce.matches) { stop(); draw(performance.now()); } else start(); };

    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (visible) start(); else stop();
    });
    const themeWatch = new MutationObserver(() => {
      color = getComputedStyle(root).getPropertyValue('--color-num').trim() || color;
      if (reduce.matches) draw(performance.now());
    });
    const ro = new ResizeObserver(() => { resize(); draw(performance.now()); });

    resize();
    draw(performance.now());
    io.observe(canvas);
    ro.observe(canvas);
    themeWatch.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    reduce.addEventListener('change', onMotion);
    start();

    return () => {
      stop();
      io.disconnect(); ro.disconnect(); themeWatch.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      reduce.removeEventListener('change', onMotion);
    };
  }, []);

  return (
    <div className="ascii" aria-hidden="true">
      <pre className="ascii-fallback">{staticText}</pre>
      <canvas ref={ref} className="ascii-canvas" />
    </div>
  );
}
```

- [ ] **Step 4: `src/components/Orbits.astro`**

```astro
---
const rings = [1, 2, 3, 4];
---
<div class="orbits" aria-hidden="true">
  <div class="orbit-plane">
    {rings.map((n) => <span class={`ring r${n}`}><i class="planet"></i></span>)}
  </div>
</div>
```

- [ ] **Step 5: Append to `vapor.css`**

```css
/* ---- hero scene: orbits and the ASCII graph ---- */
.hero-scene {
  position: relative; width: 100%; height: clamp(300px, 52vw, 520px); overflow: hidden;
  -webkit-mask-image: radial-gradient(ellipse 72% 72% at 50% 50%, #000 55%, transparent 100%);
  mask-image: radial-gradient(ellipse 72% 72% at 50% 50%, #000 55%, transparent 100%);
}
.ascii { position: absolute; left: 50%; top: 50%; width: min(620px, 86%); aspect-ratio: 576 / 420; transform: translate(-50%, -50%); }
.ascii-canvas { display: none; width: 100%; height: 100%; }
.js .ascii-canvas { display: block; }
.ascii-fallback { display: block; margin: 0; font: 400 clamp(5px, 1.2vw, 9px)/1 var(--font-mono); color: var(--color-num); text-align: center; overflow: hidden; white-space: pre; }
.js .ascii-fallback { display: none; }

.orbits { position: absolute; inset: 0; perspective: 900px; perspective-origin: 50% 40%; pointer-events: none; }
.orbit-plane {
  position: absolute; inset: 0; transform-style: preserve-3d;
  transform: rotateX(calc(66deg + var(--ny, 0) * 4deg)) rotateZ(calc(var(--nx, 0) * 6deg));
  transition: transform .25s ease-out;
}
.ring {
  position: absolute; left: 50%; top: 50%; aspect-ratio: 1; border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--color-num) 38%, transparent);
  transform: translate(-50%, -50%); animation: orbit var(--dur) linear infinite; will-change: transform;
}
.r1 { width: 40%; --dur: 46s; } .r2 { width: 62%; --dur: 78s; } .r3 { width: 84%; --dur: 112s; } .r4 { width: 108%; --dur: 150s; }
.planet { position: absolute; top: -4px; left: 50%; width: 8px; height: 8px; margin-left: -4px; border-radius: 50%; background: var(--color-accent); box-shadow: 0 0 10px 2px var(--color-glow); }
.r2 .planet { width: 6px; height: 6px; top: -3px; margin-left: -3px; }
.r4 .planet { width: 10px; height: 10px; top: -5px; margin-left: -5px; }
@keyframes orbit { to { transform: translate(-50%, -50%) rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .ring { animation: none; will-change: auto; }
  .orbit-plane { transition: none; transform: rotateX(66deg); }
}
```

If the file already ends with a reduced-motion block from Task 4, keep both blocks (CSS allows several); the test reads all of them.

- [ ] **Step 6: Run `npx vitest run src/components/ascii src/styles` → PASS; `npm test` → green. Commit** `feat: ASCII agent graph island and orbit rings`.

---

### Task 7: Hero, nav with scroll-spy, suggestion chips

**Files:**
- Create: `src/lib/scrollspy.ts`, `src/lib/scrollspy.test.ts`, `src/scripts/nav-spy.ts`, `src/components/terminal/suggestions.ts`, `src/components/terminal/suggestions.test.ts`
- Modify: `src/components/Hero.astro`, `src/components/TopBar.astro`, `src/pages/index.astro`, `src/components/terminal/IntroTerminal.tsx`, `src/components/terminal/IntroTerminal.test.tsx`, `src/styles/vapor.css` (append nav, hero, chat sections), `src/styles/global.css` (remove the old hero rules)

**Interfaces:**
- Produces `activeSection(tops: { id: string; top: number }[], offset: number): string` (tops in document order; the last section whose top is at or above `offset`; the first id when none).
- Produces `SUGGESTIONS: string[]` (6 questions), `pickSuggestions(page: number, size?: number): string[]` (a rotating window, wraps, default 3).
- Consumes `useTerminal().submit(raw?)`, `AsciiGraph` (Task 6), `Orbits` (Task 6).

- [ ] **Step 1: Failing tests.** `scrollspy.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { activeSection } from './scrollspy';

const tops = (...t: number[]) => ['top', 'experience', 'projects', 'about'].map((id, i) => ({ id, top: t[i] }));

describe('activeSection', () => {
  it('is the first section at the very top of the page', () => {
    expect(activeSection(tops(0, 700, 1500, 2300), 120)).toBe('top');
  });
  it('switches when a section crosses the offset', () => {
    expect(activeSection(tops(-600, 100, 900, 1700), 120)).toBe('experience');
    expect(activeSection(tops(-1400, -700, 100, 900), 120)).toBe('projects');
  });
  it('stays on the last section past the end', () => {
    expect(activeSection(tops(-3000, -2300, -1500, -200), 120)).toBe('about');
  });
  it('falls back to the first id when nothing has crossed yet', () => {
    expect(activeSection(tops(300, 900, 1700, 2500), 120)).toBe('top');
  });
});
```

`suggestions.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fixture from '../../agent/fixtures/snapshot.json';
import { runAgent } from '../../agent/run';
import type { Snapshot } from '../../agent/types';
import { SUGGESTIONS, pickSuggestions } from './suggestions';

const snapshot = fixture as unknown as Snapshot;

describe('suggestions', () => {
  it('has six unique questions', () => {
    expect(SUGGESTIONS.length).toBe(6);
    expect(new Set(SUGGESTIONS).size).toBe(6);
  });
  it('every question gets a grounded answer, never a refusal', () => {
    for (const q of SUGGESTIONS) {
      const result = runAgent(snapshot, q);
      expect(result.refused, q).toBe(false);
      expect(result.answer, q).not.toBeNull();
    }
  });
  it('rotates a window of three and wraps', () => {
    expect(pickSuggestions(0)).toEqual(SUGGESTIONS.slice(0, 3));
    expect(pickSuggestions(1)).toEqual(SUGGESTIONS.slice(3, 6));
    expect(pickSuggestions(2)).toEqual(SUGGESTIONS.slice(0, 3));
    expect(pickSuggestions(1, 4)).toEqual([SUGGESTIONS[4], SUGGESTIONS[5], SUGGESTIONS[0], SUGGESTIONS[1]]);
  });
});
```

Append to `IntroTerminal.test.tsx`:

```tsx
describe('IntroTerminal suggestions', () => {
  it('renders three suggestion chips and a refresh button as buttons', () => {
    expect(html.split('class="intro-chip"').length - 1).toBe(3);
    expect(html).toMatch(/<button[^>]*class="intro-chip"/);
    expect(html).toContain('aria-label="Show other questions"');
  });
});
```

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement the pure modules.**

`src/lib/scrollspy.ts`:

```ts
/** The section the reader is in: the last one whose top has reached `offset`. `tops` is in document order. */
export function activeSection(tops: { id: string; top: number }[], offset: number): string {
  let active = tops[0]?.id ?? '';
  for (const s of tops) if (s.top <= offset) active = s.id;
  return active;
}
```

`src/components/terminal/suggestions.ts`:

```ts
// Each of these must be answered from the page's own content: suggestions.test.ts runs them
// through the agent against the fixture snapshot and fails on a refusal.
export const SUGGESTIONS = [
  'What did you do at Tesla?',
  'What projects have you built?',
  'What are your skills?',
  'Where did you work?',
  'Can I see your resume?',
  'Tell me about Hanna Center',
];

export function pickSuggestions(page: number, size = 3): string[] {
  const n = SUGGESTIONS.length;
  const start = ((page * size) % n + n) % n;
  return Array.from({ length: size }, (_, i) => SUGGESTIONS[(start + i) % n]);
}
```

- [ ] **Step 4: Run the pure tests.** `npx vitest run src/lib/scrollspy.test.ts src/components/terminal/suggestions.test.ts`. If a question is refused by the agent, replace that one question with a phrasing from `src/agent/golden.json` that is answered (e.g. `what did you do at Tesla`), keep the list at six, and note it in the ledger. Do not loosen the test.

- [ ] **Step 5: Replace `IntroTerminal.tsx`** (keeps the existing prompt, log and topics; adds chips and the arrow):

```tsx
import { useEffect, useRef, useState } from 'react';
import { scrollToSection } from './scrollTo';
import { useTerminal } from './useTerminal';
import { pickSuggestions } from './suggestions';

// Real links: they work without JavaScript, and the prompt routes to the same places.
const TOPICS = [
  { label: 'Experience', href: '#experience' },
  { label: 'Projects', href: '#projects' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

/** The chat panel on the home page's first screen: type a route or a question, or pick a suggestion. */
export default function IntroTerminal() {
  const term = useTerminal({
    autoHelp: false,
    onNavigate: (target) => scrollToSection(target.href),
    thinkMs: 700,
    quietRefusals: true,
  });
  const out = useRef<HTMLDivElement | null>(null);
  const [page, setPage] = useState(0);
  const chips = pickSuggestions(page);

  useEffect(() => {
    const element = out.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [term.lines]);

  return (
    <div className="intro-term">
      <div className="intro-out" role="log" aria-live="polite" ref={out} onClick={term.flush}>
        {term.lines.map((line) => (
          <div
            key={line.id}
            className={`intro-line-out intro-${line.kind}${line.status ? ` intro-${line.status}` : ''}${line.refused ? ' intro-refused' : ''}`}
          >
            {line.kind === 'input' ? <span className="intro-mark">&gt;</span> : null}
            {line.kind === 'answer' ? <span className="intro-arrow" aria-hidden="true">↳</span> : null}
            <span className="intro-text">{line.text}</span>
            {line.sources && line.sources.length > 0 ? (
              <span className="intro-sources">
                {line.sources.map((source) => (
                  <a key={`${source.title}-${source.url}`} href={source.url}>
                    {source.title}
                  </a>
                ))}
              </span>
            ) : null}
          </div>
        ))}
        {term.busy ? <div className="intro-line-out intro-info intro-think">{term.spinner} thinking</div> : null}
      </div>
      <div className="intro-suggest" role="group" aria-label="Suggested questions">
        <button type="button" className="intro-refresh" aria-label="Show other questions" onClick={() => setPage((p) => p + 1)}>
          ↻
        </button>
        {chips.map((question) => (
          <button key={question} type="button" className="intro-chip" disabled={term.busy} onClick={() => void term.submit(question)}>
            <span aria-hidden="true">↳ </span>{question}
          </button>
        ))}
      </div>
      <form
        className="intro-prompt"
        onSubmit={(event) => {
          event.preventDefault();
          void term.submit();
        }}
      >
        <label className="intro-caret" htmlFor="intro-input" aria-hidden="true">
          &gt;
        </label>
        <input
          id="intro-input"
          className="intro-input"
          aria-label="Ask anything about Andrian — a question or a route"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Ask anything about Andrian…"
          value={term.value}
          onChange={(event) => term.change(event.target.value)}
          onKeyDown={term.keyDown}
        />
      </form>
      <nav className="topics" aria-label="Jump to">
        {TOPICS.map((topic) => (
          <a key={topic.href} href={topic.href}>
            {topic.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
```

The existing test `renders the four topic links` reads anchors only, so the nav's new `aria-label` does not affect it; the existing label test reads the input and stays valid. The chip test counts `class="intro-chip"` occurrences; if React's static markup orders attributes differently, adjust the `toMatch` only.

- [ ] **Step 6: Replace `Hero.astro`**

```astro
---
import IntroTerminal from './terminal/IntroTerminal.tsx';
import AsciiGraph from './ascii/AsciiGraph.tsx';
import Orbits from './Orbits.astro';
---
<header class="hero" id="top">
  <h1 class="vtitle" data-text="Andrian Than">Andrian Than</h1>
  <p class="vtag">AI engineer · building agents that ship</p>
  <div class="hero-scene">
    <Orbits />
    <AsciiGraph client:visible />
  </div>
  <div class="chat">
    <p class="chat-hello">hey there! i build AI agents people can trust. Ask me anything about my work.</p>
    <IntroTerminal client:idle />
  </div>
  <a class="full" href="/terminal">Open the full terminal →</a>
</header>
```

- [ ] **Step 7: Replace `TopBar.astro`**

```astro
---
import ThemeToggle from './ThemeToggle.tsx';
import { profile } from '../data/profile';
---
<header class="vbar">
  <div class="vbar-in">
    <a class="vbrand" href="#top">andrian than</a>
    <nav class="vnav" aria-label="Sections">
      <a href="#top" data-spy="top">Home</a>
      <a href="#experience" data-spy="experience">Experience</a>
      <a href="#projects" data-spy="projects">Projects</a>
      <a href="#about" data-spy="about">About</a>
      <a href={profile.contact.resume}>Resume</a>
    </nav>
    <span class="vbar-right"><ThemeToggle client:load /></span>
  </div>
</header>
```

- [ ] **Step 8: `src/scripts/nav-spy.ts`**

```ts
import { activeSection } from '../lib/scrollspy';

const links = [...document.querySelectorAll<HTMLAnchorElement>('.vnav a[data-spy]')];
const targets = links.map((a) => document.getElementById(a.dataset.spy ?? ''));

if (links.length && targets.every((t): t is HTMLElement => t !== null)) {
  let raf = 0;
  const update = () => {
    raf = 0;
    const id = activeSection(targets.map((el) => ({ id: el.id, top: el.getBoundingClientRect().top })), 120);
    for (const a of links) {
      if (a.dataset.spy === id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
  };
  const request = () => { if (!raf) raf = requestAnimationFrame(update); };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  update();
}
```

- [ ] **Step 9: `index.astro`:** move `<TopBar />` out of `.inner`, and load the script.

```astro
  <TopBar />
  <div class="inner">
    <main>
    <Hero />
    <StatStrip />
    <Timeline />
    <ProjectCards />
    <Skills />
    <About />
    </main>
    <Footer />
  </div>
  <script>import '../scripts/nav-spy.ts';</script>
```

- [ ] **Step 10: Append the nav, hero and chat CSS to `vapor.css`**

```css
/* ---- nav ---- */
.vbar { position: sticky; top: 0; z-index: 20; background: color-mix(in srgb, var(--color-bg) 62%, transparent); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }
.vbar-in { max-width: var(--measure); margin: 0 auto; padding: 14px var(--space-md); display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: var(--space-md); }
.vbrand { font: 400 13px var(--font-pixel); letter-spacing: .12em; text-transform: uppercase; color: var(--color-fg); white-space: nowrap; }
.vbrand:hover { text-decoration: none; color: var(--color-accent); }
.vnav { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 10px; }
.vnav a { font: 400 12px var(--font-pixel); letter-spacing: .14em; text-transform: uppercase; color: var(--color-muted); padding: 8px 12px; border: 1px solid transparent; border-radius: 8px; transition: color .15s, border-color .15s, box-shadow .15s; }
.vnav a:hover { color: var(--color-fg); text-decoration: none; }
.vnav a[aria-current="true"] { color: var(--color-fg); border-color: var(--color-num); box-shadow: 0 0 14px -4px var(--color-glow); }
.vbar-right { justify-self: end; }
#theme-toggle { font-family: var(--font-pixel); font-size: 11px; letter-spacing: .12em; text-transform: uppercase; }
@media (max-width: 639px) {
  .vbar-in { grid-template-columns: 1fr auto; padding: 10px var(--space-md); row-gap: 6px; }
  .vnav { grid-column: 1 / -1; grid-row: 2; gap: 4px 2px; }
  .vnav a { padding: 6px 8px; letter-spacing: .08em; font-size: 11px; }
}

/* ---- hero ---- */
.hero { padding: clamp(20px, 5svh, 56px) 0 var(--space-xl); text-align: center; display: flex; flex-direction: column; align-items: center; }
.vtitle { position: relative; margin: 0; font: 900 clamp(32px, 8.6vw, 84px)/1.02 var(--font-title); letter-spacing: .02em; text-transform: uppercase; text-wrap: balance; overflow-wrap: anywhere; color: var(--title-fill); text-shadow: 3px 3px 0 var(--title-shadow), 0 0 28px var(--title-glow), 0 0 64px var(--color-glow); }
.vtitle::after { content: attr(data-text); content: attr(data-text) / ""; position: absolute; inset: 0; color: transparent; text-shadow: none; background: repeating-linear-gradient(to bottom, transparent 0 3px, color-mix(in srgb, var(--color-bg) 62%, transparent) 3px 4px); -webkit-background-clip: text; background-clip: text; }
.vtag { margin: 14px 0 0; font: 400 clamp(11px, 2.4vw, 16px)/1.5 var(--font-pixel); letter-spacing: .14em; text-transform: lowercase; color: var(--color-accent); }

/* ---- chat panel ---- */
.chat { width: min(680px, 100%); margin-top: calc(var(--space-md) * -1); text-align: left; background: var(--color-glass); border: 1px solid var(--color-rule); border-radius: 14px; padding: 18px 18px 14px; box-shadow: 0 0 40px -18px var(--color-glow), 0 24px 60px -30px var(--color-glow); -webkit-backdrop-filter: blur(14px) saturate(1.3); backdrop-filter: blur(14px) saturate(1.3); }
.chat:focus-within { border-color: var(--color-num); box-shadow: 0 0 0 1px var(--color-num), 0 0 34px -8px var(--color-glow); }
.intro-out { font: 400 14px/1.6 var(--font-mono); }
.intro-input-line, .intro-line-out.intro-input { color: var(--color-fg); }
.intro-line-out.intro-answer { font: 400 16px/1.6 var(--font-sans); padding-left: 1.6em; text-indent: -1.6em; }
.intro-arrow { color: var(--color-num); margin-right: .6em; }
.intro-suggest { display: none; flex-wrap: wrap; gap: 8px; margin: var(--space-md) 0 12px; align-items: stretch; }
.js .intro-suggest { display: flex; }
.intro-chip, .intro-refresh { font: 400 12px/1.4 var(--font-mono); color: var(--color-fg); background: var(--color-chip); border: 1px solid var(--color-rule); border-radius: 8px; padding: 8px 12px; cursor: pointer; text-align: left; transition: border-color .15s, background .15s; }
.intro-chip:hover:not(:disabled), .intro-refresh:hover { border-color: var(--color-num); }
.intro-chip:disabled { opacity: .55; cursor: default; }
.intro-refresh { color: var(--color-muted); padding: 8px 10px; }
.topics { margin: 12px 0 0; gap: 6px 14px; }
.topics a { font: 400 11px var(--font-pixel); letter-spacing: .12em; text-transform: uppercase; color: var(--color-muted); border: 0; padding: 4px 0; background: none; }
.topics a:hover { color: var(--color-fg); background: none; text-decoration: underline; text-underline-offset: 4px; }
.intro-prompt { background: var(--color-bg); }
.full { font: 400 11px var(--font-pixel); letter-spacing: .14em; text-transform: uppercase; }
@media (max-width: 480px) {
  .hero-scene { height: clamp(220px, 62vw, 300px); }
  .intro-chip { flex: 1 1 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .vnav a, .intro-chip, .intro-refresh { transition: none; }
}
```

- [ ] **Step 11: Remove the old hero rules from `global.css`.** Run `grep -n "avatar\|h1 \.w\|h1 \.grad\|^\.status\|@keyframes bi\|\.topics\|\.chat-hello" src/styles/global.css`. Delete only: the `.avatar` rule; both `h1 .w` rules; the `h1 .grad` rule and the comment above it; `@keyframes bi`; `.status`; the `.avatar`, `h1`, `.status` lines inside the `@media (max-width: 480px)` block; and `h1 .w { animation: none; ... }` and `h1 .grad` from the reduced-motion block (keep `.stat b { animation: none; }`). Keep the base `h1` rule (the work pages' `.ph h1` builds on it), `@keyframes grad-drift` (used by `.stat b`), the `.topics`/`.chat`/`.intro-*` base rules (vapor.css overrides them), and `.bar` rules (the work pages' header). Then add one assertion to `vapor.test.ts`:

```ts
it('no longer carries the old hero rules', () => {
  expect(global).not.toContain('.avatar');
  expect(global).not.toContain('h1 .w');
  expect(global).not.toContain('@keyframes bi');
});
```

- [ ] **Step 12: Verify.** `npm test` → green (if a test pinned old hero markup, update that expectation, do not delete it). `npm run build` → `check-build: ok`. `npm run typecheck 2>&1 | tail -3` → not above the baseline.

- [ ] **Step 13: Commit** `feat: vapor hero, scroll-spy nav and suggestion chips`.

---

### Task 8: Whole-page restyle

**Files:**
- Modify: `src/styles/vapor.css` (append), `src/styles/global.css` (heading and stat rules only), `src/styles/vapor.test.ts`
- Audit: `src/styles/projects.css`, `src/components/**/*.css`

**Interfaces:** Consumes the tokens and fonts. No markup changes.

- [ ] **Step 1: Failing test** (append to `vapor.test.ts`):

```ts
describe('vapor typography', () => {
  it('section headings use the pixel face and no gradient clip', () => {
    const m = vapor.match(/\.sh h2\s*\{[^}]*\}/)?.[0] ?? '';
    expect(m).toContain('var(--font-pixel)');
    expect(m).not.toContain('background-clip: text');
  });
  it('never sets the pixel face below 11px', () => {
    for (const m of vapor.matchAll(/font:\s*\d+\s+(\d+)px[^;]*var\(--font-pixel\)/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(11);
  });
  it('keeps paragraphs on the readable sans', () => {
    expect(vapor).not.toMatch(/(^|\n)\s*(p|\.prose)\s*\{[^}]*var\(--font-pixel\)/);
  });
});
```

- [ ] **Step 2: Run, expect FAIL** (no `.sh h2` rule yet).

- [ ] **Step 3: Append to `vapor.css`**

```css
/* ---- headings, labels, stats ---- */
.sh h2 { font: 400 clamp(20px, 3.4vw, 32px)/1.2 var(--font-pixel); letter-spacing: .08em; text-transform: uppercase; color: var(--color-fg); background: none; -webkit-background-clip: border-box; background-clip: border-box; text-shadow: 0 0 18px var(--title-glow); transition: none; }
.sh h2:hover { background-position: 0 50%; }
.eyebrow { font: 400 11px var(--font-pixel); letter-spacing: .2em; color: var(--color-accent); }
h2 { font: 400 12px var(--font-pixel); letter-spacing: .14em; color: var(--color-accent); }
.kicker { font: 400 11px var(--font-mono); letter-spacing: .14em; color: var(--color-accent); }
.stat b { font-family: var(--font-title); font-weight: 800; letter-spacing: -0.01em; }
.stat span { color: var(--color-muted); }

/* ---- surfaces ---- */
.dec, .node, .meta, .prose pre, .qa { box-shadow: 0 0 28px -16px var(--color-glow); }
.dec, .node { background: var(--color-card); border-color: var(--color-rule); }
.job.now::before { box-shadow: 0 0 0 5px var(--color-glow), 0 0 14px var(--color-glow); }
.shot { background: var(--color-chip); }
footer { border-top-color: var(--color-rule); }
.job:hover h3, .prow:hover b { background: none; color: var(--color-accent); -webkit-background-clip: border-box; background-clip: border-box; }

@media (prefers-reduced-motion: reduce) {
  .sh h2 { text-shadow: none; }
}
```

- [ ] **Step 4: Audit hard-coded colors**

```bash
grep -rn -E "#[0-9a-fA-F]{3,8}\b|rgb\(|rgba\(" src/styles/projects.css src/components --include=*.css | grep -v -E "var\(--" | head -40
```

For each hit that paints a surface or text the vapor theme shows (not decorative art such as `--qa-sky`, and not semantic status colors like `#3fae6a` / `#e0605a`): swap to a token. Record every swap and every deliberate keep in the ledger. Check the `.qa` window chrome and the work-page rail in a browser in Task 9.

- [ ] **Step 5: Run `npm test`, `npm run build` → green. Commit** `feat: carry the vapor treatment through headings, labels and surfaces`.

---

### Task 9: Verification pass (controller, in a browser)

**Files:** none changed unless a defect is found; each fix gets its own commit.

- [ ] **Step 1: Full suite and build**

```bash
npm test 2>&1 | tail -6
npm run build 2>&1 | tail -3
npm run typecheck 2>&1 | tail -4
```

Expected: tests green (baseline plus the new files), `check-build: ok`, typecheck no worse than 7.

- [ ] **Step 2: Serve and look.** `npm run preview -- --port 4323` (the Tesla dev server owns 4322). Open `/` in a browser and take screenshots at 1440, 768, 390 and 320 px, in vapor and in light. Compare the hero against the reference screenshot Andrian supplied: title weight and glow, tagline, spacing, chat panel. If the title or pixel font is visibly off, swap to the alternates named in the plan's rulings (one install, one `Base.astro` import, one token), rebuild, and re-compare. Record the final font picks in the ledger and in the spec's open items.

- [ ] **Step 3: Interaction checks.** Cursor moves → stars and rings shift, graph leans. Scroll → nav pill follows (Home, Experience, Projects, About). Click a chip → question is answered, answer shows the arrow. Refresh button rotates the chips. Typing a route (`/projects`) scrolls. Theme toggle flips vapor ↔ light and the graph recolors. Reload keeps the saved theme.

- [ ] **Step 4: Reduced motion and no-JS.** Emulate `prefers-reduced-motion: reduce`: rings still, stars still, graph a single frame. Disable JavaScript: the `<pre>` graph shows, the route links work, no empty chip row.

- [ ] **Step 5: Layout.** No horizontal scroll at 320, 375, 414, 768 on `/`, `/work/tesla`, `/work/hanna`, `/work/bluedome`. The Tesla demo windows and the rail read correctly on the vapor background and in light. Keyboard: tab order is nav, toggle, chips, input, topic links; focus rings visible on every control.

- [ ] **Step 6: Lighthouse.** Run Lighthouse mobile on `/` and `/work/tesla` (Chrome DevTools, or `npx lighthouse http://localhost:4323/ --form-factor=mobile --only-categories=performance,accessibility`). Target 95 or higher. If performance is under, profile in this order: backdrop layer count, orbit rings (`will-change`), graph frame rate, font preload. Do not report a score that was not measured.

- [ ] **Step 7: Report.** List what was checked and what was not. Do not merge or push. Leave the branch and worktree in place for Andrian's decision.

---

### Task 10: Stats strip (added after Andrian's review of the running branch)

Andrian replaced the four home-page stats. Values and captions are his, confirmed in chat on 2026-11-08; all four are his own estimates, so a single quiet line under the strip says so (the per-tile "estimated" captions were removed at his request). Removed tiles: "32% better than baseline", "$30k+", "200+ staging deploys a week", "1st of 9". Those figures stay on the work pages and in the chat agent. The vehicle-accessories forecasting and Micron's hours are not counted in the hours total yet. The people total includes Micron at Andrian's estimate (about 50), on top of Tesla ~60, Blue Dome ~20 and Hanna ~20.

**Files:**
- Modify: `src/data/stats.ts`, `src/components/StatStrip.astro`, `src/styles/vapor.css` (append)
- Create: `src/data/stats.test.ts`

**Interfaces:**
- Produces: `stats: { value: string; caption: string }[]` (exactly four entries, in this order) and `statsNote: string`.
- Consumed by: `src/components/StatStrip.astro` only. The agent does not read `stats.ts`.

- [ ] **Step 1: Write the failing test** `src/data/stats.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { stats, statsNote } from './stats';

describe('home stats', () => {
  it('has Andrian\'s four stats, in order', () => {
    expect(stats.map((s) => s.value)).toEqual(['90B+', '95%+', '450+', '150+']);
  });
  it('captions say what each number measures', () => {
    expect(stats[0].caption).toBe('tokens used across my work and personal AI use');
    expect(stats[1].caption).toBe('prompt cache hit rate');
    expect(stats[2].caption).toBe('hours saved across Tesla, Hanna Center and Blue Dome projects');
    expect(stats[3].caption).toBe('people use what I\'ve built, across Tesla, Hanna Center, Blue Dome and Micron');
  });
  it('carries no per-tile "estimated" caption; one note under the strip says so', () => {
    for (const s of stats) expect(s.caption.toLowerCase()).not.toContain('estimated');
    expect(statsNote).toBe('Figures are my estimates.');
  });
  it('drops the removed tiles', () => {
    const all = stats.map((s) => `${s.value} ${s.caption}`).join(' ');
    for (const gone of ['32%', '$30k', '200+', '1st of 9', 'IBM', 'hackathon']) expect(all).not.toContain(gone);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL** (`npx vitest run src/data/stats.test.ts`).

- [ ] **Step 3: Replace `src/data/stats.ts`:**

```ts
export const stats = [
  { value: '90B+', caption: 'tokens used across my work and personal AI use' },
  { value: '95%+', caption: 'prompt cache hit rate' },
  { value: '450+', caption: 'hours saved across Tesla, Hanna Center and Blue Dome projects' },
  { value: '150+', caption: 'people use what I\'ve built, across Tesla, Hanna Center, Blue Dome and Micron' },
];

export const statsNote = 'Figures are my estimates.';
```

- [ ] **Step 4: Update `src/components/StatStrip.astro`** (the note sits inside the grid as a last, full-width child, so it needs no margin tricks):

```astro
---
import { stats, statsNote } from '../data/stats';
---
<div class="stats reveal">
  {stats.map((s) => <div class="stat"><b>{s.value}</b><span>{s.caption}</span></div>)}
  <p class="stats-note">{statsNote}</p>
</div>
```

- [ ] **Step 5: Append to `src/styles/vapor.css`:**

```css
/* ---- stats note ---- */
.stats-note { grid-column: 1 / -1; margin: 0; text-align: center; font: 400 12px/1.4 var(--font-mono); letter-spacing: .04em; color: var(--color-muted); }
```

- [ ] **Step 6: Verify.** `npx vitest run src/data/stats.test.ts` PASS; `npm test` green (if the agent or any other test pinned the old stats, update the expectation, do not delete it); `npm run build` ends `check-build: ok`; `npm run typecheck | tail -3` still 7. Then open `dist/index.html` and confirm the four values appear in order, the note appears once, and none of `1st of 9`, `32%`, `$30k+`, `200+` appears in the stats block. If the build's number check (`scripts/lib/checks.mjs`) rejects the new numbers, report exactly which check and stop with NEEDS_CONTEXT rather than editing the check.

- [ ] **Step 7: Commit** `feat: new home stats strip (tokens, cache rate, hours, people)`.

---

### Task 11: A moving backdrop (added after Andrian's review: "the background is still static ... like streaming")

Andrian approved this design on 2026-11-08: the three star layers drift continuously at different speeds, and now and then a shooting star crosses the sky. The cursor parallax stays on top. Everything is `transform` and `opacity` only, and everything stops under `prefers-reduced-motion`.

**Files:**
- Modify: `src/styles/vapor.css` (replace the three star-layer rules; append drift, streak and reduced-motion rules), `src/layouts/Base.astro` (two streak elements), `src/styles/vapor.test.ts` (append tests)

**Interfaces:**
- Consumes: `.vb` and its `i` layers from Task 4 (parent `i` carries the cursor parallax transform; the star pattern moves to the parent's `::before`, which carries the drift animation, so the two transforms never fight).
- Produces: CSS custom properties `--tw`, `--th`, `--dur` per star layer; `@keyframes vb-drift` and `@keyframes vb-streak`; markup `<i class="vb-streak vb-streak-1">` and `-2`.

**Drift design.** Each star layer's pattern lives on a `::before` that is one tile wider and taller than its parent. The animation translates that `::before` by exactly one tile (`-tw`, `-th`), so the loop is seamless and the parent area stays covered. Speeds: far 140s, mid 100s, near 70s per tile (about 1.7, 3.4 and 6.7 px/s along the diagonal).

- [ ] **Step 1: Write the failing tests** (append to `src/styles/vapor.test.ts`; `vapor` is the comment-stripped stylesheet already defined there, and `fs`/`path` are imported):

```ts
describe('vapor backdrop motion', () => {
  const base = fs.readFileSync(path.join(process.cwd(), 'src/layouts/Base.astro'), 'utf8');

  it('drifts each star layer on its ::before, transform only, one tile per loop', () => {
    for (const layer of ['far', 'mid', 'near']) {
      const m = vapor.match(new RegExp(`\\.vb-${layer}::before\\s*\\{[^}]*\\}`))?.[0] ?? '';
      expect(m, layer).toContain('background-image');
      expect(m, layer).toMatch(/animation:\s*vb-drift\s+var\(--dur\)\s+linear\s+infinite/);
      expect(m, layer).toContain('calc(100% + var(--tw))');
      const own = vapor.match(new RegExp(`\\.vb-${layer}\\s*\\{[^}]*\\}`))?.[0] ?? '';
      expect(own, layer).toMatch(/--tw:\s*\d+px/);
      expect(own, layer).toMatch(/--th:\s*\d+px/);
      expect(own, layer).toMatch(/--dur:\s*\d+s/);
      expect(own, layer).not.toContain('background-image');
    }
    const kf = vapor.match(/@keyframes vb-drift\s*\{[^}]*\{[^}]*\}[^}]*\}/)?.[0] ?? '';
    expect(kf).toContain('transform: translate3d(calc(var(--tw) * -1), calc(var(--th) * -1), 0)');
    expect(kf).not.toMatch(/\b(top|left|margin|background-position)\b/);
  });

  it('keeps the star tile sizes and the --tw/--th values identical (a seamless loop)', () => {
    for (const [layer, w, h] of [['far', 173, 157], ['mid', 241, 223], ['near', 331, 307]] as const) {
      const own = vapor.match(new RegExp(`\\.vb-${layer}\\s*\\{[^}]*\\}`))?.[0] ?? '';
      const before = vapor.match(new RegExp(`\\.vb-${layer}::before\\s*\\{[^}]*\\}`))?.[0] ?? '';
      expect(own).toContain(`--tw: ${w}px`);
      expect(own).toContain(`--th: ${h}px`);
      expect(before).toContain(`background-size: ${w}px ${h}px`);
    }
  });

  it('adds two shooting stars that animate transform and opacity only', () => {
    expect(base.match(/class="vb-streak vb-streak-[12]"/g)?.length).toBe(2);
    const kf = vapor.match(/@keyframes vb-streak\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(kf).toContain('opacity');
    expect(kf).toContain('transform');
    expect(kf).not.toMatch(/\b(top|left|right|bottom|margin|width|height)\s*:/);
  });

  it('stops all backdrop motion under reduced motion', () => {
    const rm = vapor.split('@media (prefers-reduced-motion: reduce)').slice(1).join('\n');
    expect(rm).toMatch(/\.vb i::before\s*\{[^}]*animation:\s*none/);
    expect(rm).toMatch(/\.vb i\.vb-streak\s*\{[^}]*display:\s*none/);
  });
});
```

- [ ] **Step 2: Run, expect FAIL** (`npx vitest run src/styles/vapor.test.ts`).

- [ ] **Step 3: Replace the three star-layer rules in `src/styles/vapor.css`** (`.vb-far`, `.vb-mid`, `.vb-near`; leave `.vb-neb`, `.vb i`, `.vb::before/::after` as they are) with:

```css
.vb-far  { --tw: 173px; --th: 157px; --dur: 140s; opacity: .55; transform: translate3d(calc(var(--nx, 0) * -8px), calc(var(--ny, 0) * -6px), 0); }
.vb-mid  { --tw: 241px; --th: 223px; --dur: 100s; opacity: .8;  transform: translate3d(calc(var(--nx, 0) * -16px), calc(var(--ny, 0) * -12px), 0); }
.vb-near { --tw: 331px; --th: 307px; --dur: 70s;                transform: translate3d(calc(var(--nx, 0) * -30px), calc(var(--ny, 0) * -22px), 0); }

/* the star pattern lives on a pseudo-element one tile wider and taller than its layer, and
   drifts by exactly one tile per loop, so the loop is seamless and the layer stays covered.
   the layer itself keeps the cursor parallax, so the two transforms never fight */
.vb-far::before, .vb-mid::before, .vb-near::before {
  content: ""; position: absolute; left: 0; top: 0;
  width: calc(100% + var(--tw)); height: calc(100% + var(--th));
  animation: vb-drift var(--dur) linear infinite; will-change: transform;
}
.vb-far::before {
  background-image:
    radial-gradient(1px 1px at 14px 22px, var(--color-star), transparent),
    radial-gradient(1px 1px at 96px 71px, var(--color-star), transparent),
    radial-gradient(1px 1px at 151px 133px, var(--color-star), transparent);
  background-size: 173px 157px;
}
.vb-mid::before {
  background-image:
    radial-gradient(1px 1px at 40px 60px, var(--color-star), transparent),
    radial-gradient(1.2px 1.2px at 180px 150px, var(--color-star), transparent),
    radial-gradient(1px 1px at 120px 20px, var(--color-star), transparent);
  background-size: 241px 223px;
}
.vb-near::before {
  background-image:
    radial-gradient(1.6px 1.6px at 70px 90px, var(--color-star), transparent),
    radial-gradient(1.4px 1.4px at 260px 200px, var(--color-star), transparent);
  background-size: 331px 307px;
}
@keyframes vb-drift {
  to { transform: translate3d(calc(var(--tw) * -1), calc(var(--th) * -1), 0); }
}

/* a shooting star now and then: down and to the left, head first. most of each loop is idle */
.vb i.vb-streak {
  inset: auto; width: 160px; height: 1px; opacity: 0;
  background: linear-gradient(90deg, transparent, var(--color-star));
  transform: translate3d(0, 0, 0) rotate(152deg);
  animation: vb-streak var(--sdur) linear infinite; animation-delay: var(--sdelay);
}
.vb-streak-1 { top: 14%; left: 78%; --sdur: 13s; --sdelay: 3s; }
.vb-streak-2 { top: 38%; left: 94%; --sdur: 19s; --sdelay: 9s; }
@keyframes vb-streak {
  0%   { opacity: 0;  transform: translate3d(0, 0, 0) rotate(152deg); }
  1.5% { opacity: .9; }
  7%   { opacity: 0;  transform: translate3d(-520px, 276px, 0) rotate(152deg); }
  100% { opacity: 0;  transform: translate3d(-520px, 276px, 0) rotate(152deg); }
}
```

Then, inside the EXISTING reduced-motion block that holds `.vb i { will-change: auto; transform: none; }` (or a new reduced-motion block appended after the rules above), add:

```css
  .vb i::before { animation: none; will-change: auto; }
  .vb i.vb-streak { display: none; }
```

- [ ] **Step 4: Markup in `src/layouts/Base.astro`:** inside the `.vb` div, after `<i class="vb-near"></i>`, add `<i class="vb-streak vb-streak-1"></i><i class="vb-streak vb-streak-2"></i>`.

- [ ] **Step 5: Verify.** `npx vitest run src/styles/vapor.test.ts` PASS (the existing four-layer regex test must still pass; it matches `.vb-far {` etc., not the `::before` rules). `npm test` green, `npm run build` ends `check-build: ok`, `npm run typecheck | tail -3` still 7. Open `dist/index.html` and confirm two `vb-streak` elements exist inside `.vb`. Report the final text of the three layer rules and the `::before` rules in the report.

- [ ] **Step 6: Commit** `feat: the star layers drift and shooting stars cross the sky`.

---

### Task 12: The Lifting block in About (added after Andrian's review; design confirmed in chat 2026-11-08)

A "Lifting" block inside the About section: a month calendar that fills green day by day, a year-by-year overview, the three lifts, a percentile line and an hours figure. Data comes from Andrian's own CSV (`/Users/andrianthan/Downloads/gym_checkin_calendar.csv`, 861 check-ins from 2022-06-01 to 2026-11-08). He ruled: the CSV wins for every month (including Aug to Dec 2025, even though his screenshot differs on a few days), no 60-day delay (data through the last date is shown), no live feed or iPhone Shortcut, and no claim of syncing or connection anywhere on the page. The caption is plain: "Gym check-ins". No "estimated", no source claim.

Confirmed copy (use verbatim):
- Lifts: `~245 lb` bench, `~385 lb` squat, `~475 lb` deadlift, total `~1,105 lb`.
- Percentile line: `90th percentile (per Strength Level, 145 lb)`.
- Hours: headline `1.6k hours` (861 check-ins × 1.9 hours each; no formula on the page).
- Calendar caption: `Gym check-ins`.

**Files:**
- Create: `scripts/build-gym-data.mjs`, `src/data/gym-checkins.json` (generated by the script), `src/data/gym-checkins.test.ts`, `src/data/lifting.ts`, `src/data/lifting.test.ts`, `src/components/gym/calendar.ts`, `src/components/gym/calendar.test.ts`, `src/components/gym/GymCalendar.tsx`, `src/components/gym/GymCalendar.test.tsx`, `src/components/gym/YearWall.tsx`, `src/components/gym/gym.css`, `src/components/Lifting.astro`
- Modify: `src/components/About.astro`

**Interfaces — Produces:**
- `gym-checkins.json`: `{ "asOf": "2026-11-08", "dates": string[] /* ISO, sorted, unique */, "phases": { "label": string, "from": string }[] }`
- `lifting.ts`: `lifts: { name: string; pounds: string }[]`, `liftTotal: string`, `percentileLine: string`, `hoursLabel: string`, `calendarCaption: string`
- `calendar.ts`: `MONTH_NAMES: string[]`; `toSet(dates: string[]): Set<string>`; `daysInMonth(year: number, month: number): number` (month 0 to 11); `interface Cell { day: number; iso: string; went: boolean; future: boolean }`; `interface MonthView { year: number; month: number; lead: number; cells: Cell[]; count: number; elapsed: number; days: number }`; `monthView(year: number, month: number, set: Set<string>, asOf: string): MonthView`; `summaryText(v: MonthView, asOf: string): string`; `shiftMonth(m: { year: number; month: number }, delta: number): { year: number; month: number }`; `monthKey(year: number, month: number): string`; `yearsOf(dates: string[]): number[]`; `phaseSpans(phases: { label: string; from: string }[], dates: string[], asOf: string): { label: string; from: string; to: string; count: number }[]`; `dayLabel(iso: string, went: boolean): string`; `weekGrid(year: number, set: Set<string>): { cols: number; cells: { col: number; row: number; went: boolean }[] }`; `formatHours(sessions: number, hoursEach: number): string`.

- [ ] **Step 1: The data script.** Create `scripts/build-gym-data.mjs` (run once: `node scripts/build-gym-data.mjs /Users/andrianthan/Downloads/gym_checkin_calendar.csv`):

```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const input = process.argv[2];
if (!input) { console.error('usage: node scripts/build-gym-data.mjs <checkins.csv>'); process.exit(1); }

function parseLine(line) {
  const out = [];
  let cur = '', quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === ',' && !quoted) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

const lines = fs.readFileSync(input, 'utf8').split(/\r?\n/).filter(Boolean);
const header = parseLine(lines[0]);
const iDate = header.indexOf('date');
const iPhase = header.indexOf('phase');
if (iDate < 0 || iPhase < 0) throw new Error('csv needs date and phase columns');

const rows = lines.slice(1).map(parseLine).map((r) => ({ date: r[iDate], phase: r[iPhase] }));
const dates = [...new Set(rows.map((r) => r.date))].sort();
if (!dates.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))) throw new Error('bad date in csv');

const phases = [];
for (const r of rows.slice().sort((a, b) => (a.date < b.date ? -1 : 1))) {
  if (!phases.length || phases[phases.length - 1].label !== r.phase) phases.push({ label: r.phase, from: r.date });
}

const out = { asOf: dates[dates.length - 1], dates, phases };
const dest = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'gym-checkins.json');
fs.writeFileSync(dest, JSON.stringify(out) + '\n');
console.log(`wrote ${dates.length} dates, ${phases.length} phases, asOf ${out.asOf}`);
```

- [ ] **Step 2: Failing data tests.** `src/data/gym-checkins.test.ts` (write before generating the JSON; run, see it fail on the missing file):

```ts
import { describe, it, expect } from 'vitest';
import data from './gym-checkins.json';

describe('gym check-in data', () => {
  it('has 861 unique, sorted ISO dates from 2022-06-01 to 2026-11-08', () => {
    expect(data.dates.length).toBe(861);
    expect(new Set(data.dates).size).toBe(861);
    expect([...data.dates].sort()).toEqual(data.dates);
    for (const d of data.dates) expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(data.dates[0]).toBe('2022-06-01');
    expect(data.dates[data.dates.length - 1]).toBe('2026-11-08');
    expect(data.asOf).toBe('2026-11-08');
  });
  it('has the four phases in order, each starting on a check-in date', () => {
    expect(data.phases.map((p) => p.label)).toEqual([
      'Summer 2022 — slower start',
      'Late 2022 — building consistency',
      '2023 — increasingly consistent',
      'Nov 2023–present — consistent',
    ]);
    for (const p of data.phases) expect(data.dates).toContain(p.from);
  });
  it('carries nothing but dates and phase boundaries (no times, names or brands)', () => {
    expect(Object.keys(data).sort()).toEqual(['asOf', 'dates', 'phases']);
  });
});
```

- [ ] **Step 3: Generate the JSON.** Run `node scripts/build-gym-data.mjs /Users/andrianthan/Downloads/gym_checkin_calendar.csv`; expect `wrote 861 dates, 4 phases, asOf 2026-11-08`. Run the data tests: PASS.

- [ ] **Step 4: Failing lifting tests.** `src/data/lifting.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { lifts, liftTotal, percentileLine, hoursLabel, calendarCaption } from './lifting';
import { formatHours } from '../components/gym/calendar';

describe('lifting facts', () => {
  it('lists bench, squat and deadlift as approximate pounds', () => {
    expect(lifts).toEqual([
      { name: 'Bench', pounds: '~245 lb' },
      { name: 'Squat', pounds: '~385 lb' },
      { name: 'Deadlift', pounds: '~475 lb' },
    ]);
  });
  it('the total is the sum of the three lifts', () => {
    expect(245 + 385 + 475).toBe(1105);
    expect(liftTotal).toBe('~1,105 lb');
  });
  it('uses the confirmed percentile line, hours label and caption', () => {
    expect(percentileLine).toBe('90th percentile (per Strength Level, 145 lb)');
    expect(hoursLabel).toBe('1.6k hours');
    expect(calendarCaption).toBe('Gym check-ins');
  });
  it('the hours label matches 861 check-ins at 1.9 hours each', () => {
    expect(formatHours(861, 1.9)).toBe('1.6k');
  });
});
```

- [ ] **Step 5: `src/data/lifting.ts`:**

```ts
export const lifts = [
  { name: 'Bench', pounds: '~245 lb' },
  { name: 'Squat', pounds: '~385 lb' },
  { name: 'Deadlift', pounds: '~475 lb' },
];
export const liftTotal = '~1,105 lb';
export const percentileLine = '90th percentile (per Strength Level, 145 lb)';
export const hoursLabel = '1.6k hours';
export const calendarCaption = 'Gym check-ins';
```

- [ ] **Step 6: Failing calendar-logic tests.** `src/components/gym/calendar.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import data from '../../data/gym-checkins.json';
import {
  MONTH_NAMES, toSet, daysInMonth, monthView, summaryText, shiftMonth, monthKey, yearsOf, phaseSpans, dayLabel, weekGrid, formatHours,
} from './calendar';

const set = toSet(data.dates);
const asOf = data.asOf;

describe('daysInMonth', () => {
  it('handles leap years and 30/31-day months', () => {
    expect(daysInMonth(2024, 1)).toBe(29);
    expect(daysInMonth(2025, 1)).toBe(28);
    expect(daysInMonth(2025, 8)).toBe(30);
    expect(daysInMonth(2025, 7)).toBe(31);
  });
});

describe('monthView', () => {
  it('lays out Aug 2025: starts on a Friday (5 blanks), 31 cells, 20 went', () => {
    const v = monthView(2025, 7, set, asOf);
    expect(v.lead).toBe(5);
    expect(v.cells.length).toBe(31);
    expect(v.count).toBe(20);
    expect(v.days).toBe(31);
    expect(v.elapsed).toBe(31);
    expect(v.cells.every((c) => !c.future)).toBe(true);
    expect(v.cells[0]).toEqual({ day: 1, iso: '2025-08-01', went: true, future: false });
  });
  it('marks days after asOf as future in the current month', () => {
    const v = monthView(2026, 10, set, asOf);
    expect(v.lead).toBe(0);
    expect(v.count).toBe(5);
    expect(v.elapsed).toBe(8);
    expect(v.cells.filter((c) => c.future).length).toBe(22);
    expect(v.cells[8].future).toBe(true);
    expect(v.cells[7].future).toBe(false);
  });
});

describe('summaryText', () => {
  it('reads "N of D days" for a finished month', () => {
    expect(summaryText(monthView(2025, 7, set, asOf), asOf)).toBe('20 of 31 days');
  });
  it('reads "N of D days so far" for the current month', () => {
    expect(summaryText(monthView(2026, 10, set, asOf), asOf)).toBe('5 of 8 days so far');
  });
});

describe('navigation helpers', () => {
  it('shifts across year boundaries', () => {
    expect(shiftMonth({ year: 2025, month: 11 }, 1)).toEqual({ year: 2026, month: 0 });
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
  });
  it('builds sortable month keys and lists the years', () => {
    expect(monthKey(2025, 7)).toBe('2025-08');
    expect(yearsOf(data.dates)).toEqual([2022, 2023, 2024, 2025, 2026]);
    expect(MONTH_NAMES.length).toBe(12);
  });
});

describe('phaseSpans', () => {
  it('splits the history into the four phases and the counts add up to 861', () => {
    const spans = phaseSpans(data.phases, data.dates, asOf);
    expect(spans.length).toBe(4);
    expect(spans.map((s) => s.label)).toEqual([
      'Summer 2022: slower start',
      'Late 2022: building consistency',
      '2023: increasingly consistent',
      'Nov 2023–present: consistent',
    ]);
    expect(spans.reduce((n, s) => n + s.count, 0)).toBe(861);
    expect(spans[0].count).toBe(18);
    expect(spans[3].to).toBe(asOf);
  });
});

describe('dayLabel', () => {
  it('describes a day for assistive tech', () => {
    expect(dayLabel('2025-08-01', true)).toBe('Fri, Aug 1, 2025: went to the gym');
    expect(dayLabel('2025-08-06', false)).toBe('Wed, Aug 6, 2025: rest day');
  });
});

describe('weekGrid', () => {
  it('puts every check-in of a year on the grid exactly once', () => {
    for (const year of [2022, 2023, 2024, 2025, 2026]) {
      const g = weekGrid(year, set);
      const went = g.cells.filter((c) => c.went).length;
      expect(went).toBe(data.dates.filter((d) => d.startsWith(String(year))).length);
      expect(g.cols === 53 || g.cols === 54).toBe(true);
      for (const c of g.cells) { expect(c.row).toBeGreaterThanOrEqual(0); expect(c.row).toBeLessThan(7); }
    }
  });
});

describe('formatHours', () => {
  it('rounds to one decimal in thousands', () => {
    expect(formatHours(861, 1.9)).toBe('1.6k');
    expect(formatHours(1000, 2)).toBe('2.0k');
  });
});
```

- [ ] **Step 7: `src/components/gym/calendar.ts`:**

```ts
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = MONTH_NAMES.map((m) => m.slice(0, 3));
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface Cell { day: number; iso: string; went: boolean; future: boolean }
export interface MonthView { year: number; month: number; lead: number; cells: Cell[]; count: number; elapsed: number; days: number }

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export function toSet(dates: string[]): Set<string> { return new Set(dates); }

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function monthKey(year: number, month: number): string { return `${year}-${pad(month + 1)}`; }

export function monthView(year: number, month: number, set: Set<string>, asOf: string): MonthView {
  const days = daysInMonth(year, month);
  const lead = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const cells: Cell[] = [];
  let count = 0;
  for (let day = 1; day <= days; day++) {
    const key = iso(year, month, day);
    const went = set.has(key);
    if (went) count++;
    cells.push({ day, iso: key, went, future: key > asOf });
  }
  const elapsed = cells.filter((c) => !c.future).length;
  return { year, month, lead, cells, count, elapsed, days };
}

export function summaryText(v: MonthView, asOf: string): string {
  const current = asOf.startsWith(monthKey(v.year, v.month));
  return current && v.elapsed < v.days ? `${v.count} of ${v.elapsed} days so far` : `${v.count} of ${v.days} days`;
}

export function shiftMonth(m: { year: number; month: number }, delta: number): { year: number; month: number } {
  const index = m.year * 12 + m.month + delta;
  return { year: Math.floor(index / 12), month: ((index % 12) + 12) % 12 };
}

export function yearsOf(dates: string[]): number[] {
  return [...new Set(dates.map((d) => Number(d.slice(0, 4))))].sort((a, b) => a - b);
}

function dayBefore(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d - 1));
  return iso(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
}

export function phaseSpans(
  phases: { label: string; from: string }[],
  dates: string[],
  asOf: string,
): { label: string; from: string; to: string; count: number }[] {
  return phases.map((p, i) => {
    const next = phases[i + 1]?.from;
    const to = next ? dayBefore(next) : asOf;
    const count = dates.filter((d) => d >= p.from && (next ? d < next : true)).length;
    return { label: p.label.replace(' — ', ': '), from: p.from, to, count };
  });
}

export function dayLabel(isoDate: string, went: boolean): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dow = DAY_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${dow}, ${MONTH_SHORT[m - 1]} ${d}, ${y}: ${went ? 'went to the gym' : 'rest day'}`;
}

/** A year as weeks (columns) by weekdays (rows), Sunday first, for the overview wall. */
export function weekGrid(year: number, set: Set<string>): { cols: number; cells: { col: number; row: number; went: boolean }[] } {
  const jan1 = new Date(Date.UTC(year, 0, 1)).getUTCDay();
  const total = daysInMonth(year, 1) === 29 ? 366 : 365;
  const cells: { col: number; row: number; went: boolean }[] = [];
  for (let i = 0; i < total; i++) {
    const t = new Date(Date.UTC(year, 0, 1 + i));
    const key = iso(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
    const slot = i + jan1;
    cells.push({ col: Math.floor(slot / 7), row: slot % 7, went: set.has(key) });
  }
  return { cols: Math.floor((total - 1 + jan1) / 7) + 1, cells };
}

export function formatHours(sessions: number, hoursEach: number): string {
  return `${((sessions * hoursEach) / 1000).toFixed(1)}k`;
}
```

- [ ] **Step 8: Failing component markup test.** `src/components/gym/GymCalendar.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import GymCalendar from './GymCalendar';

const html = renderToStaticMarkup(<GymCalendar />);

describe('GymCalendar', () => {
  it('opens on the latest month with the plain caption and its summary', () => {
    expect(html).toContain('Gym check-ins');
    expect(html).toContain('November 2026');
    expect(html).toContain('5 of 8 days so far');
  });
  it('renders an accessible grid with weekday headers and labelled days', () => {
    expect(html).toContain('role="grid"');
    expect(html).toContain('aria-label="November 2026 gym check-ins"');
    expect(html).toContain('Sun');
    expect(html).toContain('Mon, Nov 2, 2026: went to the gym');
    expect(html).toContain('Sun, Nov 1, 2026: rest day');
  });
  it('has exactly one tabbable day (roving tabindex)', () => {
    expect(html.split('tabindex="0"').length - 1).toBe(1);
  });
  it('offers previous/next buttons and a year switcher, and says nothing about syncing', () => {
    expect(html).toContain('aria-label="Previous month"');
    expect(html).toContain('aria-label="Next month"');
    expect(html).toContain('aria-label="Year"');
    expect(html.toLowerCase()).not.toMatch(/synced|connected|estimated|reconstructed/);
  });
  it('lists the four phases with counts and the overview summary', () => {
    expect(html).toContain('Summer 2022: slower start');
    expect(html).toContain('861 check-ins since June 2022');
  });
});
```

(Sun Nov 1, 2026 is a rest day in the data: the November 2026 check-ins are the 2nd, 3rd, 4th, 7th and 8th.)

- [ ] **Step 9: `src/components/gym/GymCalendar.tsx`.** Implement exactly this behavior:

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import data from '../../data/gym-checkins.json';
import { calendarCaption } from '../../data/lifting';
import YearWall from './YearWall';
import {
  MONTH_NAMES, toSet, monthView, summaryText, shiftMonth, monthKey, yearsOf, phaseSpans, dayLabel,
} from './calendar';
import './gym.css';

const set = toSet(data.dates);
const years = yearsOf(data.dates);
const asOf = data.asOf;
const first = { year: Number(data.dates[0].slice(0, 4)), month: Number(data.dates[0].slice(5, 7)) - 1 };
const last = { year: Number(asOf.slice(0, 4)), month: Number(asOf.slice(5, 7)) - 1 };
const spans = phaseSpans(data.phases, data.dates, asOf);
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const within = (m: { year: number; month: number }) =>
  monthKey(m.year, m.month) >= monthKey(first.year, first.month) && monthKey(m.year, m.month) <= monthKey(last.year, last.month);

/** The gym check-in calendar: one month at a time, filling green day by day when it scrolls into view. */
export default function GymCalendar() {
  const [cursor, setCursor] = useState(last);
  const [focusDay, setFocusDay] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [filled, setFilled] = useState(false);
  const grid = useRef<HTMLDivElement | null>(null);
  const moved = useRef(false);
  const seen = useRef(false);

  const view = useMemo(() => monthView(cursor.year, cursor.month, set, asOf), [cursor]);
  const title = `${MONTH_NAMES[cursor.month]} ${cursor.year}`;

  // fill when the grid scrolls into view, and again after each month change
  useEffect(() => {
    const el = grid.current;
    if (!el) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof IntersectionObserver === 'undefined') { setFilled(true); return; }
    let raf = 0;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { seen.current = true; setFilled(true); }
    }, { threshold: 0.3 });
    io.observe(el);
    if (seen.current) { setFilled(false); raf = requestAnimationFrame(() => setFilled(true)); }
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [cursor]);

  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    grid.current?.querySelector<HTMLElement>(`[data-day="${focusDay}"]`)?.focus();
  }, [focusDay, cursor]);

  const go = useCallback((delta: number) => {
    const next = shiftMonth(cursor, delta);
    if (!within(next)) return;
    setCursor(next);
    setFocusDay(1);
    setSelected(null);
  }, [cursor]);

  const onKey = (e: React.KeyboardEvent) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key as 'ArrowLeft'];
    let next = focusDay;
    if (step !== undefined) next = focusDay + step;
    else if (e.key === 'Home') next = 1;
    else if (e.key === 'End') next = view.days;
    else return;
    e.preventDefault();
    next = Math.max(1, Math.min(view.days, next));
    moved.current = true;
    setFocusDay(next);
    setSelected(view.cells[next - 1].iso);
  };

  const weeks: (typeof view.cells[number] | null)[][] = [];
  const flat = [...Array(view.lead).fill(null), ...view.cells];
  for (let i = 0; i < flat.length; i += 7) weeks.push(flat.slice(i, i + 7));
  const picked = selected ? view.cells.find((c) => c.iso === selected) : null;
  let order = 0;

  return (
    <div className="gym">
      <p className="gym-caption">{calendarCaption}</p>
      <div className="gym-bar">
        <button type="button" className="gym-nav" aria-label="Previous month" aria-disabled={!within(shiftMonth(cursor, -1)) ? true : undefined} onClick={() => go(-1)}>‹</button>
        <h4 className="gym-title">{title}</h4>
        <button type="button" className="gym-nav" aria-label="Next month" aria-disabled={!within(shiftMonth(cursor, 1)) ? true : undefined} onClick={() => go(1)}>›</button>
        <select className="gym-year" aria-label="Year" value={cursor.year} onChange={(e) => {
          const y = Number(e.target.value);
          const m = { year: y, month: Math.min(Math.max(cursor.month, y === first.year ? first.month : 0), y === last.year ? last.month : 11) };
          setCursor(m); setFocusDay(1); setSelected(null);
        }}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <p className="gym-summary">{summaryText(view, asOf)}</p>
      <div ref={grid} role="grid" aria-label={`${title} gym check-ins`} className={`gym-grid${filled ? ' gym-on' : ''}`} onKeyDown={onKey}>
        <div role="row" className="gym-row gym-head">
          {WEEKDAYS.map((d) => <span key={d} role="columnheader" className="gym-dow">{d}</span>)}
        </div>
        {weeks.map((week, w) => (
          <div role="row" className="gym-row" key={w}>
            {week.map((cell, i) => cell ? (
              <button
                key={cell.iso}
                type="button"
                role="gridcell"
                data-day={cell.day}
                tabIndex={cell.day === focusDay ? 0 : -1}
                className={`gym-cell${cell.went ? ' gym-went' : ''}${cell.future ? ' gym-future' : ''}`}
                style={cell.went ? ({ '--d': `${Math.min(order++ * 45, 1500)}ms` } as React.CSSProperties) : undefined}
                aria-label={dayLabel(cell.iso, cell.went)}
                onMouseEnter={() => setSelected(cell.iso)}
                onFocus={() => { setFocusDay(cell.day); setSelected(cell.iso); }}
                onClick={() => { setFocusDay(cell.day); setSelected(cell.iso); }}
              >{cell.day}</button>
            ) : <span key={`b${i}`} className="gym-blank" aria-hidden="true" />)}
          </div>
        ))}
      </div>
      <p className="gym-status" aria-live="polite">{picked ? dayLabel(picked.iso, picked.went) : ' '}</p>

      <p className="gym-wall-note">{data.dates.length} check-ins since June 2022</p>
      <YearWall />
      <ol className="gym-phases">
        {spans.map((s) => (
          <li key={s.from}><span className="gym-phase-name">{s.label}</span><span className="gym-phase-n">{s.count} check-ins</span></li>
        ))}
      </ol>
    </div>
  );
}
```

Note for the implementer: the markup test needs `Mon, Nov 2, 2026: went to the gym` and `Sun, Nov 1, 2026: rest day` present in the static render, exactly one `tabindex="0"`, and the day cells render as `<button role="gridcell" ...>`. React renders `tabIndex` as `tabindex`. If the static markup puts `--d` styles that break nothing, fine. If a lint/type error appears for `React.KeyboardEvent`, import the type: `import type { KeyboardEvent as ReactKeyboardEvent, CSSProperties } from 'react'`.

- [ ] **Step 10: `src/components/gym/YearWall.tsx`.** A decorative canvas: one row per year (oldest at top), each year drawn with `weekGrid`; went cells in green, others dim; sized by the container; redrawn on resize and theme change; drawn once (no animation).

```tsx
import { useEffect, useRef } from 'react';
import data from '../../data/gym-checkins.json';
import { toSet, yearsOf, weekGrid } from './calendar';

const set = toSet(data.dates);
const years = yearsOf(data.dates);
const grids = years.map((y) => weekGrid(y, set));
const COLS = 54;
const LABEL = 34;

export default function YearWall() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const root = document.documentElement;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      const style = getComputedStyle(root);
      const on = style.getPropertyValue('--gym-go').trim() || '#5ee38a';
      const off = style.getPropertyValue('--color-rule').trim() || '#2a2552';
      const muted = style.getPropertyValue('--color-muted').trim() || '#a39fc4';
      const cell = (rect.width - LABEL) / COLS;
      const gap = Math.max(1, cell * 0.18);
      const block = 7 * cell + 10;
      ctx.font = `${Math.max(9, cell * 1.6)}px "JetBrains Mono", monospace`;
      ctx.textBaseline = 'middle';
      grids.forEach((g, yi) => {
        const top = yi * block;
        ctx.fillStyle = muted;
        ctx.fillText(String(years[yi]).slice(2), 0, top + (7 * cell) / 2);
        for (const c of g.cells) {
          ctx.fillStyle = c.went ? on : off;
          ctx.globalAlpha = c.went ? 1 : 0.55;
          ctx.fillRect(LABEL + c.col * cell, top + c.row * cell, cell - gap, cell - gap);
        }
        ctx.globalAlpha = 1;
      });
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    const mo = new MutationObserver(draw);
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { ro.disconnect(); mo.disconnect(); };
  }, []);
  return <canvas ref={ref} className="gym-wall" aria-hidden="true" style={{ height: `${years.length * (7 * 6 + 10)}px` }} />;
}
```

The canvas is decorative (`aria-hidden`); the text line above it ("861 check-ins since June 2022") and the phase list carry the meaning. The implementer must make the CSS height match the drawing: the canvas CSS height is set from `years.length` and a nominal 6 px cell; if the drawn block height (`7 * cell + 10` per year) differs from that at some widths, size the canvas by `aspect-ratio` instead: `aspect-ratio: ${COLS + LABEL / cell}`-style is unnecessary; the simple rule is `height = years.length * (7 * cell + 10)` recomputed in `draw()` by setting `canvas.style.height` before measuring. Do that (set `canvas.style.height` inside `draw()` from the measured width) so the wall never clips or leaves a gap.

- [ ] **Step 11: `src/components/gym/gym.css`** (all selectors prefixed `.gym` or `.lifting` so nothing ties with global rules):

```css
.lifting { max-width: 46rem; margin: var(--space-xl) auto 0; }
.lifting-head { text-align: center; margin: 0 0 var(--space-lg); }
.lifting-head .eyebrow { margin: 0 0 8px; }
.lifting-head h3 { margin: 0; font: 400 clamp(18px, 3vw, 26px)/1.2 var(--font-pixel); letter-spacing: .08em; text-transform: uppercase; color: var(--color-fg); text-shadow: 0 0 18px var(--title-glow); }
.lifting-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-md); margin: 0 0 var(--space-md); padding: 0; list-style: none; text-align: center; }
.lifting-stats li { padding: 14px 8px; border: 1px solid var(--color-rule); border-radius: 12px; background: var(--color-card); }
.lifting-stats b { display: block; font: 800 clamp(20px, 3.4vw, 28px)/1.1 var(--font-title); color: var(--color-fg); }
.lifting-stats span { display: block; margin-top: 6px; font: 400 11px/1.3 var(--font-pixel); letter-spacing: .12em; text-transform: uppercase; color: var(--color-muted); }
.lifting-pct { margin: 0 0 var(--space-lg); text-align: center; font: 400 14px/1.5 var(--font-mono); color: var(--color-accent); }
.lifting-hours { margin: 0 0 var(--space-lg); text-align: center; font: 400 14px/1.5 var(--font-mono); color: var(--color-muted); }
.lifting-hours b { color: var(--color-fg); font-weight: 500; }

.gym { --gym-go: #5ee38a; --gym-go-ink: #08210f; }
.gym-caption { margin: 0 0 8px; text-align: center; font: 400 11px var(--font-pixel); letter-spacing: .14em; text-transform: uppercase; color: var(--color-muted); }
.gym-bar { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; }
.gym-title { margin: 0; min-width: 11ch; text-align: center; font: 500 16px/1.2 var(--font-mono); color: var(--color-fg); }
.gym-nav, .gym-year { font: 500 14px var(--font-mono); color: var(--color-fg); background: var(--color-chip); border: 1px solid var(--color-rule); border-radius: 8px; padding: 6px 12px; cursor: pointer; }
.gym-nav[aria-disabled="true"] { opacity: .4; cursor: default; }
.gym-nav:hover:not([aria-disabled="true"]), .gym-year:hover { border-color: var(--color-num); }
.gym-summary { margin: 10px 0 12px; text-align: center; font: 400 13px var(--font-mono); color: var(--color-muted); }
.gym-grid { max-width: 28rem; margin: 0 auto; }
.gym-row { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; margin-bottom: 4px; }
.gym-dow { text-align: center; font: 400 11px var(--font-pixel); letter-spacing: .08em; text-transform: uppercase; color: var(--color-muted); }
.gym-cell { aspect-ratio: 1; display: grid; place-items: center; padding: 0; font: 400 12px var(--font-mono); color: var(--color-muted); background: var(--color-chip); border: 1px solid var(--color-rule); border-radius: 6px; cursor: default; }
.gym-blank { aspect-ratio: 1; }
.gym-went { background: var(--gym-go); border-color: var(--gym-go); color: var(--gym-go-ink); font-weight: 500; }
.gym-future { opacity: .35; }
.gym-cell:hover, .gym-cell:focus-visible { border-color: var(--color-num); }
/* the fill: without JS the days stay green; with JS they start empty and fill in order when the grid scrolls into view */
.js .gym-grid:not(.gym-on) .gym-went { background: var(--color-chip); border-color: var(--color-rule); color: var(--color-muted); }
.gym-went { transition: background-color .35s ease var(--d, 0ms), border-color .35s ease var(--d, 0ms), color .35s ease var(--d, 0ms); }
.gym-status { min-height: 1.4em; margin: 10px 0 var(--space-md); text-align: center; font: 400 13px var(--font-mono); color: var(--color-fg); }
.gym-wall-note { margin: var(--space-md) 0 8px; text-align: center; font: 400 13px var(--font-mono); color: var(--color-muted); }
.gym-wall { display: block; width: 100%; }
.gym-phases { list-style: none; margin: var(--space-md) 0 0; padding: 0; display: grid; gap: 6px; }
.gym-phases li { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; font: 400 12px/1.4 var(--font-mono); color: var(--color-muted); border-top: 1px solid var(--color-rule); padding-top: 6px; }
.gym-phase-name { color: var(--color-fg); }
@media (max-width: 639px) { .lifting-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (prefers-reduced-motion: reduce) { .gym-went { transition: none; } .js .gym-grid:not(.gym-on) .gym-went { background: var(--gym-go); border-color: var(--gym-go); color: var(--gym-go-ink); } }
```

Contrast notes the implementer must check: day numbers on green use `--gym-go-ink` (#08210f on #5ee38a, well above 4.5:1); `.gym-cell` muted day numbers on `--color-chip` must meet 4.5:1 in vapor and light (muted on chip: if it fails in either theme, use `--color-fg` for the day numbers instead). Pixel text stays at 11px or larger.

- [ ] **Step 12: `src/components/Lifting.astro` and wiring.**

```astro
---
import GymCalendar from './gym/GymCalendar.tsx';
import { lifts, liftTotal, percentileLine, hoursLabel } from '../data/lifting';
---
<div class="lifting reveal">
  <header class="lifting-head"><p class="eyebrow">Outside of work</p><h3>Lifting</h3></header>
  <ul class="lifting-stats">
    {lifts.map((l) => <li><b>{l.pounds}</b><span>{l.name}</span></li>)}
    <li><b>{liftTotal}</b><span>Total</span></li>
  </ul>
  <p class="lifting-pct">{percentileLine}</p>
  <p class="lifting-hours"><b>{hoursLabel}</b> in the gym</p>
  <GymCalendar client:visible />
</div>
```

In `src/components/About.astro` add `import Lifting from './Lifting.astro';` and render `<Lifting />` as the last child of the `<section>` (after the `.about` div).

- [ ] **Step 13: Verify.** Run, in order: `npx vitest run src/data src/components/gym` (all PASS); `npm test` (green); `npm run build` (ends `check-build: ok`; if a build check rejects the new content, stop with NEEDS_CONTEXT naming the check, do not edit it); `npm run typecheck | tail -3` (still 7, add none). Open `dist/index.html` and report: the Lifting block is inside `#about`, the four stat tiles read `~245 lb`, `~385 lb`, `~475 lb`, `~1,105 lb`, the percentile line and `1.6k hours` appear once each, the calendar renders `November 2026` with `5 of 8 days so far`, and the words `synced`, `connected`, `estimated`, `reconstructed` do not appear anywhere in the About section's HTML.

- [ ] **Step 14: Commit** `feat: the Lifting block in About, with a gym check-in calendar`. Include the generated `src/data/gym-checkins.json` and the script. The CSV itself is NOT committed (it stays in Downloads).

---

### Task 13: Mobile nav as a fixed grid (carried over from the Task 9 verification run that hit its step limit)

The earlier browser verification (already on this branch as commits 220de42, 5bc128c, 8ff009a) found that the CLS fix (font preload) only holds if the font lands before first paint. With fonts delayed 2.5 s, CLS returns to 0.171. Cause: the mono fallback fits the five nav links on one row, Silkscreen needs two, so the bar grows 33 px and pushes the page down. That run tested four fixes and found a clean one that it did not get to apply: make the mobile nav a fixed 3-column grid, so the row count never depends on which font is loaded (measured: CLS 0.171 to 0.007, bar height unchanged at 117 px, one CSS rule). It also left a doc claim to soften.

**Files:**
- Modify: `src/styles/vapor.css` (the `@media (max-width: 639px)` block, about line 126), `src/styles/vapor.test.ts` (append one test), `docs/superpowers/specs/2026-11-07-vapor-theme-design.md` (the Fonts paragraph, about line 102)

- [ ] **Step 1: Failing test.** Append to `src/styles/vapor.test.ts` (`vapor` is the comment-stripped stylesheet defined there):

```ts
describe('mobile nav layout', () => {
  function mediaBlock(header: string): string {
    const start = vapor.indexOf(header);
    expect(start, header).toBeGreaterThan(-1);
    const open = vapor.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < vapor.length; i++) {
      if (vapor[i] === '{') depth++;
      else if (vapor[i] === '}' && --depth === 0) return vapor.slice(open + 1, i);
    }
    throw new Error('unterminated block');
  }

  it('is a fixed three-column grid on small screens, so a late font swap cannot change the row count', () => {
    const block = mediaBlock('@media (max-width: 639px)');
    const nav = block.match(/\.vnav\s*\{[^}]*\}/)?.[0] ?? '';
    expect(nav).toContain('display: grid');
    expect(nav).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(nav).toContain('justify-items: center');
    const link = block.match(/\.vnav a\s*\{[^}]*\}/)?.[0] ?? '';
    expect(link).toContain('white-space: nowrap');
  });
});
```

Run it, expect FAIL.

- [ ] **Step 2: The CSS.** In `src/styles/vapor.css`, inside the existing `@media (max-width: 639px)` block, replace the two `.vnav` lines with:

```css
  .vnav { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); justify-items: center; grid-column: 1 / -1; grid-row: 2; gap: 4px 2px; }
  .vnav a { padding: 6px 8px; letter-spacing: .08em; font-size: 11px; white-space: nowrap; }
```

Run the test: PASS. Keep everything else in that block unchanged.

- [ ] **Step 3: Soften the spec.** In the spec's Fonts paragraph, replace the clause "with metric fallbacks to avoid layout shift" with: "preloaded so the first paint uses them, and the mobile nav is a fixed three-column grid so a late font swap cannot reflow the bar". Do not claim metric overrides; none are implemented.

- [ ] **Step 4: Verify in a real browser (report the numbers).** `npm run build`, then serve the build (`npm run preview -- --port 4325`; the 4323 server may belong to someone else, do not kill it). Reuse an existing throwaway harness if one exists (earlier runs left traces in /private/tmp: `cdp-cls-*` profile dirs, `lh-clsfix*.json`; `ls /private/tmp` and `ls ~/.cache/ms-playwright`), or write a small one OUTSIDE the repo (use the scratchpad directory). Measure:
  1. Late-font CLS: block the two woff2 requests for 2.5 s (route interception with a delay), load `/`, and read the layout-shift total at widths 320, 375, 412, 768 and 1440. Expect near 0 at every width (the report predicted about 0.007 at mobile widths). Report each number.
  2. A mobile screenshot at 320 px and 390 px: the nav should read as three links on the first row and two on the second, nothing clipped (check that "EXPERIENCE" fits its column at 320 px: its text width must be below the column width; report both).
  3. Lighthouse mobile on `/` measured with nothing else running: performance must stay at 0.99 or above (the baseline is 0.99), CLS 0. Report the scores.
  If no browser tooling is available and cannot be found, stop with NEEDS_CONTEXT instead of installing browsers.

- [ ] **Step 5: Suite and commit.** `npm test` green, `npm run build` ends `check-build: ok`, `npm run typecheck | tail -3` still 7. Commit `fix: mobile nav is a fixed three-column grid so a late font swap cannot shift the page`.

---

### Task 14: A simpler chat box (added after Andrian's review: "a bit big and clunky ... i like this better more simple")

Andrian approved this design on 2026-11-08, modelled on his reference screenshot of a compact bar: three question chips with a refresh button on one row, and one input under them.

- No greeting line (the input placeholder already says "Ask anything about Andrian…").
- No agent trace lines on the home page ("orchestrator: routed to…", "verifier: 3 numbers checked ✓"). They stay in the full terminal (`/terminal`, `useTerminal`'s own trace output is unchanged).
- The idle state is just the bar: no empty "Answers show up here." area.
- No Experience / Projects / About / Contact row when JavaScript is on (the top nav already has them). The row stays in the markup and shows without JavaScript, because it is the no-JS path and an existing test pins it.
- Answers appear above the bar, clipped to the first few lines with a "Show more" / "Show less" toggle, and keep their source links. (The agent's answers can be thousands of characters long; the home box must not become a wall of text.)
- A flatter look: smaller padding and radius, lighter glass, no big glow.

**Files:**
- Create: `src/components/terminal/clip.ts`, `src/components/terminal/clip.test.ts`
- Modify: `src/components/Hero.astro`, `src/components/terminal/IntroTerminal.tsx`, `src/components/terminal/IntroTerminal.test.tsx`, `src/styles/vapor.css` (the chat panel section, about lines 138 to 166), `src/styles/global.css` (remove one dead rule), `src/styles/vapor.test.ts` (append)

**Interfaces — Produces (`clip.ts`):**
- `visibleLines<T extends { kind: string }>(lines: T[]): T[]` returns the lines whose `kind` is not `'trace'`.
- `clipAnswer(text: string, max?: number): { text: string; clipped: boolean }` with `max` defaulting to 320. If `text.length <= max` it returns the text unchanged and `clipped: false`. Otherwise it cuts at the last sentence end (`.`, `!`, `?` followed by whitespace) before `max` if that leaves at least 120 characters; else at the last space before `max`; else at `max`. It trims trailing whitespace, appends `…`, and returns `clipped: true`.

- [ ] **Step 1: Failing tests.** `src/components/terminal/clip.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { visibleLines, clipAnswer } from './clip';

describe('visibleLines', () => {
  it('drops the agent trace lines and keeps the question and the answer, in order', () => {
    const lines = [
      { id: 1, kind: 'input', text: 'q' },
      { id: 2, kind: 'trace', text: 'orchestrator: routed' },
      { id: 3, kind: 'trace', text: 'verifier: ok' },
      { id: 4, kind: 'answer', text: 'a' },
    ];
    expect(visibleLines(lines).map((l) => l.id)).toEqual([1, 4]);
  });
});

describe('clipAnswer', () => {
  it('leaves a short answer alone', () => {
    expect(clipAnswer('Short answer.')).toEqual({ text: 'Short answer.', clipped: false });
  });
  it('leaves an answer of exactly max characters alone', () => {
    const t = 'x'.repeat(320);
    expect(clipAnswer(t)).toEqual({ text: t, clipped: false });
  });
  it('cuts a long answer at the last sentence end before max', () => {
    const sentence = 'This is a sentence that runs for a while. ';
    const text = sentence.repeat(20);
    const out = clipAnswer(text);
    expect(out.clipped).toBe(true);
    expect(out.text.endsWith('.…')).toBe(true);
    expect(out.text.length).toBeLessThanOrEqual(321);
    expect(out.text.length).toBeGreaterThan(120);
  });
  it('falls back to a word boundary when there is no usable sentence end', () => {
    const text = 'word '.repeat(200);
    const out = clipAnswer(text);
    expect(out.clipped).toBe(true);
    expect(out.text.endsWith('word…')).toBe(true);
    expect(out.text.length).toBeLessThanOrEqual(321);
  });
  it('hard-cuts text with no spaces at all', () => {
    const out = clipAnswer('x'.repeat(1000));
    expect(out.text).toBe('x'.repeat(320) + '…');
    expect(out.clipped).toBe(true);
  });
  it('honours a custom max', () => {
    expect(clipAnswer('a b c d e f g h i j', 9).text.length).toBeLessThanOrEqual(10);
  });
});
```

Append to `src/components/terminal/IntroTerminal.test.tsx` (it already renders the component to static markup in `html`):

```tsx
describe('IntroTerminal, simplified', () => {
  it('has no greeting and no empty placeholder text in the markup', () => {
    expect(html).not.toContain('Answers show up here');
    expect(html).not.toContain('hey there');
  });
  it('keeps the log region in the DOM (a live region must exist before it is updated) but empty', () => {
    expect(html).toMatch(/<div class="intro-out"[^>]*role="log"[^>]*><\/div>/);
  });
});
```

Append to `src/styles/vapor.test.ts`:

```ts
describe('simpler chat box', () => {
  it('collapses the empty log instead of reserving space for it', () => {
    expect(vapor).toMatch(/\.intro-out:empty\s*\{[^}]*(display:\s*none|max-height:\s*0|height:\s*0)/);
  });
  it('hides the route row once JavaScript is on, but keeps it for no-JS', () => {
    expect(vapor).toMatch(/\.js \.topics\s*\{\s*display:\s*none/);
  });
  it('lays the chips out on one row with the refresh button, wrapping their text instead of cutting it', () => {
    const rule = vapor.match(/\.js \.intro-suggest\s*\{[^}]*\}/)?.[0] ?? '';
    expect(rule).toContain('display: grid');
    expect(vapor).toMatch(/\.intro-suggest\s*\{[^}]*grid-template-columns:\s*auto repeat\(3, minmax\(0, 1fr\)\)/);
    expect(vapor).not.toMatch(/\.intro-chip\s*\{[^}]*text-overflow:\s*ellipsis/);
  });
  it('drops the old placeholder text rule from global.css', () => {
    const globalCss = fs.readFileSync(path.join(process.cwd(), 'src/styles/global.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(globalCss).not.toContain('Answers show up here');
  });
});
```

Run all new tests, expect FAIL.

- [ ] **Step 2: `src/components/terminal/clip.ts`:**

```ts
/** The home chat shows the question and the answer; the agent's routing trace stays in the full terminal. */
export function visibleLines<T extends { kind: string }>(lines: T[]): T[] {
  return lines.filter((line) => line.kind !== 'trace');
}

/** The first few lines of a long answer, cut at a sentence if there is a sensible one. */
export function clipAnswer(text: string, max = 320): { text: string; clipped: boolean } {
  if (text.length <= max) return { text, clipped: false };
  const head = text.slice(0, max);
  const sentence = [...head.matchAll(/[.!?](?=\s)/g)].pop();
  let cut = head;
  if (sentence && sentence.index !== undefined && sentence.index + 1 >= 120) cut = head.slice(0, sentence.index + 1);
  else {
    const space = head.lastIndexOf(' ');
    if (space > 0) cut = head.slice(0, space);
  }
  return { text: `${cut.trimEnd()}…`, clipped: true };
}
```

Run `clip.test.ts`: PASS.

- [ ] **Step 3: `Hero.astro`:** delete the `<p class="chat-hello">…</p>` line. Nothing else in Hero changes.

- [ ] **Step 4: `IntroTerminal.tsx`.** Read the current file. Make these changes only:
  - `import { visibleLines, clipAnswer } from './clip';`
  - Add `const [open, setOpen] = useState<Set<number>>(new Set());` and `const shown = visibleLines(term.lines);`
  - Render `shown.map(...)` instead of `term.lines.map(...)`.
  - For a line with `kind === 'answer'`, compute `const clipped = clipAnswer(line.text)` and render `open.has(line.id) ? line.text : clipped.text` inside `.intro-text`; if `clipped.clipped` render after the text a `<button type="button" className="intro-more" aria-expanded={open.has(line.id)} onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(line.id)) n.delete(line.id); else n.add(line.id); return n; })}>{open.has(line.id) ? 'Show less' : 'Show more'}</button>`. Other kinds render unchanged.
  - The log `<div className="intro-out" role="log" ...>` stays rendered always (a live region must exist before it is updated) and must render no children when there is nothing to show: with `shown` empty and `term.busy` false the div has no child nodes at all (so `:empty` matches and the static markup test passes). Keep the `ref`, `onClick={term.flush}`, `aria-live`.
  - The scroll-to-bottom effect keeps working on `term.lines`.
  - Leave the suggestion chips, the form/input, and the `topics` nav as they are.

- [ ] **Step 5: CSS.** In `src/styles/vapor.css`, in the chat panel section:
  - `.chat`: change `width` to `min(640px, 100%)`, `border-radius` to `12px`, `padding` to `12px`, replace the `background` with `color-mix(in srgb, var(--color-card) 70%, transparent)`, and replace the soft `box-shadow` with `none`. Keep `margin-top`, `text-align`, the border, and the `backdrop-filter` declaration. Make `.chat:focus-within` `border-color: var(--color-num); box-shadow: 0 0 0 1px var(--color-num);` (drop the big glow).
  - Add `.intro-out:empty { display: none; }`. If an `aria-live` region inside `display: none` concerns you, use this instead and keep it accessible: `.intro-out:empty { min-height: 0; max-height: 0; margin: 0; overflow: hidden; }`. Use the second form (it keeps the live region in the accessibility tree), and make the test accept it (the regex allows `max-height: 0`).
  - `.intro-out`: when it has content, `max-height: min(40svh, 320px); overflow-y: auto; margin-bottom: 8px;`.
  - `.intro-suggest`: `display: none; grid-template-columns: auto repeat(3, minmax(0, 1fr)); gap: 8px; margin: 0 0 8px; align-items: stretch;` and `.js .intro-suggest { display: grid; }`. Chips wrap their text (no `white-space: nowrap`, no ellipsis); `.intro-refresh { align-self: stretch; }`.
  - Under `@media (max-width: 639px)`: `.intro-suggest { grid-template-columns: 1fr; }` and `.intro-refresh { justify-self: start; }`; remove the old `.intro-chip { flex: 1 1 100% }` rule.
  - `.js .topics { display: none; }`.
  - `.intro-more`: a small text button: `margin-left: 8px; padding: 0; background: none; border: 0; color: var(--color-accent); font: 400 12px var(--font-mono); cursor: pointer; text-decoration: underline; text-underline-offset: 3px;`
  - The `.chat-hello` rule, if present anywhere, is deleted.
  In `src/styles/global.css`, delete the one rule `.js .intro-out:empty::before { content: "Answers show up here."; color: var(--color-muted); }` and any `.chat-hello` rule.

- [ ] **Step 6: Verify.** `npx vitest run src/components/terminal src/styles` PASS; `npm test` green (update, never delete, any test the change invalidates); `npm run build` ends `check-build: ok`; `npm run typecheck | tail -3` still 7. Then, in a real browser if browser tooling is available (preview on port 4326; do not touch ports 4322 or 4323; write any harness outside the repo; stop the server when done): load `/`, confirm the box is about one third of its old height with nothing but chips and the input (report the measured height of `.chat` before typing), click the first chip, wait 3 s, confirm no `orchestrator:`/`verifier:` text appears, that the answer shows a "Show more" button when clipped, and that clicking it expands and the button then reads "Show less". Report the numbers; if no browser tooling is available, say so.

- [ ] **Step 7: Commit** `feat: a simpler home chat box (chips and input, clipped answers, no trace lines)`.
