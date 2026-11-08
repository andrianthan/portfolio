# Alpha Kappa Psi work page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/work/akpsi` — a two-project work page for Alpha Kappa Psi – Omega Phi with a mock-data demo for each project, plus the home-page Experience entry and the matching chat-agent chunks.

**Architecture:** A new content entry `src/content/work/akpsi.md` becomes a multi-project page through the existing `MULTI` / `demoFor` / switch machinery in `src/pages/work/[slug].astro`. Two React islands render the demos — a membership-intake pipeline stepper and an opportunity-listings feed — each with its logic in a sibling `.ts` file and its invented data in `src/components/akpsi/fixtures.ts`. Nothing reaches the network: both demos are pure state machines over local fixtures.

**Tech Stack:** Astro 7, React 19 islands, Vitest 4 (SSR markup tests via `renderToStaticMarkup`), TypeScript, plain CSS tokens; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-08-akpsi-page-design.md`

## Global Constraints

- Exactly four figures may appear as claims about the work, anywhere on the page or in its demos: **21** (hours of manual work saved), **80** (% improvement in operational efficiency), **50** (members who use the listings bot), **5** (individuals mentored into internships). No other number may be stated as a fact about this work.
- No real applicant or member name, email address, file, or any other detail about an individual. The demos use `Applicant A`–`Applicant E` and fictional company names only.
- No claim about the opportunity bot's language, model, hosting or stack beyond **Gmail**, **Google Drive** and **Discord**, which Andrian named. Its schedule (daily) and its role filtering are confirmed and may appear.
- Never the words "estimated", "accuracy" or "precision". Never a "[to confirm]" marker.
- The role is current: `dates: "Dec 2025 – Present"`, `current: true`, and the page is written in the present tense.
- Every demo must be visibly labelled sample data: the `qa` window chrome's "sample data" badge plus a caption that says the data is invented.
- Demos are pure client-side state machines: no network calls, no live model, no timers.
- Lighthouse 95 or higher on mobile for `/work/akpsi`; no horizontal scroll from 320 px; AA contrast in both themes; no animation.
- `npm test` green, `npm run build` ends `check-build: ok`, `npx astro check` stays at the 7 pre-existing errors. Never push or merge.

## Review Focus

Five input classes the spec implies that no task's tests exercise unless it is added to that task:

1. **An intake question that is not in the knowledge base** → the pipeline must stop at the knowledge-base stage and flag the email for a person, never invent an answer. (Task 1)
2. **Availability text that names no times** ("Weekends work best") → the scheduler must resolve to no slots, not a fabricated one. (Task 1)
3. **An attachment that fails validation** → the pipeline must stop at the validation stage and name the failing attachment. (Task 1)
4. **A listing whose source and role type are both filtered out** → it must disappear, and clearing the filters must bring it back. (Task 2)
5. **The same listing posted to the channel twice** → the channel must hold one copy, not two. (Task 2)

---

### Task 1: The membership intake pipeline demo

**Files:**
- Create: `src/components/akpsi/fixtures.ts`, `src/components/akpsi/intake/intake.ts`, `src/components/akpsi/intake/intake.test.ts`, `src/components/akpsi/intake/IntakeDemo.tsx`, `src/components/akpsi/intake/IntakeDemo.test.tsx`, `src/components/akpsi/intake/intake.css`

**Interfaces:**
- Consumes: nothing (this task is self-contained; the page wiring is Task 3).
- Produces, from `src/components/akpsi/fixtures.ts`:
  - `export interface Attachment { name: string; kind: 'resume' | 'transcript' | 'other'; valid: boolean }`
  - `export interface IntakeEmail { id: string; subject: string; question: string; availability: string; attachments: Attachment[] }` — `id` is `'Applicant A'` … `'Applicant E'`
  - `export const EMAILS: IntakeEmail[]` — exactly five, in the order A, B, C, D, E (see the table below)

  This file is the single home for the demos' invented data, as the spec requires: Task 2
  adds the listing fixtures to it.
- Produces, from `src/components/akpsi/intake/intake.ts`:
  - `export const STAGES = ['classify', 'knowledge', 'attachments', 'drive', 'schedule'] as const`
  - `export type Stage = (typeof STAGES)[number]`
  - `export interface IntakeState { emailId: string; stage: Stage; completed: Stage[]; flagged: boolean; answer: string | null; invalid: string | null; folder: string | null; slots: string[] }`
  - `export const KNOWLEDGE_BASE: Record<string, string>`
  - `export function initialState(emailId: string): IntakeState`
  - `export function advance(state: IntakeState, email: IntakeEmail): IntakeState` — processes exactly one stage
  - `export function answerFor(email: IntakeEmail): string | null` — the knowledge-base answer, or `null` when the question is not in it
  - `export function parseSlots(text: string): string[]`
  - `export function folderFor(email: IntakeEmail): string`
  - `export function stageTitle(stage: Stage): string`
  - `export function isComplete(state: IntakeState): boolean`

**Fixture data (use verbatim):**

| id | subject | question | availability | attachments |
|---|---|---|---|---|
| Applicant A | Membership requirements | What are the interview requirements? | Tuesday or Thursday afternoons | `resume-a.pdf` (resume, valid) |
| Applicant B | Membership fee | Does the organization cover the membership fee? | Monday, Wednesday or Friday mornings | `resume-b.pdf` (resume, valid), `transcript-b.pdf` (transcript, valid) |
| Applicant C | Scheduling | Can I defer my interview to next month? | Flexible | `resume-c.pdf` (resume, valid) |
| Applicant D | Application with transcript | What are the interview requirements? | Friday mornings | `resume-d.pdf` (resume, valid), `transcript-d.txt` (transcript, **invalid**) |
| Applicant E | Interview length | How long is the interview? | Weekends work best | `resume-e.pdf` (resume, valid) |

`KNOWLEDGE_BASE` holds exactly four entries — the questions of A, B, D and E. **Applicant C's question is deliberately absent**, which is what makes C the flagged case:

- `'What are the interview requirements?'` → `'Each candidate has a 30-minute interview and a short discussion with two members.'`
- `'Does the organization cover the membership fee?'` → `'The organization covers the membership fee for each member in good standing.'`
- `'How long is the interview?'` → `'The interview is 30 minutes, followed by a short discussion with two members.'`
- `'When does the fall membership intake open?'` → `'Fall intake opens in September, before the first meeting of the term.'`

**`parseSlots` contract (pin this exactly):** split the text on `,` and the standalone word
`or`. The **first time phrase in the whole text is the default time** for every fragment
that does not carry its own. For each fragment, find a weekday (a full day name, or a
three-letter name at the start of the fragment) and a time phrase: a fragment with both
yields `"<Weekday> <HH:MM>"`, a fragment with only a weekday yields `"<Weekday>"` (only
possible when the text names no time at all), a fragment with only a time yields
`"<HH:MM>"`, and a fragment with neither yields nothing. Time phrases map as: `morning` →
`09:00`, `before noon` → `09:00`, `afternoon` → `14:00`, `evening` → `18:00`, `after N` →
`N + 12` o'clock when `N < 12`, otherwise `N` o'clock. Dedupe, preserve order.

The default-time rule is what makes `"Monday, Wednesday or Friday mornings"` produce three
morning slots rather than one: `mornings` is only on the last fragment, but it is the first
time phrase in the text, so it is the default for all three days.

The five fixture availabilities must therefore resolve to exactly:

- A → `['Tuesday 14:00', 'Thursday 14:00']`
- B → `['Monday 09:00', 'Wednesday 09:00', 'Friday 09:00']`
- C → `[]`
- D → `['Friday 09:00']`
- E → `[]`  ("Weekends work best" names no day and no time)

`folderFor(email)` returns `` `Membership intake/${email.id}` `` — e.g. `Membership intake/Applicant A`.

**`advance` semantics (pin this exactly):** `advance` processes the state's *current* stage and returns the next state.
- `classify` → always completes; `completed` gains `'classify'`, `stage` becomes `'knowledge'`.
- `knowledge` → `answer = answerFor(email)`. If `null`, the state is **flagged** and stays on `'knowledge'` (it does not advance). Otherwise `answer` is set and `stage` becomes `'attachments'`.
- `attachments` → if any attachment has `valid === false`, the state is **flagged**, `invalid` is that attachment's `name`, and it stays on `'attachments'`. Otherwise `stage` becomes `'drive'`.
- `drive` → `folder` is set, `stage` becomes `'schedule'`.
- `schedule` → `slots` is `parseSlots(email.availability)`.

`stageTitle` returns, in stage order: `'Classify the email'`, `'Answer from the knowledge base'`, `'Validate attachments'`, `'File in Drive'`, `'Propose interview slots'`. `isComplete(state)` is true when `completed.length === STAGES.length`.

- [ ] **Step 1: Write the failing tests** — `src/components/akpsi/intake/intake.test.ts`:
  - `parseSlots`: the five fixture availabilities resolve to the exact arrays above; a fragment with no day and no time contributes nothing; `after 6` → `18:00`; the default time applies to every bare weekday in the text; duplicates are removed.
  - `answerFor`: A, B, D and E return their knowledge-base answer; **C returns `null`**.
  - `advance`: starting from `initialState('Applicant A')`, four presses reach the `'drive'` stage with `completed` equal to `['classify','knowledge','attachments','drive']`; a fifth reaches `'schedule'` and `isComplete` is true; `slots` equals A's expected array.
  - `advance` on C: after `'classify'` the state is `flagged: true`, `stage` is still `'knowledge'`, and `answer` is `null`.
  - `advance` on D: after `'classify'` and `'knowledge'`, the state is `flagged: true`, `stage` is still `'attachments'`, and `invalid` is `'transcript-d.txt'`.
  - `advance` on E: `slots` is `[]` — no time was named, so no slot is invented.
  - `folderFor`: returns `Membership intake/Applicant A`.
  - `advance` never mutates the state it is given.
  - **closed-world fixture test:** `EMAILS.map((e) => e.id)` is exactly `['Applicant A','Applicant B','Applicant C','Applicant D','Applicant E']`, every email id matches `/^Applicant [A-E]$/`, and no email or attachment name contains `@`.

- [ ] **Step 2: Run the test to verify it fails** — `npx vitest run src/components/akpsi/intake/intake.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement** `src/components/akpsi/fixtures.ts` (the table above) and `src/components/akpsi/intake/intake.ts` (the contracts above).

