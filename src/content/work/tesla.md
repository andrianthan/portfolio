---
company: Tesla
title: AI Software Engineer Intern
project: Service Demand Planning Copilot
dates: Jun 2026 – Dec 2026
start: "2026-06"
end: "2026-12"
summary: "Built Ask SDP, a tool-calling LLM copilot whose answers **can't contain invented numbers**, and shipped Forecast Lab, with Chronos-2 forecasts **32% better than baseline** on backtest. Built the staging-to-prod pipeline behind 200+ staging deploys a week."
stack: [LLM agents, FastAPI, React, DuckDB, GitHub Actions, Evals]
logo: /logos/tesla.svg
current: true
listed: true
cleared: false
order: 1
---
## Ask SDP

Ask SDP is a tool-calling copilot over live consumption data: planners ask a question in plain language, and every number in the answer comes from a tool result, never from the model's imagination.

### Problem

Demand planners were already asking an LLM questions about consumption data, and the answers read beautifully and were sometimes fiction. A confident invented number is worse than no answer: it flows into a planning decision, and nobody can tell afterwards which figures were real. The tooling the team had — dashboards and SQL — answered the questions accurately but slowly, one query at a time.

### What it does

- **Answers only from tool results.** An output rail extracts every number in a draft answer and checks each one against the tool results in the conversation. A figure with no source is stripped, and the answer ships without it.
- **Forces tool use where it matters.** A code-gated routing floor sends data questions to a tool before the model can free-form an answer. On the routing evals that floor takes coverage to 35/35 metric intents with 0% free-route answers.
- **Grades metric understanding.** Metric questions — error rates, deltas, forecast quality — grade 17/17 on the metric eval set.
- **Stops silent verdict flips.** Every answer ends in a typed verdict stating what the data supports, so a conclusion cannot quietly change between runs.
- **Runs a sandboxed Python tool.** Numeric questions go to a Python tool that accepts an allow-listed subset of the language and touches no network, returning a checked result into the conversation.

### Architecture

The shape is a pipeline with one mandatory gate. A planner's question enters the routing floor; the floor decides whether the question needs data, and every data-bound path passes through a tool call before drafting. The draft then crosses the output rail, which verifies each figure against the tool results, and the answer leaves with a typed verdict.

The rail sits after the model rather than inside it because grounding is a checkable property, not a style the model can be prompted into. Putting the guarantee in code makes it testable in CI: a fabricated number either survives the rail or the build fails.

<figure class="arch">
<svg viewBox="0 0 640 300" role="img" aria-label="Ask SDP architecture: a planner question flows through a code-gated routing floor, then to a Python tool and a retrieval tool, and the draft answer passes an output rail that checks every number against tool results before a typed verdict ships.">
  <defs>
    <marker id="at1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker>
  </defs>
  <g fill="none" stroke="currentColor" stroke-width="1.4" style="color:var(--color-muted)">
    <rect x="20" y="120" width="110" height="60" rx="10"/>
    <rect x="190" y="120" width="120" height="60" rx="10"/>
    <rect x="370" y="60" width="110" height="54" rx="10"/>
    <rect x="370" y="186" width="110" height="54" rx="10"/>
    <rect x="510" y="60" width="110" height="54" rx="10"/>
    <rect x="510" y="186" width="110" height="54" rx="10"/>
    <path d="M130 150 H 184" marker-end="url(#at1)"/>
    <path d="M310 138 C 340 120, 340 96, 364 90" marker-end="url(#at1)"/>
    <path d="M310 162 C 340 180, 340 204, 364 210" marker-end="url(#at1)"/>
    <path d="M480 87 H 504" marker-end="url(#at1)"/>
    <path d="M480 213 H 504" marker-end="url(#at1)"/>
    <path d="M565 114 V 180" marker-end="url(#at1)"/>
    <path d="M565 186 V 114" marker-end="url(#at1)"/>
  </g>
  <g fill="currentColor" font-family="var(--font-sans)" font-size="13" text-anchor="middle" style="color:var(--color-fg)">
    <text x="75" y="145">Planner's</text><text x="75" y="162" font-size="11" style="fill:var(--color-muted)">question</text>
    <text x="250" y="145">Routing floor</text><text x="250" y="162" font-size="11" style="fill:var(--color-muted)">code-gated</text>
    <text x="425" y="82">Python tool</text><text x="425" y="99" font-size="11" style="fill:var(--color-muted)">sandboxed</text>
    <text x="425" y="208">Data tool</text><text x="425" y="225" font-size="11" style="fill:var(--color-muted)">live consumption</text>
    <text x="565" y="82">Output rail</text><text x="565" y="99" font-size="11" style="fill:var(--color-muted)">every number checked</text>
    <text x="565" y="208">Typed verdict</text><text x="565" y="225" font-size="11" style="fill:var(--color-muted)">what the data supports</text>
  </g>
