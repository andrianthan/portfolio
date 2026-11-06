# Portfolio Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and locally verify the portfolio site (home plus seven gated detail pages) described in the spec, ready to scan, push, and deploy once the owner approves.

**Architecture:** Astro static site with content collections (Markdown plus Zod schemas). All pages are static Astro components; React is used only for three small islands (theme toggle, rotating subtitle word, card spotlight is a plain script). Two flags per entry (`listed`, `cleared`) gate what is rendered; a post-build script fails the build on leaks, markers, broken links, or missing alt text.

**Tech Stack:** Astro (latest stable), TypeScript, `@astrojs/react`, `@astrojs/sitemap`, `@vercel/analytics`, `gray-matter`, Vitest. Plain CSS tokens. Node 20+.

**Spec:** `/Users/andrianthan/Desktop/projects/portfolio/docs/superpowers/specs/2026-11-05-portfolio-design.md`

**Visual reference (gitignored, read-only):** `design-reference/b2-spice.html` (home), `design-reference/project.html` (detail), `design-reference/logos/`, `design-reference/headshot.jpg`.

## Global Constraints

- Astro static output; TypeScript; content collections with Zod schemas; plain CSS with tokens in `src/styles/tokens.css`; no CSS framework.
- React only for islands, via `@astrojs/react`. No React Bits, no react-three-fiber, no animation libraries.
- Fonts: Inter (400, 500, 600, 700) and JetBrains Mono (400, 500) via Google Fonts link with `display=swap`.
- Headings are roman, never italic.
- Max widths: home `56rem`, detail pages `46rem`; 16px side gutter; no horizontal scroll at 320, 375, 414, 768px; clickable text stays on one line (`white-space: nowrap`).
- Colors only through CSS variables. Light: `--color-bg #f6f7f8`, `--color-fg #1e232a`, `--color-muted #5b6573`, `--color-rule #d8dce2`, `--color-accent #3d5f9e`, `--color-num #7a3fe0`, `--color-chip #e7e9ee`, `--color-card #ffffff`, `--color-dot #c9ced6`, `--color-glow rgba(122,63,224,.14)`. Dark: `--color-bg #1d2128`, `--color-fg #dce2ea`, `--color-muted #99a3b1`, `--color-rule #3a404a`, `--color-accent #8fb0e0`, `--color-num #b794ff`, `--color-chip #2f353e`, `--color-card #262b33`, `--color-dot #343b46`, `--color-glow rgba(183,148,255,.16)`.
- Motion only: name blur-in, pulsing availability dot, rotating subtitle word, scroll fade-in-up, card spotlight, arrow nudge. All disabled under `prefers-reduced-motion: reduce`.
- Theme follows the system setting; the user's choice is stored in `localStorage` with every read and write wrapped in try/catch.
- Only resume-derived numbers allowed: 32%, $30k+, 200+, 1st of 9, 3.7 GPA, 30+ mentored, 700+ applicants, 8-person team, 35/35, 0.854. No invented metrics.
- Every content entry has `listed` (default `true`) and `cleared` (default `false`). `cleared: false` means no detail page, no route, no sitemap entry. `listed: false` means not shown on home.
- No contact form, no backend, no secrets in the repo. `design-reference/`, `drafts/`, `.env*` stay gitignored.
- Nothing is pushed, published, or deployed without explicit owner approval (Task 11).
- Commit messages end with: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Working directory for every task: `/Users/andrianthan/Desktop/projects/portfolio`.

---

## File Structure

```
astro.config.mjs                 Astro config (react, sitemap, static output)
package.json                     scripts: dev, build (astro build && check), test, preview
tsconfig.json
vitest.config.ts
src/
  content.config.ts              collections: work, projects (Zod schemas)
  content/work/*.md              4 roles
  content/projects/*.md          3 projects
  data/stats.ts                  4 resume-derived stat items
  lib/content.ts                 pure selectors: listed, cleared, neighbors, renderBold
  lib/content.test.ts
  styles/tokens.css              light/dark tokens
  styles/global.css              base, components, motion rules
  layouts/Base.astro             head, fonts, OG, theme init script, analytics
  components/Hero.astro  StatStrip.astro  Timeline.astro  RoleEntry.astro
  components/ProjectCards.astro  About.astro  Footer.astro  TopBar.astro
  components/ThemeToggle.tsx  RotatingWord.tsx
  scripts/enhance.ts             reveal + card spotlight (plain TS, imported client-side)
  pages/index.astro
  pages/work/[slug].astro
  pages/projects/[slug].astro
  layouts/Detail.astro           detail-page layout
public/
  logos/ (tesla.svg micron.svg hanna.png bluedome.png)
  headshot.jpg  resume.pdf  favicon.svg  robots.txt
scripts/
  lib/checks.mjs                 findMarkers, findLeaks, findBrokenLinks, findMissingAlt
  lib/checks.test.mjs
  check-build.mjs                runs all checks on dist/, exits 1 on failure
```

---

### Task 1: Scaffold Astro project with tooling

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `src/pages/index.astro` (temporary)
- Modify: `.gitignore` (already exists; verify entries)

**Interfaces:**
- Produces: npm scripts `dev`, `build` (`astro build && node scripts/check-build.mjs`), `test` (`vitest run`), `preview`; Astro config with `output: 'static'`, React and sitemap integrations, `site` set to `https://andrian-than.vercel.app`.

- [ ] **Step 1: Scaffold into the existing repo**

```bash
cd /Users/andrianthan/Desktop/projects/portfolio
npm create astro@latest . -- --template minimal --no-install --no-git --yes --skip-houston
```
If the CLI refuses a non-empty directory, run it in a temp dir (`/tmp/astro-scaffold`) and copy `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/` and `public/` into the repo. Do not overwrite `.gitignore`, `docs/`, or `design-reference/`.

- [ ] **Step 2: Install dependencies**

```bash
npm install
npx astro add react sitemap --yes
npm install @vercel/analytics
npm install -D vitest gray-matter @types/react @types/react-dom
```

- [ ] **Step 3: Set config and scripts**

`astro.config.mjs`:
```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://andrian-than.vercel.app',
  output: 'static',
  integrations: [react(), sitemap()],
});
```

