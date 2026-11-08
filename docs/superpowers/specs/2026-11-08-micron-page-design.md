# Micron work page — design

Status: draft for Andrian's review (2026-11-08). Branch `feat/vapor-theme`.
Nothing here merges or pushes without his explicit instruction.

## Goal

Turn the Micron placeholder into a real work page, shown the way Tesla, Hanna
Center and Blue Dome are: an Experience entry that links to `/work/micron`, two
project sections each with a mock-data demo, and matching answers from the chat
agent. Today `src/content/work/micron.md` is `listed: true, cleared: false` and
every section reads "[to confirm]", so the entry shows on the home page but has
no public page.

## What may be said (source of truth)

From Andrian's resume (`Andrian_Than_Resume 2.pdf`) and his answers in chat.

Confirmed, may appear on the page:

- Role: Data Science Intern, Micron Technology, May 2025 – Aug 2025.
- Domain: high-volume manufacturing data; HBM (high-bandwidth memory) wafers;
  patterns across thousands of production steps.
- Data stack: Python and Snowflake SQL pipelines.
- **Copilot:** an LLM copilot over that data. Workflows were automated with
  Microsoft Copilot and Power Automate, integrating Snowflake queries with
  GPT-based reasoning. Engineers used it **daily** to investigate wafer failure
  rates, asking things like "what made this specific wafer fail?".
- **Risk model:** a risk classification model using gradient boosting trees,
  trained on wafers that had failed before. Inputs include Z-score, failure
  rate and wafer size, plus other factors such as which machines the wafers
  went through. It ranks wafers so engineers can prioritize the high-risk ones
  for analysis and yield-optimization work.

Not allowed, never on the page or in a demo:

- Real data, real screenshots, real wafer or lot identifiers.
- Internal tool, system or machine names. Anything named is written as
  "internal tools" or a generic label ("Tool A").
- Any figure (wafers scored, accuracy, hours saved, users, data volume).
  Andrian gave none. The "1k+ hours" tile on the home page already includes
  Micron and stays as it is.
- Claims about how the model was validated. Andrian has not said; the page
  omits it (see Open items).

## Page shape

`/work/micron` becomes a multi-project page like Tesla's: each `##` heading is a
project, its demo renders right after the project's first paragraph, and the
existing "Sample data" note and project index appear automatically because the
page has demos.

Front matter changes:

- `project: LLM copilot and wafer risk model` (was "HBM Wafer Analysis Agent";
  Andrian chose the new line).
- `summary` rewritten to name both pieces, no figures.
- `stack: [Python, Snowflake SQL, Power Automate, Microsoft Copilot, GPT, Gradient boosting]`.
- `cleared: true` on this branch so the page can be seen. The gate only matters
  when the branch merges to `main`.

Body, two projects, each with Problem, What I built, and How it was used (no
Results section, because there are no figures):

1. **Wafer analysis copilot** (heading id prefix `wafer-analysis-copilot`)
2. **Wafer risk model** (heading id prefix `wafer-risk-model`)

## Demos (mock data, labelled "sample data")

Both reuse the `qa` demo-window chrome (`src/components/qa/qa.css`) like the
Tesla demos, hydrate with `client:visible`, and run on invented data in a new
`src/components/micron/fixtures.ts`. Wafer ids look like `W-0412`; tools are
"Tool A" to "Tool F"; no real name appears.

**Copilot demo** (`src/components/micron/copilot/`): a chat window with three
sample-question chips, for example "What made wafer W-0412 fail?". Each chip
shows a short, visible tool-call line ("ran query: step history for W-0412")
and a scripted answer built from the fixture rows. There is no live model and
no free text: the input line is omitted so the demo cannot pretend to answer
anything it was not scripted for. A caption says the answers are scripted from
sample rows.

**Risk demo** (`src/components/micron/risk/`): a table of about twelve invented
wafers with columns wafer, tool path, Z-score, recent failure rate, size and
risk score, sorted high to low. A "review queue" control (a slider or a
three-step selector) sets how many wafers are in the queue; the queue header
says how many wafers fall above the line. Selecting a row shows which inputs
pushed its score up (a short factor list from the fixture). A caption states
that the scores are sample values and not the output of a trained model.

Both demos are pure-state components with their logic in a sibling `.ts` file,
matching `asksdp.ts` and `forecastlab.ts`, so the tests run without a DOM.

## Integration points

- `src/pages/work/[slug].astro`: add `'micron'` to `MULTI`; add `'wafer'` and
  `'risk'` to the `Demo` type, `demoFor` prefixes, and the `switch` (the
  `never`-typed default makes a missing case a type error).
- `src/content/work/micron.md`: rewritten as above.
- Chat agent: the snapshot builds a chunk per `##` heading of a cleared role, so
  `role:micron#wafer-analysis-copilot` and `role:micron#wafer-risk-model` appear
  automatically. The agent's code does not change. Tests that pin the chunk list
  (`src/agent/run.test.ts`) and `src/agent/fixtures/snapshot.json` are updated,
  and `src/agent/golden.json` gains two queries (one per project) that expect
  the new chunk ids.
- `scripts/check-build.mjs`: the page count goes from 5 to 6; the check's own
  counts and any pinned numbers are updated, not loosened.
- A `micron-cleared` test, like the Tesla ones, asserts the page carries no
  "[to confirm]" and no figure.

## Constraints kept

- Lighthouse 95 or higher on mobile for `/work/micron`.
- No horizontal scroll from 320 px up; AA contrast in both themes.
- Motion respects `prefers-reduced-motion`; the demos animate nothing.
- All current tests pass; build ends `check-build: ok`.
- Tesla, Hanna and Blue Dome content untouched.

## Testing

Pure-function tests for both demos' logic (script lookup and the queue cut). SSR
markup tests for each demo with `renderToStaticMarkup`, following
`AskSdpDemo.test.tsx`. Content tests for the gate and for forbidden content: no
figures, no internal names, no "[to confirm]". Agent tests and golden queries as
above. As with every layout change on this branch, nothing counts as verified
until the page has been opened in a browser at 320, 375 and 1440 px in both
themes.

## Risks

- **Over-claiming.** The risk demo can read as "this is the model". Mitigation:
  the sample-data label in the window chrome, the caption, and a page note that
  already says the demos run on mock data.
- **Resume mismatch.** The resume says "AI HBM Wafer Analysis Agent" and lists
  the risk model's inputs without naming gradient boosting. The page follows
  Andrian's chat answers; the resume line is his to update.
- **Chunk-pinned tests.** Cleared Micron adds agent chunks; every test that pins
  the chunk list changes in the same commit.

## Out of scope

Real data or screenshots, a live model, free-text input in the copilot demo,
any change to Tesla, Hanna or Blue Dome, the stats strip, and merging or
pushing.

## Open items

- **How the model was checked.** Not said; the page makes no validation claim.
  One line from Andrian (for example "back-tested on earlier failures") would
  let the risk section say it.
- **Any figure.** None given. If he wants one, it must be his to say.
- **Resume line.** Whether to update the resume's project title to match the
  page.