- [ ] **Step 4: Run the test to verify it passes** → PASS.

- [ ] **Step 5: Build the demo component** — `src/components/akpsi/intake/IntakeDemo.tsx`:
  - Uses the `qa` window chrome: import `../../qa/qa.css` and `./intake.css`, and render the `qa` / `qa-top` / `qa-dots` / `qa-title` / `qa-sample` structure with `qa-title` `"Membership intake"` and `qa-sample` `"sample data"`. Copy the chrome markup from `src/components/micron/risk/RiskDemo.tsx` — do not redesign it.
  - The root element is `<div className="qa intake" role="group" aria-label="Sample membership intake pipeline">`.
  - A list of the five applicant emails, each selectable; the selected one is `aria-pressed`.
  - A **Process** button that calls `advance(state, email)` once per press, showing one stage at a time.
  - The stage output shows, as reached: the classification, the knowledge-base answer **or** the flag-for-a-person message, the attachment validation result, the Drive folder path, and the proposed slots.
  - A caption that states the data is invented, for example: `<p className="intake-cap">Sample pipeline on invented data. The knowledge-base answers and applicant emails are made up.</p>`
  - Reset to the initial state when a different email is selected.

- [ ] **Step 6: Write the SSR markup test** — `src/components/akpsi/intake/IntakeDemo.test.tsx`, using `renderToStaticMarkup` as `src/components/micron/risk/RiskDemo.test.tsx` does:
  - the markup contains `role="group"`, `aria-label="Sample membership intake pipeline"` and `sample data`;
  - it contains the caption text and the words `Applicant A` and `Applicant E`;
  - it contains the first stage title `'Classify the email'` and the `Process` button;
  - it contains no `@` anywhere;
  - it contains no `fetch(`, no `XMLHttpRequest`, no `setTimeout`.

