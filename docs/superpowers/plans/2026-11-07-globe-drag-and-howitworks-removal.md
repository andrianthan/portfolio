# Globe grab-and-go + HowItWorks removal: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the skills globe grabbable (drag rotates, auto-spin eases out/in) and remove the "How this site answers" section from the home page.

**Architecture:** Drag math and easing go into the pure lib (`src/lib/skillsGlobe.ts`) and are unit-tested; `SkillsGlobe.tsx` wires pointer events onto the existing render loop. The removal deletes one self-contained section (component tree + dead CSS), which is the last reveal section, so no stagger re-indexing is needed.

**Tech Stack:** Astro 7, React island, vanilla canvas render loop, vitest.

**Spec:** `docs/superpowers/specs/2026-11-07-globe-drag-and-howitworks-removal-design.md` (approved by Andrian 2026-11-07).

## Global Constraints

- Branch `feat/skills-globe`; commit author `Andrian Than <andrian.than.api@gmail.com>`; every commit message ends with trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Never push or merge to `main` without Andrian's explicit chat approval.
- `npm test` green; `npm run build` ends `check-build: ok`; Lighthouse mobile ≥95 every category on `/`; no horizontal scroll at 320/375/414/768.
- `transform`/`opacity` for motion; under `prefers-reduced-motion: reduce` the globe stays static (no drag, no spin) and the page renders complete.
- Colors only via `--color-*` tokens; no new dependencies; the agent engine/router/verifier and `/terminal` are untouched by the removal.
- The page stays complete with JavaScript off (the globe already degrades to a static island render).

## Review Focus

