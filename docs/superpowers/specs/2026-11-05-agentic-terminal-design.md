# Agentic terminal and hero graph: design spec

Date: 2026-11-05. Owner: Andrian Than. Status: design approved in conversation; awaiting spec review. Extends `2026-11-05-portfolio-design.md` (the base site spec stays binding wherever this spec is silent).

## 1. Goal

Relate the portfolio to agentic systems in a way a recruiter can see in seconds and an engineer can respect on inspection. Two deliverables:

1. **Hero graph (phase 1):** a small cursor-reactive agent graph on the home page whose nodes mirror the real architecture of the terminal's agent.
2. **Terminal (phase 2):** an opt-in `/terminal` page with a **deterministic agent**: slash commands and free-text questions go through one router, tools retrieve from the site's own cleared content, a verifier checks every number, and the terminal shows the agent's **real trace**.

The agent is **rules and retrieval, with no LLM**. The site says so. It mirrors the owner's engineering stance ("AI proposes, code disposes") by removing the AI entirely from the loop, and it demonstrates tool routing, numeric grounding and golden-set evals on the owner's own content.

## 2. Scope

### In scope
- Phase 1: `HeroGraph` on the home page; "Try the terminal" text link beside the hero buttons.
- Phase 2: `/terminal` page; agent engine in `src/agent/`; build-time snapshot at `/agent-data.json`; golden-set eval in CI; easter-egg commands; opt-in sound toggle; terminal theme tokens; no-JS fallback.
- A shared profile data file so the About text, skills and contact links have one source.
- Build-check extensions so the new outputs fall under the existing content gate.

### Out of scope (this spec)
- Any LLM-backed answer path, API keys, serverless functions, rate limits, or spend caps. A later LLM-backed engine would implement the same `runAgent` interface and gets its own spec.
- 3D, xterm.js, React Bits, animation libraries, new runtime dependencies.
- Scripted replays of other projects' agents (AdvisorAI, ai-swing-trader, claude-token-saver, Ask SDP). The terminal shows only real traces of its own deterministic agent.
- Official Anthropic or Claude marks (see section 9).

## 3. Phases and acceptance

**Phase 1 (hero graph) is done when:** the home page shows the graph (SSR SVG, nodes are real links), pointer reaction works only while the pointer is inside and the graph is visible, reduced motion shows a static layout, there is no layout shift (reserved aspect ratio), mobile layout works at 320 to 768px, home Lighthouse stays at the base spec's bar (performance, accessibility, best practices, SEO each at least 95 on mobile), and the build check passes.

**Phase 2 (terminal) is done when:** `/terminal` works with keyboard and touch, every command and free-text question runs through `runAgent`, traces render live, the golden-set eval passes in CI with the thresholds in section 6, the snapshot provably excludes uncleared content (tests plus build check), the page has a working no-JS fallback, `/terminal` Lighthouse is at least 95 for accessibility, SEO and best practices and at least 90 for performance, and the build check passes.

Phases ship as separate branches or commits so phase 1 can deploy on its own. Nothing is pushed or deployed without explicit owner approval (pushing `main` deploys to production).

## 4. Data