- [ ] **Step 7: Run the demo's tests to verify they pass** → PASS. Then run `npm test` to confirm nothing else broke.

- [ ] **Step 8: Commit** — `git add src/components/akpsi && git commit -m "feat: the membership intake pipeline demo"` with the trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

---

### Task 2: The opportunity listings demo

**Files:**
- Create: `src/components/akpsi/listings/listings.ts`, `src/components/akpsi/listings/listings.test.ts`, `src/components/akpsi/listings/ListingsDemo.tsx`, `src/components/akpsi/listings/ListingsDemo.test.tsx`, `src/components/akpsi/listings/listings.css`
- Modify: `src/components/akpsi/fixtures.ts` (created by Task 1 — add the listing fixtures to the same invented-data file, as the spec requires)

**Interfaces:**
- Consumes: `src/components/akpsi/fixtures.ts` (Task 1) — add to it.
- Produces, from `src/components/akpsi/fixtures.ts`:
  - `export interface Listing { id: string; title: string; company: string; source: ListingSource; roleType: RoleType; posted: string; place: string }`
  - `export type ListingSource = 'career site' | 'GitHub list' | 'referral'`
  - `export type RoleType = 'internship' | 'new grad' | 'co-op'`
  - `export const SOURCES: ListingSource[]` = `['career site', 'GitHub list', 'referral']`
  - `export const ROLE_TYPES: RoleType[]` = `['internship', 'new grad', 'co-op']`
  - `export const LISTINGS: Listing[]` — exactly ten, in this order
