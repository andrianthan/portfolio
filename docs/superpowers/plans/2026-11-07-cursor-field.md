# Cursor-reactive background and a livelier foreground: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the background react to the cursor (a glow that follows, dots that light up, a slight counter-drift) and give the foreground depth (hover lifts, a staggered scroll arrival, a slow shimmer).

**Architecture:** One rAF-throttled `pointermove` listener writes `--mx`/`--my` on the root. Two absolutely positioned layers under the page carry the effect — the quiet dot grid, and above it a radial glow plus a brighter dot grid masked to the same circle. Both layers move with `transform` only, so the page is never repainted. The foreground changes are CSS: hover states, a staggered reveal, and a slow gradient animation.

**Tech Stack:** Astro 7 static, plain CSS with tokens, one small vanilla script.

**Spec:** `docs/superpowers/specs/2026-11-07-cursor-field-design.md` (binding, approved by Andrian on 2026-11-07).

## Global Constraints

- Working directory `/Users/andrianthan/Desktop/projects/portfolio`, branch `feat/cursor-field` (create it from `main`; do not work on `main` directly — another session pushes to `main`). Never push `main`, merge to `main`, or deploy without Andrian's explicit approval in chat.
- **Under `prefers-reduced-motion: reduce` everything is static**: no cursor field, no parallax, no shimmer, no stagger. The page renders in its final state.
- Lighthouse mobile on every page: every category ≥ 95. No horizontal scroll at 320/375/414/768px. Contrast AA in both themes. `npm test` green; `npm run build` ends with `check-build: ok`.
- `transform` and `opacity` only for motion. No per-frame layout, no repaint of the page, no new dependency.
- Colors only through the `--color-*` tokens. The effect must read in both the dark and light themes.
- The page stays fully usable with JavaScript off: the cursor field is a progressive enhancement.
- The content gate, the agent engine, the build script, `vercel.json` and the dependencies are untouched.
- Never write the literal to-confirm marker into any source file.
- Commit message ends with the trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`, authored as `Andrian Than <andrian.than.api@gmail.com>`. git 2.53 rejects `-c` after `-m`:
  `git -c user.name="Andrian Than" -c user.email="andrian.than.api@gmail.com" commit -m "<msg>" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"`

---

### Task 1: The cursor field

**Files:**
- Modify: `src/styles/global.css`
- Create: `src/scripts/cursor-field.ts`
- Modify: `src/layouts/Base.astro` (import the script)

**Interfaces:**
- Consumes: the existing `--color-bg`, `--color-dot`, `--color-glow`, `--color-mask` tokens and the existing `body::before` background layer.
- Produces: `--mx` / `--my` on the root element (the pointer position in pixels), and two layers that use them.

- [ ] **Step 1: Split the background into two layers**

Today `body::before` paints the glow and the dot grid together, is 760px tall, and is masked to fade downward. Replace it with two layers that cover the whole page:

- `body::before` keeps the **quiet dot grid**: the existing `radial-gradient(var(--color-dot) 1.1px, transparent 1.1px) 0 0 / 24px 24px` tile, now covering the whole page (`inset: 0`, `height: auto`), with the existing downward mask.
- `body::after` paints the **field**: the same dot tile but larger and brighter (`--color-fg` at low alpha), masked by a radial gradient centred on the pointer (`--mx`, `--my`), plus the `--color-glow` radial gradient in the same mask, so the glow and the lit-up dots travel together.

Both layers are `position: absolute; inset: 0; z-index: -1; pointer-events: none;` and neither may capture pointer events.

- [ ] **Step 2: Write the pointer script**

Create `src/scripts/cursor-field.ts`: a rAF-throttled `pointermove` listener on `window` that writes `--mx` and `--my` (in pixels) onto `document.documentElement`, plus a `pointerleave`/`blur` reset that fades the field out. It must:
- do nothing at all when `matchMedia('(prefers-reduced-motion: reduce)').matches` is true, and stop listening if that preference turns on;
- stop listening when `document.hidden` is true;
- never write more than one update per animation frame;
- degrade silently if the custom properties are unsupported.

Import it from `src/layouts/Base.astro` the same way `src/scripts/enhance.ts` is imported today (a `<script>` in the body, module-scoped), so it is a no-JS-safe progressive enhancement.

- [ ] **Step 3: Add the counter-drift**

The grid layer gets a very small `translate` driven by the pointer, in the opposite direction to the field, so the two layers separate:

```css
body::before { transform: translate3d(calc((var(--mx, 50vw) - 50vw) * -0.006), calc((var(--my, 50vh) - 50vh) * -0.006), 0); }
```

Use a small enough factor that the drift is felt rather than seen, and make sure the layer is wide enough (extend it past the viewport edges) that the drift never reveals an edge.

- [ ] **Step 4: The reduced-motion and no-JS states**

