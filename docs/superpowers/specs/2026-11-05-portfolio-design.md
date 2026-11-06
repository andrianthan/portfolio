# Portfolio site: design spec

Date: 2026-11-05. Owner: Andrian Than. Status: awaiting owner review.

## 1. Goal and audience

A public portfolio that SWE recruiters and hiring managers can skim in seconds and then dig into. The differentiator is production AI-agent work: LLM agents with numeric grounding, evals, and guardrails, shipped to real users.

Success looks like:
- A recruiter understands who Andrian is and what he has shipped within one screen of scrolling.
- Any role or project can be opened for a real architectural write-up (problem, architecture, key decisions, backend, results).
- The site is fast, readable on a phone, and works in light and dark mode.
- Nothing confidential or unreviewed is ever published (see section 5).

## 2. Scope

### In v1
- One home page.
- Seven detail pages: four roles (`/work/tesla`, `/work/hanna`, `/work/bluedome`, `/work/micron`) and three projects (`/projects/advisorai`, `/projects/ai-swing-trader`, `/projects/claude-token-saver`).
- Downloadable resume at `/resume.pdf` (source: `~/Downloads/Andrian_Than_Resume 2.pdf`).
- Light/dark toggle. Open Graph tags for link previews. Vercel Analytics.
- Company logos on role entries, using files already collected (see section 7).

### Out of v1
- Contact form or any backend. Contact is links only (email, LinkedIn, GitHub).
- Blog, CMS, i18n.
- Interactive live demos on mock data. The architecture leaves room (React islands) but none ship in v1.
- Custom domain (added later, no design change).
- react-three-fiber, React Bits, or any heavy animation library.

## 3. Information architecture

```
/                        Home
/work/<slug>             Role detail (4)
/projects/<slug>         Project detail (3)
/resume.pdf              Static download
```

Home sections, in order: top bar (name, theme toggle), hero, stat strip, Experience (timeline), Projects (cards), About, footer.

Every role entry and every project card links to its detail page. Visual reference: `design-reference/b2-spice.html` (home) and `design-reference/project.html` (detail template). These are throwaway mockups kept locally and gitignored. They are the visual source of truth for layout and styling; this spec is the source of truth for behavior and rules.

## 4. Content model

Content lives in Markdown files under `src/content/` using Astro content collections.

- `src/content/work/<slug>.md`: roles.
- `src/content/projects/<slug>.md`: projects.

Frontmatter (validated with a Zod schema; build fails on invalid):

Roles: `company`, `title`, `dates` (display string), `start`, `end` (ISO), `summary`, `bullets[]`, `stack[]`, `logo` (path), `current` (boolean), `listed` (boolean, default `true`: show on the home timeline), `cleared` (boolean, default `false`: generate the detail page), `order` (number).

Projects: `name`, `kicker`, `lede`, `meta{role,status,stack}`, `repoUrl` (optional), `shot` (optional path), `summary`, `listed` (default `true`), `cleared` (default `false`), `order`.

The Markdown body of each file holds the detail-page sections: Problem, Architecture, Key decisions, Backend and data, Results and lessons.

Diagrams in v1 are small HTML/CSS box flows (as in the project mockup). Mermaid or SVG can replace them later without changing the content model.

Resume-derived facts (employer names, dates, metrics such as "32% better than baseline", "$30k+", "200+ staging deploys a week", "1st of 9") are the only numbers allowed. No invented metrics.

## 5. The cleared gate (safety)

Employer work and unreviewed drafts must never ship by accident.