</svg>
<figcaption>Ask SDP architecture</figcaption>
</figure>

- The question hits the routing floor first; the floor is code, so a data question cannot reach the model ungated.
- Tool calls run in parallel where a question needs more than one source.
- The output rail re-reads the draft and the tool results together; any unmatched figure is removed before the answer ships.
- The typed verdict closes the loop: the answer states its own grounding.

### Key decisions

- **Grounding in code, not in the prompt.** A prompt can ask the model to behave; a rail makes honesty the only way an answer ships. The cost is that every formatting change in the model's output has to keep parsing.
- **A routing floor instead of tool-choice.** Leaving the choice to the model produced free-route answers on the evals; gating it in code took routing to 35/35 with 0% free-route answers. The cost is a hard boundary that occasionally routes a question a human would have answered from memory.
- **A typed verdict.** A structured end-of-answer field makes a flipped conclusion visible and diffable. The cost is one more schema the prompts and evals must agree on.
- **A sandboxed Python tool with an AST allow-list.** It lets the copilot compute rather than guess, while the allow-list and the no-network rule keep the blast radius of a bad generation near zero. The cost is maintenance: each accepted construct is a reviewed surface.
- **Strip, don't block.** An unverifiable figure is removed and the rest of the answer ships, because a partial answer with only sourced numbers is more useful than an error page. The cost is answers that can be quieter than the question deserved.

### Impact

- Routing coverage 35/35 metric intents with 0% free-route answers.
- Metric intents grade 17/17.
- Grounding grades at micro-F1 0.854 against a 0.80 threshold.
- No answer ships with a number that did not come from a tool result.

## Forecast Lab

Forecast Lab is the shipping vehicle for the forecasting work: Chronos-2 forecasts on a planner's watchlist, shaping controls for business knowledge, and a guarded write-back into the planning system.

### Problem

The planning system's baseline forecasts were produced by a gradient-boosted model that handled seasonality but missed the shape the business could see coming. Planners corrected forecasts by hand, and the corrections lived in spreadsheets where nobody could grade them. Meanwhile two foundation-model forecasters had appeared that the team had never compared on its own data.

### What it does

- **Compares models on real backtests.** LightGBM, Chronos-2 and TimesFM run on the same history and are graded on the same error metric, so model choice is a measurement rather than a preference.
- **Puts the winner on a watchlist.** Planners follow the series they care about and see Chronos-2 forecasts generated for each.
- **Lets planners shape a forecast.** Where the business knows something the data does not — a launch, a holiday shift — a shaping control adjusts the forecast, and the adjustment is recorded as a diff.
- **Writes back only through the guarded path.** A shaped forecast lands in the planning system through the interface the system already exposes, never as a silent mutation.
- **Keeps the baseline visible.** The gradient-boosted baseline runs alongside, so an improvement is always relative to what the team had.

### Architecture

The pipeline runs history through the candidate models, collects their errors, and hands the comparison to the watchlist service, which serves forecasts and records shaping. Write-back is a separate guarded step, so generation and mutation never share a path.

