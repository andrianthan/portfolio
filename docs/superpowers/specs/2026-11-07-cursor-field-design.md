# Cursor-reactive background and a livelier foreground

Status: approved by Andrian in chat on 2026-11-07 ("go with recommended"). The backdrop variant was chosen from the four sketched ("(c) Both — the glow follows and the dots it passes over light up. A field plus a light."). The foreground was chosen as "(c) Both" — hover depth plus a staggered arrival plus the ambient shimmer.

## Intent

The site reads as static and one-dimensional: the background is printed wallpaper, and the foreground rows, headings and stats all sit on one flat plane with nothing happening. This change gives the page a background that reacts to the reader and a foreground that has depth of its own.

## Backdrop

A field plus a light, with a slight counter-drift so the background reads as a layer with thickness rather than a texture.

- A **glow follows the cursor** across the whole page.
- The **dots it passes over brighten and grow**, fading back to the quiet grid away from the pointer.
- The **grid drifts a couple of pixels against the cursor** (parallax), so the field has depth even when you are not moving.

Rejected alternatives, for the record: constellation only (the lightest touch, no sense of a moving presence), pool of light only (no texture in the light), repulsion (physical, too playful for a portfolio), ripple on click (a new interaction for a small beat — possible later).

Implementation shape: one `pointermove` listener, rAF-throttled, writing `--mx`/`--my` on the root. Two composited layers under the page: the quiet dot grid, and above it a radial glow plus a brighter, larger dot grid masked to the same circle. The layers move with `transform` only, so the effect never repaints the page. The field covers the **whole page**, not just the top 760px the current background layer covers.

## Foreground

Hover depth plus a staggered arrival plus an ambient shimmer.

- **Hover depth.** The role rows and project rows lift and catch the gradient as the pointer passes over them (the project rows already do the gradient sweep; the role rows do not). The section headings and the stat numbers pick up a slow shimmer. The chat card glows on focus.
- **Scroll depth.** The sections arrive with a **stagger** instead of one uniform fade, so the page assembles itself as it is read.
- **Ambient.** The hero's gradient drifts slowly on its own, so the page is never completely still.

## Constraints

- Lighthouse mobile on every page: every category ≥ 95. No horizontal scroll at 320/375/414/768px. `npm test` green; `npm run build` ends with `check-build: ok`.
- **Under `prefers-reduced-motion: reduce` everything is static**: no cursor field, no parallax, no shimmer, no stagger — the page renders in its final state.
- Cheap: `transform` and `opacity` only. No per-frame layout, no repaint of the page, no new dependency. The pointer listener is removed when the page is hidden.
- Colors only through the `--color-*` tokens. The effect must read in both the dark and light themes.
- The site stays honest and still reads as a static, plain-HTML document with JavaScript off: the cursor field is a progressive enhancement, and the page is fully usable without it.
- The content gate, the agent engine, the build script, `vercel.json` and the dependencies are untouched.
