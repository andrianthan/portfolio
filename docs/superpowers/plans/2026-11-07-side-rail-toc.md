# Side-rail table of contents: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the detail pages' "Projects on this page" index out of the content column and into a fixed rail on the left side of the screen at wide viewports, keeping the current sticky-top list below 1200px.

**Architecture:** The TOC is a `<nav class="toc">` rendered into the detail layout's `toc` slot (`src/pages/work/[slug].astro`) and styled by `src/styles/projects.css`. The rail is a third breakpoint on the same element: at ≥1200px it becomes `position: fixed` in the left gutter (the page's content column is 46rem centred, so the gutter is where the space is), and at 900–1199px the existing sticky-at-top behaviour stays. Pure CSS, one file, no JavaScript.

**Tech Stack:** Astro 7 static, plain CSS with tokens.

**Spec:** `docs/superpowers/specs/2026-11-07-side-rail-toc-design.md` (binding, approved by Andrian on 2026-11-07).

## Global Constraints

- Working directory `/Users/andrianthan/Desktop/projects/portfolio`, branch `feat/side-rail-toc` (create it from `main`; do not work on `main` directly — another session pushes to `main`). Never push `main`, merge to `main`, or deploy without Andrian's explicit approval in chat.
- CSS only. No JavaScript, no component, no dependency. Touch only `src/styles/projects.css`.
- Colors only through the `--color-*` tokens. The rail has no background of its own: nothing scrolls behind it (it lives in the gutter), so the page's glow and dot grid show through.
- Lighthouse mobile on every page: every category ≥ 95. No horizontal scroll at 320/375/414/768px. Reduced motion respected. Contrast AA in both themes. `npm test` green, `npm run build` ends with `check-build: ok`.
- The content gate, the agent engine, the build script, `vercel.json` and the dependencies are untouched.
- Never write the literal to-confirm marker into any source file.
- Commit message ends with the trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`, authored as `Andrian Than <andrian.than.api@gmail.com>`. git 2.53 rejects `-c` after `-m`:
  `git -c user.name="Andrian Than" -c user.email="andrian.than.api@gmail.com" commit -m "<msg>" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"`

## Decisions already made

- **Left rail, not right.** One line to flip.
- **The rail starts below the top bar, not beside it.** The bar is 56rem wide while the content column is 46rem, so the bar reaches 80px further into the gutter on each side; a rail that started at the top of the viewport would cover the bar's back link.
- **The rail takes no space in the column**, so the write-ups start right under the page header instead of ~220px lower.
- **At ≥1200px the project sections go back to a small `scroll-margin-top`**, because the rail is beside the content, not above it.

---

### Task 1: The side rail

**Files:**
- Modify: `src/styles/projects.css`

**Interfaces:**
- Consumes: the existing `.toc`, `.toc a`, `.toc .go`, `.project` rules and the `--toc-*` custom properties already in the file.
- Produces: a fixed left rail at ≥1200px; the existing sticky-top list unchanged at 900–1199px; the existing in-flow list unchanged below 900px.

- [ ] **Step 1: Read the file and measure the "before" state**

Read `src/styles/projects.css` in full. Then build (`npm run build`) and serve (`npx astro preview --port 4321`, background it; stop it when done) and measure in headless Chrome (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, driven over the DevTools protocol with a small Node script) on `/work/hanna` at 1440×900:
- the content column's left edge (`document.querySelector('main.inner').getBoundingClientRect().left`) and the top bar's left edge (`document.querySelector('.bar').getBoundingClientRect().left`);
- the top bar's bottom edge and the "← experience" link's box;
- the TOC's box and the first `.project` heading's document offset.

Report the numbers: the gutter width (viewport minus the column), the bar's overhang into the gutter, the bar's height, and how far below the page header the first project currently starts.

- [ ] **Step 2: Add the rail breakpoint**

Append a new block at the end of `src/styles/projects.css` (after the existing `@media (min-width: 900px)` block, so it wins on order):

```css
@media (min-width: 1200px) {
  :root { --toc-rail-width: 200px; --toc-rail-gap: 32px; --toc-rail-top: 90px; }
  .toc {
    position: fixed;
    top: var(--toc-rail-top);
    left: max(16px, calc(50% - 368px - var(--toc-rail-gap) - var(--toc-rail-width)));
    width: var(--toc-rail-width);
    z-index: 5;
    margin: 0;
    padding: 0;
    background: none;
  }
  .toc .go { display: none; }
  .project { scroll-margin-top: 24px; }
}
```

The `left` expression puts the rail's right edge exactly `--toc-rail-gap` (32px) clear of the content column's left edge, which is `50% - 368px` (half of the 46rem column). The `max(16px, …)` keeps the rail on screen on a viewport barely wider than 1200px, where the gutter is narrower than the rail.

Adjust `--toc-rail-top` to the bar's measured height plus a gap (the bar is `padding: 20px 0` plus its content, so roughly 74px; measure it). It must be below the bar's bottom edge so the rail never covers the back link.

- [ ] **Step 3: Verify the rail**