The separation matters because a forecast is cheap to regenerate and expensive to undo: anything that changes the planning system goes through the checked interface, and everything upstream of it can fail loudly without touching anyone's data.

<figure class="arch">
<svg viewBox="0 0 640 300" role="img" aria-label="Forecast Lab architecture: demand history feeds a gradient-boosted baseline and the Chronos-2 model, both graded in a comparison step, and the winner serves a planner watchlist whose shaped forecasts reach the planning system only through a guarded write-back.">
  <defs>
    <marker id="at2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker>
  </defs>
  <g fill="none" stroke="currentColor" stroke-width="1.4" style="color:var(--color-muted)">
    <rect x="20" y="120" width="110" height="60" rx="10"/>
    <rect x="190" y="60" width="120" height="54" rx="10"/>
    <rect x="190" y="186" width="120" height="54" rx="10"/>
    <rect x="370" y="120" width="110" height="60" rx="10"/>
    <rect x="510" y="120" width="110" height="60" rx="10"/>
    <rect x="510" y="226" width="110" height="54" rx="10"/>
    <path d="M130 145 C 160 120, 160 96, 184 90" marker-end="url(#at2)"/>
    <path d="M130 155 C 160 180, 160 204, 184 210" marker-end="url(#at2)"/>
    <path d="M310 87 C 340 100, 340 130, 364 142" marker-end="url(#at2)"/>
    <path d="M310 213 C 340 200, 340 170, 364 158" marker-end="url(#at2)"/>
    <path d="M480 150 H 504" marker-end="url(#at2)"/>
    <path d="M565 180 V 220" marker-end="url(#at2)"/>
  </g>
  <g fill="currentColor" font-family="var(--font-sans)" font-size="13" text-anchor="middle" style="color:var(--color-fg)">
    <text x="75" y="145">Demand</text><text x="75" y="162" font-size="11" style="fill:var(--color-muted)">history</text>
    <text x="250" y="82">Baseline</text><text x="250" y="99" font-size="11" style="fill:var(--color-muted)">gradient boosted</text>
    <text x="250" y="208">Chronos-2</text><text x="250" y="225" font-size="11" style="fill:var(--color-muted)">foundation model</text>
    <text x="425" y="145">Comparison</text><text x="425" y="162" font-size="11" style="fill:var(--color-muted)">same backtest</text>
    <text x="565" y="145">Watchlist</text><text x="565" y="162" font-size="11" style="fill:var(--color-muted)">forecast shaping</text>
    <text x="565" y="248">Guarded write-back</text><text x="565" y="265" font-size="11" style="fill:var(--color-muted)">to the planning system</text>
  </g>
</svg>
<figcaption>Forecast Lab architecture</figcaption>
</figure>

- History enters both model boxes unchanged, so the comparison is apples to apples.
- The comparison step owns the error metric and publishes it; the watchlist never asserts an improvement the comparison did not measure.
- Shaping is a recorded diff on top of a generated forecast, not an edit to the model.
- The guarded write-back is the only arrow that reaches the planning system.

### Key decisions

- **Grade models on the team's own backtest.** Public benchmarks said the foundation models were good; the backtest said by how much on this data: lag-zero error fell from $17.0M to $11.6M, 32% better than baseline. The cost is maintaining a backtest harness nobody gets to skip.
- **Ship the comparison, not just the winner.** Keeping the baseline visible keeps the improvement honest and gives the next model change its reference point. The cost is running two forecasters where one would do.
- **Shaping as a recorded diff.** Planners' adjustments become data — gradable, revertible, and auditable — instead of invisible spreadsheet edits. The cost is that shaping has a schema, and "just change the number" is no longer a thing.
- **A guarded write-back path.** Regeneration is cheap; wrong data in the planning system is not. The cost is a code review for every change to the write-back surface.

### Impact

- Lag-zero backtest error fell from $17.0M to $11.6M — 32% better than the baseline.
- Forecast Lab shipped to planners: watchlist, Chronos-2 forecasts, forecast shaping, guarded write-back.

## Planning app

