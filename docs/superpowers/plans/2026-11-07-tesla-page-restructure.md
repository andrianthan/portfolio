# Tesla Page Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/work/tesla` as eight project sections (Dashboard, Part Summary, Ask SDP, Forecast Lab, Campaigns, Slideshow generation, Modular architecture, Admin), each in the Hanna/Blue Dome shape with its own architecture SVG and its own independent demo island.

**Architecture:** One markdown body (`src/content/work/tesla.md`) split by `##` headings; the template (`src/pages/work/[slug].astro`) maps heading-id prefixes to demo islands via `demoFor()`. Every demo is an independent React island (own state module, own tests, `client:visible`). Demos share only `src/components/tesla/fixtures.ts` (fake parts, people, campaigns) and the existing `.qa` window chrome. A single `tesla-facts.ts` is the source of truth for every number allowed on the page.

**Tech Stack:** Astro 7, React 19, TypeScript, Vitest 4, gray-matter. Branch `feat/tesla-page`, worktree `/Users/andrianthan/Desktop/projects/portfolio-worktrees/tesla-page`.

**Spec:** `docs/superpowers/specs/2026-11-07-tesla-page-restructure-design.md` (read it first). Prior plan for conventions: `docs/superpowers/plans/2026-11-07-tesla-page.md`.

## Global Constraints

- Run everything from the worktree root. Never `git stash`. Never push or merge to main (merging deploys). Commits end with the line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- `cleared: true` and the frontmatter `summary` in `tesla.md` stay exactly as they are (`tesla-cleared.test.ts` enforces it).
- Numbers: every number in the page prose comes from `tesla-facts.ts` (Task 1). Mock demo figures are allowed only inside demo windows, which must render the `qa-sample` "sample data" label.
- Banned anywhere on the page or in any demo: real person or team names, real part numbers (pattern `\d{6,}-[A-Z0-9]{2}-[A-Z0-9]`), PR/ticket numbers (`#\d+`), commit hashes, hosts/ports, env-var names, internal codenames. Public tech is allowed by name (React, FastAPI, DuckDB, ClickHouse, Chronos-2). Internal systems use generic names: "the demand forecast", "the firming system", "the weekly ETL", "the planning service".
- Claim labels (use these words in Impact sections): "measured (local)", "measured (stage)", "planner-reported", "estimate", "not booked". Dollars are forecast exposure removed, not cash. Never multiply the 2 h to 25 min result by user count. The hourly rate is a placeholder, not an employer rate. Backtest dollars stay separate. Held-for-verification parts are uncounted.
- Never claim: default-deny enforcement (built, flag off), a chat product in Teams, per-tab processes, booked savings, the "50+ users" figure as a measured count.
- Every section: `### Problem`, `### What it does`, `### Architecture` (with one `<figure class="arch">` SVG, Task 3), `### Key decisions`, `### Impact`, `### About the demo`.
- Demo islands: default export, `client:visible`, markup root `<div className="qa ..." role="group" aria-label="Sample …">`, top bar `<div className="qa-top">` with `<span className="qa-sample">sample data</span>`, tab buttons use `aria-pressed` (not tab roles), no hover-only controls, 44px touch targets, no motion that ignores `prefers-reduced-motion`. Pattern file: `src/components/tesla/worklog/WorklogDemo.tsx`. Chrome CSS: `src/components/qa/qa.css`.
- Layout must work with no horizontal scroll at 320, 375, 414, 768 px.
- Test command: `npm test`. Full gate: `npm test && npm run build` (build runs `check-build`).

## File Structure

| File | Responsibility |
|---|---|
| `src/content/work/tesla-facts.ts` | Allowed-number list + banned-term list, imported by tests |
| `src/content/work/tesla.md` | Page body, eight sections |
| `src/content/work/tesla.test.ts` | Body structure, banned terms, numbers |
| `src/content/work/tesla-figures.test.ts` | SVG count, labels, arrowheads |
| `src/content/work/tesla-islands.test.ts` | Island source scan (label present, banned terms absent) |
| `src/components/tesla/fixtures.ts` + `fixtures.test.ts` | Shared fake data |
| `src/components/tesla/<name>/` | One folder per demo: `<Name>Demo.tsx`, `<name>.ts` (logic), `<name>.test.ts`, `<name>.css` |
| `src/pages/work/[slug].astro` | `MULTI`, `Demo` union, `demoFor()`, switch cases |
| `src/styles/projects.css:61` | `--toc-list-height` for 8 rows |
| `src/content/work/tesla-page.test.ts` | Template wiring tests |
| `src/agent/fixtures/snapshot.json`, `src/agent/run.test.ts`, `src/agent/snapshot.test.ts` | Agent fixture + trace text |

Demo folders: `dashboard`, `partsummary`, `asksdp`, `forecastlab`, `campaigns`, `slides`, `modular`, `admin`. The existing `worklog` folder is kept unchanged and reused as a view inside `dashboard`.

---

### Task 1: Facts file and rewritten body tests (red)

**Files:**
- Create: `src/content/work/tesla-facts.ts`
- Modify: `src/content/work/tesla.test.ts` (full rewrite)
- Modify: `src/content/work/tesla-page.test.ts` (later, Task 13)

**Interfaces:**
- Produces: `ALLOWED_NUMBERS: readonly string[]`, `BANNED_TERMS: readonly string[]`, `SECTION_TITLES: readonly string[]`, `SECTION_IDS: readonly string[]` from `tesla-facts.ts`.

- [ ] **Step 1: Write `tesla-facts.ts`**

```ts
// Every number the Tesla page prose may state. Source: Andrian's confirmed
// notes (2026-11-07) plus the public resume. The page test fails on any other
// number, so adding a figure to the page means adding it here on purpose.
// Basis labels: (local) laptop, (stage) stage build, (PR) quoted, (estimate).
export const SECTION_TITLES = [
  'Dashboard', 'Part Summary', 'Ask SDP', 'Forecast Lab',
  'Campaigns', 'Slideshow generation', 'Modular architecture', 'Admin',
] as const;

export const SECTION_IDS = [
  'dashboard', 'part-summary', 'ask-sdp', 'forecast-lab',
  'campaigns', 'slideshow-generation', 'modular-architecture', 'admin',
] as const;

export const ALLOWED_NUMBERS: readonly string[] = [
  // resume
  '32%', '0.854', '0.80', '35', '0%', '17', '165', '77', '20+', '200+', '10+', '30+', '$17.0M', '$11.6M', '10', '2', '1',
  // dashboard: cold-load and delivery (local/stage)
  '71', '100', '6', '112', '4.4', '110', '189', '250', '12', '6.9', '2.4', '0.05', '50', '22', '8.5', '9', '0.2',
  '5.8', '1.1', '335', '2.3', '0.37', '25', '4.6', '1.9', '39', '11', '196', '16',
  // dashboard: memory
  '1.75', '3.6', '4.0', '3500', '15',
  // ask sdp
  '109', '8.3%', '4', '1375', '1639',
  // forecast lab
  '87', '4.9', '300', '6.8', '20', '24.9', '54M', '9.7',
  // campaigns
  '223', '131', '54', '$13.3M', '44', '$4.9M', '$11k', '1.5M', '$8.4M', '$1.2M', '$2.5M', '25%', '50%', '26',
  '141', '$56M', '$6.5M', '$9.3M', '36', '23', '94', '13', '3', '$3.7M', '75%', '60%',
  // time saved (placeholder rate)
  '8', '1.58', '200', '660', '$20k', '$66k', '80', '$8k', '45', '39', '$0.6k', '$3.9k', '117', '29', '$2.9k', '30', '12', '$3.6k',
  '350', '$30k', '$35k', '$100',
  // modular architecture
  '445', '44', '11', '28', '242,563', '217,514', '10.3%', '405', '46', '3,141', '597', '5,048', '93', '2,008', '852', '24.1k',
  // data freshness
  '66M',
];

export const BANNED_TERMS: readonly string[] = [
  'Krutarth', 'Krutharth', 'Ananthan', 'Anthan', 'Ragini', 'Sahel', 'Saheel', 'Ramji', 'Pritish', 'Adiga', 'Miguel',
  'Grace Chen', 'sranji', 'krumehta', 'Cybercab', 'North Star', 'RhinoInsight', 'Hyperresearch', 'ZipLabs',
  'Demand Engine', 'WARP', 'DEPROD', 'SDPDB', 'SDP_DEFAULT_DENY', 'sdp-dashboard-unification', 'sdp_kpi', 'local-dev',
  '3006', 'Teams chat',
];
```

Note: executors must remove any token above that the final prose does not use only if the test for "every allowed number is used" is added; it is not required. Keep the list as the contract.