1. Drag while auto-spinning — the spin must ease out under the finger, never snap (pinned by `spinEase` tests, Task 2).
2. Pitch clamp — dragging far up/down must never flip the sphere past [-0.2, 0.9] rad (pinned by `clampPitch` tests, Task 2).
3. Touch: a vertical drag on the globe must keep scrolling the page — `touch-action: pan-y` on `.globe` (pinned by Task 3's computed-style check).
4. Removal must leave zero dead references: no `HowItWorks`/`HeroGraph`/`heroGraph`/`.how-` matches anywhere after Task 1 (pinned by Task 1's grep + suite).
5. Reduced motion + pointer: pointer listeners must not attach at all when the preference is on (pinned by Task 3's emulation check).

---

### Task 1: Remove the "How this site answers" section

**Files:**
- Modify: `src/pages/index.astro` (drop the import at line 10 and `<HowItWorks />` at line 23)
- Delete: `src/components/HowItWorks.astro`, `src/components/HeroGraph.astro`, `src/components/HeroGraph.tsx`, `src/components/HeroGraph.test.tsx`, `src/lib/heroGraph.ts`, `src/lib/heroGraph.test.ts`
- Modify: `src/styles/global.css` (drop lines 214-216 `.how-copy`/`.how-graph`/`.how-link` and lines 239-240 `#how .how-copy`/`#how .how-graph`)

**Interfaces:** Consumes nothing; produces nothing. `#how` is the last `.reveal` section (steps 7-8 were the max), so no `--reveal-step` re-indexing is required.

- [ ] **Step 1: Verify nothing else references the section** — Run: `grep -rn "HowItWorks\|HeroGraph\|heroGraph\|#how\|how-copy\|how-graph\|how-link" src/ | grep -v "styles/global.css"` — Expected: only `src/pages/index.astro` (import + usage) and the component-internal references listed above. If anything else appears, STOP and report.
- [ ] **Step 2: Remove the import and usage from `index.astro`, delete the six files, strip the five CSS lines.**
- [ ] **Step 3: Re-verify zero references** — Run the same grep including `global.css` — Expected: no matches anywhere.
- [ ] **Step 4: Run the gates** — `npm test` (all green) and `npm run build` (ends `check-build: ok`). Expected: no test referenced HeroGraph besides its own deleted test file.
- [ ] **Step 5: Commit**

```bash
git add -A && git -c user.name="Andrian Than" -c user.email="andrian.than.api@gmail.com" commit -m "fix: drop the how-it-answers section from the home page" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Grab-and-go rotation on the globe

**Files:**
- Modify: `src/lib/skillsGlobe.ts` (add the three pure functions + five constants below)
- Test: `src/lib/skillsGlobe.test.ts` (add a describe block)
- Modify: `src/components/SkillsGlobe.tsx` (wire pointer events into the existing loop)
- Modify: `src/styles/global.css` (`.globe` gets `touch-action: pan-y; cursor: grab;`, plus `.globe:active { cursor: grabbing; }`)

**Interfaces:**
- Consumes: the existing loop state (`ry`, `TILT`, `SPIN_PER_MS`, `frame(ry, rx)`, `tick`, `start`/`stop`) in `SkillsGlobe.tsx`; `reduced` matchMedia already in scope.
- Produces (lib, exact):

```ts
export const PITCH_MIN = -0.2;
export const PITCH_MAX = 0.9;
export const HOLD_EASE_MS = 250;
export const RELEASE_EASE_MS = 1000;
export function clampPitch(rx: number): number;                       // clamps to [PITCH_MIN, PITCH_MAX]
export function dragToAngle(dxPx: number, dyPx: number, radiusPx: number): { dRy: number; dRx: number };
                                                                       // dRy = dx/radius, dRx = dy/radius
export function spinEase(msHeld: number, releasedForMs: number | null): number;
                                                                       // holding (null): 1 -> 0 over HOLD_EASE_MS
                                                                       // released: 0 -> 1 over RELEASE_EASE_MS
                                                                       // easing: smoothstep x*x*(3-2x) of the clamped t
```

**Sign convention (pinned):** dragging right (dx > 0) increases `ry` so the front face follows the finger; dragging down (dy > 0) increases `rx` (front face moves down). `rx` is always passed through `clampPitch`.

- [ ] **Step 1: Write the failing lib tests** in `src/lib/skillsGlobe.test.ts`:

```ts
import { clampPitch, dragToAngle, spinEase, PITCH_MIN, PITCH_MAX, HOLD_EASE_MS, RELEASE_EASE_MS } from './skillsGlobe';
describe('globe drag', () => {
  it('clamps pitch to the designed band', () => {
    expect(clampPitch(-1)).toBe(PITCH_MIN);
    expect(clampPitch(2)).toBe(PITCH_MAX);
    expect(clampPitch(0.5)).toBe(0.5);
  });
  it('maps drag pixels to radians by radius', () => {
    expect(dragToAngle(100, 50, 300)).toEqual({ dRy: 100 / 300, dRx: 50 / 300 });
  });
  it('eases the auto-spin out while held and back in after release', () => {
    expect(spinEase(0, null)).toBe(1);
    expect(spinEase(HOLD_EASE_MS, null)).toBe(0);
    expect(spinEase(Math.floor(HOLD_EASE_MS / 2), null)).toBeCloseTo(0.5);
    expect(spinEase(0, 0)).toBe(0);
    expect(spinEase(RELEASE_EASE_MS, RELEASE_EASE_MS)).toBe(1);
    expect(spinEase(Math.floor(RELEASE_EASE_MS / 2), Math.floor(RELEASE_EASE_MS / 2))).toBeCloseTo(0.5);
  });
});
```

- [ ] **Step 2: Run them** — `npx vitest run src/lib/skillsGlobe.test.ts` — Expected: FAIL (functions undefined).
- [ ] **Step 3: Implement the three functions + constants** in `src/lib/skillsGlobe.ts` per the signatures and smoothstep contract above.
- [ ] **Step 4: Run them again** — Expected: PASS.
- [ ] **Step 5: Wire the pointer events in `SkillsGlobe.tsx`**: inside the existing effect, when `!reduced.matches`, attach `pointerdown` on `root` (call `setPointerCapture`, record the pointer id and last x/y, note hold start), `pointermove` (only while captured: `const { dRy, dRx } = dragToAngle(dx, dy, radius); ry += dRy; rx = clampPitch(rx + dRx); frame(ry, rx);`), `pointerup`/`pointercancel` (release, note release time). In `tick`, multiply the auto-spin: `ry += SPIN_PER_MS * (now - last) * spinEase(now - holdStart, releaseStart === null ? null : now - releaseStart)`. Keep the rAF loop and all existing observers untouched; remove the listeners in the effect's cleanup.
- [ ] **Step 6: CSS** — `.globe { touch-action: pan-y; cursor: grab; }` and `.globe:active { cursor: grabbing; }` appended to the globe block in `global.css`.
- [ ] **Step 7: Gates** — `npm test` (all green), `npm run build` (ends `check-build: ok`).
- [ ] **Step 8: Commit**

```bash
git add -A && git -c user.name="Andrian Than" -c user.email="andrian.than.api@gmail.com" commit -m "feat: grab and rotate the skills globe" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Browser verification (both changes)

**Files:** none (verification only).

- [ ] **Step 1:** `npm run build`, serve (`npx astro preview --port 4324` — already running from the controller; a rebuild replaces `dist` in place).
- [ ] **Step 2:** In headless Chrome (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` via CDP) on `/`:
  - the text "How this site answers" is absent and `#how` does not exist;
  - `getComputedStyle(document.querySelector('.globe')).touchAction === 'pan-y'`;
  - a synthetic pointer drag (CDP `Input.dispatchMouseEvent`, press at the globe center, move ~200px right, release) changes the rendered canvas pixels and the rotation visibly follows the drag direction;
  - after release, the idle spin resumes (pixel deltas continue over the following ~2s, no snap);
  - with `prefers-reduced-motion: reduce` emulated: a synthetic drag changes nothing (no listeners attached), the static frame stays.
- [ ] **Step 3:** No horizontal scroll at 320/375/414/768; Lighthouse mobile on `/` (report the four categories + CLS); JS-off render still complete (script-disabled screenshot).
- [ ] **Step 4:** Report every number to the controller.