The planning app is the React and FastAPI application planners live in, rebuilt internally around layers that keep the UI, the data access and the domain logic from tangling.

### Problem

The app had grown screen-first: each feature reached directly into whatever data it needed, so a change in one screen broke another, and the data layer had three competing conventions. New engineers paired with planners on real work but hesitated to touch the app, because nothing told them where a change belonged. The visual state of 165 routes was held together by attention rather than by tooling.

### What it does

- **Shares a component library.** The screens that planners use every day are built from one library, so a pattern fixed once is fixed everywhere.
- **Routes through modules behind a thin entry point.** Each route module owns its screen; the app entry point stays small enough to read in one sitting.
- **Reaches data through a data-client facade.** Screens call domain modules through one facade, and the facade is the only place that knows how the data layer is reached.
- **Enforces the layers with lint guards.** A screen that imports past the facade fails lint in the change that tries it, with a message pointing at the right layer.
- **Regression-tests the visuals.** A harness screenshots 165 routes on every change and diffs them against the last accepted state.

### Architecture

The browser talks to route modules; route modules compose shared components and call the data-client facade; the facade fronts the domain modules that own queries and writes. The domain systems sit behind that last layer.

The facade is deliberately the only path to data. One path means one place to add caching, one place to instrument, and one place a new engineer can read to learn what the app can do.

<figure class="arch">
<svg viewBox="0 0 640 300" role="img" aria-label="Planning app architecture: the browser talks to route modules, which call a data-client facade spanning route modules and domain modules, and the facade is the only path down to the domain systems behind it.">
  <defs>
    <marker id="at3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker>
  </defs>
  <g fill="none" stroke="currentColor" stroke-width="1.4" style="color:var(--color-muted)">
    <rect x="20" y="120" width="100" height="60" rx="10"/>
    <rect x="180" y="40" width="150" height="50" rx="10"/>
    <rect x="180" y="125" width="150" height="50" rx="10"/>
    <rect x="180" y="210" width="150" height="50" rx="10"/>
    <rect x="420" y="40" width="200" height="220" rx="10"/>
    <path d="M120 150 H 174" marker-end="url(#at3)"/>
    <path d="M330 65 C 380 55, 380 55, 414 60" marker-end="url(#at3)"/>
    <path d="M330 150 H 414" marker-end="url(#at3)"/>
    <path d="M330 235 C 380 245, 380 245, 414 240" marker-end="url(#at3)"/>
  </g>
  <g fill="currentColor" font-family="var(--font-sans)" font-size="13" text-anchor="middle" style="color:var(--color-fg)">
    <text x="70" y="145">Browser</text><text x="70" y="162" font-size="11" style="fill:var(--color-muted)">planners</text>
    <text x="255" y="60">Route modules</text><text x="255" y="77" font-size="11" style="fill:var(--color-muted)">one per screen</text>
    <text x="255" y="145">Data-client facade</text><text x="255" y="162" font-size="11" style="fill:var(--color-muted)">the only path to data</text>
    <text x="255" y="230">Domain modules</text><text x="255" y="247" font-size="11" style="fill:var(--color-muted)">queries and writes</text>
    <text x="520" y="145">Domain systems</text><text x="520" y="162" font-size="11" style="fill:var(--color-muted)">behind the facade</text>
  </g>
</svg>
<figcaption>Planning app architecture</figcaption>
</figure>

- The three stacked layers are ordered: a route module may use components and the facade, never the domain systems directly.
- The lint guards encode that order, so the architecture survives people who have not read this page.
- The visual regression harness watches all 165 routes; a screenshot diff is part of every change.

### Key decisions

- **A facade over a wider refactor.** The data-client facade gave every screen one blessed path without rewriting them all at once; screens migrated as they were touched. The cost is a transition period where the old patterns still exist in older screens.
- **Lint guards instead of convention docs.** A document is read once; a failing lint rule is read every time someone tries the wrong import. The cost is writing the rules and keeping their messages kind.
- **A visual regression harness before a component freeze.** Locking down patterns without watching the 165 routes would have moved breakage into production. The cost is a snapshot store and a review step that occasionally catches trivia.
- **Route modules behind a thin entry.** The app entry point stopped being the place where routes tangled, which made the app legible to new engineers. The cost is a little ceremony per route.