- [ ] **Step 2: Rewrite `src/content/work/tesla.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ALLOWED_NUMBERS, BANNED_TERMS, SECTION_TITLES } from './tesla-facts';

const raw = fs.readFileSync(path.resolve(process.cwd(), 'src/content/work/tesla.md'), 'utf8');
const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const prose = body.replace(/<svg[\s\S]*?<\/svg>/g, '');

describe('the tesla page body', () => {
  it('has the eight sections in order', () => {
    const heads = [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
    expect(heads).toEqual([...SECTION_TITLES]);
  });

  it('gives every section its subsections in order', () => {
    const sections = body.split(/^## /m).slice(1);
    expect(sections).toHaveLength(8);
    for (const s of sections) {
      const subs = [...s.matchAll(/^### (.+)$/gm)].map((m) => m[1].trim());
      expect(subs).toEqual(['Problem', 'What it does', 'Architecture', 'Key decisions', 'Impact', 'About the demo']);
    }
  });

  it('carries no to-confirm marker and no raster image', () => {
    expect(body.toLowerCase()).not.toContain('[to confirm');
    expect(body).not.toMatch(/<img/i);
    expect(body).not.toMatch(/!\[[^\]]*\]\(/);
  });

  it('names no real person, team or internal identifier', () => {
    for (const needle of BANNED_TERMS) expect(body.toLowerCase()).not.toContain(needle.toLowerCase());
    expect(body).not.toMatch(/#\d+/);
    expect(body).not.toMatch(/\b\d{6,}-[A-Z0-9]{2}-[A-Z0-9]\b/);
    expect(body).not.toMatch(/\b[0-9a-f]{7,40}\b/);
  });

  it('states only numbers from the facts file', () => {
    const found = prose.match(/\$?\d[\d,]*(?:\.\d+)?(?:[kKmM])?[%+]?/g) ?? [];
    for (const token of found) expect(ALLOWED_NUMBERS, `unlisted number "${token}"`).toContain(token);
  });

  it('labels every impact claim with a basis word', () => {
    const impacts = body.split(/^### Impact$/m).slice(1).map((s) => s.split(/^### /m)[0]);
    expect(impacts).toHaveLength(8);
    const basis = /(measured \((local|stage)\)|planner-reported|estimate|not booked|not measured)/i;
    for (const imp of impacts) expect(imp, imp.slice(0, 80)).toMatch(basis);
  });

  it('never makes a forbidden claim', () => {
    const lower = prose.toLowerCase();
    expect(lower).not.toMatch(/default-deny[^.]*\b(enforc(es|ing|ed)|on)\b(?![^.]*(not|off|built))/);
    expect(lower).not.toContain('50+ users');
    expect(lower).not.toMatch(/per-tab process(es)?[^.]*\b(runs|run|built|shipped)\b(?![^.]*\bnot\b)/);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/content/work/tesla.test.ts`
Expected: FAIL (`has the eight sections in order` — old six headings).

- [ ] **Step 4: Commit**

```bash
git add src/content/work/tesla-facts.ts src/content/work/tesla.test.ts
git commit -m "test: red tests for the eight-section Tesla body

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Rewrite the page body (prose, eight sections)

**Files:**
- Modify: `src/content/work/tesla.md` (keep lines 1-14 frontmatter untouched; replace everything after `---`)
- Read for reuse: current `tesla.md` sections (Ask SDP, Forecast Lab, Planning app, Evals and CI, Data pipelines)

**Interfaces:**
- Consumes: `ALLOWED_NUMBERS`, `SECTION_TITLES`.
- Produces: eight `##` sections whose heading ids (Astro slugging) are exactly `SECTION_IDS`.

Content brief per section. Write each as Problem (2-3 sentences), What it does (4-6 bullets), Architecture (one intro sentence + 4-6 bullets; the SVG is added in Task 3 above the bullets), Key decisions (3-4 bullets with the trade-off), Impact (bullets with basis labels), About the demo (2-3 sentences: what the window does, that it runs on mock data, which behaviour is real logic). First paragraph under each `##` is a one-paragraph summary (the template places the demo after it).

1. **Dashboard.** Summary: the unified planning dashboard, React + FastAPI, shipped end to end. Problem: every cold open rebuilt data on the request path against several backends; pages blocked for minutes; simultaneous users each triggered their own build; navigating back refetched everything. What it does: Overview / Part Summary / deep dive, Ask, Forecast Lab, Campaigns, KPI tabs, Home, Admin in one app. Architecture: warm at startup and serve the last good copy or an instant "warming up" 503, never build on the request path; one shared warm build across workers via atomic disk snapshots; single-flight so concurrent requests share one build; pooled connections and one shared DuckDB connection with a memory limit; bounded warm-up semaphore; an RSS ceiling that stops hot-part warming; stale-while-revalidate cache in the frontend; gzip plus lazy charts. Also folds the data-freshness story: weekly runs that showed green but wrote no file, a loader that deleted the live database before failing, association data frozen; fixed with streaming stitch, fail-loud CI and loaders, atomic builds with verification, polling every 10 minutes (was 6 hours), freshness gates; ~66M rows restored, association data moved from 2026-05-04 to 2026-07-06 (write dates as "early May" and "early July"). Key decisions: warm instead of build per request (memory bought for latency); the ceiling caps pre-warming (hot-part warming stopped at 15 of 25); dashboard reads are SELECT-only; fail loud. Impact (use the Facts: before to after, label each (local) or (stage)): first cold load 71 to 100 s down to 6 s (local); six simultaneous cold loads 112 s down to 4.4 s (local); first request after restart blocked 110 to 189 s, now "warming up" in under 250 ms (local); back from Part Summary 12 requests / 6.9 MB / 2.4 s down to 0 requests / 0.05 s (local); Campaigns load 22 requests / 8.5 MB down to 9 requests / 0.2 MB (local); entry JavaScript 5.8 MB down to 1.1 MB raw, 335 KB gzipped (use "335 KB" only if you add `'335'` — it is in the list); first paint 2.3 s down to 0.37 s at 25 Mbps (local); stage Overview rows about 4.6 s and Campaigns about 1.9 s (measured (stage)). Cost to watch: stage RAM idled at 1.75 GB and reached 3.6 to 4.0 GB after opening every deep-dive tab on a cold part; the ceiling is 3500 MB; production runs one worker and is not yet verified. Confidence line: direction high, exact figures medium (local and stage mix).
2. **Part Summary.** Search a part; sub-tabs Overview (AI-generated insights on current status), Consumption, Failure rates, Location by build-year matrix, Correction-code matrix, Breakdown (customer symptoms and correction codes). Problem: planners had to pull each of these from separate reports to understand one part. Architecture: slices load per sub-tab, single-flight, pooled SQL clients, weekly demand aggregation, stream-in with retry on timeout. Decisions: one playbook, two skins (Ask is interactive; Part Summary is the auto one-stop); narrowing path plus verdict plus exhibit titles; a chart is omitted unless it has a purpose and a because; captions that could push planners to firm wrong were removed. Impact: planner-reported a spike investigation went from about 2 hours to about 25 minutes (reported, not measured; not multiplied by user count); back-navigation numbers are in Dashboard.
3. **Ask SDP.** Absorbs Evals and CI (reuse existing prose). Facts: 9 of 9 reproduced dead-ends fixed (8.3% of 109 mined real turns); routing and metrics gated in CI (17/17 metric intents, micro-F1 0.854 vs 0.80 gate); Ask mean answer 39 s to 11 s, slowest narrative 196 s to 16 s; 35/35 routing (resume figure, keep the existing attribution wording from the current Ask SDP section); 1375 backend tests and 1639 frontend tests (measured (stage)). Decisions: the LLM writes every answer, the verdict is input plus a checker; a typed planner verdict the model cannot override; sandboxed Python escape hatch.
4. **Forecast Lab.** Facts: firming used to mean exporting a CSV, filling a template and uploading by hand; batches of 4+ parts took 50 to 87 s and 6+ timed out, failures were swallowed so overlays came back empty. Built a warm Chronos-2 runner, Firm Selected with dry-run preview then commit to the firming system, South America warehouses, shaping and buffer layers, backtest switcher (off by default). 4 parts 87 s down to 4.9 s; 6 parts over 300 s (timeout) down to 6.8 s; 20 parts timeout down to 24.9 s with identical forecast output; cause was a database query-plan flip on a 54M-row table, fixed with an index hint, not a model change; warm runner 9.7 s first call down to 1.1 s (measured (stage), re-measured on stage). Time saved estimate: 20 firms a week x 15 minutes x 16 weeks is about 80 hours (estimate, placeholder rate). Keep the existing "32% better than baseline on backtest" claim where the current page has it.
5. **Campaigns.** Facts and wording in the Facts block below ("Campaigns"). Must include the basis sentence: figures come from a snapshot taken 22 October on a development copy, not production; dollars are forecast exposure removed, not cash; held parts are reported separately and not counted; backtest evidence is separate and not booked.
6. **Slideshow generation.** Weekly executive deck regeneration inside the app (regenerate plus PPTX download; composer controls hidden as work in progress) and the weekly ETL behind it: a weekly GitHub Actions run, accessories KPI automation, and a weekly Part Miss by Lag CSV published every KPI Monday. Reuse the current Data pipelines deck text (77-slide executive deck is on the resume). Impact: hours saved per cycle not timed (say "not measured"); time-saved estimates: weekly CSV 45 minutes x 8 Mondays is about 6 hours (estimate). The scheduled Monday run was stopped on 6 November (write "was later stopped").
7. **Modular architecture.** Reuse refactor: 445 files, 44 commits, 11 sessions behind a 28-shot deterministic visual harness; lines of code 242,563 down to 217,514 (10.3% fewer); raw buttons 405 down to 2; unwrapped fetches 46 down to 8 allowlisted; main app file 3,141 down to 597 lines; data client 5,048 down to a 93-line facade; engine 2,008 down to 852; legacy agent deleted (24.1k lines) behind an import guard; route table byte-identical (165 routes, resume figure). Contributor tabs: a tab is a manifest plus one frontend file; the shell auto-discovers and mounts it behind sign-in with a runtime kill switch; a tab that fails to import is skipped and reported. The like-part tab was contributed by a teammate and is the first outside-style tab ("built on / contributed to"). Not built: per-tab processes (proposal only), so a hanging tab can still affect others — state this plainly in Key decisions.
8. **Admin.** Per-person and per-group tab access, Ask data categories, audit log, dry-run and check actions, a default-deny gate (built; enforcement is off until a server flag is set, so say "built, not yet enforcing"), per-person usage computed from the request log (active days over 30 days, visits over 7 and 30 days where a visit is requests with gaps under 30 minutes, top tab, Ask request count, LLM spend), and a per-tab LLM usage ledger on the Status view. Problem: access was managed by editing code and nobody could see who used the dashboard (the sign-in table held one stage user, so People showed 1). Admins are separate from full access. Impact: the first real usage count is now readable from production traffic (say "a real count is now readable; it replaces the resume's 50+ users claim once read"); do not state any user count. Decision: usage comes from the request log, not sign-ins.