### 4.1 Profile data (`src/data/profile.ts`)
A typed module exporting the About paragraphs, skills (from the resume's Technical Skills section, grouped as on the resume), and contact links (email, LinkedIn, GitHub, resume path). `About.astro` and `Hero.astro` consume it so there is one source. No visible change on the home page from this refactor. Only facts already on the public resume or home page may appear.

### 4.2 Snapshot (`src/pages/agent-data.json.ts`, output `/agent-data.json`)
Built at build time from the content collections and `profile.ts` by a pure function `buildSnapshot(input): Snapshot` in `src/agent/snapshot.ts`.

```ts
export type ChunkKind = 'role' | 'project' | 'about' | 'skill' | 'contact';
export interface Chunk {
  id: string;          // stable, lowercase. Summary chunk: 'role:tesla', 'project:ai-swing-trader'.
                       // Body-section chunk (cleared entries only): 'role:tesla#problem', 'project:ai-swing-trader#key-decisions'
                       // (the heading slug after '#'). Profile chunks: 'about:bio', 'skill:ai-llm', 'contact:links'.
  kind: ChunkKind;
  title: string;
  text: string;        // plain text, no markdown or HTML
  url: string;         // internal path or absolute external URL
  facts: string[];     // numbers and short phrases found in `text`, derived by the builder
}
export interface Snapshot { version: 1; chunks: Chunk[]; }
```

Inclusion rules (the gate):
- A **listed** role or project contributes ONE chunk from its frontmatter `summary` (the same resume-level text the home page shows). Its `url` points to the detail page only if the entry is `cleared`, otherwise to the home anchor (`/#experience` or `/#projects`).
- A **cleared** role or project additionally contributes chunks derived from its Markdown body, split by `##` heading (one chunk per section, plain text, HTML blocks reduced to their text). A non-cleared body never enters the snapshot.
- `listed: false` entries contribute nothing.
- About, skills and contact chunks come from `profile.ts`.
- The builder drops any chunk whose text contains the marker `[to confirm` (case-insensitive) and the build check fails if one slips through (section 8).
- Chunks are sorted by `id` ascending (determinism).

## 5. The agent engine (`src/agent/`, pure TypeScript)

No randomness, no clock, no network. Same input gives the same output. Ties break by `id` ascending.

```ts
export type Intent =
  | 'help' | 'experience' | 'projects' | 'resume' | 'about' | 'skills' | 'contact'
  | 'search' | 'clear' | 'sound' | 'easter' | 'refuse';
export interface Route { intent: Intent; args: string[]; query: string; }
export type Actor = 'orchestrator' | 'experience' | 'projects' | 'resume' | 'skills' | 'contact' | 'search' | 'verifier';
export interface TraceStep { actor: Actor; text: string; status: 'ok' | 'fail' | 'info'; }
export interface Source { title: string; url: string; }
export interface AgentResult {
  route: Route;
  steps: TraceStep[];          // the trace the terminal renders, in order
  answer: { text: string; sources: Source[] } | null;
  refused: boolean;            // true when verification failed or nothing relevant was found
  effects?: { clear?: boolean; sound?: 'on' | 'off' | 'toggle' };  // UI side effects, never content
}
export function runAgent(snapshot: Snapshot, query: string): AgentResult;
```

Pipeline (each stage is its own module with its own tests):
1. `normalize(query)`: trim, collapse whitespace, lowercase for matching, strip punctuation, cap length at 200 characters (longer queries route to `refuse` with a short explanation).
2. `route(query)` (the orchestrator): slash commands map directly to intents (`/help /experience /projects /resume /about /skills /contact /clear /sound /hire /coffee /whoami`). Free text is classified by ordered keyword rules plus entity matching (company names, project names, skill terms taken from snapshot titles and facts). Anything outside the portfolio's scope or that tries to steer the agent ("ignore previous instructions", salary, private details) routes to `refuse`. A low-confidence search score also routes to `refuse` with command suggestions.
3. `tools`: `experience`, `projects`, `resume`, `skills`, `contact`, `search`. Each takes the snapshot plus args and returns ranked chunks. `search` uses BM25 over `title + text` with a fixed tokenizer and a minimum score.
4. `respond`: builds the answer by quoting or templating from the retrieved chunks only (no free generation) and attaches sources.
5. `verify(answer, chunks)`: numeric-grounding rail. Every number-like token in the answer (digits with optional `$`, `%`, `+`, `k`, `m`, commas) must appear in the retrieved chunks' text or facts. If any does not, the answer is withheld, the trace shows `verifier ✗`, and the result is a refusal. URLs in sources must match chunk URLs.
6. Each stage appends `TraceStep`s with plain language, for example `orchestrator: routed to experience (matched "tesla")` then `experience: 1 chunk (role:tesla)` then `verifier: 3 numbers checked against sources ✓`.

Refusal copy is honest and short: "I only answer from this portfolio's published content. Try /help." The engine never claims to be a language model; the terminal header says "deterministic agent: rules and retrieval, no LLM".

Easter eggs are intents handled by the same pipeline: `/hire` returns the contact chunk with a verifier-checked trace; `/whoami` returns a one-line profile from `profile.ts`; `/coffee` returns a short fixed ASCII cup (the trace shows `orchestrator: easter egg, no tools needed`). No other hidden behavior.

## 6. Golden-set eval (CI)

`src/agent/golden.json` holds at least 25 cases: `{ query, expectIntent, expectTop?: chunkId, expectRefuse?: boolean }`. Cases cover every intent, company and project aliases, paraphrases, typos within the matcher's tolerance, and refusals (off-topic, prompt-injection phrasing, salary or private-detail requests, over-length input). Cases run against a fixed fixture snapshot committed under `src/agent/fixtures/` (not the live content), so content edits cannot break CI by themselves; a second small test builds the real snapshot from the repo's content and checks structure only.

`golden.test.ts` asserts, and prints a one-line report (routing coverage, refusal rate):
- Routing coverage: 100% of non-refusal cases route to `expectIntent` and, where given, return `expectTop` first.
- Refusal: 100% of `expectRefuse` cases refuse; 0 non-refusal cases refuse.
- Negative control: a result whose answer text is tampered to include a number absent from the sources fails `verify` (the test mutates the answer and expects `refused`).
- Determinism: running every case twice yields identical `AgentResult` JSON.

The report numbers may be shown on the site only if they are real test output.

## 7. Terminal UI (`/terminal`)

- **Route and shell:** `src/pages/terminal.astro` renders a static shell and the no-JS fallback; one React island (`Terminal.tsx`, `client:load`, this page only) hydrates the interactive part.
- **Layout:** header bar "andrian@portfolio · terminal" with a sound toggle and a link back to the clean site; scrollback log; `>` prompt; a row of command chips.
- **Input:** Enter submits; ↑/↓ recall history; Tab completes slash commands; Ctrl-L or `/clear` clears. On load it auto-runs `/help`.
- **Output:** each submission runs `runAgent` against `/agent-data.json` (fetched once, cached in memory) and appends the trace lines with a short delay per line (about 120 ms), then the answer with source links. Reduced motion, or a click on the log, shows everything at once.
- **Sound:** off by default. Header toggle and `/sound on|off` control it. Tiny Web Audio blips (about 20 ms) on trace lines, created only after a user gesture. No autoplay. Choice stored in `localStorage` key `term-sound`, every read and write in try/catch.
- **Accessibility:** the log is `role="log"` with `aria-live="polite"`; the input has a visible label (can be visually styled as the prompt); chips are `<button>`s with text; focus returns to the input after a chip; visible focus rings; input font size at least 16px (avoids iOS zoom); trace and answer text meets contrast AA on the terminal theme.
- **No-JS fallback:** the same content as a plain list of sections with links, rendered at build time from the same snapshot data, inside the page body (visible when JS is off; hidden once the island mounts).
- **Mobile:** works at 320 to 768px; chips wrap; the log is scrollable without horizontal page scroll.

## 8. Hero graph (home page, phase 1)

- **Shape:** inline SVG, about 7 nodes: an orchestrator at the center, tool nodes (experience, projects, resume, skills, contact) around it, and a verify node reached by edges that carry a ✓ mark. It mirrors the real engine in section 5.
- **Links:** each node is an SVG `<a>`: `#experience`, `#projects`, `/resume.pdf`, `#about`, the footer contact anchor, and `/terminal`. The graph works without JavaScript, has a text alternative (`<title>` and `<desc>`), and nodes have visible labels or accessible names.
- **Interaction:** a tiny island (`HeroGraph.tsx`, `client:idle`) eases node positions toward the pointer within a radius and stretches edges, using one `requestAnimationFrame` loop that runs only while the pointer is inside and the graph is in view (IntersectionObserver). Under `prefers-reduced-motion: reduce`, nodes do not move (fixed layout).
- **Placement and cost:** right of the hero text at 900px and up; below the hero buttons on narrow screens; reserved `aspect-ratio` so there is no layout shift; no new runtime dependency. A "Try the terminal →" text link sits next to the hero buttons.

## 9. Look and branding

Terminal-inspired and clearly the owner's. Scoped terminal tokens (`--term-*` in `src/styles/terminal.css`, used on `/terminal` only; the home page keeps the base tokens):
- Background warm charcoal `#1b1917`; text `#e9e5de`; muted `#948d83`; rule `#34302c`; accent (prompt, spinner, links) warm terracotta `#e07a5f`; OK `#7fb88a`; fail `#e57373`. All colors only through these variables. Contrast AA is checked in tests or Lighthouse.
- Monospace stack (`JetBrains Mono` already loaded, then `ui-monospace`). A generic braille-dot spinner for in-progress lines.
- **No Anthropic or Claude logo, wordmark, mascot or pixel art, and no styling that presents the page as an Anthropic product.** A visible footer line: "Unaffiliated personal portfolio. Inspired by Claude Code. Not an Anthropic product." Text mentions of Claude Code are factual and nominative only. Official assets, if the owner ever adds them, are the owner's decision under Anthropic's brand guidelines and need no code change here.

## 10. Build checks and gate changes

- The snapshot route emits static JSON, which `listText` already scans for markers and body needles. `runChecks` is extended so the build fails if `dist/agent-data.json` is missing, has zero chunks, or contains any chunk whose id starts with `role:` or `project:` for an entry that is not `listed`, or any body-derived chunk (id with a `#section` suffix) for an entry that is not `cleared`.
- `readEntries` and the checks keep working unchanged for existing collections.
- `/terminal/index.html` must exist in `dist` after the phase 2 build, and the existing HTML checks (markers, alt, broken links) apply to it.
- New vitest globs: `src/agent/**/*.test.ts` (the existing `src/**/*.test.ts` already matches).

## 11. Files

```
src/data/profile.ts
src/agent/{types,normalize,snapshot,route,tools,respond,verify,run}.ts
src/agent/*.test.ts  src/agent/golden.json  src/agent/golden.test.ts  src/agent/fixtures/
src/pages/agent-data.json.ts
src/pages/terminal.astro
src/components/terminal/Terminal.tsx  src/components/terminal/useTerminal.ts  src/components/terminal/sound.ts
src/components/HeroGraph.astro  src/components/HeroGraph.tsx
src/styles/terminal.css
scripts/lib/run.mjs   (extended)  scripts/lib/checks.mjs (extended)  with tests
```
Home-page edits: `Hero.astro` (graph slot, terminal link), `About.astro` (reads `profile.ts`), header link to `/terminal`.

## 12. Motion (extends the base spec's motion list)
Adds: hero graph pointer reaction, terminal trace-line reveal, terminal cursor blink, spinner. All disabled or static under `prefers-reduced-motion: reduce` (trace lines appear instantly; the cursor does not blink; the spinner is a static glyph).

## 13. Risks and notes
- **Agent scope creep:** keep the rule set small and tested; unknown questions refuse rather than guess.
- **Employer content:** the agent only sees cleared body text plus the resume-level `summary` already public on the home page; employer role bodies stay uncleared until the owner approves them.
- **Honesty:** the header and refusals state "deterministic, no LLM". Trace text is generated from actual engine steps. Any reported eval numbers are real test output.
- **Performance:** the terminal island and snapshot load only on `/terminal`; the home page adds one small SVG and one small island.
- **Pushing `main` deploys to production**; work happens on a feature branch and merges only with owner approval.
- **Later:** an LLM-backed engine behind `runAgent`, `/lab` 3D, extra scripted demos, richer easter eggs.
