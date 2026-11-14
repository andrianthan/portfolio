# Micron work page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Micron placeholder into a cleared `/work/micron` page with two projects, a mock-data demo for each, and matching chat-agent chunks.

**Architecture:** Micron joins the multi-project work-page pattern (`MULTI` in `src/pages/work/[slug].astro`). Two pure-state demos live under `src/components/micron/`, each with its logic in a sibling `.ts`, on invented fixtures. The agent's snapshot picks up the new `##` sections from the cleared role without code changes.

**Tech Stack:** Astro 7, React 19 islands (`client:visible`), Vitest 4 (SSR markup tests via `renderToStaticMarkup`, no DOM env), TypeScript, plain CSS tokens.

**Spec:** `docs/superpowers/specs/2026-11-08-micron-page-design.md`

## Global Constraints

- No real data, screenshots, wafer/lot ids, or internal tool/machine names anywhere: wafers are `W-04xx`, tools are `Tool A` to `Tool F`.
- No figure on the page except those in the demos' own invented fixtures, which the demo windows label "sample data". Page copy (micron.md) carries no number other than dates.
- Validation claim allowed, exactly: back-tested on earlier failures. No accuracy or other figure.
- Demos reuse the `qa` window chrome (`import '../../qa/qa.css'`, classes `qa`, `qa-top`, `qa-dots`, `qa-title`, `qa-sample`) like `src/components/tesla/asksdp/AskSdpDemo.tsx`; hydrate with `client:visible`; animate nothing.
- Copilot demo has NO free-text input and no live model.
- Every number a demo prints must be derived from its fixture rows (a test asserts it).
- Tesla, Hanna, Blue Dome content and the stats strip are untouched.
- `npm test` green, `npm run build` ends `check-build: ok`, `npx astro check` stays at the 7 pre-existing errors.
- Commit trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Never push or merge.

---

### Task 1: Fixtures and the copilot demo

**Files:**
- Create: `src/components/micron/fixtures.ts`
- Create: `src/components/micron/copilot/copilot.ts`, `copilot.test.ts`, `CopilotDemo.tsx`, `CopilotDemo.test.tsx`, `copilot.css`