- Produces, from `src/components/akpsi/listings/listings.ts`:
  - `export function filterListings(listings: readonly Listing[], opts: { source: ListingSource | null; roleType: RoleType | null }): Listing[]`
  - `export function postToChannel(channel: readonly Listing[], listing: Listing): Listing[]`

**Fixture data (use verbatim):**

| id | title | company | source | roleType | posted | place |
|---|---|---|---|---|---|---|
| `L-01` | Software Engineering Intern | Northwind Labs | career site | internship | 2026-01-12 | Remote |
| `L-02` | Robotics Intern | Harborlight Robotics | career site | internship | 2026-01-14 | Seattle, WA |
| `L-03` | Backend Engineer Intern | Cedarworks Systems | GitHub list | internship | 2026-01-15 | Remote |
| `L-04` | Software Engineer, New Grad | Lumenworks | career site | new grad | 2026-01-16 | Boston, MA |
| `L-05` | Health Data Intern | Asterline Health | referral | internship | 2026-01-17 | Austin, TX |
| `L-06` | Platform Engineering Intern | Quarryline Software | GitHub list | internship | 2026-01-19 | Remote |
| `L-07` | Data Science Intern | Tidecrest Data | GitHub list | internship | 2026-01-20 | Chicago, IL |
| `L-08` | Co-op, Test Engineering | Brightfold Labs | career site | co-op | 2026-01-21 | Denver, CO |
| `L-09` | New Grad Software Engineer | Stonebridge Analytics | referral | new grad | 2026-01-22 | Atlanta, GA |
| `L-10` | Co-op, Embedded Systems | Vantagepoint Robotics | career site | co-op | 2026-01-23 | San Diego, CA |

`filterListings` treats `null` as "no filter on this axis"; when both are set the two filters combine with AND. `postToChannel` appends the listing to the end of the channel list **unless a listing with the same `id` is already there**, in which case it returns the channel unchanged.

- [ ] **Step 1: Write the failing tests** — `src/components/akpsi/listings/listings.test.ts`:
  - `filterListings` with no filters returns all ten, in order.
  - `filterListings` by `source: 'referral'` returns exactly `L-05` and `L-09`.
  - `filterListings` by `roleType: 'co-op'` returns exactly `L-08` and `L-10`.
  - `filterListings` by `source: 'GitHub list'` **and** `roleType: 'internship'` returns exactly `L-03`, `L-06`, `L-07`.
  - a combination that matches nothing returns `[]`.
  - `filterListings` does not mutate the array it is given.
  - `postToChannel` appends a listing to the end; posting a listing that is already in the channel returns a channel of the same length with no duplicate.
  - **closed-world fixture test:** `LISTINGS` has ten entries; every `company` is one of the ten fictional companies listed above and no other; every `id` matches `/^L-\d\d$/`; no title, company or place contains `@` or a digit other than the `posted` date.

- [ ] **Step 2: Run the test to verify it fails** → FAIL (module not found).

