# Sticky table of contents on the multi-project detail pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "Projects on this page" table of contents stay with the reader while they scroll the page, so they can jump to any project at any time.

**Architecture:** The TOC is a `<nav class="toc">` rendered into the detail layout's `toc` slot (`src/pages/work/[slug].astro:63-75`), styled by `src/styles/projects.css`. Making it follow the reader is a CSS-only change: `position: sticky` on the TOC at desktop widths, plus a `scroll-margin-top` on the project sections so an anchor jump is not hidden behind the stuck list. No JavaScript, no new component, no dependency.

**Tech Stack:** Astro 7 static, plain CSS with tokens.

**Spec:** Andrian's request (2026-11-07): "currently the TOC is here at the top but I want to make it so that the TOC is following us as we read down so we can choose accordingly."

## Global Constraints

- Working directory `/Users/andrianthan/Desktop/projects/portfolio`, branch `feat/sticky-toc` (create it from `main`; do not work on `main` directly — another session pushes to `main`). Never push `main`, merge to `main`, or deploy without Andrian's explicit approval in chat.
- Colors only through the `--color-*` tokens. No hard-coded colors. No new dependencies. No JavaScript.
- Lighthouse mobile on every page: every category ≥ 95. No horizontal scroll at 320/375/414/768px. Reduced motion respected. Contrast AA in both themes. `npm test` green, `npm run build` ends with `check-build: ok`.
- The content gate, the agent engine, the build script, `vercel.json` and the dependencies are untouched.
- Commit message ends with the trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`, authored as `Andrian Than <andrian.than.api@gmail.com>`. git 2.53 rejects `-c` after `-m`:
  `git -c user.name="Andrian Than" -c user.email="andrian.than.api@gmail.com" commit -m "<msg>" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"`

## Decisions already made

- **Desktop only.** The TOC is three rows tall (~160px). Stuck on a phone it would eat the screen, so below the breakpoint it stays a normal in-flow list.
- **The project sections need a bigger `scroll-margin-top`.** They currently have `24px` (`src/styles/projects.css`), which assumes nothing is stuck above them. With the TOC stuck, a jump would land with the heading hidden behind it.

---

### Task 1: Make the TOC follow the reader

**Files:**
- Modify: `src/styles/projects.css`
- Modify (only if the measurement demands it): `src/pages/work/[slug].astro`

**Interfaces:**
- Consumes: the existing `.toc`, `.toc-label`, `.toc ol`, `.toc a`, `.toc .n`, `.toc .t`, `.toc .go` rules and the `.project` rule.
- Produces: a TOC that stays visible while the page scrolls on desktop widths, and project headings that are never hidden behind it.

- [ ] **Step 1: Measure before you change anything**

Build (`npm run build`) and serve (`npx astro preview --port 4321`, background it; stop it when done). In headless Chrome (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, drive it over the DevTools protocol with a small Node script) open `/work/hanna` and measure:
- the TOC's rendered height and its position at scroll 0 and after scrolling 1200px;
- whether the TOC is still at its original position after scrolling (i.e. whether `position: sticky` works at all inside this page — `html, body { overflow-x: clip }` can turn the body into a scroll container, which would break sticky, so MEASURE this, do not assume it);
- the `.project` section's current `scroll-margin-top` and what the heading's position is after clicking a TOC link.

Report the numbers.

- [ ] **Step 2: Make the TOC sticky at desktop widths**

In `src/styles/projects.css`, add (do not rewrite the existing rules):

```css
@media (min-width: 900px) {
  .toc {
    position: sticky;
    top: 20px;
    z-index: 5;
    background: var(--color-bg);
    padding-bottom: 10px;
  }
}
```

`background: var(--color-bg)` is required: the list scrolls over the content behind it, so it needs an opaque backdrop of the page's own colour. If the measured TOC height plus `top` would put it off-screen, reduce `top` rather than the content.

- [ ] **Step 3: Stop the stuck list from hiding the headings**

In the same media block, give the project sections enough scroll margin to clear the stuck list:

```css
  .project { scroll-margin-top: 200px; }
```

Use the height you measured in step 1 plus a gap; if the measured TOC is much shorter or taller than 180px, use the measured value plus ~40px.

- [ ] **Step 4: Verify the behaviour**

In headless Chrome on `/work/hanna`:
- scroll to 1200px and confirm the TOC is still visible in the viewport (its bounding box's top is ≥ 0 and its bottom is ≤ the viewport height);
- scroll to the bottom of the page and confirm the TOC has stopped at the end of its container rather than floating over the footer;
- click a TOC link and confirm the target project heading lands BELOW the stuck TOC (the heading's top must be greater than the TOC's bottom);
- repeat at 320px, 375px and 768px wide: the TOC must NOT be stuck (it stays in flow) and there must be no horizontal scroll.

Report every measurement.

- [ ] **Step 5: Run the gates**

Run `npm test` (expect the current suite to pass) and `npm run build` (must end with `check-build: ok`). Then run Lighthouse mobile against `/work/hanna` and report the four category scores and the CLS.

- [ ] **Step 6: Commit**

```bash
git -c user.name="Andrian Than" -c user.email="andrian.than.api@gmail.com" commit -m "feat: keep the project table of contents in view while reading" \
  -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 7: Report**

Write the full report to `.superpowers/sdd/2026-11-07-sticky-toc/task-1-report.md` (the directory is git-ignored; create it): the before and after measurements, the CSS you added, the gates, and anything you could not make work. Then reply with ONLY: Status, the commit SHA and subject, the measurements, the Lighthouse scores, and the report path.