- Every content file has `cleared: true|false`. Default is `false`.
- An entry with `cleared: false` is excluded from home page lists, routes, sitemap, and Open Graph. It generates no page.
- Build check: the build fails if any rendered output contains the marker `[to confirm]`, if a `cleared: false` entry has a built route, is linked from any page, or has its body text present in any built page (titles may appear because `listed` entries are shown on the home page), or if any internal link is broken.
- A `drafts/` folder is gitignored for work-in-progress text, so unreviewed writing never enters git history.
- Before the repo is first pushed, run a secrets scan (gitleaks) over the working tree and history.
- Employer pages (Tesla, Hanna, Micron, Blue Dome) are `cleared: false` until the owner has reviewed the text and is comfortable publishing it. Their entries on the home page may show only resume-level one-liners, which the owner has already chosen to publish on the resume. Whether the home page shows a role before its detail page is cleared is controlled by a separate `listed` flag (default `true` for resume-level content); a role with `listed: true, cleared: false` appears on the home timeline without a "Read the full write-up" link.

## 6. Visual design

Direction: simple and text-forward, flat continuous background, with restrained accents. Structure is inspired by a simple banded personal portfolio reference but implemented independently. Single content column, 56rem max width on home, 46rem on detail pages, 16px side gutter on mobile.

### Typography
- Inter (400, 500, 600, 700) for text.
- JetBrains Mono (400, 500) for dates, labels, tech chips, and section headers.
- Headings roman (never italic). Display name: `clamp(44px, 10vw, 92px)`, weight 700, tight tracking.

### Color tokens

Light:
- `--color-bg #f6f7f8`, `--color-fg #1e232a`, `--color-muted #5b6573`, `--color-rule #d8dce2`
- `--color-accent #3d5f9e` (links), `--color-num #7a3fe0` (violet "astro" accent: numbers, nodes, highlights)
- `--color-chip #e7e9ee`, `--color-card #ffffff`, `--color-dot #c9ced6`, `--color-glow rgba(122,63,224,.14)`

Dark:
- `--color-bg #1d2128`, `--color-fg #dce2ea`, `--color-muted #99a3b1`, `--color-rule #3a404a`
- `--color-accent #8fb0e0`, `--color-num #b794ff`
- `--color-chip #2f353e`, `--color-card #262b33`, `--color-dot #343b46`, `--color-glow rgba(183,148,255,.16)`

Note: "astro color" was interpreted as Astro's violet. It replaces the earlier amber. All colors are referenced through these CSS variables; no inline color values in components.

### Components (home)
- Top bar: wordmark text, light/dark toggle.
- Hero: availability pill ("Graduating Spring 2027 · San Jose, CA") with a gently pulsing violet dot; name blurs in word by word; subtitle with a rotating word ("AI agents", "evals and guardrails", "forecasting tools", "data pipelines"); buttons Resume, Email, LinkedIn, GitHub. Faint dot-grid background fading downward.
- Stat strip: four resume-derived numbers (32%, $30k+, 200+, 1st of 9) with captions.
- Experience timeline: vertical line with a node per role; current role (Tesla, Jun to Dec 2026) has a filled glowing node and a "current" tag. Each entry has a logo tile, title and company, mono dates, short impact text with key phrases highlighted, tech chips, and a "Read the full write-up" link when its page is cleared.
- Projects: three cards (placeholder screenshot until real images exist) with a cursor-following glow on hover.
- About: headshot (`Andrian Than Headshot.jpg`, optimized), short bio.
- Footer: hairline top border, "Built by Andrian Than", links.

### Detail page template
Back link, kicker, title, lede, meta row (role, status, stack), links, screenshot slot, then sections Problem, Architecture (box-flow diagram with the guard step highlighted), Key decisions (cards with Decision / Why / Trade-off), Backend and data, Results and lessons, and previous/next links.

### Motion and accessibility
- Motion: name blur-in, pulsing availability dot, rotating subtitle word, scroll fade-in-up, card spotlight, arrow nudge. Nothing else.
- `prefers-reduced-motion: reduce` disables all of the above (content shown static, subtitle shows the first word).
- Visible `:focus-visible` rings; text contrast at or above WCAG AA in both themes; clickable text stays on one line; no horizontal scroll at 320, 375, 414, or 768px.
- Theme: follows system setting by default; user choice stored in `localStorage` (reads and writes wrapped in try/catch; page works without it).