- [ ] **Step 3: Implement** — add the listing types, `SOURCES`, `ROLE_TYPES` and `LISTINGS` to `src/components/akpsi/fixtures.ts`, and write `src/components/akpsi/listings/listings.ts` with `filterListings` and `postToChannel`.

- [ ] **Step 4: Run the test to verify it passes** → PASS.

- [ ] **Step 5: Build the demo component** — `src/components/akpsi/listings/ListingsDemo.tsx`:
  - The same `qa` window chrome as Task 1, with `qa-title` `"Opportunity listings"` and `qa-sample` `"sample data"`.
  - Root: `<div className="qa listings" role="group" aria-label="Sample opportunity listings feed">`.
  - Filter chips for each source and each role type; a chip toggles that filter, and a filter can be cleared by pressing it again. The chip buttons are `aria-pressed`.
  - The feed lists the filtered listings, each with its source tag, role type and date.
  - A **Post to channel** button per listing, which calls `postToChannel`.
  - A channel panel styled as a plain message list — a `<ul>` of posted listings — not a copy of Discord's UI.
  - A caption that states the data is invented, for example: `<p className="listings-cap">Sample listings. Every company and listing here is made up.</p>`

- [ ] **Step 6: Write the SSR markup test** — `src/components/akpsi/listings/ListingsDemo.test.tsx`:
  - the markup contains `role="group"`, `aria-label="Sample opportunity listings feed"` and `sample data`;
  - it contains the caption text and all three source names;
  - it lists all ten listings by id (`L-01` … `L-10`);
  - it contains the filter chips with `aria-pressed="true"` on the active one;
  - it contains a `Post to channel` control and an empty channel list;
  - it contains no `@`, no `fetch(`, no `setTimeout`.

- [ ] **Step 7: Run the demo's tests to verify they pass** → PASS. Then `npm test`.

- [ ] **Step 8: Commit** — `git add src/components/akpsi && git commit -m "feat: the opportunity listings demo"` with the trailer.

---

### Task 3: The page, the Experience entry, and the agent chunks

**Files:**
- Create: `src/content/work/akpsi.md`, `src/content/work/akpsi-cleared.test.ts`, `src/content/work/akpsi-page.test.ts`, `public/logos/akpsi.svg`
- Modify: `src/pages/work/[slug].astro`, `src/agent/golden.json`, `src/agent/run.test.ts`
- Regenerate: `src/agent/fixtures/snapshot.json`

**Interfaces:**
- Consumes: `IntakeDemo` and `ListingsDemo` from Tasks 1 and 2.
- Produces: the route `/work/akpsi`; the home-page Experience entry; agent chunks `role:akpsi`, `role:akpsi#membership-intake-automation` and `role:akpsi#opportunity-bot`.

- [ ] **Step 1: Write the content entry** — `src/content/work/akpsi.md`:

  Frontmatter, exactly:

  ```yaml
  company: Alpha Kappa Psi – Omega Phi
  title: Software Engineer
  project: AI tools for internal operations
  dates: Dec 2025 – Present
  start: "2025-12"
  end: "present"
  summary: "Built two internal tools nobody asked for, after seeing the manual work: a membership intake pipeline that runs an application from the first email to a booked interview, and an opportunity bot that posts job listings to a Discord channel. The intake work saves 21+ hours of manual work, and 50+ members use the listings bot to apply."
  stack: [Gmail, Google Drive, Discord]
  logo: /logos/akpsi.svg
  current: true
  listed: true
  cleared: true
  order: 5
  ```

  Body. The three paragraphs before the first `##` are the **page intro**; each `##` project then has an intro paragraph followed by `### Problem`, `### What I built`, `### How it is used`:

  ```
  Alpha Kappa Psi's internal operations ran by hand. Nobody asked for these tools; I saw the manual work and built them.

  Two tools came out of it: a membership intake pipeline that runs an application from the first email to a booked interview, and an opportunity bot that posts job listings to the organization's Discord channel.

  I have also mentored 5+ individuals into internships.

  ## Membership intake automation

  The pipeline takes a membership application from the first email to a booked interview, with no manual step in between.

  ### Problem

  The VP Membership ran membership intake by hand: read the email, answer the applicant's questions, check the attachments, file everything, and go back and forth to find a time that worked. It was the same sequence for every applicant, done by one person.

  ### What I built

  A pipeline that watches the intake mailbox and runs that sequence. It classifies each incoming email, answers the applicant's question from a knowledge base, validates the attachments, files everything in Drive, and reads the applicant's availability to propose interview slots. When a question is not in the knowledge base, it flags the email for a person instead of guessing.

  ### How it is used

  It was built for the VP Membership, who had been doing intake by hand. It saves 21+ hours of manual work, with an 80% improvement in operational efficiency.

  ## Opportunity bot

  The bot posts job and internship listings to a Discord channel the members already use.

  ### Problem

  Members were each finding listings on their own, so the ones who did not ask around missed the ones posted elsewhere.

  ### What I built

  A scraper that collects listings from many sources, including individual company career sites and GitHub, and posts them to the channel. It runs daily and filters listings by role.

  ### How it is used

  50+ members use it to apply.
  ```

  Write the numbers as written above: `21+`, `80%`, `50+`, `5+`. No other digit may appear in the body or the summary — spell out "two", "three", "five" where a count is needed.