Facts block for Campaigns (all numbers are in `ALLOWED_NUMBERS`): scope 223 campaign-linked parts, 131 campaigns, 54 parts on the wind-down alert list, 6 planners receiving alerts; flagged cut about $13.3M across the 54 alert parts; actionable 44 parts about $4.9M (median $11k per part, 1.5M units; top 5 parts about 60% of it); held for verification 10 parts about $8.4M (unexplained bulletin demand or low-confidence complaint demand), excluded; impact about $1.2M to $2.5M of excess forecast exposure removed over 26 weeks (25% to 50% of the actionable $4.9M; 75% would be $3.7M) — label "estimate"; context 141 of 223 parts had a positive 2-year over-forecast, about $56M at unit cost, which is the size of the problem and not part of the impact; backtest evidence (separate, not booked): the shipped model was $6.5M to $9.3M closer to actual use than the books across 36 flagged parts and 23 campaigns; completion simulator P10/P50/P90 backtested on 94 past campaigns; wind-down gate: campaign pace share of service units, best of 8, 13 and 26 weeks, threshold 10%; four views (alerts, all parts, campaigns, unlisted bulletin demand) plus CSV export and on-hand inventory by warehouse; weekly notices: one email per planner with only their parts, a consolidated copy to the team, and one listing bulletin demand missing from the campaign list. Time saved (estimate, placeholder rate $100 an hour, not an employer rate): spike investigations 8 a week x 1.58 hours x 16 weeks about 200 hours about $20k (about 660 hours, $66k a year annualized); campaign review 6 planners x 30 minutes x 12 weeks about 36 hours about $3.6k; 117-part failure workbook 15 minutes per part about 29 hours about $2.9k; total roughly 300 to 350 hours, about $30k to $35k at the placeholder rate, dominated by spike investigations. Note "117" and "29" appear in both Campaigns and Slideshow-adjacent text; they are in the list once.

- [ ] **Step 1: Write the body.** Replace everything after the frontmatter. Each `##` heading must produce the ids in `SECTION_IDS` (Astro lowercases and hyphenates: "Slideshow generation" gives `slideshow-generation`). Do not add SVGs yet. Do not reference any Impact number not in `ALLOWED_NUMBERS`; if a needed number is missing, add it to `tesla-facts.ts` only if it appears in the Facts above, otherwise leave it out.

- [ ] **Step 2: Run the body tests**

Run: `npx vitest run src/content/work/tesla.test.ts src/content/work/tesla-cleared.test.ts`
Expected: PASS. If `states only numbers from the facts file` fails, the message names the token: remove it from prose or confirm it is in the Facts above and add it to the list.

- [ ] **Step 3: Show Andrian the Impact sections for sign-off before continuing.** Print the eight `### Impact` blocks. Do not proceed to Task 3 until he says the numbers are right.

- [ ] **Step 4: Commit**

```bash
git add src/content/work/tesla.md src/content/work/tesla-facts.ts
git commit -m "feat: rewrite the Tesla page body as eight project sections

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Eight architecture SVGs and their tests

**Files:**
- Create: `src/content/work/tesla-figures.test.ts`
- Modify: `src/content/work/tesla.md` (insert one `<figure class="arch">` directly under each `### Architecture` heading)

**Interfaces:**
- Consumes: SVG conventions from the old figures (see `git show 260f1b8:src/content/work/tesla.md` for the five existing SVGs and `src/content/work/hanna.md:33-80` for the Hanna example): `viewBox="0 0 640 H"`, `role="img"`, `aria-label` of 40+ characters, `<defs><marker id="atN" ...>`, boxes as `<rect x= y= width= height= rx="10"/>`, arrows as `<path d="..." marker-end="url(#atN)"/>`, one `<figcaption>`.
- Produces: marker ids `at1`..`at8`, one per figure, in page order.

Diagram briefs (boxes left to right, arrows between):
1. Dashboard: Browser, Frontend cache (SWR), API, Warm registry, Disk snapshot, Backends (databases). Side note: memory ceiling gate on the warm registry.
2. Part Summary: Search, Part resolver, Slice loaders (six), Pooled SQL, Insight writer (LLM).
3. Ask SDP: Question, Router (routing floor), Tools (parallel), Verdict checker, LLM writer, Grounding rail.
4. Forecast Lab: Firm selection, Warm Chronos-2 runner, Shaping layers, Dry-run preview, Commit to firming system.
5. Campaigns: Campaign + service data, Triage (forecast vs expected demand), Wind-down gate, Simulator (P10/P50/P90), Views, Weekly notices.
6. Slideshow: Schedule or button, Generators, Deck template, PPTX, Delivery.
7. Modular architecture: Tab manifest, Shell auto-discovery, Sign-in and access check, Kill switch, Mounted tab; broken tab skipped and reported.
8. Admin: Request log, Usage computation, Access grants, Audit log, Default-deny gate (flag), Admin UI.

- [ ] **Step 1: Write the failing test `tesla-figures.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const raw = fs.readFileSync(path.resolve(process.cwd(), 'src/content/work/tesla.md'), 'utf8');
const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');

describe('the tesla architecture figures', () => {
  it('draws one figure under every Architecture heading', () => {
    expect(body.match(/<figure class="arch">/g) ?? []).toHaveLength(8);
    for (let i = 1; i <= 8; i++) expect(body).toContain(`marker id="at${i}"`);
    const sections = body.split(/^### Architecture$/m).slice(1);
    for (const s of sections) expect(s.trimStart().startsWith('<figure class="arch">')).toBe(true);
  });

  it('gives every figure an accessible label and a caption', () => {
    const svgs = [...body.matchAll(/<svg[^>]*>/g)].map((m) => m[0]);
    expect(svgs).toHaveLength(8);
    for (const svg of svgs) {
      expect(svg).toContain('role="img"');
      expect(svg).toMatch(/aria-label="[^"]{40,}"/);
    }
    expect([...body.matchAll(/<figcaption>/g)]).toHaveLength(8);
  });

  it('lands every arrowhead inside a box of its own figure', () => {
    const figures = [...body.matchAll(/<figure class="arch">[\s\S]*?<\/figure>/g)].map((m) => m[0]);
    expect(figures).toHaveLength(8);
    for (const fig of figures) {
      const rects = [...fig.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" rx="10"\/>/g)]
        .map((m) => ({ x: +m[1], y: +m[2], w: +m[3], h: +m[4] }));
      expect(rects.length).toBeGreaterThan(0);
      const paths = [...fig.matchAll(/<path d="([^"]+)" marker-end="url\(#at\d\)"/g)].map((m) => m[1]);
      expect(paths.length).toBeGreaterThan(0);
      for (const d of paths) {
        const tokens = d.match(/[MHVLC]|-?\d+(?:\.\d+)?/g) ?? [];
        let cx = 0, cy = 0;
        for (let i = 0; i < tokens.length; i++) {
          const t = tokens[i];
          if (t === 'M' || t === 'L') { cx = +tokens[++i]; cy = +tokens[++i]; }
          else if (t === 'H') { cx = +tokens[++i]; }
          else if (t === 'V') { cy = +tokens[++i]; }
          else if (t === 'C') { i += 5; cx = +tokens[i]; cy = +tokens[++i]; }
        }
        const hit = rects.some((r) => cx >= r.x - 8 && cx <= r.x + r.w + 8 && cy >= r.y - 8 && cy <= r.y + r.h + 8);
        expect(hit, `arrow endpoint ${cx},${cy} of "${d}" lands in no box`).toBe(true);
      }
    }
  });

  it('uses each marker id only inside its own figure', () => {
    const figures = [...body.matchAll(/<figure class="arch">[\s\S]*?<\/figure>/g)].map((m) => m[0]);
    figures.forEach((fig, i) => {
      for (let n = 1; n <= 8; n++) {
        if (n !== i + 1) expect(fig).not.toContain(`url(#at${n})`);
      }
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/content/work/tesla-figures.test.ts`
Expected: FAIL (0 figures).

- [ ] **Step 3: Draw the eight figures** per the briefs. Text uses `fill="currentColor"` with `style="color:var(--color-text)"` like the existing figures; box strokes use `var(--color-muted)`. Keep labels under 22 characters per line. Caption: one line naming the diagram.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/content/work/tesla-figures.test.ts src/content/work/tesla.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/work/tesla.md src/content/work/tesla-figures.test.ts
git commit -m "feat: eight architecture diagrams for the Tesla page

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Shared fixtures

**Files:**
- Create: `src/components/tesla/fixtures.ts`, `src/components/tesla/fixtures.test.ts`

**Interfaces:**
- Produces:
  - `interface MockPart { id: string; name: string; system: string }`
  - `MOCK_PARTS: readonly MockPart[]` (5 parts, ids `P-1001`..`P-1005`)
  - `MOCK_PLANNERS: readonly string[]` (`'Planner A'`..`'Planner F'`)
  - `interface MockCampaign { id: string; name: string; partId: string; remainingUnits: number; weeklyPace: number; weeklyService: number }`
  - `MOCK_CAMPAIGNS: readonly MockCampaign[]` (6 campaigns)
  - `MOCK_USERS: readonly { id: string; name: string; group: string }[]` (6 users, names `User 1`..`User 6`)
  - `function series(seed: number, n: number, base: number, spread: number): number[]` deterministic, no `Math.random`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { MOCK_PARTS, MOCK_PLANNERS, MOCK_CAMPAIGNS, MOCK_USERS, series } from './fixtures';

describe('shared mock data', () => {
  it('has five parts with fake ids', () => {
    expect(MOCK_PARTS).toHaveLength(5);
    for (const p of MOCK_PARTS) expect(p.id).toMatch(/^P-\d{4}$/);
  });
  it('points every campaign at a mock part', () => {
    const ids = new Set(MOCK_PARTS.map((p) => p.id));
    expect(MOCK_CAMPAIGNS).toHaveLength(6);
    for (const c of MOCK_CAMPAIGNS) expect(ids.has(c.partId)).toBe(true);
  });
  it('names nobody real', () => {
    for (const n of [...MOCK_PLANNERS, ...MOCK_USERS.map((u) => u.name)]) expect(n).toMatch(/^(Planner [A-F]|User [1-6])$/);
  });
  it('builds the same series every time', () => {
    expect(series(3, 8, 100, 10)).toEqual(series(3, 8, 100, 10));
    expect(series(3, 8, 100, 10)).toHaveLength(8);
    expect(series(3, 8, 100, 10)).not.toEqual(series(4, 8, 100, 10));
    for (const v of series(1, 20, 100, 10)) { expect(v).toBeGreaterThanOrEqual(90); expect(v).toBeLessThanOrEqual(110); }
  });
});
```

