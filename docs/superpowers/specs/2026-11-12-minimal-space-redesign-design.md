# Minimal Space Redesign

Date: 2026-11-12
Branch: `redesign/minimal` (off `feat/skills-globe`)
Reference: tejasthind.com (layout and feel only; artwork is original, not copied)

## Goal

Replace the feature-heavy portfolio with a quiet, sleek single-column site over a full-bleed original space illustration. Text floats on the scene. Few elements, one glass card, a command menu.

## Decisions

- Scope: strip to essentials. Chat/agent folds into the command menu.
- Theme: dark-only. The scene is the theme. No light mode, no vapor theme, no toggle.
- Background: two original opaque illustrations generated with Gemini (banana-squad): a nebula sky and a planet/horizon foreground. User picks from options. Stars, drifting clouds, and flyers are procedural CSS, so no transparent art is needed.
- No Writing link (no posts exist). Revisit if posts appear.
- Approach: rebuild in place on a new branch. Reuse Astro, content collections, and the agent.

## Pages

### `/` (home)
- Column `max-width: 640px`, 24px side gutters on mobile.
- Italic serif greeting: "Hey, I'm Andrian". Scramble-resolve animation on load (~600ms).
- 5 short prose lines from `profile.intro`, employers in **bold** (no outbound links; no verified URLs). Copy is drafted from the work entries; the user edits it.
- One frosted glass card with the GitHub contribution grid (accent tuned to the nebula palette). Data from a public contributions API at build time. If the fetch fails the card is omitted; no data is ever fabricated.
- Floating top-right nav, no bar: icon links (email, GitHub, LinkedIn) and `Experience ->`.
- Bottom-right pill: search icon plus `⌘K`.

### `/experience`
- Same background. Sparse rows: dates, company, role, one-line summary. Hairline rules only; no cards.
- A row links to `/work/<slug>` only when the entry is `cleared` (today: Hanna Center, Blue Dome). Tesla and Micron are listed but not cleared, so they are plain rows. No inline expansion: non-cleared bodies are drafts and `check-build` forbids leaking them.
- Work detail pages (`/work/*`) keep their layout, sit on the same scene inside a readable translucent panel, and their back link goes to `/experience`.

### `⌘K` command menu (React island)
- Glass palette. Items: Home, Experience, Terminal, contact links (email, GitHub, LinkedIn, resume), plus an "Ask" row for free text that runs the existing `src/agent` pipeline in the browser and shows the answer and sources inline.
- Opens with ⌘K / Ctrl+K and via the bottom-right pill. Esc closes. Arrow keys and Enter navigate.

## Visual system

- Background: fixed full-viewport **layered, animated scene**, not a flat image. Deep indigo-to-violet palette. Layers, back to front:
  1. Base sky: CSS gradient, overlaid by the generated nebula image once chosen.
  2. Far stars: canvas or CSS star field, slow twinkle.
  3. Drifting nebula clouds: 3 large radial-gradient blobs (CSS, no image) translating slowly and looping (the equivalent of the reference's moving clouds).
  4. Wildlife equivalent of the birds: small shooting stars, a slow satellite/comet, and a few drifting tiny ships or glowing orbs crossing at random intervals and heights.
  5. Foreground: planet limb or silhouetted horizon at the bottom (generated, opaque, top edge feathered with a CSS mask).
- Cursor parallax: layers shift a few px opposite to the cursor, deeper layers move less (foreground ~12px max, far stars ~3px). Eased with rAF lerp. Layer depths 0.22 to 0.85 of a 14px max shift. Touch devices get no parallax (device tilt needs an intrusive permission prompt) and keep the idle drift and twinkle.
- Assets: `public/scene/sky.webp` (about 2560x1440) and `public/scene/horizon.webp` (about 2560x640), WebP, with the CSS gradient always underneath as the fallback. Total weight budget 400KB.
- Reduced motion: all drifting, twinkle, flyers, and parallax off; a static composite of the layers renders instead.
- Performance: animate only `transform`/`opacity`, pause when the tab is hidden, cap concurrent flyers at 3, and check frame rate on a mid-range laptop.
- Type: italic serif for the greeting (Instrument Serif or Newsreader italic). Sans for prose (Inter, already loaded). Company names at weight 600. Body about 17px, line-height 1.6. Text near-white, secondary a light lavender-gray. Fonts load from Google Fonts as they do today (Instrument Serif italic is the only addition).
- Tokens on `:root` keep today's names (`--color-bg`, `--color-fg`, `--color-muted`, `--color-rule`, `--color-accent`, `--color-glass`, ...) with dark values, so work detail pages, demos, and the terminal inherit the new look. Adds `--font-serif` and `--scene-*` tokens. `color-scheme: dark`. Explicit `body` background (the scene's deep color).
- Glass: `backdrop-filter: blur`, translucent tint, 1px hairline border.
- Motion: scramble on load, 150ms color transitions, palette fade-in, plus the background animation above. UI motion stays minimal; the scene carries the life. All off under reduced motion.
- Contrast: tokens are tested against the brightest expected scene color (`--scene-bright`): body text at least 7:1, muted text at least 4.5:1. A faint vignette sits over the layers. After the art is chosen, verify in the browser.

## Cut / keep / rewrite

Delete: `SkillsGlobe*`, `Skills*`, `StatStrip`, `Timeline`, `RoleEntry`, `About`, `ProjectCards`, `terminal/IntroTerminal*`, `ThemeToggle`, `cursor-field.ts`, `enhance.ts`, skills-globe libs, home-only CSS in `global.css`, light and vapor themes.

Keep: `src/agent/*` and golden tests (only navigation hrefs and snapshot URLs change), `content/work/*.md`, `/work/[slug]`, `/projects/[slug]`, the rest of `terminal/` and `pages/terminal.astro` (`check-build` requires the `/terminal` route and a link to it; it is reachable from the footer and the command menu), `vercel.json`, analytics.

Rewrite: `Base.astro`, `Detail.astro` (drop the toggle), `pages/index.astro`, `tokens.css`, `global.css` (prune), `Hero.astro`, `TopBar.astro`, `Footer.astro`. Add `pages/experience.astro`, `Background.astro`, `ContributionCard.astro`, `CommandMenu.tsx`, `MenuPanel.tsx`, `styles/scene.css`, `styles/home.css`, and the pure libs `stars`, `parallax`, `flyers`, `scramble`, `contributions`, `commands`.

## Testing

- Prune tests for deleted components.
- Add tests: CommandMenu (open/close, keyboard nav, route links, agent entry), scramble reduced-motion path, contribution card fallback, parallax math (offset clamps per layer, disabled under reduced motion), flyer spawner (interval and cleanup).
- `npm test` and `npm run build` (runs `scripts/check-build.mjs`) must pass.
- Browser check at mobile and desktop widths; Lighthouse performance sanity check on the background image.

## Rollout

1. Spec approved (this doc).
2. Generate background layer sets (sky/nebula, cloud layers, foreground); user picks a direction.
3. Implementation plan via writing-plans.
4. Build on `redesign/minimal`.
5. Vercel preview. User decides when to promote to production.

## Out of scope

Writing/blog, light theme, a projects section on the home page, globe, the home-page terminal panel, any new backend.