- [ ] **Step 2: Create the logo** — `public/logos/akpsi.svg`: a 48×48 SVG, `viewBox="0 0 48 48"`, whose only content is the letters `AK` centred, in `#104076` (the same navy `public/logos/micron.svg` uses), `font-family="Georgia, 'Times New Roman', serif"`, `font-size="21"`, `font-weight="700"`, `text-anchor="middle"`. No background rectangle: the tile behind it is white in both themes (`--color-logo-bg: #ffffff`). Do not set `logoFill` on the entry.

- [ ] **Step 3: Write the content gate test** — `src/content/work/akpsi-cleared.test.ts`, modelled on `src/content/work/micron-cleared.test.ts`:
  - `data.cleared`, `data.listed` and `data.current` are all `true`; `data.order` is `5`.
  - `data.dates` is `'Dec 2025 – Present'` and `data.start` is `'2025-12'`.
  - `data.stack` is exactly `['Gmail', 'Google Drive', 'Discord']`.
  - the body contains no `'[to confirm]'` and no `/\b(estimated|accuracy|precision)\b/i`.
  - the only figures: `data.summary` contains exactly `['21+', '50+']` and the body contains exactly `['5+', '21+', '80', '50+']`, in that order (scan with `/\d[\d,]*\+?/g`).
  - the body has exactly two `##` headings: `'Membership intake automation'` and `'Opportunity bot'`.
  - the body names no individual: no `'@'`, no `/\b[A-Z][a-z]+\.[A-Z][a-z]+\b/`, and no `/\b(?:applicant|member|candidate)\s+[A-Z][a-z]+\b/i`.
  - the body has a page intro of exactly three paragraphs before the first `##`.

- [ ] **Step 4: Write the template test** — `src/content/work/akpsi-page.test.ts`, modelled on `src/content/work/tesla-page.test.ts` (a source-text test on `src/pages/work/[slug].astro`):
  - `MULTI` contains `'akpsi'`.
  - `Demo` contains `'intake'` and `'listings'`.
  - `demoFor` maps `id.startsWith('membership-intake')` to `'intake'` and `id.startsWith('opportunity-bot')` to `'listings'`.
  - the switch renders `<IntakeDemo client:visible />` and `<ListingsDemo client:visible />`.

