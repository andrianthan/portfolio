# Vapor theme — design

Status: draft for Andrian's review (2026-11-07). Branch `feat/vapor-theme`, cut
from `main` at `f30294e`. Experimental: Andrian has not decided whether to
switch the live site to this theme. Nothing here merges or pushes without his
explicit instruction.

## Goal

Give the portfolio a more three-dimensional, higher-personality look modeled on
a reference site's hero (glowing title, scanlines, chip-plus-input Ask bar,
layered depth behind the content), with a space-system backdrop of our own, and carry that look through the whole page. The page
stays one scroll: Projects, Experience and About are reached by scrolling or
by anchor links, not by switching views.

## Decisions (from the brainstorm)

1. **Scope.** The whole page goes vapor: tokens, fixed background layer,
   headings, nav, cards, and the demo windows on the work pages.
2. **Center piece.** An ASCII agent-network graph, not a face. No portrait.
3. **Rendering (approach A).** A CSS space-system backdrop (tilted
   orbit rings, parallax star layers, soft nebula glow), CSS scanlines and
   glow, one small canvas for the ASCII graph. No three.js, no full-page
   canvas.
4. **Navigation.** Scroll anchors. Active tab follows scroll position.
5. **Color.** Purple, not the reference's pink: violet and lavender on an
   indigo-black ground, extending the site's current `#a78bfa` accent. Final
   hex values are set in the plan and checked for AA contrast.
6. **Fidelity.** Aesthetic and layout are matched; the reference's portrait,
   copy and code are not copied. Fonts are the closest public matches, laid
   against the reference screenshot and tuned (see Fonts).
7. **Branch.** All work on `feat/vapor-theme`. Reversible by not merging.

## Hero

- **Nav** (pixel font, spaced caps): HOME, PROJECTS, EXPERIENCE, ABOUT, RESUME.
  Anchors with scroll-spy. Active item has a violet outline pill. The theme
  control sits at the right.
- **Title:** "ANDRIAN THAN", wide techno face, lavender-white fill, soft violet glow,
  offset deep-indigo shadow, horizontal scanline cut-outs.