- [ ] **Step 2: Run to verify it fails.** Run: `npx vitest run src/components/tesla/fixtures.test.ts` Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
export interface MockPart { id: string; name: string; system: string }
export const MOCK_PARTS: readonly MockPart[] = [
  { id: 'P-1001', name: 'Rear door latch', system: 'Closures' },
  { id: 'P-1002', name: 'Window regulator', system: 'Closures' },
  { id: 'P-1003', name: 'Front fascia clip', system: 'Exterior' },
  { id: 'P-1004', name: 'Cabin air filter', system: 'Climate' },
  { id: 'P-1005', name: 'Wheel hub bearing', system: 'Chassis' },
];
export const MOCK_PLANNERS: readonly string[] = ['Planner A', 'Planner B', 'Planner C', 'Planner D', 'Planner E', 'Planner F'];
export interface MockCampaign { id: string; name: string; partId: string; remainingUnits: number; weeklyPace: number; weeklyService: number }
export const MOCK_CAMPAIGNS: readonly MockCampaign[] = [
  { id: 'C-01', name: 'Latch inspection', partId: 'P-1001', remainingUnits: 4200, weeklyPace: 300, weeklyService: 1500 },
  { id: 'C-02', name: 'Regulator update', partId: 'P-1002', remainingUnits: 900, weeklyPace: 40, weeklyService: 1200 },
  { id: 'C-03', name: 'Clip replacement', partId: 'P-1003', remainingUnits: 2600, weeklyPace: 210, weeklyService: 1300 },
  { id: 'C-04', name: 'Filter swap', partId: 'P-1004', remainingUnits: 600, weeklyPace: 20, weeklyService: 2000 },
  { id: 'C-05', name: 'Bearing recheck', partId: 'P-1005', remainingUnits: 3100, weeklyPace: 150, weeklyService: 1100 },
  { id: 'C-06', name: 'Latch follow-up', partId: 'P-1001', remainingUnits: 1200, weeklyPace: 90, weeklyService: 1500 },
];
export const MOCK_USERS: readonly { id: string; name: string; group: string }[] = [
  { id: 'u1', name: 'User 1', group: 'Planners' }, { id: 'u2', name: 'User 2', group: 'Planners' },
  { id: 'u3', name: 'User 3', group: 'Planners' }, { id: 'u4', name: 'User 4', group: 'Analysts' },
  { id: 'u5', name: 'User 5', group: 'Analysts' }, { id: 'u6', name: 'User 6', group: 'Admins' },
];
// Deterministic pseudo-series: a linear congruential step per index.
export function series(seed: number, n: number, base: number, spread: number): number[] {
  let s = (seed * 9301 + 49297) % 233280;
  return Array.from({ length: n }, () => {
    s = (s * 9301 + 49297) % 233280;
    return Math.round(base + (s / 233280 - 0.5) * 2 * spread);
  });
}
```

- [ ] **Step 4: Run to verify it passes.** Same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/tesla/fixtures.ts src/components/tesla/fixtures.test.ts
git commit -m "feat: shared mock fixtures for the Tesla demos

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Demo tasks 5-12 (independent; may run in parallel)

Each demo task follows the same recipe. **Common steps for every demo task (apply to each):**

1. Write `<name>.test.ts` (failing) from the code given in the task. Run it: expected FAIL (module missing).
2. Implement `<name>.ts` from the code given. Run it: expected PASS.
3. Write `<Name>Demo.tsx` and `<name>.css` per the "Component spec" bullets. Import `'../../qa/qa.css'` and `'./<name>.css'`. Follow `src/components/tesla/worklog/WorklogDemo.tsx` for chrome and state wiring (`useState`, pure state functions, `aria-pressed` buttons). The component has no logic of its own: every decision comes from `<name>.ts`.
4. Add a render test `<Name>Demo.test.tsx` only if `react-dom/server` rendering is already used elsewhere (check `src/components/**/*.test.tsx`; mimic `HeroGraph.test.tsx`): render to string and assert the `sample data` label and the root `aria-label`.
5. Run `npm test`. Commit with `feat: <name> demo for the Tesla page` and the Co-Authored-By line.
6. Do **not** touch `[slug].astro` (Task 13 wires every demo).

### Task 5: Dashboard demo (hero frame)

**Files:** Create `src/components/tesla/dashboard/{dashboard.ts,dashboard.test.ts,DashboardDemo.tsx,dashboard.css}`. Reuses `src/components/tesla/worklog/WorklogDemo.tsx` unchanged as one view.

**Interfaces:**
- Produces from `dashboard.ts`:
  - `NAV: readonly { id: string; label: string; target: string | null }[]` — items: overview (target null), part-summary, ask-sdp, forecast-lab, campaigns, slideshow-generation, modular-architecture, admin (each `target` equals its section id), and `worklog` (target null).
  - `type WarmStatus = 'cold' | 'warming' | 'warm'`
  - `interface WarmState { status: WarmStatus; hot: number; total: number; rssMb: number; ceilingMb: number }`
  - `initialWarm(): WarmState` (warm, 9 of 25 hot parts, RSS 3460 MB, ceiling 3500 MB; exact code below).
  - `restart(s: WarmState): WarmState`, `warmStep(s: WarmState): WarmState`, `request(s: WarmState): { status: 200 | 503; body: string }`.

- [ ] **Step 1: Failing test `dashboard.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { NAV, initialWarm, restart, warmStep, request } from './dashboard';