- [ ] **Step 5: Wire the page** — `src/pages/work/[slug].astro`:
  - add `'akpsi'` to `MULTI`;
  - add `'intake' | 'listings'` to the `Demo` type;
  - add the two `demoFor` cases and the two switch cases (`case 'intake': return <IntakeDemo client:visible />;` and `case 'listings': return <ListingsDemo client:visible />;`), with the two imports at the top;
  - **render the page intro for multi-project pages.** Today the multi branch drops everything before the first `##`: inside the `if (multi)` block it does `const html = entry.rendered?.html ?? '';` and then `for (const chunk of html.split(/(?=<h2[ >])/).filter((c) => c.trim().startsWith('<h2')))`. Split once, keep the first chunk, and render it, so the three intro paragraphs reach the page:
    ```astro
    const html = entry.rendered?.html ?? '';
    const chunks = html.split(/(?=<h2[ >])/);
    const introHtml = multi ? (chunks[0] ?? '').trim() : '';
    const projectChunks = chunks.slice(1).filter((c) => c.trim().startsWith('<h2'));
    ```
    Use `projectChunks` in place of the current inline split in the `for` loop, and render `{introHtml && <Fragment set:html={introHtml} />}` at the top of the default slot, before the project sections.
    The four existing multi pages (tesla, hanna, bluedome, micron) have no content before their first `##`, so their rendered output must not change. Prove it: run `npm run build` **before** making the template change and copy the four files aside (`dist/work/tesla/index.html`, `dist/work/hanna/index.html`, `dist/work/bluedome/index.html`, `dist/work/micron/index.html`); after the change and a rebuild, `diff` each against its copy. All four must be identical. If any differs, this step is wrong — stop and report it rather than adjusting the diff to match.

    Note for the reviewer: this touches the shared multi-page template, so it is the one place this plan touches code the other four work pages also use. The spec lists "any change to the other work pages" as out of scope; this change leaves their rendered output byte-identical, which the diff above is there to prove.

- [ ] **Step 6: Update the agent** — `src/agent/golden.json`: add two cases, following the existing shape:

  ```json
  { "query": "what did you do at alpha kappa psi", "expectIntent": "experience", "expectTop": "role:akpsi" },
  { "query": "what does the opportunity bot do", "expectIntent": "search", "expectTop": "role:akpsi" }
  ```

  `expectTop` resolves by (title, url), and the three `akpsi` chunks share both — the parent `role:akpsi` sorts first by id, so it is the one that resolves. The parent's text is the frontmatter summary, which contains the phrase "an opportunity bot" verbatim, so it is also the chunk BM25 ranks first for the second query; the sub-chunk's own body never says "opportunity" or "bot" and scores zero against it.

  **Do not word the second query "tell me about the opportunity bot".** I checked the router
  against the real code: `tell me about` matches the `about` intent rule, so that query
  routes to `about`, never reaches the role chunks, and would fail the golden set. The two
  queries above are the ones I verified — `what did you do at alpha kappa psi` routes to
  `experience` (the chunk title's first two words, "Alpha Kappa", become the entity
  needle) and `what does the opportunity bot do` routes to `search`. If either query does
  not retrieve `role:akpsi` as the top chunk, report that rather than loosening the
  assertion.

  `src/agent/run.test.ts`: the `/experience` step-trace assertion at line ~178 lists every role chunk. It becomes **23** chunks and the list gains `role:akpsi`, `role:akpsi#membership-intake-automation` and `role:akpsi#opportunity-bot` at the front (the chunk list is sorted by id). Update that one string; do not touch the other step-trace assertions — the tesla chunk count and the verified-numbers count are unaffected.

  `src/agent/fixtures/snapshot.json`: regenerate with `npm run build` then `cp dist/agent-data.json src/agent/fixtures/snapshot.json`.

- [ ] **Step 7: Run the gates** — `npm test` green; `npm run build` ends `check-build: ok (7 pages, 8 entries)` (the page count goes 6 → 7 and the content entry count 7 → 8); `npx astro check | tail -5` still shows the 7 pre-existing errors.

- [ ] **Step 8: Commit** — `git add src/content/work/akpsi.md src/content/work/akpsi-cleared.test.ts src/content/work/akpsi-page.test.ts public/logos/akpsi.svg "src/pages/work/[slug].astro" src/agent/golden.json src/agent/run.test.ts src/agent/fixtures/snapshot.json && git commit -m "feat: the Alpha Kappa Psi work page"` with the trailer.

---

### Task 4 (controller): browser verification

Open `/work/akpsi` at 320, 375 and 1440 px in both themes: the page intro renders above the two projects in the stated order; each project shows its demo; the intake demo steps through the pipeline one stage at a time, flags Applicant C at the knowledge-base stage, stops on Applicant D's `transcript-d.txt`, and proposes no slot for Applicant E; the listings demo filters by chip and posts a listing to the channel panel; the Experience entry on `/` shows Alpha Kappa Psi with the "now" tag; the agent answers both golden queries; no horizontal scroll; images and logos load. Report the evidence and fix findings through a subagent.