### Impact

- A shared component library, route modules behind a thin app entry point, and a data-client facade over the domain modules — with lint guards that enforce the layers.
- A visual regression harness across 165 routes, run on every change.

## Evals and CI

The eval harness is the golden set that grades the copilot's routing, metric and grounding changes in CI, and the CI pipeline around it turned a push-straight-to-main team into one with staging, review and prod gates.

### Problem

The copilot could regress silently: a prompt change that improved tone could quietly loosen grounding. At the same time the team pushed untested code straight to main, so the only test of a change was production, and the people affected were 10+ data analysts and demand planners doing real planning work on it.

### What it does

- **Grades every change against a golden set.** Routing, metric and grounding changes in CI are graded against a fixed set of questions with known-good answers, so a regression is a failed check rather than a surprise.
- **Runs a negative control.** The set includes a fabricated number that must fail grounding: if a change lets the invented figure through, the run fails, by design.
- **Holds the line on grounding.** Grounding grades at micro-F1 0.854 against a 0.80 threshold; a change that drops the grade is a revert, not a debate.
- **Gives the team staging.** Every branch deploys to staging of its own, so a change is tried on real data before anyone reviews it.
- **Opens the draft PR for you.** Pushing a branch auto-opens a draft pull request, which turned "put it up for review" from a chore into a side effect of pushing.
- **Deploys prod on merge.** Merging to main is the only path to production, and it is the same pipeline every time.

### Architecture

A pull request enters CI, CI runs the golden set, and the golden set feeds three gates — routing, metrics, grounding. A merge is only reachable when all three pass, and a negative control feeds the grounding gate so that a fabricated number fails the run by construction.

The gates are separate because they fail for different reasons: routing and metrics fail when behaviour changes, grounding fails when honesty does. One combined grade would let a routing win paper over a grounding loss.

<figure class="arch">
<svg viewBox="0 0 640 300" role="img" aria-label="Evals and CI architecture: a pull request runs a golden set that feeds routing, metrics and grounding gates, a negative control with a fabricated number feeds the grounding gate, and a merge is only reachable when all gates pass.">
  <defs>
    <marker id="at4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker>
  </defs>
  <g fill="none" stroke="currentColor" stroke-width="1.4" style="color:var(--color-muted)">
    <rect x="20" y="120" width="100" height="54" rx="10"/>
    <rect x="180" y="120" width="110" height="54" rx="10"/>
    <rect x="360" y="30" width="110" height="50" rx="10"/>
    <rect x="360" y="122" width="110" height="50" rx="10"/>
    <rect x="360" y="214" width="110" height="50" rx="10"/>
    <rect x="180" y="238" width="110" height="50" rx="10"/>
    <rect x="530" y="122" width="90" height="50" rx="10"/>
    <path d="M120 147 H 174" marker-end="url(#at4)"/>
    <path d="M290 120 V 86" marker-end="url(#at4)"/>
    <path d="M290 174 V 208" marker-end="url(#at4)"/>
    <path d="M290 147 H 354" marker-end="url(#at4)"/>
    <path d="M290 263 C 320 263, 320 200, 354 165" marker-end="url(#at4)"/>
    <path d="M470 55 C 510 60, 510 105, 524 116" marker-end="url(#at4)"/>
    <path d="M470 147 H 524" marker-end="url(#at4)"/>
    <path d="M470 239 C 510 234, 510 189, 524 178" marker-end="url(#at4)"/>
  </g>
  <g fill="currentColor" font-family="var(--font-sans)" font-size="13" text-anchor="middle" style="color:var(--color-fg)">
    <text x="70" y="142">Pull request</text><text x="70" y="159" font-size="11" style="fill:var(--color-muted)">in CI</text>
    <text x="235" y="142">Golden set</text><text x="235" y="159" font-size="11" style="fill:var(--color-muted)">graded questions</text>
    <text x="415" y="50">Routing gate</text><text x="415" y="67" font-size="11" style="fill:var(--color-muted)">tool coverage</text>
    <text x="415" y="142">Metrics gate</text><text x="415" y="159" font-size="11" style="fill:var(--color-muted)">intents</text>
    <text x="415" y="234">Grounding gate</text><text x="415" y="251" font-size="11" style="fill:var(--color-muted)">numbers checked</text>
    <text x="235" y="258">Negative control</text><text x="235" y="275" font-size="11" style="fill:var(--color-muted)">fabricated number</text>
    <text x="575" y="142">Merge</text><text x="575" y="159" font-size="11" style="fill:var(--color-muted)">all gates pass</text>
  </g>