- **Tagline:** "AI Software Engineer · building agents that ship", light-violet pixel type.
- **Backdrop (a space system, deliberately not the reference's grid floor):**
  the agent graph is the system's sun. Around it, a few concentric orbit
  rings drawn as tilted ellipses (CSS 3D transform), each with a small
  planet dot that drifts along its ring. Behind them, two or three star
  layers at different depths and a faint violet nebula glow. Layers shift at
  different rates with the cursor via the existing `--mx`/`--my` variables,
  which is what makes it read as 3D. Orbit speed is slow; planets are
  decorative only.
- **Ask bar:** sits at the bottom of the hero, over the backdrop. Three suggestion chips and a refresh
  button above an input. It drives the existing agent (`src/agent`) and the
  existing `IntroTerminal` logic; this spec changes presentation, not the
  agent. No mic button and no "Conversation mode" toggle: that is the
  reference's voice feature, which this site does not have.
- **Answers** render in a panel over the backdrop: the question in the mono
  face, each answer line in the readable body face behind a violet arrow
  marker (the pattern in the reference's answer view), clipped to a
  `min(40svh, 320px)` window with a "Show more" / "Show less" toggle, so
  the box stays a box however long the answer is.
- The "Open the full terminal" link and the stat strip stay.

## ASCII agent graph

A canvas, drawn with `@ # % * + .` by brightness, showing a small network:
nodes, edges, pulses travelling along edges. The cursor leans the whole graph
(parallax) and brightens nearby nodes. Rules:

- Static single frame under `prefers-reduced-motion`.
- Paused when off-screen (IntersectionObserver) and when the tab is hidden.
- Fixed small grid (character cells), so cost does not scale with viewport.
- No-JS fallback: a static `<pre>`.
- Decorative: `aria-hidden`, not focusable.

## Whole-page treatment

- `tokens.css` gains a vapor palette (deep indigo-black background, violet and lavender
  accents) and font tokens. A fixed background layer replaces the current
  dot field: star layers, nebula glow, scanlines, vignette. The orbit rings
  belong to the hero only; below it the page keeps the stars and glow.
- Section headings use the pixel face. Body text and long paragraphs keep the
  existing readable sans, because pixel type hurts paragraph legibility.
- Cards, timeline, skills globe, project cards, footer: restyled with the new
  tokens (borders, glow, mono labels). Layout unchanged.
- Work pages (Tesla, Hanna, Blue Dome): the `.qa` demo-window chrome and the
  side rail pick up the tokens. The demo islands are not rewritten; their CSS
  already uses variables where possible, and any hard-coded colors get
  tokenized.
- Existing tests that pin colors, tokens or layout are updated, not deleted.

## Theme control

Vapor becomes the default look. The existing light theme stays as the
alternate, since a vapor look has no real light form. The control reads
"vapor / light". A prefers-color-scheme: light visitor with no saved choice
gets light. Open item: Andrian may instead keep the current dark theme and add
vapor as a third option; decide at review.

## Fonts

Candidates, compared against the reference screenshot before committing:
title: Orbitron or Audiowide; pixel nav, tagline and headings: Silkscreen,
VT323 or Pixelify Sans; mono labels: JetBrains Mono (already used). Fonts are
self-hosted through fontsource (the latin subset that ships with each
package), `font-display: swap`, preloaded so the first paint uses them, and
the mobile nav is a fixed three-column grid so a late font swap cannot
change the nav's row count. The final picks are recorded in the plan once
tested.

**Picked (Task 9, 2026-11-08): Orbitron Variable for the title, Silkscreen for
the pixel face.** Both are self-hosted through fontsource and preloaded, so the
first paint already uses them, and the mobile nav's row count does not depend
on which font is showing (it is a fixed three-column grid). The swap itself can
still cause small shifts elsewhere: with the fonts delayed 2.5 s, layout shift
is about 0.045 at 320 px and 0.073 at 375 px, caused by the Orbitron title
wrapping to two lines when it loads; with no delay it is 0. The picks match
the reference as this document describes it — a wide techno title with
lavender-white fill, soft violet glow, offset deep-indigo shadow and
horizontal scanline cut-outs, and a light-violet pixel tagline. The original
reference screenshot was not available in the Task 9 session, so the comparison
was made against the description above rather than against the image; the
alternates named in the plan (`@fontsource/audiowide` or `@fontsource/michroma`
for the title, `@fontsource/vt323` for the pixel face) remain a one-import,
one-token swap if the screenshot shows a different read.

## Post-spec additions

This section records what the branch added after this document was written. The
six items below are Tasks 10 to 15 of the plan, added after Andrian reviewed the
running branch and asked for them. Each carries the ruling that shaped it.

- **The stats strip (Task 10).** Andrian replaced the four home-page stats with
  his own: tokens used, prompt cache hit rate, hours saved and people reached.
  All four are his estimates, so one quiet line under the strip says so — "Figures
  are my estimates." — rather than a caption on every tile. The figures he
  removed stay on the work pages and in the chat agent.
- **The moving backdrop (Task 11).** The three star layers drift continuously at
  different speeds and a shooting star crosses the sky now and then, so the
  background reads as streaming rather than static. Everything moves with
  `transform` and `opacity` only, and everything stills under
  `prefers-reduced-motion`.
- **The Lifting block (Task 12).** The About section gained a "Lifting" block: a
  month calendar that fills green day by day, a year-by-year overview wall, the
  three lifts, a percentile line and an hours figure. The calendar is a static
  export of Andrian's own check-ins with no live feed and no regeneration job,
  so the page states its cutoff rather than claiming to be current, and it never
  claims to be synced, connected, estimated or reconstructed.
- **The mobile nav grid (Task 13).** The mobile nav is a fixed three-column
  grid, so the bar's row count cannot change when the pixel face swaps in late.
- **The simpler chat box (Task 14).** The Ask bar is three question chips with
  a refresh button on one row and one input under them. No greeting line, no
  agent trace lines on the home page, no route row when JavaScript is on, and
  answers clipped to a `min(40svh, 320px)` window with a "Show more" / "Show
  less" toggle.
- **The Personal automation section (Task 15).** A section between Projects and
  Skills with two cards about Andrian's Grok-powered bots: a budgeting bot and
  a daily AI digest. Only what he confirmed is claimed — no numbers, schedules
  beyond "daily", accounts or institutions.

## Constraints kept

- Lighthouse 95 or higher on mobile (home and `/work/tesla`).
- No horizontal scroll from 320 px up.
- AA contrast on body text and controls in both themes.
- All motion respects `prefers-reduced-motion`; nothing animates off-screen.
- All current tests pass; build ends `check-build: ok`.
- No change to content, the cleared/listed gate, or the agent's answers.

## Testing

Unit tests for the graph layout and pulse logic (pure functions), scroll-spy,
and theme resolution. Render tests for the hero and Ask bar. Existing suite
stays green at each step. Manual checklist: Lighthouse, 320 to 768 px, both
themes, reduced motion, keyboard focus order, and a visual comparison with the
reference screenshot. As with the Tesla page, nothing counts as verified for
layout until it has been opened in a browser.

## Risks

- Orbit rings, star layers and scanlines cost paint time on low-end phones.
  Mitigation: transform and opacity only, `will-change` kept narrow, layers
  disabled under reduced motion and on small low-power viewports if profiling
  shows a problem.
- Pixel and techno fonts add weight. Mitigation: subsetting, two files at most.
- Whole-page restyle touches many files. Mitigation: token-first, so most of it
  is one file; the branch is isolated.
- Legibility of small pixel text. Mitigation: pixel face only for labels and
  headings above a minimum size.

## Out of scope

A face or portrait, voice input or a conversation mode, three.js,
rewriting demo islands, content changes, merging or pushing to main.

## Open items

- Vapor as default-with-light-alternate versus a third theme option.
- Exact font picks, after comparison against the screenshot. Orbitron + Silkscreen
  are in place (see Fonts); the comparison against the original image is still
  open, since that screenshot was not available when Task 9 ran.