In `package.json` set:
```json
"scripts": {
  "dev": "astro dev",
  "build": "astro build && node scripts/check-build.mjs",
  "preview": "astro preview",
  "test": "vitest run"
}
```
Add `"type": "module"` if absent.

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'] } });
```

Temporary `src/pages/index.astro`:
```astro
---
---
<html lang="en"><head><meta charset="utf-8"><title>Andrian Than</title></head><body><h1>Andrian Than</h1></body></html>
```

- [ ] **Step 4: Verify the toolchain**

Create a stub `scripts/check-build.mjs` containing `console.log('checks: none yet');` so the build script resolves. Run:
```bash
npx astro build && node scripts/check-build.mjs && npx vitest run --passWithNoTests
```
Expected: build succeeds, `dist/index.html` exists, vitest exits 0.

- [ ] **Step 5: Commit**

```bash
git add -A ':!design-reference'
git commit -m "chore: scaffold Astro project with React, sitemap, vitest

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Content schemas, selectors, and seed content (TDD)

**Files:**
- Create: `src/content.config.ts`, `src/lib/content.ts`, `src/lib/content.test.ts`, `src/data/stats.ts`
- Create: `src/content/work/tesla.md`, `hanna.md`, `bluedome.md`, `micron.md`
- Create: `src/content/projects/advisorai.md`, `ai-swing-trader.md`, `claude-token-saver.md`

**Interfaces:**
- Produces (`src/lib/content.ts`):
  - `type Gated = { data: { listed: boolean; cleared: boolean; order: number } }`
  - `listed<T extends Gated>(xs: T[]): T[]` (listed only, sorted by `order` ascending)
  - `cleared<T extends Gated>(xs: T[]): T[]` (cleared only, sorted by `order`)
  - `neighbors<T extends { id: string }>(xs: T[], id: string): { prev: T | null; next: T | null }`
  - `renderBold(text: string): string` (turns `**x**` into `<b>x</b>`, HTML-escapes everything else)
- Produces (`src/data/stats.ts`): `export const stats: { value: string; caption: string }[]`
- Produces collections `work` and `projects` with the schema fields from the spec section 4.

- [ ] **Step 1: Write the failing tests**

`src/lib/content.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { listed, cleared, neighbors, renderBold } from './content';

const mk = (id: string, order: number, l = true, c = false) => ({ id, data: { listed: l, cleared: c, order } });

describe('listed', () => {
  it('keeps only listed entries sorted by order', () => {
    const out = listed([mk('b', 2), mk('a', 1), mk('x', 0, false)]);
    expect(out.map((e) => e.id)).toEqual(['a', 'b']);
  });
});

describe('cleared', () => {
  it('keeps only cleared entries sorted by order', () => {
    const out = cleared([mk('a', 2, true, true), mk('b', 1, true, true), mk('c', 0, true, false)]);
    expect(out.map((e) => e.id)).toEqual(['b', 'a']);
  });
  it('returns empty when nothing is cleared', () => {
    expect(cleared([mk('a', 1)])).toEqual([]);
  });
});

describe('neighbors', () => {
  const xs = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  it('returns prev and next', () => expect(neighbors(xs, 'b')).toEqual({ prev: xs[0], next: xs[2] }));
  it('returns null at the ends', () => {
    expect(neighbors(xs, 'a').prev).toBeNull();
    expect(neighbors(xs, 'c').next).toBeNull();
  });
  it('returns nulls for an unknown id', () => expect(neighbors(xs, 'zzz')).toEqual({ prev: null, next: null }));
});

describe('renderBold', () => {
  it('wraps **x** in <b>', () => expect(renderBold('a **b** c')).toBe('a <b>b</b> c'));
  it('escapes html', () => expect(renderBold('<i>x</i> **y**')).toBe('&lt;i&gt;x&lt;/i&gt; <b>y</b>'));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/content.test.ts`
Expected: FAIL (module `./content` not found).

- [ ] **Step 3: Implement**

`src/lib/content.ts`:
```ts
export type Gated = { data: { listed: boolean; cleared: boolean; order: number } };

const byOrder = <T extends Gated>(a: T, b: T) => a.data.order - b.data.order;

export const listed = <T extends Gated>(xs: T[]): T[] => xs.filter((x) => x.data.listed).sort(byOrder);
export const cleared = <T extends Gated>(xs: T[]): T[] => xs.filter((x) => x.data.cleared).sort(byOrder);

export function neighbors<T extends { id: string }>(xs: T[], id: string): { prev: T | null; next: T | null } {
  const i = xs.findIndex((x) => x.id === id);
  if (i === -1) return { prev: null, next: null };
  return { prev: xs[i - 1] ?? null, next: xs[i + 1] ?? null };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const renderBold = (text: string): string => esc(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
```

`src/data/stats.ts`:
```ts
export const stats = [
  { value: '32%', caption: 'better than baseline, Forecast Lab backtest' },
  { value: '$30k+', caption: 'vendor cost avoided, grant-research agent' },
  { value: '200+', caption: 'staging deploys a week supported' },
  { value: '1st of 9', caption: 'teams at the IBM hackathon, 700+ applicants' },
];
```

`src/content.config.ts` (use the Zod import that the installed Astro version documents; `z` from `astro:content` on Astro 5, `astro/zod` if Astro 6 requires it):
```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const gate = { listed: z.boolean().default(true), cleared: z.boolean().default(false), order: z.number() };

const work = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/work' }),
  schema: z.object({
    company: z.string(), title: z.string(), project: z.string(), dates: z.string(),
    start: z.string(), end: z.string(), summary: z.string(), stack: z.array(z.string()),
    logo: z.string(), logoFill: z.boolean().default(false), current: z.boolean().default(false), ...gate,
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/projects' }),
  schema: z.object({
    name: z.string(), kicker: z.string(), lede: z.string(), summary: z.string(), tag: z.string(),
    meta: z.object({ role: z.string(), status: z.string(), stack: z.string() }),
    repoUrl: z.string().url().optional(), ...gate,
  }),
});

export const collections = { work, projects };
```

Seed role files. `src/content/work/tesla.md`:
```md
---
company: Tesla
title: AI Software Engineer Intern
project: Service Demand Planning Copilot
dates: Jun 2026 – Dec 2026
start: "2026-06"
end: "2026-12"
summary: "Built Ask SDP, a tool-calling LLM copilot whose answers **can't contain invented numbers**, and shipped Forecast Lab, with Chronos-2 forecasts **32% better than baseline** on backtest. Built the staging-to-prod pipeline behind 200+ staging deploys a week."
stack: [LLM agents, FastAPI, React, DuckDB, GitHub Actions, Evals]
logo: /logos/tesla.svg
current: true
listed: true
cleared: false
order: 1
---
## Problem

[to confirm]

## Architecture

[to confirm]

## Key decisions

[to confirm]

## Backend and data

[to confirm]

## Results and lessons

[to confirm]
```