</svg>
<figcaption>Evals and CI architecture</figcaption>
</figure>

- The golden set is versioned with the code that grades it, so a grade always means the same thing.
- The negative control has failed real changes: when the output rail was being built, the control proved the gap the rail closed.
- Staging and the draft PR are plumbing around the same pipeline, not a second one.

### Key decisions

- **A golden set instead of spot checks.** A fixed, versioned set makes a grade comparable across time, which is the whole point. The cost is maintaining the set as the product's behaviour grows.
- **A negative control on the grounding gate.** A gate that has never failed proves nothing; the fabricated number makes the grounding gate falsifiable every run. The cost is one contrived question that reviewers have to accept as load-bearing.
- **Per-branch staging before review.** Reviewers comment on behaviour they have actually clicked, not diffs they imagine. The cost is infrastructure: deploys for every branch, including the ones that go nowhere.
- **Auto-opened draft PRs.** The pipeline produces the review artifact instead of relying on habit. The cost is a draft PR queue with more noise in it, which the team decided was the cheaper problem.
- **Prod on merge only.** One path to production means one thing to watch. The cost is that hotfixes queue behind the same merge.

### Impact

- Routing, metrics and grounding changes grade in CI; grounding holds at micro-F1 0.854 against the 0.80 threshold, routing at 35/35 with 0% free-route answers, metrics at 17/17.
- A fabricated number must fail the negative control, and does.
- 200+ staging deploys a week across 10+ data analysts and demand planners.

## Data pipelines

The pipelines feed the app: weekly demand data lands in the analytics tables the planning app reads, and the same data rolls up into the executive reporting deck.

### Problem

The executive deck was assembled by hand from queries that drifted between runs, and the analytics tables the app depended on went stale without anyone noticing — a planner investigating a demand spike could be reading last week's data and have no way to tell.

### What it does

- **Builds the executive deck automatically.** Weekly demand data flows into the 77-slide deck without a hand-assembled run, saving 20+ hours of reporting work each time.
- **Rebuilds on a schedule with verification.** Each build of the analytics tables is checked before it is used: row counts and sanity checks run against the fresh build, not against hope.
- **Swaps atomically.** A verified build replaces the live tables in one step, so a reader is never on a half-updated schema.
- **Polls freshness every 10 minutes.** A staleness check runs continuously, so a broken upstream feed is an alert within minutes instead of a mystery next week.
- **Serves two consumers from one source.** The planning app and the executive deck read the same verified tables, so a number quoted upstairs matches the number in the app.

### Architecture

The source lands in a staging area; a freshness job polls it on a 10-minute interval, triggers a build, verifies the build, and swaps it in atomically. Downstream, two consumers read the swapped-in tables: the planning app and the executive deck.

Verification sits between build and swap because the dangerous failure is not a late table — that is visible — but a confidently wrong one, which only a check before the swap can catch.