describe('dashboard frame logic', () => {
  it('lists every project once, in page order, plus overview and work log', () => {
    expect(NAV.map((n) => n.id)).toEqual(['overview', 'part-summary', 'ask-sdp', 'forecast-lab', 'campaigns', 'slideshow-generation', 'modular-architecture', 'admin', 'worklog']);
    expect(NAV.find((n) => n.id === 'campaigns')!.target).toBe('campaigns');
    expect(NAV.find((n) => n.id === 'overview')!.target).toBeNull();
  });
  it('starts warm and answers 200', () => {
    expect(request(initialWarm()).status).toBe(200);
  });
  it('answers 503 warming up right after a restart, never building on the request', () => {
    const s = restart(initialWarm());
    expect(s.status).toBe('cold');
    const r = request(s);
    expect(r.status).toBe(503);
    expect(r.body).toBe('warming up');
  });
  it('warms hot parts one step at a time and stops at the memory ceiling', () => {
    let s = restart(initialWarm());
    for (let i = 0; i < 40; i++) s = warmStep(s);
    expect(s.status).toBe('warm');
    expect(s.rssMb).toBeLessThanOrEqual(s.ceilingMb);
    expect(s.hot).toBeLessThan(s.total);
    expect(s.hot).toBeGreaterThan(0);
  });
  it('serves the last good payload while warming', () => {
    let s = restart(initialWarm());
    s = warmStep(s);
    expect(s.status).toBe('warming');
    expect(request(s).status).toBe(200);
  });
});
```

- [ ] **Step 2: Implement `dashboard.ts`**

```ts
export const NAV: readonly { id: string; label: string; target: string | null }[] = [
  { id: 'overview', label: 'Overview', target: null },
  { id: 'part-summary', label: 'Part Summary', target: 'part-summary' },
  { id: 'ask-sdp', label: 'Ask SDP', target: 'ask-sdp' },
  { id: 'forecast-lab', label: 'Forecast Lab', target: 'forecast-lab' },
  { id: 'campaigns', label: 'Campaigns', target: 'campaigns' },
  { id: 'slideshow-generation', label: 'Slides', target: 'slideshow-generation' },
  { id: 'modular-architecture', label: 'Tabs', target: 'modular-architecture' },
  { id: 'admin', label: 'Admin', target: 'admin' },
  { id: 'worklog', label: 'Work log', target: null },
];
export type WarmStatus = 'cold' | 'warming' | 'warm';
export interface WarmState { status: WarmStatus; hot: number; total: number; rssMb: number; ceilingMb: number }
const BASE_MB = 1750;
const STEP_MB = 190; // each hot part adds this much, so 3500 MB stops warming near 9 parts; the ceiling is the point
export const initialWarm = (): WarmState => ({ status: 'warm', hot: 9, total: 25, rssMb: BASE_MB + 9 * STEP_MB, ceilingMb: 3500 });
export const restart = (s: WarmState): WarmState => ({ ...s, status: 'cold', hot: 0, rssMb: BASE_MB });
export function warmStep(s: WarmState): WarmState {
  if (s.status === 'warm') return s;
  const nextRss = s.rssMb + STEP_MB;
  if (s.hot >= s.total || nextRss > s.ceilingMb) return { ...s, status: 'warm' };
  return { ...s, status: 'warming', hot: s.hot + 1, rssMb: nextRss };
}
export function request(s: WarmState): { status: 200 | 503; body: string } {
  return s.status === 'cold' ? { status: 503, body: 'warming up' } : { status: 200, body: 'last good payload' };
}
```

(The demo's 9-of-25 figure is mock; the page prose states the measured "15 of 25". Both are fine: the window is labeled sample data.)

- [ ] **Step 3: Component spec (`DashboardDemo.tsx`).** Root `qa dash`, `aria-label="Sample planning dashboard"`. Left rail of `NAV` buttons: items with a `target` render `<a href="#{target}">` (they scroll to that project's demo); `overview` and `worklog` are `aria-pressed` buttons switching the main pane. Main pane Overview: four KPI tiles and one inline-SVG bar chart built from `series()` (mock figures). Beneath: a "Server" strip with a **Restart server** button, a status pill (cold / warming / warm), a "hot parts" count, and an RSS bar with the ceiling marked; a **Request** button that shows the `request()` result and a **Warm step** button (also auto-advances every 600 ms via `setInterval` unless `matchMedia('(prefers-reduced-motion: reduce)').matches`, in which case only the button advances). Work log pane renders `<WorklogDemo />`. Stacks to one column below 640 px; the rail becomes a horizontally wrapping row, never a horizontal scroll.

- [ ] **Steps 4-6:** common steps 1-6 above. Commit: `feat: dashboard demo for the Tesla page`.

---

### Task 6: Part Summary demo

**Files:** Create `src/components/tesla/partsummary/{partsummary.ts,partdata.ts,partsummary.test.ts,PartSummaryDemo.tsx,partsummary.css}`.

**Interfaces:**
- Consumes: `MOCK_PARTS`, `MockPart`, `series` from `../fixtures`.
- Produces from `partsummary.ts`: `type SubTab = 'overview'|'consumption'|'failures'|'location'|'codes'|'breakdown'`; `SUBTABS: readonly {id: SubTab; label: string}[]` (labels: Overview, Consumption, Failure rates, Location × build year, Correction codes, Breakdown); `interface PSState { query: string; partId: string | null; tab: SubTab; message: string }`; `initialState: PSState`; `matches(query: string, parts: readonly MockPart[]): MockPart[]`; `search(s: PSState, query: string, parts: readonly MockPart[]): PSState`; `selectTab(s: PSState, tab: SubTab): PSState`.
- Produces from `partdata.ts`: `interface PartData { insights: string[]; consumption: number[]; failureRate: number[]; locationMatrix: { rows: string[]; cols: string[]; cells: number[][] }; codeMatrix: { rows: string[]; cols: string[]; cells: number[][] }; breakdown: { symptom: string; code: string; share: number }[] }` and `dataFor(partId: string): PartData` (deterministic via `series`; `consumption` and `failureRate` have 12 points; matrices 4 rows x 5 cols; `breakdown` shares sum to 100).

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { MOCK_PARTS } from '../fixtures';
import { SUBTABS, initialState, matches, search, selectTab } from './partsummary';
import { dataFor } from './partdata';

describe('part summary logic', () => {
  it('has the six sub-tabs in order', () => {
    expect(SUBTABS.map((t) => t.id)).toEqual(['overview', 'consumption', 'failures', 'location', 'codes', 'breakdown']);
  });
  it('finds a part by id, case-insensitively, or by name fragment', () => {
    expect(matches('p-1001', MOCK_PARTS).map((p) => p.id)).toEqual(['P-1001']);
    expect(matches('bearing', MOCK_PARTS).map((p) => p.id)).toEqual(['P-1005']);
    expect(matches('', MOCK_PARTS)).toEqual([]);
  });
  it('opens the overview on a successful search', () => {
    const s = search(initialState, 'P-1003', MOCK_PARTS);
    expect(s.partId).toBe('P-1003');
    expect(s.tab).toBe('overview');
    expect(s.message).toBe('');
  });
  it('says so when nothing matches and keeps the previous part closed', () => {
    const s = search(initialState, 'zzz', MOCK_PARTS);
    expect(s.partId).toBeNull();
    expect(s.message).toMatch(/no part matches/i);
  });
  it('switches sub-tabs only when a part is open', () => {
    expect(selectTab(initialState, 'consumption')).toEqual(initialState);
    const open = search(initialState, 'P-1001', MOCK_PARTS);
    expect(selectTab(open, 'codes').tab).toBe('codes');
  });
  it('never mutates the old state', () => {
    const open = search(initialState, 'P-1001', MOCK_PARTS);
    const frozen = Object.freeze({ ...open });
    expect(() => selectTab(frozen, 'failures')).not.toThrow();
  });
  it('builds deterministic data of the right shape', () => {
    const d = dataFor('P-1002');
    expect(d).toEqual(dataFor('P-1002'));
    expect(d.consumption).toHaveLength(12);
    expect(d.failureRate).toHaveLength(12);
    expect(d.locationMatrix.cells).toHaveLength(4);
    expect(d.locationMatrix.cells[0]).toHaveLength(5);
    expect(d.codeMatrix.cells).toHaveLength(4);
    expect(d.breakdown.reduce((a, b) => a + b.share, 0)).toBe(100);
    expect(d.insights.length).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Implement.** `partsummary.ts` per the interface (`search` returns `{...s, query, partId: hit.id, tab: 'overview', message: ''}` using the first match, or `{...s, query, partId: null, message: 'No part matches "<query>".'}`). `partdata.ts`: seed from the numeric part of the id (`Number(partId.slice(2))`); `insights` are three fixed template sentences filled with values from the series ("Consumption is running N% above the 12-week average", etc.); `locationMatrix` rows `['Region A'..'Region D']`, cols = five build years `['2021'..'2025']`; `codeMatrix` rows four fake correction codes `['CC-01'..'CC-04']`, cols five sub-systems; `breakdown` four rows, shares `[40, 30, 20, 10]`.

- [ ] **Steps 3-6:** common steps. Component spec: root `qa ps`, `aria-label="Sample part summary"`. Top: search `<form>` with a labeled `<input>` (`aria-label="Search for a part"`), a submit button, and suggestion chips (the five mock ids) so a visitor can try it with no typing. Below, once a part is open: a header (id, name, system) and the `SUBTABS` as `aria-pressed` buttons (wrap, no horizontal scroll). Panels: Overview = insights list with an "AI-generated, mock" tag; Consumption = SVG line chart of `consumption`; Failure rates = SVG line of `failureRate`; Location × build year and Correction codes = HTML `<table>` heatmaps (cell background opacity from value, numbers visible in cells so color is not the only cue); Breakdown = table of symptom, code, share with a bar. All charts have `role="img"` and `aria-label`. Heatmap tables get `overflow-x:auto` inside their own wrapper so only the table scrolls on a 320px screen, never the page.

---

### Task 7: Ask SDP demo

**Files:** Create `src/components/tesla/asksdp/{asksdp.ts,asksdp.test.ts,AskSdpDemo.tsx,asksdp.css}`.

**Interfaces:**
- Consumes: `MOCK_PARTS` from `../fixtures`.
- Produces from `asksdp.ts`: `type Verdict = 'firm' | 'hold' | 'no-action'`; `interface ToolCall { tool: string; result: string }`; `interface Answer { question: string; text: string; verdict: Verdict | null; tools: ToolCall[]; refused: boolean }`; `PRESETS: readonly string[]` (3 sample questions); `ungrounded(text: string, toolResults: readonly string[]): string[]`; `ask(question: string): Answer`.

Behavior: `ask` routes by keyword to one of three canned entries (consumption trend, failure rate, firm-or-hold) each with `tools` (parallel calls) and a `text` written from the tool results; an unknown question returns `{refused: true, verdict: null, tools: [], text: "I can't answer that from the data I can reach."}` (the routing floor: if the question needs data and no tool matches, refuse). `ungrounded(text, results)` extracts every number token from `text` and returns those that appear in none of `results`. `ask` must never return an answer where `ungrounded(text, tools.map(t=>t.result))` is non-empty (the grounding rail; if a canned text were edited to include an invented number, `ask` returns the refusal).

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { PRESETS, ask, ungrounded } from './asksdp';

describe('ask sdp logic', () => {
  it('offers three preset questions', () => { expect(PRESETS).toHaveLength(3); });
  it('answers every preset with tools, a verdict, and only grounded numbers', () => {
    for (const q of PRESETS) {
      const a = ask(q);
      expect(a.refused).toBe(false);
      expect(a.tools.length).toBeGreaterThan(0);
      expect(a.verdict).not.toBeNull();
      expect(ungrounded(a.text, a.tools.map((t) => t.result))).toEqual([]);
    }
  });
  it('refuses a question no tool can answer', () => {
    const a = ask('what is the meaning of life');
    expect(a.refused).toBe(true);
    expect(a.verdict).toBeNull();
    expect(a.tools).toEqual([]);
  });
  it('flags a number the tools never returned', () => {
    expect(ungrounded('Demand is up 42% on 7 parts', ['up 42%'])).toEqual(['7']);
    expect(ungrounded('No figures here', [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Implement** per the behavior above (regex for numbers: `/\d[\d,]*(?:\.\d+)?%?/g`).
- [ ] **Steps 3-6:** common steps. Component spec: root `qa ask`, `aria-label="Sample Ask SDP chat"`. A message list (`role="log"`, `aria-live="polite"`), preset chips, a text input and Send button (Enter submits). Each answer shows tool-call chips (tool name plus result) above the text, then a verdict badge (Firm / Hold / No action) with text, never color alone. A refused answer shows a neutral "Can't answer from sources" badge. A small caption: "Every number in an answer must come from a tool result."

---

### Task 8: Forecast Lab demo

**Files:** Create `src/components/tesla/forecastlab/{forecastlab.ts,forecastlab.test.ts,ForecastLabDemo.tsx,forecastlab.css}`.

**Interfaces:**
- Consumes: `MOCK_PARTS`, `series`.
- Produces: `type Phase = 'idle' | 'previewed' | 'committed'`; `interface FLState { selected: string[]; backtest: boolean; phase: Phase }`; `initialState: FLState` (nothing selected, `backtest: false`, phase `idle`); `toggle(s, partId): FLState` (resets phase to `idle`); `setBacktest(s, on: boolean): FLState`; `interface PreviewRow { partId: string; current: number; proposed: number; delta: number }`; `dryRun(s): { state: FLState; rows: PreviewRow[] }` (only when `selected.length > 0`, else state unchanged and `rows: []`; sets phase `previewed`); `commit(s): FLState` (only from `previewed`; otherwise returns `s` unchanged).

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { initialState, toggle, setBacktest, dryRun, commit } from './forecastlab';

describe('forecast lab logic', () => {
  it('starts idle with backtest off', () => {
    expect(initialState.phase).toBe('idle');
    expect(initialState.backtest).toBe(false);
    expect(initialState.selected).toEqual([]);
  });
  it('previews only when something is selected', () => {
    const none = dryRun(initialState);
    expect(none.rows).toEqual([]);
    expect(none.state.phase).toBe('idle');
    const s = toggle(initialState, 'P-1001');
    const r = dryRun(s);
    expect(r.state.phase).toBe('previewed');
    expect(r.rows.map((x) => x.partId)).toEqual(['P-1001']);
    expect(r.rows[0].delta).toBe(r.rows[0].proposed - r.rows[0].current);
  });
  it('commits only from a preview', () => {
    const s = toggle(initialState, 'P-1001');
    expect(commit(s).phase).toBe('idle');
    const previewed = dryRun(s).state;
    expect(commit(previewed).phase).toBe('committed');
  });
  it('resets the preview when the selection changes', () => {
    const previewed = dryRun(toggle(initialState, 'P-1001')).state;
    expect(toggle(previewed, 'P-1002').phase).toBe('idle');
  });
  it('is deterministic for the same selection', () => {
    const a = dryRun(toggle(initialState, 'P-1003')).rows;
    const b = dryRun(toggle(initialState, 'P-1003')).rows;
    expect(a).toEqual(b);
  });
  it('toggles backtest', () => { expect(setBacktest(initialState, true).backtest).toBe(true); });
});
```