`hanna.md`: company `Hanna Center`, title `Software Engineer Intern`, project `AI Agents & Workflow Automation`, dates `Dec 2025 – Jun 2026`, start `"2025-12"`, end `"2026-06"`, summary `"Built in-house LLM tools with non-technical staff, including a grant-research agent that replaced an enterprise platform, **avoiding $30k+** in vendor and subscription cost. Wrote the validation framework for agent accuracy, consistency, and safety."`, stack `[Python, LLM agents, Salesforce, Agent evals]`, logo `/logos/hanna.png`, `logoFill: true`, current false, listed true, cleared false, order 2, same five-heading body.

`bluedome.md`: company `Blue Dome Technologies`, title `Software Engineer Intern`, project `AI/ML Quality Assurance Tool`, dates `Aug 2025 – Dec 2025`, start `"2025-08"`, end `"2025-12"`, summary `"Shipped a production full-stack QA tool for reviewing AI-labeled roadway images, with TPM 2.0 backed authentication."`, stack `[Flask, SQLite, TPM 2.0]`, logo `/logos/bluedome.png`, `logoFill: true`, listed true, cleared false, order 3, same body.

`micron.md`: company `Micron Technology`, title `Data Science Intern`, project `HBM Wafer Analysis Agent`, dates `May 2025 – Aug 2025`, start `"2025-05"`, end `"2025-08"`, summary `"Built Python and Snowflake pipelines over high-volume manufacturing data, plus a risk classification model to prioritize high-risk wafers."`, stack `[Python, Snowflake SQL, Power Automate]`, logo `/logos/micron.svg`, listed true, cleared false, order 4, same body.

Seed project files (all `listed: true`, `cleared: false`). `advisorai.md`: name `AdvisorAI`, kicker `Project · Multi-agent academic advising`, lede `A multi-agent advising system built in a hackathon: an orchestrator, a retrieval agent, and an evaluation agent behind a React frontend.`, summary `Multi-agent academic advising. Led 8 people to 1st of 9 teams.`, tag `IBM Skillsbuild hackathon`, meta role `Team lead (8 people)` status `Hackathon build, 1st of 9 teams from 700+ applicants` stack `Python, React, IBM watsonx Orchestrate`, order 1, same five-heading body with `[to confirm]`.
`ai-swing-trader.md`: name `ai-swing-trader`, kicker `Project · Multi-agent trading research`, lede `AI agents research US semiconductor stocks, but they never place a trade. Deterministic code decides, and it can't be talked out of its rules.`, summary `Research agents whose orders must pass deterministic risk gates.`, tag `GitHub`, meta role `Solo build` status `V1, paper trading only` stack `Python, pydantic, Alpaca MCP`, repoUrl `https://github.com/andrianthan/ai-swing-trader`, order 2, body with five headings and `[to confirm]`.
`claude-token-saver.md`: name `claude-token-saver`, kicker `Project · Claude Code plugin`, lede `A Claude Code plugin that routes each prompt to the right model tier through a hook, so simple turns do not pay for the biggest model.`, summary `A hook that routes each prompt to the right model tier.`, tag `GitHub`, meta role `Solo build` status `Working, with tests and an installer` stack `Python, Claude Code hooks, pytest`, order 3, body with five headings and `[to confirm]`.

- [ ] **Step 4: Run tests and typecheck content**

Run: `npx vitest run src/lib/content.test.ts && npx astro check || npx astro sync`
Expected: all vitest tests PASS; Astro validates every seed file against its schema without errors.

- [ ] **Step 5: Commit**

```bash
git add src/content.config.ts src/lib src/data src/content
git commit -m "feat: content collections, gating selectors, and seed content

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Tokens, global styles, and base layout

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/layouts/Base.astro`, `public/favicon.svg`, `public/robots.txt`

**Interfaces:**
- Produces: `Base.astro` with props `{ title: string; description?: string; ogImage?: string; path?: string }` and a default slot; sets `<html lang="en">`, Google Fonts link, inline theme-init script, Open Graph and Twitter tags, canonical URL from `Astro.site`, and mounts `@vercel/analytics` via its Astro component or script. All pages use it.
- Produces CSS class names used by later tasks (copied verbatim from the mockup): `.inner`, `.wide`, `.bar`, `.hero`, `.pill`, `.sub`, `.contact`, `.stats`, `.stat`, `.tl`, `.job`, `.logo`, `.logo.fill`, `.tag`, `.dates`, `.stack`, `.more`, `.cards`, `.card`, `.shot`, `.about`, `footer`, `h2`, `.reveal`, plus detail-page classes `.ph`, `.kicker`, `.lede`, `.meta`, `.links`, `.flow`, `.node`, `.node.gate`, `.dec`, `.facts`, `.fact`, `.next`, `.caption`.

- [ ] **Step 1: Extract tokens**

Create `src/styles/tokens.css` containing the `:root`, `:root[data-theme="dark"]`, and `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }` blocks, with exactly the color values in Global Constraints, plus `--font-sans`, `--font-mono`, `--space-sm 8px`, `--space-md 16px`, `--space-lg 32px`, `--space-xl 80px`, `--measure 56rem`.

- [ ] **Step 2: Port component CSS**