<figure class="arch">
<svg viewBox="0 0 640 300" role="img" aria-label="Data pipelines architecture: a source feeds a freshness job polling every ten minutes, which triggers a verified build, and an atomic swap makes the tables live for two consumers, the planning app and the executive deck.">
  <defs>
    <marker id="at5" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker>
  </defs>
  <g fill="none" stroke="currentColor" stroke-width="1.4" style="color:var(--color-muted)">
    <rect x="20" y="60" width="110" height="54" rx="10"/>
    <rect x="190" y="60" width="120" height="54" rx="10"/>
    <rect x="370" y="60" width="110" height="54" rx="10"/>
    <rect x="530" y="60" width="90" height="54" rx="10"/>
    <rect x="180" y="210" width="130" height="54" rx="10"/>
    <rect x="400" y="210" width="130" height="54" rx="10"/>
    <path d="M130 87 H 184" marker-end="url(#at5)"/>
    <path d="M310 87 H 364" marker-end="url(#at5)"/>
    <path d="M480 87 H 524" marker-end="url(#at5)"/>
    <path d="M575 114 V 160 H 465 V 204" marker-end="url(#at5)"/>
    <path d="M575 114 V 160 H 245 V 204" marker-end="url(#at5)"/>
  </g>
  <g fill="currentColor" font-family="var(--font-sans)" font-size="13" text-anchor="middle" style="color:var(--color-fg)">
    <text x="75" y="82">Source</text><text x="75" y="99" font-size="11" style="fill:var(--color-muted)">weekly demand</text>
    <text x="250" y="82">Freshness</text><text x="250" y="99" font-size="11" style="fill:var(--color-muted)">10-minute polling</text>
    <text x="425" y="82">Verified build</text><text x="425" y="99" font-size="11" style="fill:var(--color-muted)">checked rows</text>
    <text x="575" y="82">Atomic swap</text><text x="575" y="99" font-size="11" style="fill:var(--color-muted)">live tables</text>
    <text x="245" y="232">Planning app</text><text x="245" y="249" font-size="11" style="fill:var(--color-muted)">planners</text>
    <text x="465" y="232">Executive deck</text><text x="465" y="249" font-size="11" style="fill:var(--color-muted)">77 slides</text>
  </g>
</svg>
<figcaption>Data pipelines architecture</figcaption>
</figure>

- The freshness job is the only thing that touches the source; consumers never read it directly.
- A build that fails verification is discarded, and the previous tables keep serving.
- The atomic swap is the whole freshness story: either the new tables are fully live or the old ones are.

### Key decisions

- **Verify before swap, not after.** A post-swap check catches a bad table after planners have already read it; a pre-swap check catches it while the cost is zero. The cost is holding the swap until verification finishes.
- **Atomic swap over in-place updates.** Readers see one consistent generation of tables or the last good one, never a mixture. The cost is double storage during the swap window.
- **One source for app and deck.** The number upstairs and the number in the app come from the same verified tables, which ends the "which number is right" argument. The cost is that the deck's format constrains the table shape.
- **A poll, not a push.** Polling every 10 minutes makes staleness self-announcing with no upstream cooperation needed. The cost is up to 10 minutes of lag that a push-based design could have avoided.

### Impact

- Weekly demand data lands in the 77-slide executive deck automatically — 20+ hours of reporting work saved per run.
- Automated freshness with verified builds, atomic swap, and 10-minute polling.

## Work log

The window below is a mock recreation of the work log I kept through the internship — the running notes I wrote for myself and the next person. It is a recreation: every name and identifier in it is invented, while the figures are the real, published ones from this page.

### What it is

A work log is an engineer's running record: what shipped, what it cost, what broke, and what the next person needs to know. The real one is internal, so this window recreates its shape — headline result up top, one section per system, and a handbook for whoever comes next — with stand-in names and identifiers throughout.

The recreation exists because the organisation of the work is the interesting part. How the systems were graded, what each decision traded away, and what got written down for successors is the actual job; the sanitised names do not change that.

### About the demo

The window runs the real selection and expansion logic — the same tab-and-row behaviour as every other demo on this site — over invented content. Every person, system name and identifier in it is invented; the impact metrics in it are the real, published figures from this page, checked against the same allowlist. Nothing in the window is confidential.