- [ ] **Step 2: Implement.** `current` and `proposed` come from `series(seed, 1, 500, 200)[0]` seeded by the part id number and a per-field constant; `delta` is the difference.
- [ ] **Steps 3-6:** common steps. Component spec: root `qa fl`, `aria-label="Sample Forecast Lab"`. Left: checkbox list of mock parts ("Select parts to firm") and a Backtest checkbox labeled "Backtest (off by default)". Right: a forecast chart (SVG, `series`) for the first selected part. Buttons: **Preview (dry run)** → table of `PreviewRow`s with a banner "Dry run: nothing has been sent"; then **Commit to firming system** enabled only in `previewed`, after which a green confirmation "Committed (mock)". Disabled buttons use `disabled` and visible text explaining why.

---

### Task 9: Campaigns demo

**Files:** Create `src/components/tesla/campaigns/{campaigns.ts,campaigns.test.ts,CampaignsDemo.tsx,campaigns.css}`.

**Interfaces:**
- Consumes: `MOCK_CAMPAIGNS`, `MockCampaign`, `MOCK_PARTS`, `MOCK_PLANNERS`.
- Produces: `type View = 'alerts' | 'parts' | 'campaigns' | 'unlisted'`; `VIEWS: readonly {id: View; label: string}[]`; `WINDOWS = [8, 13, 26] as const`; `THRESHOLD = 0.1`; `paceShare(c: MockCampaign): number` (`weeklyPace / weeklyService`); `isWindDown(c: MockCampaign, scale?: readonly number[]): boolean` — for each window index `i` the share is `paceShare(c) * scale[i]` (`scale` defaults to `[1, 0.95, 0.9]`, a mock decay); the campaign is winding down when the best (max) share is below `THRESHOLD`; `type Pct = 'P10' | 'P50' | 'P90'`; `weeksToFinish(c: MockCampaign, p: Pct): number` = `Math.ceil(c.remainingUnits / (c.weeklyPace * factor))` with factors P10 → 1.25, P50 → 1.0, P90 → 0.75 (P10 is the fast case); `alerts(cs): MockCampaign[]` = wind-down campaigns sorted by `remainingUnits` descending; `assignPlanner(c: MockCampaign): string` = `MOCK_PLANNERS[index of campaign id number % 6]`.

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { MOCK_CAMPAIGNS } from '../fixtures';
import { THRESHOLD, WINDOWS, alerts, assignPlanner, isWindDown, paceShare, weeksToFinish } from './campaigns';

const [c1, c2, c3, c4] = MOCK_CAMPAIGNS;

describe('campaigns logic', () => {
  it('uses the 8/13/26 week windows and a 10% threshold', () => {
    expect([...WINDOWS]).toEqual([8, 13, 26]);
    expect(THRESHOLD).toBe(0.1);
  });
  it('computes pace share of service units', () => {
    expect(paceShare(c1)).toBeCloseTo(300 / 1500);
    expect(paceShare(c4)).toBeCloseTo(20 / 2000);
  });
  it('flags a campaign as winding down when its best window share is under the threshold', () => {
    expect(isWindDown(c4)).toBe(true);   // 1% pace share
    expect(isWindDown(c2)).toBe(true);   // 3.3%
    expect(isWindDown(c1)).toBe(false);  // 20%
    expect(isWindDown(c3)).toBe(false);  // 16%
  });
  it('orders the P10 case faster than P50 faster than P90', () => {
    const [a, b, d] = (['P10', 'P50', 'P90'] as const).map((p) => weeksToFinish(c1, p));
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(d);
    expect(weeksToFinish(c1, 'P50')).toBe(Math.ceil(c1.remainingUnits / c1.weeklyPace));
  });
  it('lists alerts by largest remaining units first', () => {
    const a = alerts(MOCK_CAMPAIGNS);
    expect(a.map((c) => c.id)).toEqual(['C-02', 'C-04']);
  });
  it('assigns each alert to a mock planner', () => {
    for (const c of MOCK_CAMPAIGNS) expect(assignPlanner(c)).toMatch(/^Planner [A-F]$/);
  });
});
```

- [ ] **Step 2: Implement.** `isWindDown`: `const shares = WINDOWS.map((_, i) => paceShare(c) * (scale[i] ?? 1)); return Math.max(...shares) < THRESHOLD;` with default `scale = [1, 0.95, 0.9]`.
- [ ] **Steps 3-6:** common steps. Component spec: root `qa camp`, `aria-label="Sample Campaigns tab"`. `VIEWS` as `aria-pressed` buttons (Alerts, All parts, Campaigns, Unlisted bulletin demand). Alerts view: table of wind-down campaigns with part name, pace share %, planner, and a "weekly notice" preview line per planner ("One email per planner, only their parts"). Campaigns view: all campaigns with a **Simulate** control: a select of P10 / P50 / P90 showing `weeksToFinish`. Unlisted view: a static three-row mock table. "All parts" lists `MOCK_PARTS` with how many campaigns touch each. Table wrappers scroll inside themselves only.

---

### Task 10: Slideshow generation demo

**Files:** Create `src/components/tesla/slides/{slides.ts,slides.test.ts,SlidesDemo.tsx,slides.css}`.

**Interfaces:**
- Produces: `type Phase = 'idle' | 'generating' | 'ready'`; `interface SlideState { phase: Phase; step: number; template: string }`; `TEMPLATES: readonly string[]` (`'Executive weekly'`, `'Accessories KPI'`); `STEPS: readonly string[]` (4 steps: `'Read weekly data'`, `'Draw charts'`, `'Fill the template'`, `'Write the deck'`); `initialState: SlideState`; `selectTemplate(s, t): SlideState` (ignored while generating; resets to idle); `start(s): SlideState` (idle or ready → generating, step 0); `tick(s): SlideState` (generating: step+1; when step reaches `STEPS.length` phase becomes `ready`; otherwise unchanged); `downloadName(s): string | null` (`ready` → `deck-<slug of template>.pptx`, else null).

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { STEPS, TEMPLATES, downloadName, initialState, selectTemplate, start, tick } from './slides';

describe('slideshow generation logic', () => {
  it('walks every step and ends ready', () => {
    let s = start(initialState);
    expect(s.phase).toBe('generating');
    for (let i = 0; i < STEPS.length; i++) s = tick(s);
    expect(s.phase).toBe('ready');
  });
  it('offers a download only when ready', () => {
    expect(downloadName(initialState)).toBeNull();
    let s = start(initialState);
    for (let i = 0; i < STEPS.length; i++) s = tick(s);
    expect(downloadName(s)).toBe('deck-executive-weekly.pptx');
  });
  it('ignores a template change mid-run and resets after one', () => {
    const run = start(initialState);
    expect(selectTemplate(run, TEMPLATES[1]).template).toBe(run.template);
    let s = run;
    for (let i = 0; i < STEPS.length; i++) s = tick(s);
    expect(selectTemplate(s, TEMPLATES[1]).phase).toBe('idle');
  });
  it('does nothing on tick when not generating', () => {
    expect(tick(initialState)).toEqual(initialState);
  });
});
```

- [ ] **Step 2: Implement** per the interface (`initialState = {phase:'idle', step:0, template: TEMPLATES[0]}`; slug = lowercase, spaces to hyphens).
- [ ] **Steps 3-6:** common steps. Component spec: root `qa sl`, `aria-label="Sample slideshow generation"`. Template buttons (`aria-pressed`), a **Regenerate deck** button, a step list (`<ol>`) that checks off as `tick` advances (auto-advance every 700 ms via `setInterval` while `generating`, unless reduced motion, in which case a **Next step** button shows), a mock slide thumbnail strip (4 SVG rectangles), and, when ready, a **Download** link-styled button that does nothing but shows "Mock download: deck-….pptx". Caption: "Composer controls are work in progress and hidden."