Create `src/styles/global.css` starting with `@import './tokens.css';`, then port, in order, the rules from the `<style>` block of `design-reference/b2-spice.html` (everything after the `:root` blocks) and from `design-reference/project.html` (everything after its `:root` blocks) with these rules: de-duplicate selectors that appear in both files (home values win; detail-specific selectors use their own names), keep every `@media (max-width: 720px)` and `(max-width: 760px)` and `@media (prefers-reduced-motion: reduce)` block, merge into single blocks per query. The `.close` rules from the mockup are dead and must not be ported. Do not hard-code any color value in this file; use the tokens (the mockup's `#ffffff` logo tile becomes `--color-logo-bg: #ffffff` defined in `tokens.css` for both themes).

- [ ] **Step 3: Base layout**

`src/layouts/Base.astro`:
```astro
---
import '../styles/global.css';
import Analytics from '@vercel/analytics/astro';

interface Props { title: string; description?: string; ogImage?: string; path?: string }
const { title, description = 'Andrian Than, software engineer building AI agents.', ogImage = '/og.png', path = Astro.url.pathname } = Astro.props;
const canonical = new URL(path, Astro.site).toString();
const og = new URL(ogImage, Astro.site).toString();
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content="website" />
    <meta property="og:url" content={canonical} />
    <meta property="og:image" content={og} />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <script is:inline>
      try { var t = localStorage.getItem('theme'); if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t); } catch (e) {}
      document.documentElement.classList.add('js');
    </script>
  </head>
  <body>
    <slot />
    <Analytics />
  </body>
</html>
```
`public/favicon.svg`: a 32x32 rounded square filled `#7a3fe0` with white "AT" text. `public/robots.txt`: `User-agent: *\nAllow: /\nSitemap: https://andrian-than.vercel.app/sitemap-index.xml`.

- [ ] **Step 4: Verify**

Replace the temporary `src/pages/index.astro` with a page that wraps `<h1>Andrian Than</h1>` in `Base`. Run `npm run build`, then:
```bash
grep -c 'fonts.googleapis.com/css2' dist/index.html
grep -c 'data-theme' dist/index.html
grep -R -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(' src/styles/global.css || echo "no hard-coded colors"
```
Expected: counts of at least 1 and the last command prints `no hard-coded colors`.

- [ ] **Step 5: Commit**

```bash
git add src/styles src/layouts public/favicon.svg public/robots.txt src/pages/index.astro
git commit -m "feat: design tokens, global styles, and base layout

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Home page (static sections)

**Files:**
- Create: `src/components/TopBar.astro`, `Hero.astro`, `StatStrip.astro`, `RoleEntry.astro`, `Timeline.astro`, `ProjectCards.astro`, `About.astro`, `Footer.astro`
- Modify: `src/pages/index.astro`
- Create: `public/headshot.jpg`, `public/logos/*` (copy), `public/resume.pdf` (copy)

**Interfaces:**
- Consumes: `listed`, `cleared`, `renderBold` from `src/lib/content.ts`; `stats` from `src/data/stats.ts`; collections `work` and `projects`; `Base.astro`.
- Produces: `index.astro` renders sections in this order: TopBar, Hero, StatStrip, Timeline, ProjectCards, About, Footer. Island mount points exist as plain markup: `<button id="theme-toggle">` inside TopBar and `<span id="rot">` inside Hero (Task 5 hydrates them).
- `RoleEntry` props: `{ role: CollectionEntry<'work'>; hasPage: boolean }`. When `hasPage` is false no write-up link is rendered. `ProjectCards` renders a card as `<a>` only when its entry is cleared, otherwise as a non-link `<div class="card">`.

- [ ] **Step 1: Copy assets**

```bash
mkdir -p public/logos
cp design-reference/logos/* public/logos/
cp "/Users/andrianthan/Downloads/Andrian_Than_Resume 2.pdf" public/resume.pdf
sips -Z 720 -s format jpeg -s formatOptions 82 "/Users/andrianthan/Downloads/Andrian Than Headshot.jpg" --out public/headshot.jpg
```
Verify `public/headshot.jpg` is under 200 KB (`ls -l public/headshot.jpg`).

- [ ] **Step 2: Components**

Port each section's markup from `design-reference/b2-spice.html` into the component named for it, with these exact data bindings and no other copy changes:
- `TopBar`: wordmark text `andrian than`, `<button id="theme-toggle" type="button" aria-label="Toggle light and dark theme">light / dark</button>`.
- `Hero`: availability pill `Graduating Spring 2027 · San Jose, CA`; `<h1><span class="w">Andrian</span> <span class="w">Than<span class="dot">.</span></span></h1>`; subtitle `Software engineer building <span id="rot">AI agents</span> that people can trust.`; buttons Resume (`/resume.pdf`, class `p`), Email (`mailto:andrian.than.api@gmail.com`), LinkedIn (`https://www.linkedin.com/in/andrian-than`), GitHub (`https://github.com/andrianthan`). Links open external ones with `rel="noopener"`.
- `StatStrip`: maps `stats` to `.stat` blocks inside `<div class="stats reveal">`.
- `Timeline`: `const roles = listed(await getCollection('work'))`; for each, `<RoleEntry role={role} hasPage={role.data.cleared} />`; wrapper classes `.tl`.
- `RoleEntry`: logo tile `<div class={`logo${role.data.logoFill ? ' fill' : ''}`}><img src={role.data.logo} alt={role.data.company} /></div>`; heading `{title} <span class="org">· {company}</span>` plus `<span class="tag">current</span>` when `current`; dates line `{dates} · {project}` upper-cased by CSS (`text-transform: uppercase` on `.dates`); body paragraph is `<p set:html={renderBold(role.data.summary)} />`; stack chips; link `<a class="more" href={`/work/${role.id}`}>Read the full write-up <span>→</span></a>` only when `hasPage`. Entry gets class `now` when `current`.
- `ProjectCards`: `listed(await getCollection('projects'))`; card shows `.shot` placeholder text `screenshot`, name, `tag`, summary; link target `/projects/${id}` only when `cleared`.
- `About`: headshot `<img src="/headshot.jpg" alt="Andrian Than" width="170" height="210">` and the three paragraphs from the mockup verbatim.
- `Footer`: `Built by Andrian Than` and LinkedIn, GitHub, Resume links.
- Section wrappers and ids as in the mockup (`#experience`, `#projects`, `#about`); `h2` text `Experience`, `Projects`, `About`.

`src/pages/index.astro` composes them inside `Base` with title `Andrian Than · Software Engineer`.

- [ ] **Step 3: Verify**

```bash
npm run build
test -f dist/index.html && echo ok
grep -c 'class="job' dist/index.html          # expect 4
grep -c 'Read the full write-up' dist/index.html  # expect 0 (nothing cleared yet)
grep -c 'class="card' dist/index.html          # expect 3
grep -c 'href="/work/' dist/index.html         # expect 0
```
Expected: counts as annotated, build passes.

- [ ] **Step 4: Visual check**

Run `npm run preview` and open the preview URL next to `design-reference/b2-spice.html` in Chrome. Confirm layout, spacing, light and dark mode, and mobile width (375px) match the reference apart from the intentional differences (no write-up links, project cards not clickable).

- [ ] **Step 5: Commit**

```bash
git add src public
git commit -m "feat: home page static sections and assets

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Islands and enhancements (theme toggle, rotating word, reveal, spotlight)

**Files:**
- Create: `src/components/ThemeToggle.tsx`, `src/components/RotatingWord.tsx`, `src/scripts/enhance.ts`
- Modify: `src/components/TopBar.astro`, `src/components/Hero.astro`, `src/layouts/Base.astro`

**Interfaces:**
- Consumes: markup from Task 4 (`#theme-toggle` replaced by the island, `#rot` replaced by the island).
- Produces: `<ThemeToggle client:load />` rendering the same button; `<RotatingWord client:visible words={string[]} />` rendering `<span id="rot">`; `enhance.ts` default-exports nothing and on load wires `.reveal` observers and `.card` pointer glow.

- [ ] **Step 1: ThemeToggle**

`src/components/ThemeToggle.tsx`:
```tsx
import { useCallback } from 'react';

export default function ThemeToggle() {
  const toggle = useCallback(() => {
    const root = document.documentElement;
    const explicit = root.getAttribute('data-theme');
    const dark = explicit === 'dark' || (!explicit && matchMedia('(prefers-color-scheme: dark)').matches);
    const next = dark ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch {}
  }, []);

  return (
    <button id="theme-toggle" type="button" aria-label="Toggle light and dark theme" onClick={toggle}>
      light / dark
    </button>
  );
}
```
In `TopBar.astro` import it and render `<ThemeToggle client:load />` in place of the static button; the CSS selector `#toggle` from the mockup is `#theme-toggle` in `global.css` (rename if it was ported as `#toggle`).

- [ ] **Step 2: RotatingWord**

`src/components/RotatingWord.tsx`:
```tsx
import { useEffect, useState } from 'react';

export default function RotatingWord({ words }: { words: string[] }) {
  const [i, setI] = useState(0);
  const [out, setOut] = useState(false);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      setOut(true);
      setTimeout(() => { setI((n) => (n + 1) % words.length); setOut(false); }, 260);
    }, 2600);
    return () => clearInterval(id);
  }, [words.length]);

  return <span id="rot" className={out ? 'out' : ''}>{words[i]}</span>;
}
```
In `Hero.astro` render `<RotatingWord client:visible words={['AI agents', 'evals and guardrails', 'forecasting tools', 'data pipelines']} />` in place of the static `<span id="rot">`. The server-rendered HTML contains `AI agents`, so reduced-motion and no-JS show the first word.

- [ ] **Step 3: Reveal and spotlight script**

`src/scripts/enhance.ts`:
```ts
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelectorAll<HTMLElement>('.reveal').forEach((el) => {
  if (reduce || !('IntersectionObserver' in window)) el.classList.add('in');
});

if (!reduce && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
    { threshold: 0.12 },
  );
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
}

document.querySelectorAll<HTMLElement>('.card').forEach((card) => {
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
});
```
In `Base.astro` add before `</body>`: `<script>import '../scripts/enhance.ts';</script>` (Astro bundles it).

- [ ] **Step 4: Verify**

```bash
npm run build
ls dist/_astro | grep -E '\.js$' | head
grep -c 'astro-island' dist/index.html   # expect at least 2
```
Then in Chrome on the preview: toggle switches themes and survives reload; subtitle word rotates; with DevTools "Emulate prefers-reduced-motion: reduce" it stays on "AI agents", the name appears without blur, and nothing animates.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: theme toggle, rotating word, reveal and spotlight enhancements

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Detail pages

**Files:**
- Create: `src/layouts/Detail.astro`, `src/pages/work/[slug].astro`, `src/pages/projects/[slug].astro`

**Interfaces:**
- Consumes: `cleared`, `neighbors` from `src/lib/content.ts`; `Base.astro`; collections.
- Produces: static routes `/work/<id>/` and `/projects/<id>/` generated only for cleared entries. `Detail.astro` props: `{ kicker: string; title: string; lede: string; meta: { label: string; value: string }[]; links: { label: string; href: string; primary?: boolean }[]; prev: { href: string; label: string } | null; next: { href: string; label: string } | null; backHref: string; backLabel: string }` with the Markdown body in the default slot.

- [ ] **Step 1: Detail layout**

`src/layouts/Detail.astro` wraps `Base` and renders, in order: top bar row (back link `← {backLabel}` to `backHref`, and `<ThemeToggle client:load />`), header block (kicker, `<h1>`, lede, `<dl class="meta">` from `meta`, `.links` from `links`), `<div class="shot">` placeholder only when the page provides no screenshot, the slot inside `<div class="prose">`, and a `<nav class="next">` with prev and next links. Markup and classes follow `design-reference/project.html`. Add `.prose h2` and `.prose p, ul, ol, code, pre` rules to `global.css` so Markdown renders in the same style as the mockup sections (`h2` uses the existing mono hairline heading style).

- [ ] **Step 2: Routes**

`src/pages/projects/[slug].astro`:
```astro
---
import { getCollection, render } from 'astro:content';
import Detail from '../../layouts/Detail.astro';
import { cleared, neighbors } from '../../lib/content';

export async function getStaticPaths() {
  const all = cleared(await getCollection('projects'));
  return all.map((entry) => {
    const { prev, next } = neighbors(all, entry.id);
    return { params: { slug: entry.id }, props: { entry, prev, next } };
  });
}

const { entry, prev, next } = Astro.props;
const { Content } = await render(entry);
const d = entry.data;
---
<Detail
  kicker={d.kicker}
  title={d.name}
  lede={d.lede}
  meta={[{ label: 'Role', value: d.meta.role }, { label: 'Status', value: d.meta.status }, { label: 'Stack', value: d.meta.stack }]}
  links={d.repoUrl ? [{ label: 'View on GitHub ↗', href: d.repoUrl, primary: true }] : []}
  prev={prev ? { href: `/projects/${prev.id}`, label: prev.data.name } : null}
  next={next ? { href: `/projects/${next.id}`, label: next.data.name } : null}
  backHref="/#projects"
  backLabel="all projects"
>
  <Content />
</Detail>
```
`src/pages/work/[slug].astro` follows the same pattern over the `work` collection: kicker `Role · {project}`, title `{company}`, lede `{title}, {dates}`, meta Role/Dates/Stack (stack joined with `, `), no repo link, `backHref="/#experience"`, `backLabel="experience"`, prev/next labels use `company`.

- [ ] **Step 2b: Hide nothing when nothing is cleared**

`getStaticPaths` returning `[]` must not fail the build; confirm by running `npm run build` now (all entries are `cleared: false`).

- [ ] **Step 3: Verify with a temporary cleared entry**

```bash
sed -i '' 's/^cleared: false/cleared: true/' src/content/projects/ai-swing-trader.md
npm run build
test -f dist/projects/ai-swing-trader/index.html && echo "page generated"
grep -c 'href="/projects/ai-swing-trader' dist/index.html   # expect 1
sed -i '' 's/^cleared: true/cleared: false/' src/content/projects/ai-swing-trader.md
npm run build
test ! -d dist/projects/ai-swing-trader && echo "page gone when not cleared"
```
Expected: the page and the home card link exist when cleared, and both disappear when reverted. (The `[to confirm]` markers in the body make the check script from Task 7 fail the first build once it exists; at this point the stub script only logs.) Confirm `git diff --stat` shows the seed file unchanged at the end.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/Detail.astro src/pages src/styles
git commit -m "feat: gated detail pages for roles and projects

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Build safety checks (TDD)

**Files:**
- Create: `scripts/lib/checks.mjs`, `scripts/lib/checks.test.mjs`
- Modify: `scripts/check-build.mjs` (replace stub)
- Modify: `docs/superpowers/specs/2026-11-05-portfolio-design.md` section 5 and section 9 (leak-check wording)

**Interfaces:**
- Produces (`scripts/lib/checks.mjs`, all synchronous, each returns an array of human-readable problem strings, empty when clean):
  - `listHtml(dir: string): string[]` (absolute paths of every `.html` under `dir`)
  - `findMarkers(files: string[]): string[]` (files containing `[to confirm]`)
  - `findBrokenLinks(distDir: string, files: string[]): string[]` (internal `href="/..."` and `src="/..."` that resolve to no file)
  - `findMissingAlt(files: string[]): string[]` (`<img` without an `alt` attribute)
  - `findLeaks(distDir: string, files: string[], entries: { collection: string; id: string; cleared: boolean; body: string }[]): string[]` (for non-cleared entries: a built route `/work/<id>` or `/projects/<id>`, an `href` to it in any file, or the first 60 characters of the Markdown body, if the body is longer than 60 characters, appearing in any file)
  - `readEntries(contentDir: string): { collection; id; cleared; body }[]` (reads `work/*.md` and `projects/*.md` with `gray-matter`)
- `scripts/check-build.mjs` runs all of them against `dist/` and `src/content/`, prints each problem, and exits with code 1 if any.

- [ ] **Step 1: Write the failing tests**

`scripts/lib/checks.test.mjs`:
```js
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { listHtml, findMarkers, findBrokenLinks, findMissingAlt, findLeaks } from './checks.mjs';

let dir;
const write = (rel, content) => {
  const p = path.join(dir, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
};

beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dist-')); });

describe('listHtml', () => {
  it('finds nested html files only', () => {
    write('index.html', '<p>a</p>'); write('a/b/index.html', '<p>b</p>'); write('x.css', '');
    expect(listHtml(dir).map((f) => path.relative(dir, f)).sort()).toEqual(['a/b/index.html', 'index.html']);
  });
});

describe('findMarkers', () => {
  it('flags files containing [to confirm]', () => {
    write('index.html', '<p>ok</p>'); write('p/index.html', '<p>[to confirm]</p>');
    const problems = findMarkers(listHtml(dir));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('p/index.html');
  });
  it('returns nothing when clean', () => { write('index.html', '<p>ok</p>'); expect(findMarkers(listHtml(dir))).toEqual([]); });
});

describe('findBrokenLinks', () => {
  it('flags internal links with no target', () => {
    write('index.html', '<a href="/work/tesla">t</a><img src="/logos/x.png" alt="x"><a href="https://e.com">e</a>');
    expect(findBrokenLinks(dir, listHtml(dir))).toHaveLength(2);
  });
  it('accepts directory index and asset targets, ignores anchors and hashes', () => {
    write('work/tesla/index.html', '<p>t</p>'); write('logos/x.png', 'x');
    write('index.html', '<a href="/work/tesla/">t</a><a href="/work/tesla#a">t</a><img src="/logos/x.png" alt="x"><a href="/#projects">p</a>');
    expect(findBrokenLinks(dir, listHtml(dir))).toEqual([]);
  });
});

describe('findMissingAlt', () => {
  it('flags img without alt, allows empty alt', () => {
    write('a.html', '<img src="/a.png">'); write('b.html', '<img src="/b.png" alt="">');
    const problems = findMissingAlt(listHtml(dir));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('a.html');
  });
});

describe('findLeaks', () => {
  const body = 'This is a confidential architecture description that must never be published anywhere.';
  const entries = [{ collection: 'work', id: 'tesla', cleared: false, body }];
  it('flags a built route, a link to it, or body text', () => {
    write('work/tesla/index.html', '<p>x</p>');
    write('index.html', `<a href="/work/tesla">t</a><p>${body}</p>`);
    expect(findLeaks(dir, listHtml(dir), entries).length).toBeGreaterThanOrEqual(3);
  });
  it('ignores cleared entries and allows listed titles', () => {
    write('index.html', '<p>Tesla</p>');
    expect(findLeaks(dir, listHtml(dir), entries)).toEqual([]);
    write('work/tesla/index.html', '<p>x</p>');
    expect(findLeaks(dir, listHtml(dir), [{ ...entries[0], cleared: true }])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run scripts/lib/checks.test.mjs`
Expected: FAIL (module `./checks.mjs` not found).

- [ ] **Step 3: Implement**

`scripts/lib/checks.mjs`:
```js
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export function listHtml(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listHtml(p));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const read = (f) => fs.readFileSync(f, 'utf8');

export const findMarkers = (files) =>
  files.filter((f) => read(f).includes('[to confirm]')).map((f) => `marker "[to confirm]" in ${f}`);

export function findBrokenLinks(distDir, files) {
  const problems = [];
  const re = /\b(?:href|src)="(\/[^"#?]*)/g;
  for (const f of files) {
    for (const m of read(f).matchAll(re)) {
      const target = decodeURIComponent(m[1]);
      if (target.startsWith('//')) continue;
      const base = path.join(distDir, target);
      const ok = fs.existsSync(base) && (fs.statSync(base).isFile() || fs.existsSync(path.join(base, 'index.html')));
      if (!ok && !fs.existsSync(base + '.html')) problems.push(`broken link ${m[1]} in ${f}`);
    }
  }
  return problems;
}

export const findMissingAlt = (files) =>
  files.filter((f) => /<img(?![^>]*\balt=)[^>]*>/i.test(read(f))).map((f) => `<img> without alt in ${f}`);

export function findLeaks(distDir, files, entries) {
  const problems = [];
  const html = files.map((f) => [f, read(f)]);
  for (const e of entries.filter((x) => !x.cleared)) {
    const route = `/${e.collection}/${e.id}`;
    if (fs.existsSync(path.join(distDir, e.collection, e.id))) problems.push(`non-cleared route built: ${route}`);
    const needle = e.body.trim().slice(0, 60);
    for (const [f, text] of html) {
      if (text.includes(`href="${route}`)) problems.push(`link to non-cleared ${route} in ${f}`);
      if (e.body.trim().length > 60 && text.includes(needle)) problems.push(`body of non-cleared ${route} found in ${f}`);
    }
  }
  return problems;
}

export function readEntries(contentDir) {
  const entries = [];
  for (const collection of ['work', 'projects']) {
    const dir = path.join(contentDir, collection);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.md'))) {
      const { data, content } = matter(fs.readFileSync(path.join(dir, name), 'utf8'));
      entries.push({ collection, id: name.replace(/\.md$/, ''), cleared: data.cleared === true, body: content });
    }
  }
  return entries;
}
```

`scripts/check-build.mjs`:
```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listHtml, findMarkers, findBrokenLinks, findMissingAlt, findLeaks, readEntries } from './lib/checks.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
if (!fs.existsSync(dist)) { console.error('check-build: dist/ not found; run astro build first'); process.exit(1); }

const files = listHtml(dist);
const entries = readEntries(path.join(root, 'src', 'content'));
const problems = [
  ...findMarkers(files),
  ...findMissingAlt(files),
  ...findBrokenLinks(dist, files),
  ...findLeaks(dist, files, entries),
];

if (problems.length) {
  console.error(`check-build: ${problems.length} problem(s)`);
  for (const p of problems) console.error(' - ' + p);
  process.exit(1);
}
console.log(`check-build: ok (${files.length} pages, ${entries.length} entries)`);
```

Update the spec: in section 5 replace the sentence "the build fails if ... any `cleared: false` entry's title or slug appears in the built HTML" with "the build fails if a `cleared: false` entry has a built route, is linked from any page, or has its body text present in any built page (titles may appear because `listed` entries are shown on the home page)"; make the matching change in section 9 item 2.

- [ ] **Step 4: Run tests and the real build**

```bash
npx vitest run
npm run build
```
Expected: all vitest tests PASS; `npm run build` ends with `check-build: ok (1 pages, 7 entries)`.

Then prove the gate works: set `cleared: true` on `src/content/projects/ai-swing-trader.md` (its body contains `[to confirm]`), run `npm run build`; expected: exit code 1 with `marker "[to confirm]"` listed. Revert the flag.

- [ ] **Step 5: Commit**

```bash
git add scripts docs/superpowers/specs/2026-11-05-portfolio-design.md
git commit -m "feat: post-build safety checks (markers, leaks, links, alt)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: SEO, sitemap, and Open Graph image

**Files:**
- Create: `public/og.png`
- Modify: `astro.config.mjs` (sitemap filter), `src/pages/index.astro` (title and description)

**Interfaces:**
- Consumes: `Base.astro` props `ogImage`, `description`.
- Produces: a 1200x630 `public/og.png`; sitemap that lists only built pages.

- [ ] **Step 1: OG image**

Generate `public/og.png` (1200x630) from an HTML file using headless Chrome:
```bash
cat > /tmp/og.html <<'EOF'
<!doctype html><meta charset="utf-8"><body style="margin:0;width:1200px;height:630px;background:#1d2128;color:#dce2ea;font:700 88px/1.05 Inter,system-ui,sans-serif;display:flex;flex-direction:column;justify-content:center;padding:0 80px;box-sizing:border-box">
<div>Andrian Than<span style="color:#b794ff">.</span></div>
<div style="font:500 36px/1.3 Inter,system-ui,sans-serif;color:#99a3b1;margin-top:24px">Software engineer building AI agents that people can trust.</div></body>
EOF
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --screenshot=public/og.png --window-size=1200,630 --hide-scrollbars file:///tmp/og.html
```
Confirm the file is 1200x630 with `sips -g pixelWidth -g pixelHeight public/og.png`.

- [ ] **Step 2: Home metadata**

In `index.astro`, pass `title="Andrian Than · Software Engineer"` and `description="Andrian Than is a computer science student at San Jose State building LLM agents with numeric grounding, evals, and guardrails."`.

- [ ] **Step 3: Verify**

```bash
npm run build
grep -o 'og:image" content="[^"]*"' dist/index.html
ls dist | grep sitemap
grep -c '<loc>' dist/sitemap-0.xml   # expect 1 (home only)
```
Expected: og:image URL ends in `/og.png`, sitemap lists only the home page.

- [ ] **Step 4: Commit**

```bash
git add public/og.png astro.config.mjs src/pages/index.astro
git commit -m "feat: Open Graph image and home metadata

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Draft project pages from the repositories (owner review required)

**Files:**
- Modify: `src/content/projects/ai-swing-trader.md`, `src/content/projects/claude-token-saver.md` (bodies only; `cleared` stays `false`)
- Create (gitignored): `drafts/QUESTIONS.md`

**Interfaces:**
- Consumes: local repos `/Users/andrianthan/Desktop/projects/ai-swing-trader` and `/Users/andrianthan/Desktop/projects/claude-token-saver`.
- Produces: bodies with the five spec headings (Problem, Architecture, Key decisions, Backend and data, Results and lessons) filled only with facts read from the repos (README, docs, config, code structure, git log), plus a `drafts/QUESTIONS.md` listing every fact that could not be verified. No metric may appear unless it is found in the repo or the resume.

- [ ] **Step 1: Read the repos**

Read README, docs, top-level layout, key modules, config files, tests, and `git log --oneline | head -40` in each repo. Do not read `.env*`, databases, logs, journals, or any data directory.

- [ ] **Step 2: Write bodies**

For each project write the five sections in the owner's voice (first person, conversational, concise, no buzzwords). Architecture sections use this exact HTML flow structure (adapt the nodes to what the repo actually does; mark the guard step with `gate`):
```html
<div class="flow">
  <div class="node"><b>Step name</b><span>one line</span></div>
  <div class="node gate"><b>Guard step</b><span>one line</span></div>
</div>
```
Key decisions use this structure, three to four per project, each grounded in something visible in the repo:
```html
<article class="dec">
  <h3>Decision title</h3>
  <dl><dt>Decision</dt><dd>...</dd><dt>Why</dt><dd>...</dd><dt>Trade-off</dt><dd>...</dd></dl>
</article>
```
Anything the repo does not show goes into `drafts/QUESTIONS.md` as a question for the owner and is written in the page as `[to confirm]` (the build check keeps the page from shipping while a marker remains).

- [ ] **Step 3: Verify**

```bash
git diff --stat
grep -c '\[to confirm\]' src/content/projects/ai-swing-trader.md src/content/projects/claude-token-saver.md
grep -n '^cleared:' src/content/projects/*.md
```
Expected: `cleared: false` still on all three project files; marker counts match the number of open questions in `drafts/QUESTIONS.md`.

- [ ] **Step 4: Commit**

```bash
git add src/content/projects
git commit -m "docs: draft project write-ups from repositories (not cleared)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

STOP: report the drafts and the open questions to the owner. The owner answers the questions, edits the text, and flips `cleared: true` per page. AdvisorAI and the four role pages stay `cleared: false` until the owner writes or approves them.

---

### Task 10: Quality pass (Lighthouse, widths, themes, reduced motion)

**Files:**
- Modify: whichever files fail a check (CSS or components)

**Interfaces:**
- Consumes: the built site via `npm run preview`.
- Produces: recorded results in the commit message and fixes for anything below target.

Targets: Lighthouse performance >= 95, accessibility >= 95, best practices >= 95, SEO >= 95 on the home page (mobile profile); no horizontal scroll at 320, 375, 414, 768px; both themes legible; reduced-motion verified.

- [ ] **Step 1: Run Lighthouse**

```bash
npm run build && (npm run preview -- --port 4321 &) && sleep 3
npx lighthouse http://localhost:4321/ --only-categories=performance,accessibility,best-practices,seo --chrome-flags="--headless" --output=json --output-path=/tmp/lh-home.json --quiet
node -e "const r=require('/tmp/lh-home.json');for(const [k,v] of Object.entries(r.categories))console.log(k,Math.round(v.score*100))"
```
Expected: each score at or above 95. Fix any failure at its cause (for example contrast tokens, missing labels, layout shift from image sizes) and re-run.

- [ ] **Step 2: Widths and themes**

In Chrome, for widths 320, 375, 414, 768 and for light and dark: confirm no horizontal scrollbar (`document.documentElement.scrollWidth <= window.innerWidth` via the console), no two-line buttons or links, no overlapping text, logos visible on both themes.

- [ ] **Step 3: Reduced motion and no-JS**

With `prefers-reduced-motion: reduce` emulated: name has no blur-in, availability dot does not pulse, subtitle stays on "AI agents", sections are visible without scrolling in. With JavaScript disabled: all content is visible and readable (reveal blocks must not stay hidden; they are hidden only under `.js .reveal`).

- [ ] **Step 4: Commit fixes**

```bash
git add -A ':!design-reference'
git commit -m "fix: quality pass results (lighthouse, widths, reduced motion)

Lighthouse (mobile, home): perf <n>, a11y <n>, best-practices <n>, seo <n>

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
Replace `<n>` with the measured scores. If nothing needed fixing, skip the commit.

---

### Task 11: Secrets scan, then public repo and Vercel deploy (OWNER APPROVAL GATES)

**Files:**
- None created in the repo (deployment config lives on GitHub and Vercel).

**Interfaces:**
- Consumes: clean `main` branch, `gh` authenticated, `vercel` CLI logged in as `andrianthan`.
- Produces: a public GitHub repo and a production URL.

- [ ] **Step 1: Secrets scan (safe, local)**

```bash
brew list gitleaks >/dev/null 2>&1 || brew install gitleaks
gitleaks detect --source . --log-opts="--all" --no-banner
git status --short
git ls-files | grep -E '(^|/)(\.env|design-reference|drafts)' || echo "no sensitive paths tracked"
```
Expected: gitleaks reports no leaks, status is clean, and the last command prints `no sensitive paths tracked`. If anything is found, stop and report; do not proceed.

- [ ] **Step 2: Pre-push content review (owner)**

Print what would be public and ask the owner to confirm: the list of cleared pages (`grep -l '^cleared: true' src/content/*/*.md`), `public/resume.pdf` is the intended version, and `git log --stat` shows no unexpected files. Wait for an explicit "yes".

- [ ] **Step 3: Create the public repo (needs explicit owner approval)**

Only after the owner says yes to publishing publicly:
```bash
gh repo create andrianthan/portfolio --public --source=. --remote=origin --push
```
Use the repo name the owner chooses; default `portfolio`. Confirm with `gh repo view --json url,visibility`.

- [ ] **Step 4: Deploy to Vercel (needs explicit owner approval)**

Only after the owner approves the project name (default `andrian-than`):
```bash
npx vercel link --yes --project andrian-than
npx vercel git connect
npx vercel deploy --prod
```
If the name is taken, ask the owner for another and repeat. Enable Vercel Analytics for the project in the Vercel dashboard (or `npx vercel` project settings) and confirm production branch is `main`.

- [ ] **Step 5: Verify the live site**

On the production URL: home loads; light and dark toggle works; `/resume.pdf` downloads; a link preview (Open Graph) renders using `https://www.opengraph.xyz` or similar; mobile width looks right; `/work/tesla` returns 404 while Tesla is not cleared; `sitemap-index.xml` lists only cleared pages. Report the URL to the owner.

- [ ] **Step 6: Record**

```bash
git add -A ':!design-reference'
git commit --allow-empty -m "chore: deployed to production

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
git push
```

---

## Self-Review (done)

- **Spec coverage:** sections 1-2 (scope) Tasks 4-6; section 3 (IA) Tasks 4 and 6; section 4 (content model) Task 2; section 5 (cleared gate) Tasks 2, 6, 7 (with the leak-check wording fixed in the spec); section 6 (visual design) Tasks 3-5; section 7 (assets) Tasks 4 and 8; section 8 (architecture) Tasks 1-6; section 9 (build checks) Tasks 7 and 10; section 10 (deployment) Task 11; section 11 (content responsibilities) Task 9 and its STOP; section 12 (risks) covered by the gates.
- **Placeholder scan:** the only deliberate markers are `[to confirm]` in non-cleared seed bodies, which the build check prevents from shipping; `<n>` in Task 10's commit message is filled from measured scores.
- **Type consistency:** `listed`, `cleared`, `neighbors`, `renderBold` signatures match between Task 2 definitions and their uses in Tasks 4 and 6; `findLeaks` entry shape matches `readEntries` output; `Detail.astro` props match both route files.
