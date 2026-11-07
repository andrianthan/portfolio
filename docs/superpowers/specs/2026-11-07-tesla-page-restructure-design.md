# Tesla page restructure — design

Status: draft for Andrian's review (2026-11-07). Branch `feat/tesla-page`.
Supersedes the six-section body shipped in `260f1b8`. Builds on
`2026-11-07-hanna-center-design.md` (multi-project page shape) and
`2026-11-07-side-rail-toc-design.md` (the rail).

## Goal

Restructure `/work/tesla` so the SDP dashboard is the lead project and every
major project has its own section and its own demo window, in the same shape
as the Hanna Center and Blue Dome pages.

## Decisions (from the brainstorm)

1. **Hero** is a dashboard-looking frame with a nav of all project tabs. Only
   the Overview view is live (mock KPIs, charts, filters). Other nav items
   scroll to that project's own demo below. The Work log is a small view in the
   frame. The hero section carries the dashboard architecture story.
2. **No shared React shell.** Each project demo is its own island with its own
   state. Shared: one `fixtures.ts` of fake parts, people and numbers, the
   existing demo-window chrome, and the automatic "Sample data" note.
3. **Numbers.** The Facts block is rebuilt from Andrian's confirmed notes
   (2026-11-07), including impact figures. Part numbers, personal names, team
   names and internal codenames are replaced with invented or generic
   stand-ins. Claim labels from the notes carry over: forecast dollars are
   exposure removed, not cash; the 2 h to 25 min spike result is
   planner-reported and not multiplied by user count; the hourly rate is a
   placeholder; backtest dollars stay separate; held-for-verification parts are
   uncounted. Not claimed: default-deny enforcement, a chat product in Teams,
   per-tab processes, booked savings.
4. **Naming.** Public technology by name (React, FastAPI, DuckDB, ClickHouse,
   Chronos-2). Internal systems get generic names (the demand forecast, the
   firming system, the weekly ETL).
5. **Gate.** `cleared: true` stays Andrian's switch. No push or merge to main
   without an explicit "merge to prod main".

## Page structure

Eight `##` sections, each with Problem, What it does, Architecture (inline
SVG), Key decisions, Impact, About the demo, and a demo window:

| # | Section | Absorbs | Demo window |
|---|---|---|---|
| 1 | Dashboard | old Planning app, Data pipelines | Frame with live Overview; nav scrolls to demos; Work log view |
| 2 | Part Summary | | Part search, then six sub-tabs |
| 3 | Ask SDP | old Evals and CI | Chat with grounded answers and a verdict |
| 4 | Forecast Lab | | Mock firm: dry-run preview, then commit |
| 5 | Campaigns | | Alerts, parts, campaigns, unlisted demand; P10/P50/P90 simulator |
| 6 | Slideshow generation | | Regenerate a deck; mock PPTX download |
| 7 | Modular architecture | | Tab manifest, auto-discovery, kill switch, skipped broken tab |
| 8 | Admin | | Per-user usage, LLM spend, access grants, audit log |

Part Summary sub-tabs: Overview (AI-generated status insights), Consumption,
Failure rates, Location by build-year matrix, Correction-code matrix,
Breakdown (customer symptoms and correction codes).

The like-part tab is owned by a teammate. It appears inside section 7 as the
proof that contributors can ship tabs, credited to a teammate with no name,
worded "built on / contributed to". It is not its own section.

Dashboard architecture story (section 1): cold opens used to rebuild data on
the request path. Fix: warm at startup, serve the last good copy or an instant
"warming up", never build per request. Warming costs memory, so the design adds
one shared warm build across workers via disk snapshots, single-flight for
concurrent requests, pooled connections, a bounded warm-up semaphore, and a
memory ceiling that stops hot-part warming. Trade-off: memory bought for
latency.

## Mechanics that change

- `src/content/work/tesla.md`: body rewritten to the eight sections.
- `src/pages/work/[slug].astro`: `MULTI`, `demoFor()` prefix map, and the
  `Demo` union with its `never` switch gain eight entries.
- `--toc-list-height` and the sticky list resize for eight rows (check 320 px).
- Eight new SVGs; the five old inline SVGs are redrawn or retired.
- Eight demo islands under `src/components/tesla/`, each `client:visible`.
- Agent fixture regenerated; snapshot (chunk count) and respond/run tests
  updated.
- Allowlist test and built-page number check rebuilt from the new Facts block.
  Add a source-level number scan on the island files, because island strings
  are invisible to the built-page check.

## Build order

1. Content rewrite, Facts block, rebuilt allowlist test.
2. `fixtures.ts` and template wiring.
3. Eight architecture SVGs.
4. Eight demo islands in page order (independent, parallelizable).
5. Regenerate agent fixture and update tests.
6. Final pass: a11y both themes, Lighthouse, reduced motion, 320 to 768 px.

## Testing

Per island: unit tests on mock logic plus a render test. Suite green at each
step; `npm run build` with `check-build: ok`; sitemap includes `/work/tesla`.
Manual checklist from the session-1 handoff still applies.

## Risks

- Island JS weight against Lighthouse 95 or higher on mobile: every island is
  lazy via `client:visible`.
- Rail height with eight rows on small screens.
- Page length: mitigated by the rail and the hero nav.

## Out of scope

Real data, any backend, merging to main, changes to other work pages.

## Open items

- Work log: default is a small view inside the hero frame; Andrian may drop it.
- Exact impact numbers are transcribed from Andrian's notes during the plan
  step and shown to him before they go on the page.