---

### Task 11: Modular architecture demo

**Files:** Create `src/components/tesla/modular/{modular.ts,modular.test.ts,ModularDemo.tsx,modular.css}`.

**Interfaces:**
- Produces: `interface Manifest { id: string; title: string; entry: string | null; owner: string }`; `MANIFESTS: readonly Manifest[]` (5 entries: `overview`, `part-summary`, `campaigns`, `like-part` with `owner: 'a teammate'`, and `broken-tab` with `entry: null`; all other owners `'platform team'`); `interface Discovery { mounted: Manifest[]; skipped: { id: string; reason: string }[] }`; `discover(manifests: readonly Manifest[], killed: readonly string[]): Discovery` — a manifest with `entry === null` or an empty `id` or `title` is skipped with reason `'manifest incomplete'` or `'failed to import'` (null entry → `'failed to import'`); a killed id is skipped with reason `'kill switch'`; everything else is mounted in input order; `toggleKill(killed: readonly string[], id: string): string[]`; `tabsReport(d: Discovery): string[]` — lines like `mounted overview` and `skipped broken-tab (failed to import)`.

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { MANIFESTS, discover, tabsReport, toggleKill } from './modular';

describe('modular tab discovery', () => {
  it('mounts valid tabs and skips the broken one, reporting why', () => {
    const d = discover(MANIFESTS, []);
    expect(d.mounted.map((m) => m.id)).toEqual(['overview', 'part-summary', 'campaigns', 'like-part']);
    expect(d.skipped).toEqual([{ id: 'broken-tab', reason: 'failed to import' }]);
  });
  it('skips a tab behind the kill switch without touching the others', () => {
    const d = discover(MANIFESTS, ['campaigns']);
    expect(d.mounted.map((m) => m.id)).not.toContain('campaigns');
    expect(d.mounted).toHaveLength(3);
    expect(d.skipped.find((s) => s.id === 'campaigns')?.reason).toBe('kill switch');
  });
  it('toggles the kill switch on and off', () => {
    const on = toggleKill([], 'overview');
    expect(on).toEqual(['overview']);
    expect(toggleKill(on, 'overview')).toEqual([]);
  });
  it('reports every tab', () => {
    const lines = tabsReport(discover(MANIFESTS, []));
    expect(lines).toContain('mounted overview');
    expect(lines).toContain('skipped broken-tab (failed to import)');
    expect(lines).toHaveLength(MANIFESTS.length);
  });
  it('credits the like-part tab to a teammate with no name', () => {
    expect(MANIFESTS.find((m) => m.id === 'like-part')!.owner).toBe('a teammate');
  });
});
```

- [ ] **Step 2: Implement** per the interface.
- [ ] **Steps 3-6:** common steps. Component spec: root `qa mod`, `aria-label="Sample contributor tab discovery"`. Two columns (stacked under 640px): left, a mock file tree (`<pre>`-free list) showing `modules/<id>/tab.json` and `tab.ts` per manifest, with the broken one marked; right, the nav as the shell would build it (mounted tabs) plus the `tabsReport` output in a `<pre className="mono">` styled block, and a **Kill switch** toggle button per mounted tab (`aria-pressed`). Caption states plainly: "Tabs do not run as separate processes."

---

### Task 12: Admin demo

**Files:** Create `src/components/tesla/admin/{admin.ts,admin.test.ts,AdminDemo.tsx,admin.css}`.

**Interfaces:**
- Consumes: `MOCK_USERS`, `series`.
- Produces: `interface Req { userId: string; tab: string; ts: number; ask?: boolean; llmCost?: number }` (`ts` in minutes since an epoch); `interface Usage { userId: string; activeDays: number; visits7: number; visits30: number; topTab: string; askCount: number; llmSpend: number }`; `VISIT_GAP_MIN = 30`; `usageFor(userId: string, reqs: readonly Req[], now: number): Usage` — only that user's requests; `activeDays`: distinct `Math.floor(ts / 1440)` days within the last 30 days (`now - 30*1440 < ts <= now`); a visit starts at the first request or after a gap of 30 minutes or more; `visits7` / `visits30` count visits whose first request is within 7 / 30 days; `topTab` most frequent tab (ties broken alphabetically; `'—'` if none); `askCount` = count with `ask`; `llmSpend` = sum of `llmCost` rounded to 2 decimals; `mockRequests(): Req[]` deterministic mock request log; `interface Grants { [userId: string]: string[] }`; `canOpen(userId: string, tab: string, grants: Grants, defaultDeny: boolean): boolean` — if `defaultDeny` is false, a user with no grants entry is allowed (legacy rules); if true, no entry means denied; an entry allows exactly its listed tabs; `type AuditEntry = { who: string; action: string; target: string }`; `grant(grants: Grants, userId: string, tab: string, log: AuditEntry[]): { grants: Grants; log: AuditEntry[] }` (adds the tab if missing and appends an audit entry `{who: 'Admin', action: 'grant', target: '<userId>:<tab>'}`, returning new objects).

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { VISIT_GAP_MIN, canOpen, grant, mockRequests, usageFor, type Req } from './admin';

const DAY = 1440;
const now = 40 * DAY;
const reqs: Req[] = [
  { userId: 'u1', tab: 'overview', ts: now - 5 },
  { userId: 'u1', tab: 'overview', ts: now - 20 },
  { userId: 'u1', tab: 'ask', ts: now - 100, ask: true, llmCost: 0.123 },
  { userId: 'u1', tab: 'ask', ts: now - 3 * DAY, ask: true, llmCost: 0.4 },
  { userId: 'u1', tab: 'campaigns', ts: now - 20 * DAY },
  { userId: 'u1', tab: 'campaigns', ts: now - 35 * DAY },
  { userId: 'u2', tab: 'admin', ts: now - 1 },
];

describe('admin usage', () => {
  it('defines a visit gap of 30 minutes', () => { expect(VISIT_GAP_MIN).toBe(30); });
  it('counts visits with the gap rule', () => {
    const u = usageFor('u1', reqs, now);
    // visits in 7d: [now-3d], [now-100], [now-20,now-5] (20 and 5 are 15 min apart) = 3
    expect(u.visits7).toBe(3);
    expect(u.visits30).toBe(4);
  });
  it('counts active days inside the 30-day window only', () => {
    // The 35-day-old request sits outside the window, so u1 is active on 3 distinct days.
    expect(usageFor('u1', reqs, now).activeDays).toBe(3);
  });
  it('finds the top tab, ask count and spend', () => {
    const u = usageFor('u1', reqs, now);
    expect(u.topTab).toBe('ask');
    expect(u.askCount).toBe(2);
    expect(u.llmSpend).toBeCloseTo(0.52, 2);
  });
  it('handles a user with no requests', () => {
    const u = usageFor('nobody', reqs, now);
    expect(u).toEqual({ userId: 'nobody', activeDays: 0, visits7: 0, visits30: 0, topTab: '—', askCount: 0, llmSpend: 0 });
  });
  it('reads usage from the request log, so a user with no sign-in row still shows', () => {
    expect(mockRequests().length).toBeGreaterThan(20);
  });
  it('is default-allow for the unmatched until the flag is on', () => {
    expect(canOpen('u9', 'admin', {}, false)).toBe(true);
    expect(canOpen('u9', 'admin', {}, true)).toBe(false);
    expect(canOpen('u1', 'admin', { u1: ['overview'] }, false)).toBe(false);
    expect(canOpen('u1', 'overview', { u1: ['overview'] }, true)).toBe(true);
  });
  it('audits every grant and never mutates its inputs', () => {
    const grants = Object.freeze({ u1: Object.freeze(['overview']) }) as Record<string, string[]>;
    const log = Object.freeze([]) as unknown as [];
    const out = grant(grants, 'u1', 'campaigns', log);
    expect(out.grants.u1).toEqual(['overview', 'campaigns']);
    expect(out.log).toEqual([{ who: 'Admin', action: 'grant', target: 'u1:campaigns' }]);
  });
});
```

- [ ] **Step 2: Implement** per the interface. `mockRequests()` builds roughly 30 requests across the six `MOCK_USERS` from `series`, over a 30-day span ending at `NOW = 40 * 1440` (export `MOCK_NOW`).
- [ ] **Steps 3-6:** common steps. Component spec: root `qa adm`, `aria-label="Sample admin dashboard"`. Sections as `aria-pressed` buttons: Usage, Access, Audit. Usage: table per `MOCK_USERS` row with active days, visits (7d/30d), top tab, Ask count, LLM spend (`$0.00`). Access: a user x tab checkbox grid (use `grant`) and a **Default-deny gate** switch (`aria-pressed`) labeled "Built; off in production" with a `canOpen` check line "Can User 4 open Admin?" that updates. Audit: list of the log. Note under Usage: "Usage is computed from the request log, not sign-ins."

---

### Task 13: Wire the template, rail height and page tests

**Files:**
- Modify: `src/pages/work/[slug].astro` (imports lines 5-11, `Demo` type line 26, `demoFor` lines 30-39, switch cases lines 118-125)
- Modify: `src/styles/projects.css:61` (`--toc-list-height`)
- Modify: `src/content/work/tesla-page.test.ts`

**Interfaces:**
- Consumes: the eight default-exported demo components from Tasks 5-12.
- Produces: `Demo` union gains `'dashboard' | 'part' | 'ask' | 'forecast' | 'campaigns' | 'slides' | 'modular' | 'admin'`; the old `'worklog'` case is removed from the template (Work log renders inside the dashboard frame) but `WorklogDemo` stays imported only by `DashboardDemo`.