In headless Chrome on `/work/hanna` at 1440×900:
- the TOC's computed `position` is `fixed` and its box is `left ≥ 16px` and `right ≤ the content column's left edge - 32px` (no overlap with the content);
- its top edge is below the top bar's bottom edge at scroll 0 (no overlap with the back link);
- after scrolling 2000px the TOC is still in the viewport at the same place;
- the first `.project` heading now starts much closer to the page header than before (report the before and after offsets);
- clicking a TOC link lands on its own project (the page already uses `scroll-behavior: auto` on pages with a TOC, so the jump is exact).

Then repeat at 1199px and 1200px: at 1199px the TOC must be the old sticky-top list (computed `position: sticky`), at 1200px it must be the fixed rail. Report the computed position at both widths.

Then at 320, 375, 414 and 768px: the TOC is in flow, unchanged, and there is no horizontal scroll (`scrollWidth === clientWidth`).

- [ ] **Step 4: Check the other detail page**

`/work/bluedome` has the same structure. Confirm the rail appears and behaves identically, and that its titles fit on one line (measure each `.toc .t` element's width against the rail's content width and report any that overflow).

- [ ] **Step 5: Run the gates**

Run `npm test` and `npm run build` (must end with `check-build: ok`). Run Lighthouse mobile against `/work/hanna` and report the four category scores and the CLS. Confirm the home page and `/terminal` are untouched: `git diff --stat` must show only `src/styles/projects.css`.

- [ ] **Step 6: Commit**

```bash
git -c user.name="Andrian Than" -c user.email="andrian.than.api@gmail.com" commit -m "feat: put the project index in a side rail on wide screens" \
  -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 7: Report**

Write the full report to `.superpowers/sdd/2026-11-07-side-rail-toc/task-1-report.md` (create the directory; it is git-ignored): the before and after measurements, the CSS you added, the gates, and anything you could not make work. Then reply with ONLY: Status, the commit SHA and subject, the measurements, the Lighthouse scores, and the report path.

---

### Task 2: Say out loud that the demos use mock data

**Files:**
- Modify: `src/pages/work/[slug].astro`
- Modify: `src/styles/projects.css`

**Interfaces:**
- Consumes: the existing page frontmatter — the page already renders its projects and their demos (`src/pages/work/[slug].astro`), and the demo records already read "Sample State Foundation", "Sample case note chatbot" and so on.
- Produces: one visible line on every page that shows demos, saying that the demos run on mock data and that these are internal tools.

**Interfaces note:** this task adds markup, so the "CSS only" constraint applies to Task 1's rail, not to this one.

- [ ] **Step 1: Find where the demos live**

Read `src/pages/work/[slug].astro` in full. Find the condition that decides which projects render a demo (`qa`, `guide`, `img`, `grants`, `ir`, `notes`) and the condition that renders the TOC. The note must appear on every page that shows at least one demo, and must NOT appear on a page with no demos.

- [ ] **Step 2: Write the note**

Add a small block to the page, immediately after the page header and before the TOC (so a reader meets it before any demo), rendered only on pages that have demos. Use the site's own type vocabulary rather than a new style: a small uppercase mono label like the existing `.eyebrow` / `.toc-label` treatment, and one plain sentence under it.

The copy must say two things, without overclaiming:
- the demos run on mock data (they are illustrative, not real records);
- these are internal tools, so there is nothing for a visitor to sign up for or try.

Draft: a label reading **"Sample data"** and a sentence reading **"The demos on this page run on mock data. These are internal tools built for a small team, so there is nothing to sign up for."** Change the wording if you can say it more plainly, but keep both facts in it. Do not name a customer or imply the tools are a product.

- [ ] **Step 3: Style it**

In `src/styles/projects.css`, add a rule for the note. Colors only through the `--color-*` tokens (the label takes `--color-muted`; the sentence takes `--color-fg` or `--color-muted` — your call, but it must clear AA in both themes). Match the surrounding rhythm: the `.eyebrow` label treatment and the site's 16px body size. Give it enough space above and below that it reads as a note rather than as body text.

- [ ] **Step 4: Verify**

In headless Chrome on `/work/hanna` and `/work/bluedome`:
- the note is visible (not `display: none`), sits above the first demo, and its text is exactly what you drafted;
- it is still visible with JavaScript off;
- it clears 4.5:1 against the page background in BOTH themes (switch the theme with the toggle and measure the computed colours);
- no page that has no demos shows the note.

Report the computed colours and the ratios in both themes.

- [ ] **Step 5: Run the gates**

Run `npm test` and `npm run build` (must end with `check-build: ok`). Run Lighthouse mobile against `/work/hanna` and report the four category scores and the CLS.

- [ ] **Step 6: Commit**

```bash
git -c user.name="Andrian Than" -c user.email="andrian.than.api@gmail.com" commit -m "docs: say the demos run on mock data" \
  -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 7: Report**

Write your full report to `.superpowers/sdd/2026-11-07-side-rail-toc/task-2-report.md`: the copy you settled on, where you put it and why, the measurements, the gates, and anything you could not make work. Then reply with ONLY: Status, the commit SHA and subject, the copy, the measurements, the Lighthouse scores, and the report path.
