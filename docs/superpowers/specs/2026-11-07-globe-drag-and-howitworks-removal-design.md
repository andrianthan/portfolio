# Globe grab-and-go + remove "How this site answers"

Status: awaiting Andrian's approval (approaches picked in chat 2026-11-07: grab-and-go = (a); removal requested directly).

## 1. The globe can be grabbed and rotated (approach (a))

**Intent:** the skills globe currently spins on its own and ignores the pointer. Andrian wants to grab it and rotate it.

**Design (approach (a) — "grab-and-go"):**
- Press anywhere on the globe and drag to rotate it in both axes (yaw from horizontal drag, pitch from vertical drag, pitch clamped near the current tilt).
- While held, the auto-spin eases to a stop; on release it eases back in over ~1s. No momentum — it always settles back to the calm idle spin.
- Touch: `touch-action: pan-y` on the globe container — a horizontal drag rotates, a vertical drag still scrolls the page.
- The node labels/icons keep `pointer-events: none`, so a drag works anywhere on the sphere.
- Reduced motion: no drag rotation (a static frame stays static); auto-spin is already disabled there.
- Implementation: pointer event listeners on the globe canvas in `SkillsGlobe.tsx`, feeding the existing `frame(ry, rx)` — no new dependency, no structural change to the render loop.

**Non-goals:** momentum/inertia (rejected (b)); clicking nodes to focus (rejected (c)); changing the idle spin speed or tilt.

**Cost if wrong:** drag feel could fight the idle spin's easing — tuned during implementation, verified in the browser.

## 2. Remove the "How this site answers" section

**Intent:** Andrian doesn't like the "UNDER THE HOOD / How this site answers" section (router/agent/verifier explainer with the node graph) on the home page.

**Design:**
- Remove `<HowItWorks />` from `src/pages/index.astro` and delete `src/components/HowItWorks.astro`, `HeroGraph.astro`, `HeroGraph.tsx`, `HeroGraph.test.tsx` (nothing else imports them — verified before deletion).
- Strip their now-dead CSS (`.how-copy`, `.how-graph` and the section's local rules) from `global.css` WITHOUT touching shared rules (`.sh h2`, reveal, tokens stay — other sections use them).
- Re-index the reveal stagger steps of the sections that follow, so the arrival order stays sensible.
- The agent engine, router and verifier themselves are untouched — this removes the home-page explainer only. The full terminal (`/terminal`) is unaffected.

**Cost if wrong:** a shared CSS rule or test gets over-deleted — caught by the suite and the build gate.

## Constraints (same as the branch's standing rules)

- Lighthouse mobile ≥95 every category; no horizontal scroll at 320/375/414/768; `npm test` green; build ends `check-build: ok`.
- `transform`/`opacity` motion; reduced motion fully static; colors via `--color-*` tokens; JS-off page still complete; no new dependencies.
- Work happens on `feat/skills-globe` (current branch, already contains the merged cursor field). Never push or merge to `main` without Andrian's explicit approval.