## 7. Assets
- Headshot: `~/Downloads/Andrian Than Headshot.jpg`, resized and compressed for web.
- Resume PDF: `~/Downloads/Andrian_Than_Resume 2.pdf`, published as `/resume.pdf`.
- Logos (kept in `public/logos/`, from `design-reference/logos/`): `tesla.svg` and `micron.svg` (Wikimedia Commons), `hanna.png` and `bluedome.png` (company site icons, low resolution). Employer logos are the companies' trademarks and are shown only to indicate where the owner worked. Higher-resolution official logos should replace the favicons if the owner supplies them. A logo is only included on a page that is itself listed or cleared.
- Project screenshots: start as labeled placeholders; `ai-swing-trader` has existing dashboard images in its repo.

## 8. Technical architecture

- Astro (static output), TypeScript, content collections with Zod schemas.
- `@astrojs/react` used for islands only: theme toggle, rotating subtitle word, card spotlight. These ship as small `client:load` or `client:visible` islands. Everything else is static Astro components, so the site works without JS except for the toggle and effects.
- Plain CSS with tokens in `src/styles/tokens.css`; no CSS framework. Fonts via Google Fonts link with `display=swap`.
- `@vercel/analytics` for analytics. `@astrojs/sitemap` for the sitemap (excludes non-cleared entries).
- Repo layout:
  - `src/pages/index.astro`, `src/pages/work/[slug].astro`, `src/pages/projects/[slug].astro`
  - `src/components/`, `src/content/`, `src/styles/`, `public/`
  - `scripts/check-build.mjs` (post-build safety checks)
  - `docs/superpowers/specs/`, `design-reference/` (gitignored)

## 9. Build checks

`npm run build` runs Astro's build, then `scripts/check-build.mjs`, which fails the build on:
1. Any `[to confirm]` marker in built HTML.
2. Any non-cleared entry with a built route in `dist/`, a link to it from any page, or its body text present in any built page (titles may appear because `listed` entries are shown on the home page).
3. Any broken internal link or missing asset reference.
4. Any `<img>` without `alt`.

Manual checks before each deploy: Lighthouse (performance, accessibility, SEO) on home and one detail page; viewport widths 320/375/414/768; light and dark; reduced-motion on.

## 10. Deployment

1. Local development in `~/Desktop/projects/portfolio`, committed locally.
2. Secrets scan with gitleaks on the full history before first push.
3. Create a **public** GitHub repo (requires owner approval at that step).
4. Connect to Vercel (CLI is logged in as `andrianthan`) so that pushes to `main` deploy to production and other branches get preview URLs. Enable Vercel Analytics.
5. Project name sets the URL (`<name>.vercel.app`); default `andrian-than`, availability checked at deploy time.
6. First production deploy ships the home page plus whichever pages are cleared. Remaining pages are added as content is written and approved.
7. Post-deploy verification on the live URL: mobile and desktop, both themes, resume download, link previews.
8. Custom domain can be attached later with no code change.

## 11. Content responsibilities
- Owner: Tesla, Hanna, Micron, and Blue Dome write-ups (architecture details I cannot read), approval of anything employer-related, official logos (optional), real project screenshots, final copy for the hero line, subtitle words, and About text.
- Draft by assistant, reviewed by owner: `ai-swing-trader` and `claude-token-saver` pages from their repos; AdvisorAI page once its code or notes are located.
- All copy in the mockups (subtitle words, availability pill, About paragraphs) is draft text.

## 12. Risks and notes
- Employer content: handled by the cleared gate, but the owner remains responsible for what they approve.
- Logo trademarks: shown for attribution only; easy to swap to plain text.
- Low-resolution favicon logos (Hanna, Blue Dome) may look soft.
- Three of the projects are trading agents; that is a coherent theme ("agents under deterministic guardrails") but narrow. The non-trading project pages (claude-token-saver, AdvisorAI) balance it.
- Google Fonts is a third-party request; acceptable for a personal site, can be self-hosted later.
