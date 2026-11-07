# Site redesign completion: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the chat-first redesign (spec `docs/superpowers/specs/2026-11-06-redesign-design.md`) so every acceptance rule holds: real glass chat card, AA contrast, gradient section titles, open rows, stats that fit, an accessible graph and top bar, and the prompt above the fold on a phone.

**Architecture:** The redesign is already implemented on `feat/redesign` (commit `7f31087`): new tokens, a centered chat-first hero, open sections, and a "How this site answers" section. This plan only closes the measured gaps. Everything is CSS and small markup changes — no engine, no dependency, no new component.

**Tech Stack:** Astro 7 static, React 19 islands, plain CSS with tokens, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-06-redesign-design.md` (binding) · `docs/superpowers/specs/2026-11-06-intro-terminal-design.md` (the chat card) · `docs/superpowers/specs/2026-11-05-portfolio-design.md` (base rules).

**Assessment:** `.superpowers/sdd/2026-11-05-agentic-terminal/redesign-assessment.md` — Lighthouse mobile on `/` is 100 / 100 / 96 / 100 with CLS 0.001; 8 of 10 checks pass; the failures below are the remaining work.

## Global Constraints

- Working directory `/Users/andrianthan/Desktop/projects/portfolio`, branch `feat/redesign`. Never push, merge to `main`, or deploy without Andrian's explicit approval in chat.
- Lighthouse mobile on `/`: **every category ≥ 95**. No horizontal scroll at 320, 375, 414, 768px. Reduced motion: no animation, instant scroll. No-JS: topic links and nav work, **the prompt is hidden**. Contrast AA for text in both themes. `npm test` green, `npm run build` ends with `check-build: ok`.
- Colors only through the `--color-*` / `--grad-*` tokens in `src/styles/tokens.css`. Never hard-code a color in `global.css`.
- The agent engine, routing, thinking animation, quiet refusals, `/terminal` page and its no-JS fallback, the content gate, the build script, `vercel.json` and the dependencies are **unchanged**.
- Honesty: no invented numbers; the site's content is the agent's only source; the project rows may only promise a page that exists.
- Never write the literal to-confirm marker into any source file.
- Commit message ends with the trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`, authored as `Andrian Than <andrian.than.api@gmail.com>`. git 2.53 rejects `-c` after `-m`:
  `git -c user.name="Andrian Than" -c user.email="andrian.than.api@gmail.com" commit -m "<msg>" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"`

## Rulings (already decided — do not re-litigate)

- **The project rows keep their arrow only when the row is a real link.** All three projects are `cleared: false`, so they have no page; an arrow on a non-link row would promise a page that 404s. The spec's "arrow" describes the intended look once those pages exist.
- **The stats are four across from 600px and 2x2 below.** The published values (`32%`, `$30k+`, `200+`, `1st of 9`) do not fit four across below ~600px without becoming unreadable, and no-horizontal-scroll is a hard acceptance rule. The spec's "one centered row" describes the desktop composition.

---

### Task 1: The chat card reads as glass, meets AA, and fits a phone

**Files:**
- Modify: `src/styles/tokens.css` (the light `--color-glass` value)
- Modify: `src/styles/global.css` (`.chat`, the placeholder, a new small-screen block)

**Interfaces:**
- Consumes: the existing `--color-glass` token (light `--color-glass` at `tokens.css:7`, dark at `:15`).
- Produces: a translucent, blurred card whose text and placeholder both pass AA in both themes, with the prompt above 667px at 375px wide.

- [ ] **Step 1: Make the card actually glass**

In `src/styles/tokens.css`, change the light `--color-glass` from `rgba(255, 255, 255, .7)` to `rgba(255, 255, 255, .4)` (a 70% white veil over a near-white page composites to 98.8% opaque and reads as a plain panel, not glass). Leave the dark value alone.

In `src/styles/global.css`, add to the `.chat` rule (line 46):

```css
  backdrop-filter: blur(18px) saturate(1.35); -webkit-backdrop-filter: blur(18px) saturate(1.35);
```

- [ ] **Step 2: Fix the placeholder contrast**

`.intro-out:empty::before` (line 71) sets `color: var(--color-muted); opacity: .7`, which measures 3.28:1 in light and 3.91:1 in dark — below AA. The muted colour on its own is about 6.2:1, so drop the opacity:

