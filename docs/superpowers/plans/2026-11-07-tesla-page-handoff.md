# Handoff: integrate the Tesla Center experience

Paste the block below into the new session. It is self-contained.

---

CONTINUE ANDRIAN THAN'S PORTFOLIO: write and ship the Tesla Center role page.

REPO: /Users/andrianthan/Desktop/projects/portfolio (public: github.com/andrianthan/portfolio)
Live site: https://andrian-than.vercel.app — Vercel is git-connected, so a push to `main` DEPLAYS TO
PRODUCTION. Never push `main` or deploy without Andrian's explicit "merge to prod main" in chat.

WORK IN A SEPARATE WORKTREE. Another session is working on the cursor-field/background motion on the
branch `feat/cursor-field` in the main checkout — do not touch that branch, and do not work on `main`
directly. Use superpowers:using-git-worktrees to create your own worktree off `main`, and use
superpowers:subagent-driven-development to execute (a fresh implementer per task, a review after each).
MODEL FOR EVERY IMPLEMENTER AND REVIEWER: minimax/MiniMax-M3.1-Flash. No external models.

READ FIRST (they are the contract):
- docs/superpowers/specs/2026-11-05-portfolio-design.md — the base site spec (the content gate, the
  honesty rules, the accessibility rules)
- docs/superpowers/specs/2026-11-06-redesign-design.md — the current look (near-black, purple accent,
  gradient display type, no pills, open unboxed sections)
- docs/superpowers/specs/2026-11-06-intro-terminal-design.md — the home page's chat card
- src/content/work/hanna.md and src/content/work/bluedome.md — the two published role pages; match their
  structure and voice
- src/pages/work/[slug].astro and src/layouts/Detail.astro — how a role page is rendered

WHAT "INTEGRATE THE EXPERIENCE WITH TESLA" MEANS
Write the Tesla Center role write-up and publish it: a real architecture page for the role, in the same
shape as the Hanna Center and Blue Dome pages, so a recruiter can read what he actually built and shipped.
Tesla is currently `cleared: false`, so it has no page today.

THE GATE IS THE SAFETY MECHANISM. Every content entry has `listed` (default true) and `cleared` (default
false). Only `cleared: true` entries get a page, a sitemap entry, or body-derived snapshot chunks. When
the write-up is finished and Andrian has approved the words, set `cleared: true` on the Tesla entry.
`npm run build` runs scripts/check-build.mjs, which fails the build on: any `[to confirm` marker anywhere
in the built output, a route/link/body-text leak from a non-cleared entry, a broken internal link, a
missing img alt, or empty inputs. The agent snapshot (/agent-data.json) is built from the same gate.

THE FACTS ARE IN THE PUBLIC RESUME (public/resume.pdf). Use only these — no invented metrics, no
speculation about internal systems. AI Software Engineer Intern, Tesla, Jun 2026 – Dec 2026, on the AI
Service Demand Planning Copilot:
- Built and shipped the planning app (React/FastAPI) planners use to investigate demand spikes: a shared
  component library, route modules behind a thin app entry point, a data-client facade over domain
  modules, lint guards that enforce the shared layers, and a visual regression harness across 165 routes.
- Built Ask SDP, a tool-calling LLM copilot over live consumption data, with numeric grounding so answers
  can't contain invented figures: an output rail checks every number against tool results, a code-gated
  routing floor forces tool use, a typed verdict stops the model flipping conclusions, and a sandboxed
  Python tool (AST allow-list, no network) feeds verified results back in.
- Graded routing, metrics and grounding changes in CI with a golden-set eval harness: a fabricated number
  must fail a negative control, tool-routing coverage 35/35 with 0% free-route answers, 17/17 metric
  intents, micro-F1 0.854 against a 0.80 threshold.
- Ran forecasting experiments comparing LightGBM, Chronos-2 and TimesFM (lag-0 error $17.0M to $11.6M on
  backtest, 32% better than baseline), then shipped Forecast Lab: Chronos-2 forecasts, a watchlist and
  forecast shaping, with guarded write-back to the planning system.
- Built the data pipelines behind the app: weekly demand data into a 77-slide executive deck (20+ hours of
  reporting saved per run), plus automated DuckDB freshness (verified builds, atomic swap, 10-minute
  polling).
- Built a GitHub Actions staging-to-prod pipeline for a team pushing untested code to main: per-branch
  staging deploys, auto-opened draft PRs, prod deploys on merge — supporting 200+ staging deploys a week
  across 10+ data analysts and demand planners.
- Mentored 30+ people in the service supply chain org on working with AI coding tools (Cursor, Claude
  Code): prompting and context practices, how to review and verify AI-generated changes, safe AI practices.
The current frontmatter summary on the Tesla entry stays as the one-line home-page card; the write-up
goes in the Markdown body.

THE OWNER OWNS THE WORDS. The base spec assigns the employer write-ups to Andrian (you cannot read his
employer's systems). So: draft the page from the resume and the site's existing voice, then put the
DRAFT IN FRONT OF ANDRIAN before setting `cleared: true`. Write it as a real architecture page — the
problem, the architecture, the key decisions and why, the backend and data, the results and lessons —
not a job description, and not a list of bullet points with no reasoning. Same honesty rules as the rest
of the site: every number from the resume, nothing invented, no employer-confidential detail, and if a
figure is an estimate rather than a measured one, say so.

QUALITY BAR (the same as the rest of the site): Lighthouse mobile on every page at least 95 in every
category; no horizontal scroll at 320/375/414/768px; reduced motion respected; contrast AA in both
themes; `npm test` green; `npm run build` ends with `check-build: ok`. The site's own agent (a
deterministic, no-LLM agent in src/agent/) reads this content, so anything you publish becomes
retrievable and quotable — write it so a query like "what did you do at tesla" answers well.

DO NOT: push main, merge to main, deploy, change the build script, vercel.json, the content gate's
semantics, or add dependencies. Commit messages end with the trailer
`Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`, authored as
`Andrian Than <andrian.than.api@gmail.com>`; git 2.53 rejects `-c` after `-m`, so use
`git -c user.name="Andrian Than" -c user.email="andrian.than.api@gmail.com" commit -m "<msg>" -m "Co-Authored-By: ..."`.

WHEN THE PAGE IS APPROVED AND GREEN: report the numbers, then ask Andrian whether to merge to prod main.

---