Under `@media (prefers-reduced-motion: reduce)`: the field layer paints nothing (or a fixed, very subtle gradient), the grid does not drift, and the reveal rules below are neutralised. Without JavaScript the `--mx`/`--my` fallbacks keep the field centred and inert.

- [ ] **Step 5: Verify**

Build (`npm run build`) and serve (`npx astro preview --port 4321`, background it; stop it when done). In headless Chrome (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, driven over the DevTools protocol with a small Node script) on `/`:
- move the pointer to three positions and confirm the lit-up patch of dots and the glow move with it (sample the rendered pixels around the pointer and 400px away from it, and report the difference);
- confirm the field covers the WHOLE page, not just the top: scroll to the bottom and confirm the effect is still present there;
- with `Emulation.setScriptExecutionDisabled` on, confirm the page still looks right (a static, centred field) and the content is unaffected;
- with `prefers-reduced-motion: reduce` emulated, confirm the field does not follow the pointer and nothing animates;
- measure the page's paint cost: run Lighthouse mobile and report the performance score and CLS before and after.

Report every number.

- [ ] **Step 6: Run the gates and commit**

`npm test` and `npm run build` (must end with `check-build: ok`).

```bash
git -c user.name="Andrian Than" -c user.email="andrian.than.api@gmail.com" commit -m "feat: a cursor-reactive field behind the page" \
  -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Foreground depth

**Files:**
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: the existing `.reveal` rules, `.job` / `.prow` rows, `.stat b`, `.sh h2`, `h1 .grad`, and the `--grad-a` / `--grad-b` tokens.
- Produces: hover depth on the rows and headings, a staggered reveal, and a slow ambient shimmer.

- [ ] **Step 1: Hover depth on the rows**

The project rows already sweep the gradient into their title on hover (`a.prow:hover b`). Give the **role rows** the same treatment, and give both row types a small lift on hover (a `translateY` of 1–2px, no layout shift, `transform` only). Keep every change inside a `transition` that is neutralised under `prefers-reduced-motion`.

- [ ] **Step 2: Hover depth on the headings and the stats**

Add the same gradient-sweep treatment the project titles get to the section headings (`.sh h2`) and the stat numbers (`.stat b`), on hover, so the headings and the numbers catch the light as the pointer passes.

- [ ] **Step 3: A staggered arrival**

Today every `.reveal` element fades up together. Give the sections a **stagger**: each reveal starts slightly later than the one above it, using a per-element delay. The reveal elements are `.about`, `.stats`, `.plist`, `.how-copy` and `.how-graph` (`src/components/`), and the experience timeline and the project list are separate sections. Use a CSS custom property for the delay so the stagger is declared once and the components only set their index — do not add a class to five components if a selector-based delay works.

The reveal must not cause layout shift, and under `prefers-reduced-motion` every element must be visible immediately with no transition and no delay.

- [ ] **Step 4: The ambient shimmer**

Give the hero's gradient name (`h1 .grad`) and the stat numbers (`.stat b`) a slow, subtle background-position animation, so the gradient drifts. It must be slow enough to be felt rather than watched, must not animate anything that changes layout, and must be disabled under `prefers-reduced-motion`.

- [ ] **Step 5: Verify**

Build, serve, and in headless Chrome on `/`:
- hovering a role row and a project row shows the gradient sweep and the lift, and moving the pointer away returns them to rest;
- hovering a section heading and a stat number shows the same treatment;
- scrolling down shows the sections arriving with a visible stagger (measure the opacity of two reveal elements at the same moment and confirm they differ);
- with `prefers-reduced-motion: reduce` emulated: every reveal element is fully visible on load, nothing animates, and no element is left at opacity 0 (this is the important check — a delayed reveal that never fires would hide content);
- no horizontal scroll at 320/375/414/768px, and no layout shift (compare `scrollHeight` and the CLS metric before and after).

Report every number.

- [ ] **Step 6: Run the gates and commit**

`npm test` and `npm run build` (must end with `check-build: ok`), and Lighthouse mobile on `/` (report the four scores and the CLS).

```bash
git -c user.name="Andrian Than" -c user.email="andrian.than.api@gmail.com" commit -m "feat: give the foreground depth on hover and on scroll" \
  -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Verification across the site

**Files:** none (verification only).

- [ ] **Step 1** `npm test` and `npm run build`.
- [ ] **Step 2** Lighthouse mobile on `/`, `/terminal`, `/work/hanna` and `/work/bluedome`: every category ≥ 95 on every page; report the CLS for each.
- [ ] **Step 3** No horizontal scroll at 320/375/414/768px on every one of those pages.
- [ ] **Step 4** Reduced motion on every page: no animation, nothing left invisible.
- [ ] **Step 5** JavaScript off on every page: the content is complete and the cursor field is inert.
- [ ] **Step 6** Both themes: the effect reads (the field is visible against the background) and the text contrast is unchanged.
- [ ] **Step 7** Report every number to the controller.