```css
.intro-out:empty::before { content: "Answers show up here."; color: var(--color-muted); }
```

- [ ] **Step 3: Fit the first screen on a phone**

Add a new media block at the end of `src/styles/global.css` (before the reduced-motion block):

```css
@media (max-width: 480px) {
  .avatar { width: 72px; height: 72px; margin-bottom: 10px; }
  h1 { font-size: clamp(32px, 9vw, 40px); }
  .status { margin-bottom: var(--space-md); }
  .chat { padding: 14px 14px 12px; }
  .intro-out { min-height: 84px; max-height: 26svh; }
  .topics { margin: 10px 0 10px; }
}
```

- [ ] **Step 4: Measure it**

Build (`npm run build`), serve with `npx astro preview --port 4321`, and in headless Chrome at 375x667 and 414x896 measure the chat input's bounding box: its bottom edge must be at or above the viewport height (667 / 896). Report the numbers. If the prompt is still below the fold, tighten the values above (the avatar, the h1 clamp and `.intro-out` min-height are the levers) and re-measure.

Also measure the placeholder's rendered colour against the card's composited background in both themes and confirm the ratio is ≥ 4.5:1.

- [ ] **Step 5: Commit**

```bash
git -c user.name="Andrian Than" -c user.email="andrian.than.api@gmail.com" commit -m "feat: make the chat card glass, meet AA and fit a phone screen" \
  -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Gradient titles, open rows, the stats row, the dates

**Files:**
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `--grad-a` / `--grad-b` (already used by `h1 .grad` at line 41 and `.stat b` at line 86).
- Produces: gradient section titles, project rows with no hairlines, a stats grid that fits, and mono dates at 13px.

- [ ] **Step 1: Gradient section titles**

`.sh h2` (line 92) sets a solid `color: var(--color-fg)`. Apply the same gradient technique as `h1 .grad`:

```css
.sh h2 { display: block; font: 700 clamp(32px, 5vw, 48px)/1.1 var(--font-sans); letter-spacing: -0.035em; text-transform: none; margin: 0;
  background: linear-gradient(90deg, var(--grad-a), var(--grad-b)); -webkit-background-clip: text; background-clip: text; color: transparent; }
