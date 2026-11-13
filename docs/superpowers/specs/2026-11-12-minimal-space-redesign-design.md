# Minimal Space Redesign

Date: 2026-11-12
Branch: `redesign/minimal` (off `feat/skills-globe`)
Reference: tejasthind.com (layout and feel only; artwork is original, not copied)

## Goal

Replace the feature-heavy portfolio with a quiet, sleek single-column site over a full-bleed original space illustration. Text floats on the scene. Few elements, one glass card, a command menu.

## Decisions

- Scope: strip to essentials. Chat/agent folds into the command menu.
- Theme: dark-only. The scene is the theme. No light mode, no vapor theme, no toggle.
- Background: original space illustration generated with Gemini (banana-squad pipeline). User picks from 3-4 options.
- No Writing link (no posts exist). Revisit if posts appear.
- Approach: rebuild in place on a new branch. Reuse Astro, content collections, and the agent.

## Pages

### `/` (home)
- Column `max-width: 640px`, 24px side gutters on mobile.
- Italic serif greeting: "Hey, I'm Andrian". Scramble-resolve animation on load (~600ms).
- 4-5 short prose lines. Employers in bold and linked: Tesla, Micron, Blue Dome, Hanna. Bio copy is drafted from resume and memory; the user edits it.
- One frosted glass card with the GitHub contribution grid (accent tuned to the nebula palette). Data from the GitHub API at build time, with a static fallback if the fetch fails.
- Floating top-right nav, no bar: icon links (email, GitHub, LinkedIn) and `Experience ->`.
- Bottom-right pill: search icon plus `⌘K`.

### `/experience`
- Same background. Sparse rows: company, role, dates, one line. Each row expands to the existing `content/work/*.md` body. Hairline rules only; no cards.
- Tesla and Hanna pages stay reachable from their rows.

### `⌘K` command menu (React island)
- Glass palette. Items: Home, Experience, contact links, and "Ask about Andrian..." which calls the existing `src/agent` pipeline.
- Opens with ⌘K / Ctrl+K and via the bottom-right pill. Esc closes. Arrow keys and Enter navigate.

## Visual system

- Background: fixed full-viewport image. Deep indigo to violet nebula, soft star field, optional horizon glow. Served as AVIF/WebP with a low-res blur placeholder and a CSS gradient fallback. Slow star drift/twinkle, disabled under `prefers-reduced-motion`.
- Type: italic serif for the greeting (Instrument Serif or Newsreader italic). Sans for prose (Geist or Inter). Company names at weight 600. Body about 17px, line-height 1.6. Text white at ~90%, secondary ~60%. Fonts self-hosted.
- Tokens on `:root`: text, muted, glass-bg, glass-border, accent. Explicit `body` background (gradient fallback).
- Glass: `backdrop-filter: blur`, translucent tint, 1px hairline border.
- Motion: scramble on load, 150ms color transitions, palette fade-in. Nothing else. All off under reduced motion.
- Contrast: body text must meet WCAG AA against the image. Verify in the browser; add a faint vignette or text-area gradient if needed.

## Cut / keep / rewrite

Delete: `SkillsGlobe*`, `Skills*`, `StatStrip`, `Timeline`, `ProjectCards`, `terminal/`, `ThemeToggle`, vapor theme CSS, `design-reference` if unused.

Keep untouched: `src/agent/*` and golden tests, `content/work/*.md`, Tesla and Hanna pages, `vercel.json`, analytics.

Rewrite: layouts, `pages/index.astro`, new `pages/experience.astro`, `global.css`, `Hero.astro`, `TopBar`, `Footer`. Add `CommandMenu.tsx`, `ContributionCard`, and the scramble script.

## Testing

- Prune tests for deleted components.
- Add tests: CommandMenu (open/close, keyboard nav, route links, agent entry), scramble reduced-motion path, contribution card fallback.
- `npm test` and `npm run build` (runs `scripts/check-build.mjs`) must pass.
- Browser check at mobile and desktop widths; Lighthouse performance sanity check on the background image.

## Rollout

1. Spec approved (this doc).
2. Generate background options; user picks one.
3. Implementation plan via writing-plans.
4. Build on `redesign/minimal`.
5. Vercel preview. User decides when to promote to production.

## Out of scope

Writing/blog, light theme, projects section, globe/terminal, any new backend.
