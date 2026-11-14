# Handoff — Tesla Center page, session 2 (2026-11-07)

Two threads: a **finished branch** awaiting human verification, and a **new
vision** from Andrian that restructures the page and has not been designed yet.

## Where things live

- Branch `feat/tesla-page` in worktree
  `/Users/andrianthan/Desktop/projects/portfolio-worktrees/tesla-page`.
- Implemented plan: `docs/superpowers/plans/2026-11-07-tesla-page.md` (untracked).
- Specs: `docs/superpowers/specs/2026-11-05-portfolio-design.md` (content gate
  §4–5, honesty rules), `2026-11-07-hanna-center-design.md` (multi-project page
  shape), `2026-11-07-side-rail-toc-design.md` (the rail).

## Thread 1 — the built branch is complete and verified

Six commits on `feat/tesla-page`, none merged (merging to main deploys —
Andrian's call only):

- `1e62ef0` work log content model + allowlist test
- `b36a22a` work log window (worklog.ts, WorklogDemo.tsx, worklog.css)
- `94bae62` six-section page body, five inline SVGs (at1–at5)
- `6af300c` template wiring ([slug].astro MULTI + demo) + --toc-list-height 380px
- `7f31f68` cleared: true, agent fixture refreshed, agent tests amended
- `260f1b8` final review fix pass (redrew at1/at3/at4, sticky-list sizing,
  35/35 routing attribution corrected, unsourced event claims removed,
  unwired tab roles → aria-pressed)

Evidence at handoff time: suite **434/434**, `npm run build` → `check-build:
ok`, `/work/tesla` in the sitemap, built-page number check clean ("all numbers
on the page are accounted for"). A final whole-branch review ran; its 6
Important findings were fixed in one pass. **Deferred minors** (from the final
report): dangling aria-controls on collapsed rows; single-digit slack in the
built-page allowlist; island strings live in the JS bundle so the built-page
check cannot see the window; `.qa` button override relies on CSS import order;
stale "three rows" comment in projects.css + extra jump clearance on 3-row
pages; "every other demo" overstatement; LightGBM unnamed in the window;
fixture is one minified line.

A dev server was left running for Andrian's verification: **pid 76514,
http://localhost:4322** (stop with `astro dev stop`).

Still outstanding from the old plan: Andrian's **manual verification checklist**
(Lighthouse ≥95 mobile on /work/tesla and /, no horizontal scroll at
320/375/414/768px in page and window, AA in both themes, reduced motion,
home timeline "Read the full write-up" link, agent answers "what did you do at
Tesla" with on-page numbers). He opened the dev server but has not reported
results; instead he pivoted to the new vision below.

## Thread 2 — Andrian's new vision (NOT designed, NOT approved)

Andrian reviewed the page and said (his words, lightly cleaned):

> the demos aren't included accordingly, and not all the projects were
> included. My vision is a mockup demo thing of the SDP dashboard at the top
> which showcases a whole mockup version of the dashboard, and then we can
> start that off as the main project — the architecture of the dashboard, the
> memory storage constraints architecture and stuff. And then we can do
> in-depth: next the Ask SDP, next the Forecast Lab, next the campaign tab,
> the part summary page. We didn't include all the major projects like the
> slideshow automation page, the admin page and stuff.

Interpretation to confirm with him (do not treat as decided):

1. **Hero mock dashboard** — a large interactive mockup of the SDP dashboard
   at the top of the page, in the spirit of the existing demo windows but as
   the page's lead artifact. The dashboard becomes the page's **first/main**
   project section, with its own architecture story, including something he
   called the "memory storage constraints architecture" (meaning unknown —
   ask; sounds like data-size/memory-budget constraints that shaped the
   design).
2. **Then in-depth sections per project**: Ask SDP, Forecast Lab, then NEW
   projects not currently on the page: the **campaign tab**, the **part
   summary page**, the **slideshow automation page**, the **admin page**, and
   "stuff" — ask him for the complete list so nothing is missed twice.
3. **"Demos aren't included accordingly"** — read as: each major project
   should carry its own demo/mockup window the way Hanna and Blue Dome pages
   do; today the Tesla page has only the work log window.

Critical constraints that bind the new work (from the plan's Global
Constraints, which the new design must keep):

- Every NUMBER on the page comes from `public/resume.pdf` (the plan's Facts
  block). The resume does NOT cover the campaign tab, part summary page,
  slideshow automation, or admin page — Andrian is the source for what those
  are; numbers for them must either exist on the resume or not appear.
  Mock demo content may use invented/mock figures only inside clearly
  labeled mock windows (the established pattern).
- No employer-confidential detail: no real names, hosts, ports, env vars,
  repo paths, ticket/part numbers or SKUs, codenames, internal dollar
  figures, internal team/org/dataset names. "Part summary page" as a page
  name is fine; actual part numbers are not.
- A page that shows a demo carries the "Sample data" note (automatic via the
  template).
- Multi-project template mechanics: `MULTI` set in `src/pages/work/[slug].astro`,
  `demoFor()` maps heading-id prefixes to demo components, the `Demo` union
  and its `never`-typed switch are the type check. Six `##` sections and
  `--toc-list-height` are sized to the row count — more sections mean the
  rail/heights/snapshot chunk tests all move (the agent snapshot test
  expects 7 `role:tesla` chunks and respond/run tests encode trace text;
  the fixture must be regenerated after any body change).

## Where the conversation stopped

Brainstorming had just started (skill invoked, playback delivered, zero
questions asked yet). Nothing designed, no approaches laid out, no design
doc, no approval. Do NOT build until Andrian approves a design doc
(brainstorming HARD-GATE), then plan via superpowers:writing-plans.

## Suggested first questions for the new session (one at a time)

1. The hero dashboard mockup: what does a visitor see and interact with —
   which tabs/panes of the dashboard does the mock show, and does it pull
   from one shared mock dataset with the per-project demos?
2. The "memory storage constraints architecture" — what was the actual
   constraint and the shape it forced, in his words (this becomes the
   dashboard section's architecture story)?
3. The complete project list in final page order (dashboard, Ask SDP,
   Forecast Lab, campaign tab, part summary, slideshow automation, admin,
   anything else?) — this sets section count, rail size, and how many demo
   windows to build.
4. For each new project: which get full Problem/What-it-does/Architecture/
   Decisions/Impact treatment vs shorter entries, and which get a demo?

Branch/merge discipline unchanged: never push or merge to main without
Andrian's explicit "merge to prod main" in chat.