```

- [ ] **Step 2: Remove the project-row hairlines**

The spec wants open rows, not hairline-bordered grids. `.prow` (line 123) sets `border-top: 1px solid var(--color-rule)` and `.prow:last-child` (line 124) sets a bottom border. Remove both and let the spacing carry the separation: change `.prow`'s padding from `24px 40px 24px 0` to `28px 40px 28px 0`.

- [ ] **Step 3: The stats row**

Move the stats rule out of the `max-width: 720px` block (line 216) into its own breakpoint so the row is four across from 600px:

```css
@media (max-width: 599px) {
  .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
```

and delete the `.stats` line from the 720px block.

- [ ] **Step 4: The dates are mono 13px**

`.dates` (line 111) sets `font: 400 13px var(--font-mono)`, but `.job p` (line 112) sets `font-size: 16px` and wins on specificity, so the dates render at 16px. Raise the dates' specificity:

```css
.job p.dates { font: 400 13px var(--font-mono); color: var(--color-muted); margin: 3px 0 10px; }
```

(replacing the `.dates` rule).

- [ ] **Step 5: Verify and commit**

Run `npm test` and `npm run build` (must end with `check-build: ok`). In headless Chrome confirm at 320, 375, 414, 600, 768 and 1440px that: the four stats sit on one row from 600px up, the section titles compute a `background-image` with a gradient, the project rows have no border, and the dates compute 13px. Report the measurements.

```bash
git -c user.name="Andrian Than" -c user.email="andrian.than.api@gmail.com" commit -m "feat: gradient section titles, open project rows, a stats row that fits" \
  -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Accessibility fixes

**Files:**
- Modify: `src/components/HeroGraph.tsx` (the SVG's role)
- Modify: `src/components/HeroGraph.test.tsx` (the assertion that pins the role)
- Modify: `src/components/TopBar.astro` (a landmark)
- Modify: `src/styles/global.css` (the nav hover)

**Interfaces:**
- Consumes: the graph island's props and the top bar's markup.
- Produces: no `nested-interactive` violation, no `region` violation, and an underlined nav hover.

- [ ] **Step 1: The graph SVG is not an image with links inside it**

`src/components/HeroGraph.tsx` gives the `<svg>` `role="img"`, which makes the whole subtree presentational: axe reports `nested-interactive` (serious, WCAG 4.1.2) because the seven node `<a>` elements are interactive inside an image role. Change the SVG's role to `group` and keep `aria-labelledby="hg-title hg-desc"` with the `<title>` and `<desc>`, so the SVG is a labelled group and its links stay exposed.

Update `src/components/HeroGraph.test.tsx`, which asserts the old role, to assert the new one. The test must still assert the `<title>`, the `<desc>` and `aria-labelledby`.

- [ ] **Step 2: The top bar is a landmark**

axe reports `region` on the Resume link: the top bar is a `<div class="bar">`, so its links sit outside any landmark. Change the wrapper in `src/components/TopBar.astro` from `<div class="bar">` to `<header class="bar">` (and the closing tag). A `<header>` that is not inside an `article`, `section`, `aside` or `nav` is the `banner` landmark, and the bar's contents then belong to it. Do not change the links, their order, the Resume button or the theme toggle.

- [ ] **Step 3: The nav underlines on hover**

The spec wants plain text links with an underline on hover. `.bar a:hover` (line 22) sets `text-decoration: none` and `.bar-nav a:hover` (line 26) sets a border colour instead. Change the nav hover to an underline:

```css
.bar-nav a:hover { color: var(--color-fg); text-decoration: underline; text-underline-offset: 4px; }
```

and remove the `border-bottom: 1px solid transparent` / `border-color` hover pair (lines 25-26) so no underline-width box is reserved.

- [ ] **Step 4: Verify and commit**

Run `npm test` and `npm run build` (must end with `check-build: ok`). Then, with the preview server running, run axe against `/` (the `axe-core` package is not installed — use Lighthouse's own accessibility audit and a manual check instead: confirm the SVG computes `role=group` and that each node `<a>` is still focusable and activatable by keyboard; confirm the top bar is a `<header>` landmark containing the Resume link; confirm the nav links underline on hover).

Report the before/after for each of the three fixes.

```bash
git -c user.name="Andrian Than" -c user.email="andrian.than.api@gmail.com" commit -m "fix: expose the graph links, give the top bar a landmark, underline the nav on hover" \
  -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Final verification of the redesign

**Files:** none (verification only).

**Interfaces:**
- Consumes: everything from Tasks 1-3.
- Produces: the numbers Andrian needs to decide whether to merge.

- [ ] **Step 1: Tests and build**

Run `npm test` (expect 290 passing) and `npm run build` (must end with `check-build: ok`).

- [ ] **Step 2: Lighthouse mobile on `/`, three runs**

```bash
npx lighthouse http://localhost:4321/ --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=/tmp/lh.json --quiet --chrome-flags="--headless=new"
```

Report all four scores per run and the CLS/LCP/TBT. **Every category must be ≥ 95 in every run.** (The best-practices 96 is the local `/_vercel/insights/script.js` 404 and is expected.)

- [ ] **Step 3: No horizontal scroll**

At 320, 375, 414 and 768px, report `document.documentElement.scrollWidth` vs `clientWidth` for `/` and `/terminal`, and name any overflowing element.

- [ ] **Step 4: Reduced motion**

With `prefers-reduced-motion: reduce` emulated: no animation runs (the hero blur-in, the chat card's answer fade, the thinking dots, the graph's pointer reaction) and scrolling is instant.

- [ ] **Step 5: No JavaScript**

With JS off: the topic links and the nav links still work as anchors, the chat input is **hidden** (the `.js` class is what reveals it), and the rest of the page reads correctly.

- [ ] **Step 6: Contrast AA in both themes**

Compute the contrast ratio for every visible text colour against its background in both themes — at minimum: `--color-fg`, `--color-muted`, `--color-accent`, the gradient text, the chat card's text, and the chat card's placeholder. Report every pair and flag anything below 4.5:1 for normal text.

- [ ] **Step 7: The agent still behaves**

In the browser: type `what did you do at tesla` into the hero chat card and report the answer and its trace lines; type `what is your salary` and confirm the honest refusal; confirm no number appears in an answer that is not on the site.

- [ ] **Step 8: Report**

Report every number to Andrian and stop. Do not push, merge or deploy.