- [ ] **Step 1: Rewrite `tesla-page.test.ts` (failing)**

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SECTION_IDS } from './tesla-facts';

const page = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/work/[slug].astro'), 'utf8');
const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/projects.css'), 'utf8');

const DEMOS: Record<string, string> = {
  'dashboard': 'DashboardDemo', 'part-summary': 'PartSummaryDemo', 'ask-sdp': 'AskSdpDemo',
  'forecast-lab': 'ForecastLabDemo', 'campaigns': 'CampaignsDemo', 'slideshow-generation': 'SlidesDemo',
  'modular-architecture': 'ModularDemo', 'admin': 'AdminDemo',
};

describe('the tesla page in the template', () => {
  it('is a multi-project page', () => {
    expect(page).toMatch(/const MULTI = new Set\(\[[^\]]*'tesla'/);
  });

  it('routes every section to its own demo island, visible-hydrated', () => {
    for (const id of SECTION_IDS) {
      expect(page, id).toContain(`id.startsWith('${id}')`);
      expect(page, id).toMatch(new RegExp(`<${DEMOS[id]} client:visible />`));
    }
  });

  it('no longer renders the work log as a page section', () => {
    expect(page).not.toContain("id.startsWith('work-log')");
    expect(page).not.toMatch(/<WorklogDemo client:visible \/>/);
  });

  it('sizes the sticky contents list for eight rows', () => {
    const m = css.match(/--toc-list-height:\s*(\d+)px/);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeGreaterThanOrEqual(480);
  });
});
```

- [ ] **Step 2: Run to verify it fails.** `npx vitest run src/content/work/tesla-page.test.ts` — FAIL.

- [ ] **Step 3: Edit the template.** Add imports `DashboardDemo from '../../components/tesla/dashboard/DashboardDemo'`, `PartSummaryDemo from '../../components/tesla/partsummary/PartSummaryDemo'`, `AskSdpDemo from '../../components/tesla/asksdp/AskSdpDemo'`, `ForecastLabDemo from '../../components/tesla/forecastlab/ForecastLabDemo'`, `CampaignsDemo from '../../components/tesla/campaigns/CampaignsDemo'`, `SlidesDemo from '../../components/tesla/slides/SlidesDemo'`, `ModularDemo from '../../components/tesla/modular/ModularDemo'`, `AdminDemo from '../../components/tesla/admin/AdminDemo'`; remove the `WorklogDemo` import. Replace the `Demo` type and `demoFor`: keep the existing Blue Dome and Hanna entries; remove `work-log`; add `if (id.startsWith('dashboard')) return 'dashboard';` plus `part-summary` → `'part'`, `ask-sdp` → `'ask'`, `forecast-lab` → `'forecast'`, `campaigns` → `'campaigns'`, `slideshow-generation` → `'slides'`, `modular-architecture` → `'modular'`, `admin` → `'admin'`. Replace the `case 'worklog'` line with eight cases, e.g. `case 'dashboard': return <DashboardDemo client:visible />;`. Keep the `default: return unhandledDemo(demo);` so a missed case is a type error.

- [ ] **Step 4: Edit `projects.css:61`** to `--toc-list-height: 500px;` and update the comment above it to say "the Tesla page's eight rows" and that Hanna and Blue Dome have three rows.

- [ ] **Step 5: Run to verify it passes, then type-check the build.**
Run: `npx vitest run src/content/work/tesla-page.test.ts src/styles/projects.test.ts && npx astro check` (if `astro check` is not installed, skip it; `npm run build` in Task 15 type-checks the template).
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/work/[slug].astro src/styles/projects.css src/content/work/tesla-page.test.ts
git commit -m "feat: wire the eight Tesla demos into the page template

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Island source scan

**Files:** Create `src/content/work/tesla-islands.test.ts`.

This replaces the spec's "number scan on island files": mock figures are allowed inside labeled demo windows, so the scan checks the label and the banned terms instead.

- [ ] **Step 1: Write the test (it should pass immediately if Tasks 5-12 followed the constraints)**

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { BANNED_TERMS } from './tesla-facts';

const root = path.resolve(process.cwd(), 'src/components/tesla');
const folders = ['dashboard', 'partsummary', 'asksdp', 'forecastlab', 'campaigns', 'slides', 'modular', 'admin'];
const files = (dir: string) => fs.readdirSync(dir).filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f));

describe('the tesla demo islands', () => {
  for (const f of folders) {
    it(`${f} carries the sample-data label and no banned term`, () => {
      const dir = path.join(root, f);
      const demo = files(dir).find((n) => n.endsWith('Demo.tsx'))!;
      expect(demo, `${f} has a Demo.tsx`).toBeDefined();
      const src = files(dir).map((n) => fs.readFileSync(path.join(dir, n), 'utf8')).join('\n');
      expect(fs.readFileSync(path.join(dir, demo), 'utf8')).toContain('qa-sample');
      for (const needle of BANNED_TERMS) expect(src.toLowerCase(), needle).not.toContain(needle.toLowerCase());
      expect(src).not.toMatch(/\b\d{6,}-[A-Z0-9]{2}-[A-Z0-9]\b/);
      expect(src).not.toMatch(/Math\.random\(/);
    });
  }
});
```

- [ ] **Step 2: Run.** `npx vitest run src/content/work/tesla-islands.test.ts` — Expected PASS. If a banned term appears, fix the island, not the test.

- [ ] **Step 3: Commit**

```bash
git add src/content/work/tesla-islands.test.ts
git commit -m "test: scan the Tesla demo islands for the label and banned terms

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Agent fixture, trace text, and full verification

**Files:**
- Modify: `src/agent/fixtures/snapshot.json` (regenerated)
- Modify: `src/agent/run.test.ts:123` (chunk list and verifier count)
- Modify: `src/agent/snapshot.test.ts` only if its tesla assertions break

- [ ] **Step 1: Build, then regenerate the fixture**

Run: `npm run build && cp dist/agent-data.json src/agent/fixtures/snapshot.json`
Expected: `check-build: ok`. If `check-build` fails on a banned or unaccounted number, fix the page text (not the check).

- [ ] **Step 2: Run the suite and read the failures**

Run: `npm test 2>&1 | tail -60`
Expected: failures only in `src/agent/run.test.ts` (the `role:tesla` chunk list and `N numbers checked against sources`). The new chunk ids will be `role:tesla#dashboard`, `#part-summary`, `#ask-sdp`, `#forecast-lab`, `#campaigns`, `#slideshow-generation`, `#modular-architecture`, `#admin` in sorted order.

- [ ] **Step 3: Update `run.test.ts:123`.** Replace the experience step text with `'9 chunks (role:tesla, role:tesla#admin, role:tesla#ask-sdp, role:tesla#campaigns, role:tesla#dashboard, role:tesla#forecast-lab, role:tesla#modular-architecture, role:tesla#part-summary, role:tesla#slideshow-generation)'` and the verifier line with the new `N numbers checked against sources ✓` printed by the failing run. Do not change any other assertion; if another assertion fails, stop and report it.

- [ ] **Step 4: Run the full gate**

Run: `npm test && npm run build`
Expected: all tests pass, `check-build: ok`, `/work/tesla` present in `dist/sitemap-0.xml` (`grep -c "/work/tesla" dist/sitemap-0.xml` prints 1).

- [ ] **Step 5: Verify the agent answer.** Run `npx vitest run src/agent/golden.test.ts` — Expected PASS (the golden set is the grounding gate).

- [ ] **Step 6: Commit**

```bash
git add src/agent
git commit -m "test: regenerate the agent fixture for the eight-section Tesla page

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 7: Manual checklist for Andrian (do not tick for him).** Dev server `npm run dev`, open `/work/tesla`: Lighthouse mobile ≥ 95 on `/work/tesla` and `/`; no horizontal scroll at 320/375/414/768 in the page and every window; AA contrast in both themes; reduced motion stops the dashboard and slideshow auto-advance; rail rows all visible at 900-1199 px; home timeline "Read the full write-up" link; the agent answers "what did you do at Tesla" with on-page numbers; every demo shows the "sample data" label.

---

## Self-Review

**Spec coverage:** eight sections and order (Tasks 1-2); Problem/What/Architecture/Decisions/Impact/About-the-demo shape (Task 1 test, Task 2); eight SVGs (Task 3); hero frame with live Overview, nav scrolling to demos, work log view (Task 5); Part Summary six sub-tabs (Task 6); each remaining demo (Tasks 7-12); shared fixtures only (Task 4); claim labels and forbidden claims (Global Constraints, Task 1 tests); naming rule (BANNED_TERMS, Global Constraints); template mechanics `MULTI`/`demoFor`/`Demo` union (Task 13); rail height for eight rows (Task 13); agent fixture and snapshot/trace tests (Task 15); allowlist rebuilt (Task 1, 2); island scan (Task 14, changed from a number scan to a label-and-banned-term scan because mock figures are allowed in labeled windows); like-part tab credited to a teammate inside section 7 (Task 2 brief, Task 11); numbers shown to Andrian before they go on the page (Task 2 Step 3).

**Placeholder scan:** none left in logic modules; Task 2 prose is specified by exact facts and wording constraints rather than final sentences, and the body test gates every number and basis label.

**Type consistency:** `SECTION_IDS`/`SECTION_TITLES` (Task 1) are used by Tasks 2, 13; demo component default-export names (`DashboardDemo`, `PartSummaryDemo`, `AskSdpDemo`, `ForecastLabDemo`, `CampaignsDemo`, `SlidesDemo`, `ModularDemo`, `AdminDemo`) match across Tasks 5-14; fixtures names (`MOCK_PARTS`, `MOCK_CAMPAIGNS`, `MOCK_PLANNERS`, `MOCK_USERS`, `series`) match their consumers.