**Interfaces:**
- Produces from `fixtures.ts`:
  - `interface Wafer { id: string; lot: string; path: string[]; z: number; failRate: number; size: number; score: number; factors: { label: string; weight: number }[] }`
  - `export const WAFERS: Wafer[]` (exactly 12, ids `W-0401`..`W-0412`, deterministic, `score` 0..1, `factors` sorted by weight desc, weights positive and each wafer's weights sum to its score within 0.01; at least 3 wafers share a tool in `path` so a shared-tool pattern exists)
  - `interface StepRow { wafer: string; step: string; tool: string; reading: number; limit: number }`
  - `export const STEP_ROWS: StepRow[]` (step history for at least `W-0412` and `W-0405`; rows where `reading > limit` mark an excursion)
  - `export const TOOL_FAIL_RATES: { tool: string; failRate: number; wafers: number }[]` (Tool A..Tool F, failRate as a fraction)
- Produces from `copilot.ts`:
  - `export const PRESETS: readonly string[]` (exactly three: `What made wafer W-0412 fail?`, `Which tool has the highest failure rate this month?`, `Which wafers should I look at first?`)
  - `export interface ToolCall { tool: string; result: string }`
  - `export interface Turn { turn: number; question: string; tools: ToolCall[]; text: string }`
  - `export interface ChatState { log: Turn[] }`, `export const initialChat: ChatState`, `export const MAX_TURNS = 20`
  - `export function ask(state: ChatState, question: string): ChatState` (only the three presets are answered; any other string returns `state` unchanged; the log keeps the newest `MAX_TURNS`; turn numbers keep counting up)
  - `export function answerFor(question: string): { tools: ToolCall[]; text: string } | null` (pure; builds text and tool results from the fixtures with template strings)

- [ ] **Step 1: Write failing tests (`copilot.test.ts`)**
  - exactly 3 presets, in order
  - `ask` on each preset appends a turn with ≥1 tool call and a non-empty text; on a non-preset returns the same state object
  - every number token in each answer's `text` appears in the answer's tool results or in the fixtures (derive the allowed set from `STEP_ROWS`, `TOOL_FAIL_RATES`, `WAFERS`, formatted as the answer formats them)
  - the W-0412 answer names a step whose `reading > limit` in `STEP_ROWS`
  - the tool-rate answer names the tool with the max `failRate`
  - the first-look answer lists the three highest-`score` wafers, highest first
  - log is capped at `MAX_TURNS` and turn numbers keep increasing
  - fixtures: 12 wafers, factor weights sum to score ±0.01, ids unique, no id/lot/tool string contains a real-looking name (only `W-04xx`, `LOT-xx`, `Tool A`..`Tool F`)
- [ ] **Step 2:** `npx vitest run src/components/micron` → FAIL
- [ ] **Step 3:** Implement `fixtures.ts` and `copilot.ts`
- [ ] **Step 4:** Tests → PASS
- [ ] **Step 5: Write `CopilotDemo.test.tsx`** (renderToStaticMarkup): window has `role="group"` and `aria-label="Sample wafer copilot chat"`, the three preset buttons, the `sample data` badge, an empty-state line, a caption saying answers are scripted from sample rows, and no `<input>`/`<textarea>`
- [ ] **Step 6: Implement `CopilotDemo.tsx` + `copilot.css`**: log (`role="log"`, `aria-live="polite"`, `tabIndex={0}`), tool-call list per turn like `ask-tools`, preset chips (`<button type="button">`), scroll-to-newest on new turn; reuse token colours only; mobile (320px) no horizontal scroll
- [ ] **Step 7:** `npm test`, commit `feat: Micron fixtures and the wafer copilot demo`

---

### Task 2: The risk demo

**Files:**
- Create: `src/components/micron/risk/risk.ts`, `risk.test.ts`, `RiskDemo.tsx`, `RiskDemo.test.tsx`, `risk.css`

**Interfaces:**
- Consumes: `WAFERS`, `Wafer` from `../fixtures`
- Produces from `risk.ts`:
  - `export function rank(ws: readonly Wafer[]): Wafer[]` (score desc, ties by id asc, does not mutate)
  - `export function queue(ws: readonly Wafer[], size: number): Wafer[]` (top `size` of `rank`, size clamped to 0..ws.length)
  - `export const DEFAULT_QUEUE = 4`
  - `export function topFactors(w: Wafer, n?: number): { label: string; weight: number }[]` (n default 3)
  - `export function queueLabel(size: number, total: number): string` (`4 of 12 wafers in the review queue`; singular handled: `1 of 12 wafers in the review queue`, `0 of 12 ...`)

- [ ] **Step 1: Failing tests (`risk.test.ts`)**: rank order and tie-break and no mutation; queue clamping at -1, 0, 5, 99; `topFactors` default 3 and sorted; `queueLabel` strings incl. 0 and 1
- [ ] **Step 2:** run → FAIL; **Step 3:** implement; **Step 4:** PASS
- [ ] **Step 5: `RiskDemo.test.tsx`**: SSR markup has `role="group"` `aria-label="Sample wafer risk ranking"`, `sample data` badge, a table with 12 rows in rank order, a range input `min=0 max=12` with default `DEFAULT_QUEUE`, `aria-valuetext` equal to `queueLabel`, the first `DEFAULT_QUEUE` rows marked `data-queued="true"` and the rest not, and a caption stating the scores are sample values and not the output of a trained model
- [ ] **Step 6: Implement `RiskDemo.tsx` + `risk.css`**: table (wafer, tool path joined with ` → `, Z-score, failure rate as %, size, score), queue slider, selecting a row (button in the first cell, `aria-pressed`) shows its `topFactors` in a panel below with `aria-live="polite"`; default selection = top wafer; tokens only; table scrolls inside its own `overflow-x: auto` wrapper so the page never scrolls sideways at 320px
- [ ] **Step 7:** `npm test`, commit `feat: Micron wafer risk demo`

---

### Task 3: The page, content, agent and build checks

**Files:**
- Modify: `src/content/work/micron.md`, `src/pages/work/[slug].astro`, `src/agent/run.test.ts`, `src/agent/golden.json`, `src/agent/fixtures/snapshot.json` (regenerate the way the repo already does; find it in `package.json`/`src/agent/snapshot.test.ts` first), `scripts/lib/*` or tests that pin page/entry counts
- Create: `src/content/work/micron-cleared.test.ts`
- Modify: docs spec Post-spec section only if the spec lists one for Micron (it does not; skip)

**Interfaces:**
- Consumes: `CopilotDemo` default export (`../../components/micron/copilot/CopilotDemo`), `RiskDemo` default export (`../../components/micron/risk/RiskDemo`)

- [ ] **Step 1: Replace `src/content/work/micron.md`** with exactly this (front matter and body verbatim):

```markdown
---
company: Micron Technology
title: Data Science Intern
project: LLM copilot and wafer risk model
dates: May 2025 – Aug 2025
start: "2025-05"
end: "2025-08"
summary: "Built an LLM copilot that engineers used daily to investigate wafer failure rates, and a gradient boosting risk model that ranks high-risk wafers, on Python and Snowflake pipelines over high-volume manufacturing data."
stack: [Python, Snowflake SQL, Power Automate, Microsoft Copilot, GPT, Gradient boosting]
logo: /logos/micron.svg
listed: true
cleared: true
order: 4
---
## Wafer analysis copilot

An LLM copilot over high-volume manufacturing data for HBM wafers. Engineers used it every day to investigate wafer failure rates, asking questions like what made a specific wafer fail.

### Problem

The manufacturing data for one wafer spans thousands of production steps. Working through it by hand to explain a failure took a lot of manual analysis time.

### What I built

Python and Snowflake SQL pipelines that process the manufacturing data, and a workflow built on Microsoft Copilot and Power Automate that connects Snowflake queries to GPT-based reasoning. An engineer asks a question in plain language, the workflow pulls the relevant data from Snowflake, and the model reasons over what comes back.

### How it was used

Engineers used it daily to investigate wafer failure rates, including what made a specific wafer fail.

## Wafer risk model

A risk classification model that ranks wafers, so engineers know which ones to look at first.

### Problem

Engineers cannot review every wafer. They needed the high-risk ones to surface first.

### What I built

A gradient boosting model trained on wafers that had failed before. Its inputs include Z-score, failure rate and wafer size, plus other factors such as which machines each wafer went through. It scores each wafer, and the highest scores rise to the top of the list.

### How I checked it

I back-tested it on earlier failures.

### How it was used

Engineers used the ranking to decide which wafers to analyze first and to inform yield optimization work.
```

- [ ] **Step 2: Failing tests (`micron-cleared.test.ts`)**, following `tesla-cleared.test.ts`: the entry is `cleared: true` and `listed: true`; body has no `[to confirm]`; body has no digit except none at all (assert `/\d/` does not match the body, the front-matter dates are outside the body); body contains neither `Snowflake` + a tool name pattern nor words `estimated`, `accuracy`, `precision`; the two `##` headings are exactly `Wafer analysis copilot` and `Wafer risk model`
- [ ] **Step 3: Edit `src/pages/work/[slug].astro`**: add `import CopilotDemo from '../../components/micron/copilot/CopilotDemo'; import RiskDemo from '../../components/micron/risk/RiskDemo';`; `MULTI` gains `'micron'`; `Demo` type gains `'wafer' | 'risk'`; `demoFor` gains `if (id.startsWith('wafer-analysis-copilot')) return 'wafer'; if (id.startsWith('wafer-risk-model')) return 'risk';`; the switch gains `case 'wafer': return <CopilotDemo client:visible />; case 'risk': return <RiskDemo client:visible />;`
- [ ] **Step 4: Agent**: regenerate the snapshot; update `src/agent/run.test.ts` expected chunk list to include `role:micron#wafer-analysis-copilot` and `role:micron#wafer-risk-model` in the position the existing sort gives; add two `golden.json` queries (`wafer risk model` expects top `role:micron#wafer-risk-model`; `wafer analysis copilot` expects `role:micron#wafer-analysis-copilot`) and keep the existing `Micron Technology` query passing (if its top changes, report it instead of editing the expectation silently)
- [ ] **Step 5: Build checks**: `npm run build`; if `check-build` or its tests pin 5 pages / 7 entries, update the pinned numbers to the real ones (6 pages), never loosen a check
- [ ] **Step 6:** `npm test`, `npm run build`, `npx astro check | tail -5` (7 errors); commit `feat: Micron work page with two demos`

---

### Task 4 (controller): browser verification

Open `/work/micron` at 320, 375 and 1440 px in both themes: no horizontal scroll, both demos usable by keyboard, the Sample data note and project index present, the home page Experience entry now links to it, Lighthouse mobile ≥ 95. Report evidence; fix findings through a subagent.
