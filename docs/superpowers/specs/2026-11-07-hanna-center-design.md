# Hanna Center page: three projects with interactive demos

Date: 2026-11-07. Branch: `feat/bluedome-demo` (same branch as the Blue Dome page). Status: design approved in chat.

## Goal

Turn `/work/hanna` into a multi-project page in the same format as `/work/bluedome`: a contents list under the role/dates/stack row, then one section per project. Each project has Problem, What it does, Architecture (hand-written SVG), Key decisions, Impact, and About the demo, plus an app-style interactive demo window running real, tested logic over fictional data.

## Projects, in page order

1. **Grants Agent** (the grant-research agent).
2. **IR Updater Bot** (the Teams-to-Salesforce incident tool).
3. **Case Note Coach** (the clinical-note chatbot, a ChatGPT Custom GPT).

The relevance-evaluation harness mentioned on the resume is not a separate project. It is described inside Grants Agent.

## Demo windows (all fictional data, no real names, orgs, clients, payers or accounts)

### Grants Agent
- Tabs: **Grants** (scored list), **Digest** (what the daily email would contain), **Tracker** (approve or skip), **Edit criteria**.
- Scorer: seven stand-in flags modeled on the real framework, each returning a reason; score 0 to 10; a threshold slider (sheet default 5.0, email default 6.0) decides what lands in each view.
- Edit criteria: plain-English commands ("raise the threshold to 7") go through a small parser, then **preview**, then **apply** with a one-time token that expires, plus **undo**. This mirrors the real two-phase-commit editor.
- Logic is unit-tested: scoring, threshold filtering, command parsing, token expiry, apply, undo.

### IR Updater Bot
- A Teams-style chat. `/ir` opens a 5-step form (who and when; type and severity; staff and narrative; resolution; flags) and a review screen with edit buttons.
- Dependent picklists: an invalid type/sub-type combination is dropped before submit, as the real bot does.
- Submit creates a **Draft** incident record plus one linked record per youth, shown in a record view; a supervisor action marks it Approved.
- Logic is unit-tested: form state machine, dependent-picklist nullification, payload builder, required-field validation.

### Case Note Coach
- A chat window with two conversation starters, like the real GPT: **Start a new note** and **Check a note**.
- Questions: retrieval (BM25 plus local LSA vectors plus rank fusion, reusing `src/components/guide/retrieve.ts`) over a fictional documentation-standards knowledge base; answers quote and cite the passage, and refuse when nothing matches.
- Check a note: the eight hard-fail conditions from the real rubric run as deterministic rules and produce a Tier 1, 2 or 3 verdict with what to fix. The exact eight are read from the engineer handoff before this is built.
- Start a new note: asks for what is missing, then assembles a D/I/P note where every sentence traces to the input (the anti-fabrication rule). Template, not an LLM.

## Real facts used (from the author's own docs; conflicts resolved by the author)

- **Grants Agent:** 39 sources, 7-flag score, 6 search profiles, sheet shows 5.0 and up, email shows 6.0 and up, about $16 to $19 a month to run (LLM about $2 to $5), 6 AM scrape, 9 AM scoring and email, Friday 8 AM digest, criteria in an editable document, a Custom GPT editor with preview, apply and undo.
- **IR Updater Bot:** 5-step form, submit in 1 to 3 seconds, about $1 to $2 a month, 54-check smoke test (53 passing), 22 documented failure scenarios, state carried in the card, Draft-only creation.
- **Case Note Coach:** 3 tiers, 8 hard-fail rules, 15 knowledge-base files, 259 ICD-10 codes, 114 intervention terms, 15 to 20 minute rebuild.
- **Shared:** $30k+ in avoided vendor and subscription cost across the first two tools (resume).

No estimated numbers. Anything not stated in the docs is left out.

## Kept off the page

AWS identifiers, function names and URLs, secret names, email addresses, staff first names, DNS tokens, the personal-account hosting detail, security weak spots (open network access, public function URL), the payer's name, and any case-note, client or student content. Diagrams use generic labels.

## Architecture diagrams (generic labels)

- Grants Agent: scheduler, workflow fan-out, scraper per source, processing (filter, extract, embed, dedupe), database with vectors, evaluator (retrieve candidates, cheap pre-filter, stronger scorer), sheet and email; plus the criteria document and the editor behind a two-phase commit.
- IR Updater Bot: Teams, bot service, one serverless function, CRM API; form state travels in the card.
- Case Note Coach: system instructions, layered knowledge base by authority, file search, two entry points, flow from input to tier or note.

## Constraints

- No new dependencies. No changes to `build`, `vercel.json` or the content gate.
- Demo numbers never enter `/agent-data.json` (Impact figures are the page's own and are labeled as doc facts).
- Lighthouse bar: at least 95 on all four categories; check the home page and the new pages after the build.
- No merge, push or deploy without explicit approval in chat.

## Build order

Per project: logic with tests, then the window, then the diagram and text, then one commit. Order: Grants Agent, IR Updater Bot, Case Note Coach. Then page structure and TOC wiring in `src/pages/work/[slug].astro`, then a mobile and Lighthouse pass.

## Testing

Vitest for every logic module (scorer, criteria editor, IR form and payload, tier rules, retrieval over the new knowledge base). Visual check in the browser for each window in dark and light, desktop and phone width.

## Open items

- Seven flag names are stand-ins unless the author supplies the real names.
- The Hanna page ships `cleared: false` until the author confirms the text; the gate semantics are unchanged.
