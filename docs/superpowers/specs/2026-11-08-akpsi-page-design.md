# Alpha Kappa Psi work page — design

Status: draft for Andrian's review (2026-11-08). Branch `feat/vapor-theme`.
Nothing here merges or pushes without his explicit instruction.

## Goal

Add Alpha Kappa Psi – Omega Phi as a work page and an Experience entry, built
the way Micron's was: two projects, each with a mock-data demo, plus matching
chat-agent chunks. The role is current, so the page is written in the present
tense and the entry reads "Dec 2025 – Present".

## What may be said (source of truth)

From Andrian's interview-prep notes (`resume-cheat-sheet.md`,
`supermicro-genai-coop.md`, `ai-agents-study-guide.md`) and his answers in chat.

Confirmed, may appear on the page:

- Role: Software Engineer, Alpha Kappa Psi – Omega Phi, Dec 2025 – Present.
  Naming the organization publicly is approved.
- Theme: AI tools for the organization's internal operations; nobody asked for
  them, he saw the manual work and built them.
- **Membership intake automation.** It runs the whole intake from the first
  email to a booked interview: it monitors a Gmail inbox and classifies incoming
  email; answers applicant questions from a knowledge base (a basic
  retrieval pattern); validates attachments; organizes the files in Google
  Drive; and schedules interviews by reading availability from free-form text.
  It was built for the VP Membership, who had been doing this by hand.
  Impact: **21+ hours of manual work saved, 80% improvement in operational
  efficiency.**
- **Opportunity bot.** It scrapes job and internship listings from many
  sources, including individual company career sites and GitHub, and posts them
  to a Discord channel for members. It runs daily and filters listings by role. **50+ members** use it to apply.
- **Mentoring:** he has mentored **5+ individuals** into internships.

Not allowed, never on the page or in a demo:

- Real applicant or member names, emails, files, or anything about an
  individual. Demos use "Applicant A" style placeholders and fictional
  companies.
- Any figure beyond the four above, and any claim about the bot's stack or
  hosting: Andrian did not give them. Its schedule (daily) and role filtering
  are confirmed and may appear.

## Page shape

`/work/akpsi` is a multi-project page like Micron's. Front matter:

- `company: Alpha Kappa Psi – Omega Phi`, `title: Software Engineer`,
  `project: AI tools for internal operations`, `dates: Dec 2025 – Present`,
  `start: "2025-12"`, `current: true`, `listed: true`, `cleared: true`
  (on this branch only), `order: 5` (last, after Micron).
- `summary`: the two tools, the 21+ hours, the 50+ members, no other figure.
- `stack`: only what he confirmed; Gmail, Google Drive and Discord are named
  because he did. Anything else (language, model) is left out until he says.
- `logo`: a plain wordmark or initials tile in the existing logo style; he
  supplies a real logo later if he wants one.

Body, two `##` projects, each Problem, What I built, How it is used:

1. **Membership intake automation** (heading id prefix `membership-intake`)
2. **Opportunity bot** (heading id prefix `opportunity-bot`)

A short third paragraph in the page intro mentions the mentoring.

## Demos (mock data, labelled "sample data")

Same pattern as Micron: `qa` window chrome, `client:visible`, logic in sibling
`.ts` files, invented fixtures in `src/components/akpsi/fixtures.ts`.

**Intake demo** (`src/components/akpsi/intake/`): a list of five sample
applicant emails. Selecting one and pressing "Process" steps through the
pipeline one visible stage at a time: classify, answer from the knowledge base
(or flag for a person), validate attachments, file in Drive (shows the folder
path), propose interview slots parsed from the free-form availability text. The
stepper is a pure state machine; no live model, no network.

**Listings demo** (`src/components/akpsi/listings/`): a feed of about ten
invented internship listings, each with a source tag (career site, GitHub
list, referral), a role type and a date. Filter chips narrow by source and role
type; a "Post to channel" button moves a listing into a mock channel panel,
styled as a plain message list rather than a copy of Discord's UI.

Both captions state the data is invented.

## Integration points

- `src/pages/work/[slug].astro`: `MULTI` gains `'akpsi'`; `Demo` gains
  `'intake' | 'listings'`; `demoFor` gains the two prefixes; the switch gains two
  cases (the `never`-typed default makes a missing case a type error).
- `src/content/work/akpsi.md`: new entry as above.
- Agent: new `##` sections of a cleared role become chunks automatically;
  `src/agent/run.test.ts`, the fixtures snapshot and `golden.json` change in the
  same commit (as Micron's did). The sub-chunk caveat from Micron applies: the
  harness cannot tell sibling chunks apart, so the golden queries expect the
  role, not the sub-chunk.
- `scripts/check-build.mjs`: page count goes from 6 to 7; pinned numbers, if any,
  are updated, never loosened.
- An `akpsi-cleared` test: the page carries no "[to confirm]", no real-looking
  names, none of the words "estimated", no figure other than 21, 80, 50 and 5.

## Constraints kept

Same as Micron: Lighthouse 95 or higher on mobile, no horizontal scroll from
320 px, AA contrast in both themes, no animation, all tests green, build ends
`check-build: ok`, typecheck unchanged, Tesla/Hanna/Blue Dome/Micron untouched.

## Testing

Pure tests for the intake state machine (stage order, a flagged email stops at
the knowledge-base stage, free-form availability resolves to slots) and the
listings filter. SSR markup tests for each demo. The content gate test. Agent
tests as above. Browser check at 320, 375 and 1440 px in both themes.

## Risks

- **Over-claiming.** Demos can read as the real system. Mitigation: the
  sample-data badge, the captions, the page note that already says the demos run
  on mock data.
- **A current role changes.** The page says "present"; if he stops, the dates
  need an end. Noted in Open items.
- **Resume mismatch.** His current resume lists the organization under
  leadership, not as a software role.

## Out of scope

Real data, a live bot or model, any applicant information, a Discord embed, any
change to the other work pages, the stats strip, merging or pushing.

## Open items

- **Stack.** Language, model and hosting are unconfirmed and omitted.
- **Resume.** His resume lists the role under leadership only because of space;
  the work is real. Whether to add it there is his call.
- **Logo.** A placeholder tile until he supplies one.
