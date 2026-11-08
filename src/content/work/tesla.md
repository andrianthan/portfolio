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
cleared: true
order: 1
---
## Dashboard

The unified planning dashboard is the React and FastAPI app planners live in, and I shipped it end to end. Overview, Part Summary, Ask, Forecast Lab, Campaigns, the KPI tabs, Home and Admin sit in one app, and the work was making it open fast and stay correct on real data.

### Problem

Every cold open rebuilt its data on the request path, against several backends, so a page could block for minutes. When several people opened it at once, each one triggered a separate build of the same data. Navigating back to a page fetched everything again. Underneath that, the data itself could go stale without anyone noticing: weekly runs showed green but wrote no file, a loader deleted the live database before it failed, and the association data stopped updating.

### What it does

- **Puts the planning tools in one app.** Overview, Part Summary and its deep dive, Ask, Forecast Lab, Campaigns, the KPI tabs, Home and Admin share one sign-in, one navigation and one data layer.
- **Opens warm.** Data is built at startup, and a request gets the last good copy or an instant "warming up" response. No request waits on a build.
- **Shares one build.** Workers share one warm build through disk snapshots, and concurrent requests for the same data share one build instead of starting their own.
- **Keeps pages instant on the way back.** The frontend serves its cached copy first and refreshes it in the background.
- **Keeps the data fresh and says when it isn't.** The weekly ETL and the loaders fail loudly, builds are verified and swapped in atomically, and freshness is polled every 10 minutes.

### Architecture

<figure class="arch">
<svg viewBox="0 0 640 230" role="img" aria-label="Dashboard architecture. The browser reads through a stale-while-revalidate frontend cache to a read-only API, which serves the last good copy from a warm registry. Builds happen off the request path: a weekly ETL that fails loud feeds pooled backends, a single-flight startup build writes an atomic disk snapshot, and every worker's warm registry reads that shared snapshot. A memory ceiling stops hot-part warming.">
<defs><marker id="at1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
<g fill="none" stroke="currentColor" stroke-width="1.4" style="color:var(--color-muted)">
<rect x="2" y="30" width="108" height="56" rx="10"/>
<rect x="134" y="30" width="108" height="56" rx="10"/>
<rect x="266" y="30" width="108" height="56" rx="10"/>
<rect x="398" y="30" width="108" height="56" rx="10"/>
<g stroke-dasharray="5 4"><rect x="530" y="30" width="108" height="56" rx="10"/></g>
<rect x="2" y="150" width="108" height="56" rx="10"/>
<rect x="134" y="150" width="108" height="56" rx="10"/>
<rect x="266" y="150" width="108" height="56" rx="10"/>
<rect x="398" y="150" width="108" height="56" rx="10"/>
<path d="M110 58H134" marker-end="url(#at1)"/>
<path d="M242 58H266" marker-end="url(#at1)"/>
<path d="M374 58H398" marker-end="url(#at1)"/>
<path d="M530 58H506" marker-end="url(#at1)" stroke-dasharray="5 4"/>
<path d="M110 178H134" marker-end="url(#at1)"/>
<path d="M242 178H266" marker-end="url(#at1)"/>
<path d="M374 178H398" marker-end="url(#at1)"/>
<path d="M452 150V86" marker-end="url(#at1)"/>
</g>
<g fill="currentColor" font-family="var(--font-sans)" font-size="13" text-anchor="middle" style="color:var(--color-fg)">
<text x="56" y="56" font-weight="600">Browser</text><text x="56" y="72" font-size="11" style="fill:var(--color-muted)">planner</text>
<text x="188" y="56" font-weight="600">SWR cache</text><text x="188" y="72" font-size="11" style="fill:var(--color-muted)">gzip, lazy load</text>
<text x="320" y="56" font-weight="600">API</text><text x="320" y="72" font-size="11" style="fill:var(--color-muted)">reads only</text>
<text x="452" y="56" font-weight="600">Warm registry</text><text x="452" y="72" font-size="11" style="fill:var(--color-muted)">last good copy</text>
<text x="584" y="56" font-weight="600">Memory cap</text><text x="584" y="72" font-size="11" style="fill:var(--color-muted)">stops warming</text>
<text x="56" y="176" font-weight="600">Weekly ETL</text><text x="56" y="192" font-size="11" style="fill:var(--color-muted)">fails loud</text>
<text x="188" y="176" font-weight="600">Backends</text><text x="188" y="192" font-size="11" style="fill:var(--color-muted)">pooled, DuckDB</text>
<text x="320" y="176" font-weight="600">Startup build</text><text x="320" y="192" font-size="11" style="fill:var(--color-muted)">single-flight</text>
<text x="452" y="176" font-weight="600">Disk snapshot</text><text x="452" y="192" font-size="11" style="fill:var(--color-muted)">atomic, shared</text>
</g>
</svg>
<figcaption>Dashboard architecture</figcaption>
</figure>

The rule behind the design is that the request path only reads, and all building happens at startup or in the background.

- **Warm at startup, never build per request.** A request gets the last good copy, or a "warming up" response in milliseconds while the first build finishes.
- **One shared warm build.** Each build is written as an atomic disk snapshot, so every worker serves the same copy and a restart picks it up.
- **Single-flight.** Concurrent requests for the same data share one in-flight build.
- **Bounded resources.** Connections are pooled, DuckDB runs as one shared connection with a memory limit, a semaphore bounds how much warms at once, and a memory ceiling stops hot-part warming when the process gets too large.
- **A lighter frontend.** A stale-while-revalidate cache, gzip, and charts that load only when they are needed.
- **A data path that fails loud.** The weekly ETL stitches its input as a stream, CI and the loaders fail instead of reporting green with no output, builds are verified before an atomic swap, polling runs every 10 minutes instead of every 6 hours, and freshness gates stop stale data from being served as current.

### Key decisions

- **Warm instead of building per request.** Startup warming turns minutes of blocking into seconds, and an instant "warming up" reply. The cost is memory: the warm copies have to live somewhere.
- **A ceiling that caps pre-warming.** The memory ceiling stops hot-part warming before the process outgrows its box; hot-part warming stopped at 15 of 25 parts. The cost is that the parts it skips open cold the first time.
- **SELECT-only dashboard reads.** The dashboard reads and never writes, so a bad query can be slow but cannot damage data. The cost is that writes need their own guarded paths.
- **Fail loud.** A run that writes nothing is now a failed run, not a green one, and a loader never deletes the live database before its replacement is verified. The cost is more red builds that someone has to look at.

### Impact

- **First cold load:** 71 to 100 s before, 6 s after, measured (local).
- **Six simultaneous cold loads:** 112 s before, 4.4 s after, measured (local).
- **First request after a restart:** blocked for 110 to 189 s before; now a "warming up" response in under 250 ms, measured (local).
- **Back from Part Summary:** 12 requests, 6.9 MB and 2.4 s before; no network requests and 0.05 s after, measured (local).
- **Campaigns load:** 22 requests and 8.5 MB before, 9 requests and 0.2 MB after, measured (local).
- **Entry JavaScript:** 5.8 MB before, 1.1 MB raw and 335 KB gzipped after, measured (local).
- **First paint at 25 Mbps:** 2.3 s before, 0.37 s after, measured (local).
- **On stage:** Overview rows load in about 4.6 s and Campaigns in about 1.9 s, measured (stage).
- **Data restored:** about 66M rows back in place, and the association data moved from early May to early July, measured.
- **Cost to watch:** stage RAM idles at 1.75 GB and reached 3.6 to 4.0 GB after opening every deep-dive tab on a cold part, against a 3500 MB ceiling, measured (stage). Production runs one worker and is not yet verified.

I am confident in the direction of these results; the exact figures are a mix of local and stage runs, so treat them as medium confidence.

### About the demo

The window above is a dashboard-style frame that runs in your browser on mock data. The Overview view is live, with stand-in KPIs, charts and filters; the other nav items scroll down to each project's own demo, and a small Work log view sits inside the frame. The work log is a mock whose figures come from the public resume; no part number, person or internal figure from the internal dashboard appears in it.

## Part Summary

Part Summary is the one-stop page for a single part: search for it, and the sub-tabs show its status, consumption, failure rates and breakdowns in one place.

### Problem

To understand one part, planners pulled each view from a separate report: consumption from one place, failure rates from another, location and correction-code breakdowns from somewhere else. Investigating a demand spike meant assembling those by hand before any thinking could start.

### What it does

- **Overview:** AI-generated insights on the part's current status.
- **Consumption:** how the part is being used over time.
- **Failure rates:** how often it fails, and where the trend is going.
- **Location by build-year matrix:** where the demand comes from, by build year.
- **Correction-code matrix:** which repairs drive the demand.
- **Breakdown:** customer symptoms and correction codes side by side.

### Architecture

<figure class="arch">
<svg viewBox="0 0 640 240" role="img" aria-label="Part Summary architecture. A part search opens a sub-tab, which asks a single-flight slice loader for only its own slice. The loader queries the backend through pooled SQL clients, demand comes back aggregated to weeks, results stream in with a retry on timeout, and the sub-tab view renders them, while an LLM insight writer reads the same results and feeds the Overview view.">
<defs><marker id="at2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
<g fill="none" stroke="currentColor" stroke-width="1.4" style="color:var(--color-muted)">
<rect x="2" y="30" width="108" height="56" rx="10"/>
<rect x="134" y="30" width="108" height="56" rx="10"/>
<rect x="266" y="30" width="108" height="56" rx="10"/>
<rect x="398" y="30" width="108" height="56" rx="10"/>
<rect x="530" y="30" width="108" height="56" rx="10"/>
<rect x="2" y="150" width="108" height="56" rx="10"/>
<rect x="134" y="150" width="108" height="56" rx="10"/>
<rect x="266" y="150" width="108" height="56" rx="10"/>
<rect x="398" y="150" width="108" height="56" rx="10"/>
<path d="M110 58H134" marker-end="url(#at2)"/>
<path d="M242 58H266" marker-end="url(#at2)"/>
<path d="M374 58H398" marker-end="url(#at2)"/>
<path d="M506 58H530" marker-end="url(#at2)"/>
<path d="M584 86V178H506" marker-end="url(#at2)"/>
<path d="M398 178H374" marker-end="url(#at2)"/>
<path d="M266 178H242" marker-end="url(#at2)"/>
<path d="M110 178H134" marker-end="url(#at2)"/>
<path d="M320 206V222H56V206" marker-end="url(#at2)"/>
</g>
<g fill="currentColor" font-family="var(--font-sans)" font-size="13" text-anchor="middle" style="color:var(--color-fg)">
<text x="56" y="56" font-weight="600">Part search</text><text x="56" y="72" font-size="11" style="fill:var(--color-muted)">one part</text>
<text x="188" y="56" font-weight="600">Sub-tab</text><text x="188" y="72" font-size="11" style="fill:var(--color-muted)">its slice only</text>
<text x="320" y="56" font-weight="600">Slice loader</text><text x="320" y="72" font-size="11" style="fill:var(--color-muted)">single-flight</text>
<text x="452" y="56" font-weight="600">Pooled SQL</text><text x="452" y="72" font-size="11" style="fill:var(--color-muted)">reused clients</text>
<text x="584" y="56" font-weight="600">Backend</text><text x="584" y="72" font-size="11" style="fill:var(--color-muted)">can be slow</text>
<text x="56" y="176" font-weight="600">LLM insights</text><text x="56" y="192" font-size="11" style="fill:var(--color-muted)">to Overview</text>
<text x="188" y="176" font-weight="600">Sub-tab view</text><text x="188" y="192" font-size="11" style="fill:var(--color-muted)">chart or matrix</text>
<text x="320" y="176" font-weight="600">Stream in</text><text x="320" y="192" font-size="11" style="fill:var(--color-muted)">retry on timeout</text>
<text x="452" y="176" font-weight="600">Weekly demand</text><text x="452" y="192" font-size="11" style="fill:var(--color-muted)">aggregated</text>
</g>
</svg>
<figcaption>Part Summary architecture</figcaption>
</figure>

Part Summary loads only what the open sub-tab needs, and loads it in a way that survives a slow backend.

- **Slices per sub-tab.** Each sub-tab fetches its own slice, so opening Overview does not pay for the matrices.
- **Single-flight.** Two requests for the same slice share one query.
- **Pooled SQL clients.** Connections are reused instead of opened per request.
- **Weekly demand aggregation.** Demand is aggregated to weeks before it reaches the page.
- **Stream in, retry on timeout.** Results stream in as they arrive, and a slice that times out is retried instead of leaving a blank chart.

### Key decisions

- **One playbook, two skins.** Ask is the interactive version of the investigation; Part Summary is the automatic one-stop version of the same steps. The cost is keeping both in step when the playbook changes.
- **A narrowing path with a verdict.** The page moves from broad to narrow, ends in a verdict, and titles each exhibit with what it shows. The cost is that a chart needs a reason to be there.
- **No chart without a purpose.** A chart is left out unless it has a purpose and a "because". The cost is a page that shows less than it could.
- **Captions that cannot mislead.** Captions that could push a planner to firm a wrong forecast were removed. The cost is fewer hints on the page.

### Impact

- **Spike investigation time:** about 2 hours before, about 25 minutes after, planner-reported. It was reported by planners, not measured, and it is not multiplied by the number of users.
- **Back-navigation speed:** the measured numbers are in the Dashboard section above.

### About the demo

The window above runs in your browser on mock data: search for a stand-in part, then switch between the six sub-tabs. The part search and the sub-tab switching are real logic; every part, number and insight in it is invented.

## Ask SDP

Ask SDP is a tool-calling copilot over live consumption data: planners ask a question in plain language, and every number in the answer comes from a tool result, never from the model's imagination. A golden-set eval harness in CI grades every change to it.

### Problem

Demand planners were already asking an LLM questions about consumption data, and the answers read well and were sometimes fiction. A confident invented number is worse than no answer: it flows into a planning decision, and nobody can tell afterwards which figures were real. The copilot could also regress silently, since a prompt change that improved tone could quietly loosen grounding, and the team pushed untested code straight to main.

### What it does

- **Answers only from tool results.** An output rail extracts every number in a draft answer and checks each one against the tool results in the conversation. A figure with no source is stripped, and the answer ships without it.
- **Forces tool use where it matters.** A code-gated routing floor sends data questions to a tool before the model can free-form an answer. On the routing evals that floor takes tool-routing coverage to 35/35 with 0% free-route answers.
- **Ends in a typed verdict.** Every answer ends in a verdict stating what the data supports, so a conclusion cannot quietly change between runs.
- **Runs a sandboxed Python tool.** Numeric questions go to a Python tool that accepts an allow-listed subset of the language and touches no network, returning a checked result into the conversation.
- **Grades every change in CI.** Routing, metric and grounding changes are graded against a golden set, and the set includes a fabricated number that must fail grounding.

### Architecture

<figure class="arch">
<svg viewBox="0 0 640 340" role="img" aria-label="Ask SDP architecture. A question passes a routing floor in code before the model, tools run in parallel, a typed verdict is computed in code from the tool results, the LLM writes the draft, and an output rail strips any number with no source before the answer ships. Below, every pull request runs a golden set with a negative control through routing, metrics and grounding gates, every branch deploys to its own staging, and merging to main is the only path to production.">
<defs><marker id="at3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
<g fill="none" stroke="currentColor" stroke-width="1.4" style="color:var(--color-muted)">
<rect x="2" y="30" width="108" height="56" rx="10"/>
<rect x="134" y="30" width="108" height="56" rx="10"/>
<rect x="266" y="30" width="108" height="56" rx="10"/>
<rect x="398" y="30" width="108" height="56" rx="10"/>
<rect x="530" y="30" width="108" height="56" rx="10"/>
<rect x="398" y="150" width="108" height="56" rx="10"/>
<rect x="530" y="150" width="108" height="56" rx="10"/>
<rect x="2" y="260" width="108" height="56" rx="10"/>
<rect x="134" y="260" width="108" height="56" rx="10"/>
<rect x="266" y="260" width="108" height="56" rx="10"/>
<rect x="398" y="260" width="108" height="56" rx="10"/>
<rect x="530" y="260" width="108" height="56" rx="10"/>
<path d="M110 58H134" marker-end="url(#at3)"/>
<path d="M242 58H266" marker-end="url(#at3)"/>
<path d="M374 58H398" marker-end="url(#at3)"/>
<path d="M506 58H530" marker-end="url(#at3)"/>
<path d="M320 86V178H398" marker-end="url(#at3)"/>
<path d="M452 150V86" marker-end="url(#at3)"/>
<path d="M506 168H530" marker-end="url(#at3)" stroke-dasharray="5 4"/>
<path d="M584 86V150" marker-end="url(#at3)"/>
<path d="M110 288H134" marker-end="url(#at3)"/>
<path d="M242 288H266" marker-end="url(#at3)"/>
<path d="M374 288H398" marker-end="url(#at3)"/>
<path d="M506 288H530" marker-end="url(#at3)"/>
</g>
<g fill="currentColor" font-family="var(--font-sans)" font-size="13" text-anchor="middle" style="color:var(--color-fg)">
<text x="56" y="56" font-weight="600">Question</text><text x="56" y="72" font-size="11" style="fill:var(--color-muted)">plain language</text>
<text x="188" y="56" font-weight="600">Routing floor</text><text x="188" y="72" font-size="11" style="fill:var(--color-muted)">code, mandatory</text>
<text x="320" y="56" font-weight="600">Tools</text><text x="320" y="72" font-size="11" style="fill:var(--color-muted)">in parallel</text>
<text x="452" y="56" font-weight="600">LLM writer</text><text x="452" y="72" font-size="11" style="fill:var(--color-muted)">drafts answers</text>
<text x="584" y="56" font-weight="600">Output rail</text><text x="584" y="72" font-size="11" style="fill:var(--color-muted)">checks numbers</text>
<text x="452" y="176" font-weight="600">Typed verdict</text><text x="452" y="192" font-size="11" style="fill:var(--color-muted)">computed in code</text>
<text x="584" y="176" font-weight="600">Answer</text><text x="584" y="192" font-size="11" style="fill:var(--color-muted)">sourced figures</text>
<text x="56" y="286" font-weight="600">Golden set</text><text x="56" y="302" font-size="11" style="fill:var(--color-muted)">+ fake number</text>
<text x="188" y="286" font-weight="600">CI gates</text><text x="188" y="302" font-size="11" style="fill:var(--color-muted)">per pull request</text>
<text x="320" y="286" font-weight="600">Staging</text><text x="320" y="302" font-size="11" style="fill:var(--color-muted)">every branch</text>
<text x="452" y="286" font-weight="600">Main</text><text x="452" y="302" font-size="11" style="fill:var(--color-muted)">only path</text>
<text x="584" y="286" font-weight="600">Production</text><text x="584" y="302" font-size="11" style="fill:var(--color-muted)">after merge</text>
</g>
</svg>
<figcaption>Ask SDP architecture</figcaption>
</figure>

The shape is a pipeline with one mandatory gate, wrapped in a CI pipeline that grades it on every change.

- **Routing floor first.** The floor is code, so a data question cannot reach the model ungated.
- **Tools in parallel.** Tool calls run in parallel when a question needs more than one source.
- **Output rail.** The rail re-reads the draft and the tool results together, and any unmatched figure is removed before the answer ships.
- **Typed verdict.** The answer states what the data supports, as a field the evals can diff.
- **Golden set and gates.** A pull request runs the golden set through separate routing, metrics and grounding gates, and a negative control with a fabricated number feeds the grounding gate.
- **Staging to prod.** Every branch deploys to its own staging, pushing a branch opens a draft pull request, and merging to main is the only path to production.

### Key decisions

- **The LLM writes every answer; the verdict is an input and a checker.** The model does the writing, and the typed planner verdict is computed in code, passed in, and checked on the way out. The model cannot override it. The cost is one more schema the prompts and evals have to agree on.
- **Grounding in code, not in the prompt.** A prompt can ask the model to behave; a rail makes honesty the only way an answer ships. The cost is that every formatting change in the model's output has to keep parsing.
- **A sandboxed Python escape hatch.** It lets the copilot compute instead of guess, while the allow-list and the no-network rule keep the damage from a bad generation near zero. The cost is that each accepted construct is a surface to review.
- **A negative control on the grounding gate.** A gate that has never failed proves nothing; the fabricated number makes it fail on purpose every run. The cost is one contrived question reviewers have to accept as load-bearing.

### Impact

- **Dead-ends fixed:** 9 of 9 reproduced dead-ends fixed, which were 8.3% of 109 real turns mined from use.
- **Routing and metrics gated in CI:** 17/17 metric intents, and grounding at micro-F1 0.854 against a 0.80 gate.
- **Routing:** tool-routing coverage 35/35 with 0% free-route answers on the routing evals.
- **Answer speed:** mean answer time from 39 s to 11 s, and the slowest narrative answer from 196 s to 16 s, quoted from a PR, not re-measured.
- **Tests:** 1375 backend tests and 1639 frontend tests, measured (stage).
- **Delivery:** 200+ staging deploys a week across 10+ data analysts and demand planners.

### About the demo

The window above is a chat that runs in your browser on mock data. The grounding check and the verdict are real logic: a stand-in answer only shows numbers that appear in its stand-in tool results. It is not a language model, and every part and figure in it is invented.

## Forecast Lab

Forecast Lab is where Chronos-2 forecasts reach planners: a watchlist, shaping controls for business knowledge, and a firming flow that previews a change before it is committed to the firming system.

### Problem

Firming a forecast used to mean exporting a CSV, filling in a template and uploading it by hand. Inside the app, batches of 4 or more parts took 50 to 87 s and batches of 6 or more timed out, and the failures were swallowed, so the forecast overlays came back empty with no error. The baseline forecast also missed shape the business could see coming.

### What it does

- **Compares models on real backtests.** LightGBM, Chronos-2 and TimesFM run on the same history and are graded on the same error metric.
- **Forecasts a watchlist.** Planners follow the parts they care about and see Chronos-2 forecasts for each, from a runner that stays warm.
- **Firms selected parts.** Firm Selected shows a dry-run preview first, then commits to the firming system.
- **Shapes forecasts.** Shaping and buffer layers let planners add what the data does not know, recorded as a diff on top of the forecast.
- **Covers South America warehouses.** The warehouses are part of the same flow.
- **Offers a backtest switcher.** It is off by default, so planners see the live forecast unless they ask for the backtest.

### Architecture

<figure class="arch">
<svg viewBox="0 0 640 230" role="img" aria-label="Forecast Lab architecture. Selected parts go to a warm Chronos-2 runner in one batch call. Shaping and buffer layers sit on top of the generated forecast without changing the model, Firm Selected shows a dry-run preview, and only a planner commit writes to the firming system. A failed batch returns a loud error instead of an empty overlay.">
<defs><marker id="at4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
<g fill="none" stroke="currentColor" stroke-width="1.4" style="color:var(--color-muted)">
<rect x="2" y="30" width="108" height="56" rx="10"/>
<rect x="134" y="30" width="108" height="56" rx="10"/>
<rect x="266" y="30" width="108" height="56" rx="10"/>
<rect x="398" y="30" width="108" height="56" rx="10"/>
<rect x="530" y="30" width="108" height="56" rx="10"/>
<g stroke-dasharray="5 4"><rect x="266" y="150" width="108" height="56" rx="10"/></g>
<rect x="398" y="150" width="108" height="56" rx="10"/>
<rect x="530" y="150" width="108" height="56" rx="10"/>
<path d="M110 58H134" marker-end="url(#at4)"/>
<path d="M242 58H266" marker-end="url(#at4)"/>
<path d="M374 58H398" marker-end="url(#at4)"/>
<path d="M506 58H530" marker-end="url(#at4)"/>
<path d="M584 86V150" marker-end="url(#at4)"/>
<path d="M530 178H506" marker-end="url(#at4)"/>
<path d="M320 86V150" marker-end="url(#at4)" stroke-dasharray="5 4"/>
</g>
<g fill="currentColor" font-family="var(--font-sans)" font-size="13" text-anchor="middle" style="color:var(--color-fg)">
<text x="56" y="56" font-weight="600">Watchlist</text><text x="56" y="72" font-size="11" style="fill:var(--color-muted)">selected parts</text>
<text x="188" y="56" font-weight="600">Batch request</text><text x="188" y="72" font-size="11" style="fill:var(--color-muted)">one call</text>
<text x="320" y="56" font-weight="600">Warm runner</text><text x="320" y="72" font-size="11" style="fill:var(--color-muted)">Chronos-2 loaded</text>
<text x="452" y="56" font-weight="600">Shaping</text><text x="452" y="72" font-size="11" style="fill:var(--color-muted)">buffer layers</text>
<text x="584" y="56" font-weight="600">Dry-run</text><text x="584" y="72" font-size="11" style="fill:var(--color-muted)">shows the change</text>
<text x="320" y="176" font-weight="600">Loud failure</text><text x="320" y="192" font-size="11" style="fill:var(--color-muted)">error, not blank</text>
<text x="452" y="176" font-weight="600">Firming</text><text x="452" y="192" font-size="11" style="fill:var(--color-muted)">only write path</text>
<text x="584" y="176" font-weight="600">Commit</text><text x="584" y="192" font-size="11" style="fill:var(--color-muted)">planner confirms</text>
</g>
</svg>
<figcaption>Forecast Lab architecture</figcaption>
</figure>

Generating a forecast and writing one are separate paths, because a forecast is cheap to regenerate and expensive to undo.

- **A warm Chronos-2 runner.** The model stays loaded, so a request does not pay the start-up cost.
- **Batch requests.** A batch of parts goes through one call instead of one call per part.
- **Shaping and buffer layers.** Planner adjustments sit on top of the generated forecast and never change the model.
- **Dry run, then commit.** Firm Selected computes the change, shows it, and only writes to the firming system when the planner commits.
- **Loud failures.** A failed batch returns an error instead of an empty overlay.

### Key decisions

- **Grade models on the team's own backtest.** The backtest said by how much the foundation model helps on this data: lag-zero error fell from $17.0M to $11.6M, 32% better than baseline. The cost is a backtest harness nobody gets to skip.
- **Fix the query, not the model.** The slow batches came from a database query plan that flipped on a 54M-row table. An index hint fixed it with identical forecast output. The cost is a hint that has to be revisited if the table changes.
- **Preview before commit.** Firming writes to a system planners rely on, so every firm is a dry run first. The cost is one extra click.
- **Backtest off by default.** Planners see the live forecast unless they ask otherwise. The cost is that the backtest is easy to miss.

### Impact

- **Backtest error:** lag-zero error from $17.0M to $11.6M, 32% better than the baseline.
- **4 parts:** 87 s before, 4.9 s after, measured (stage).
- **6 parts:** over 300 s (a timeout) before, 6.8 s after, measured (stage).
- **20 parts:** a timeout before, 24.9 s after, with identical forecast output, measured (stage).
- **Warm runner:** first call from 9.7 s to 1.1 s, measured (stage).
- **Time saved:** 20 firms a week × 15 minutes × 16 weeks is about 80 hours, an estimate.

### About the demo

The window above runs a mock firm in your browser: pick stand-in parts, see the dry-run preview, then commit. The preview-then-commit flow is real logic; the parts, forecasts and the firming system it writes to are invented.

## Campaigns

Campaigns tracks the parts linked to service campaigns and warns planners when a campaign is winding down, so the forecast stops carrying demand that will not come back.

### Problem

Campaign demand inflates a part's history, and when a campaign winds down the forecast keeps expecting it. Across the 223 campaign-linked parts, 141 had a positive 2-year over-forecast, about $56M at unit cost. That is the size of the problem, not part of the impact.

### What it does

- **Scopes the work.** 223 campaign-linked parts across 131 campaigns.
- **Flags wind-downs.** A wind-down gate compares the campaign's pace share of service units, best of 8, 13 and 26 weeks, against a 10% threshold. 54 parts are on the alert list.
- **Shows four views.** Alerts, all parts, campaigns, and bulletin demand missing from the campaign list, with CSV export and on-hand inventory by warehouse.
- **Simulates completion.** A completion simulator gives P10/P50/P90 dates, backtested on 94 past campaigns.
- **Sends weekly notices.** One email per planner with only their parts, a consolidated copy to the team, and one listing bulletin demand missing from the campaign list. 6 planners receive alerts.

### Architecture

<figure class="arch">
<svg viewBox="0 0 640 230" role="img" aria-label="Campaigns architecture. Campaign and service data land in one snapshot of campaign-linked parts. The wind-down gate compares pace share, best of three windows, against a threshold; uncertain parts are held for verification, and the actionable list feeds the four views and per-planner weekly notices. A completion simulator reads the same snapshot for P10, P50 and P90 dates.">
<defs><marker id="at5" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
<g fill="none" stroke="currentColor" stroke-width="1.4" style="color:var(--color-muted)">
<rect x="2" y="30" width="108" height="56" rx="10"/>
<rect x="134" y="30" width="108" height="56" rx="10"/>
<rect x="266" y="30" width="108" height="56" rx="10"/>
<rect x="398" y="30" width="108" height="56" rx="10"/>
<rect x="530" y="30" width="108" height="56" rx="10"/>
<rect x="134" y="150" width="108" height="56" rx="10"/>
<g stroke-dasharray="5 4"><rect x="398" y="150" width="108" height="56" rx="10"/></g>
<rect x="530" y="150" width="108" height="56" rx="10"/>
<path d="M110 58H134" marker-end="url(#at5)"/>
<path d="M242 58H266" marker-end="url(#at5)"/>
<path d="M374 58H398" marker-end="url(#at5)"/>
<path d="M506 58H530" marker-end="url(#at5)"/>
<path d="M188 86V150" marker-end="url(#at5)"/>
<path d="M320 86V178H398" marker-end="url(#at5)" stroke-dasharray="5 4"/>
<path d="M490 86V118H584V150" marker-end="url(#at5)"/>
</g>
<g fill="currentColor" font-family="var(--font-sans)" font-size="13" text-anchor="middle" style="color:var(--color-fg)">
<text x="56" y="56" font-weight="600">Campaign data</text><text x="56" y="72" font-size="11" style="fill:var(--color-muted)">parts, service</text>
<text x="188" y="56" font-weight="600">Snapshot</text><text x="188" y="72" font-size="11" style="fill:var(--color-muted)">one, shared</text>
<text x="320" y="56" font-weight="600">Wind-down</text><text x="320" y="72" font-size="11" style="fill:var(--color-muted)">best of three</text>
<text x="452" y="56" font-weight="600">Actionable</text><text x="452" y="72" font-size="11" style="fill:var(--color-muted)">alert parts</text>
<text x="584" y="56" font-weight="600">Views</text><text x="584" y="72" font-size="11" style="fill:var(--color-muted)">four, CSV export</text>
<text x="188" y="176" font-weight="600">Simulator</text><text x="188" y="192" font-size="11" style="fill:var(--color-muted)">P10/P50/P90</text>
<text x="452" y="176" font-weight="600">Held</text><text x="452" y="192" font-size="11" style="fill:var(--color-muted)">for verification</text>
<text x="584" y="176" font-weight="600">Weekly email</text><text x="584" y="192" font-size="11" style="fill:var(--color-muted)">one per planner</text>
</g>
</svg>
<figcaption>Campaigns architecture</figcaption>
</figure>

The gate, the views and the notices read the same snapshot of campaign-linked parts, so every planner sees the same numbers.

- **One snapshot.** The gate, the views and the notices read the same snapshot of campaign-linked parts.
- **The wind-down gate.** Pace share over 8, 13 and 26 weeks, best of the three, against the 10% threshold.
- **Held for verification.** Parts with unexplained bulletin demand or low-confidence complaint demand are held out of the actionable list.
- **The simulator.** P10/P50/P90 completion, checked against 94 past campaigns.
- **Per-planner notices.** Each planner's email is filtered to their own parts.

### Key decisions

- **Hold uncertain parts instead of cutting them.** 10 parts, about $8.4M, are held for verification and not counted. The cost is a smaller headline number.
- **Best of three windows.** Taking the best of 8, 13 and 26 weeks keeps a short dip from triggering an alert. The cost is slower alerts on a sharp drop.
- **Dollars are exposure, not cash.** Forecast dollar figures are exposure, not cash; time-saved dollars use a placeholder rate. The cost is less impressive wording, which is the point.
- **One email per planner.** Planners see only their own parts, so the notice is short enough to read. The cost is maintaining the part-to-planner mapping.

### Impact

These figures come from a snapshot taken 22 October on a development copy, not production. Dollars are forecast exposure removed, not cash. Held parts are reported separately and not counted. Backtest evidence is separate and not booked.

- **Flagged:** about $13.3M of forecast cut across the 54 alert parts.
- **Actionable:** 44 parts, about $4.9M (median $11k per part, 1.5M units; the top five parts are about 60% of it).
- **Held for verification:** 10 parts, about $8.4M, excluded.
- **Expected impact:** about $1.2M to $2.5M of excess forecast exposure removed over 26 weeks, which is 25% to 50% of the actionable $4.9M (75% would be $3.7M), an estimate.
- **Backtest evidence:** the shipped model was $6.5M to $9.3M closer to actual use than the books across 36 flagged parts and 23 campaigns, not booked.
- **Time saved:** an estimate at a placeholder rate of $100 an hour, not an employer rate.
  - Spike investigations: 8 a week × 1.58 hours × 16 weeks is about 200 hours, about $20k (about 660 hours and $66k a year annualized).
  - Campaign review: 6 planners × 30 minutes × 12 weeks is about 36 hours, about $3.6k.
  - The 117-part failure workbook: 15 minutes per part is about 29 hours, about $2.9k.
  - Total: roughly 300 to 350 hours, about $30k to $35k at the placeholder rate, across the projects on this page (this includes Forecast Lab's 80-hour estimate), mostly from spike investigations.

### About the demo

The window above runs in your browser on mock data: the four views over stand-in parts and campaigns, and a P10/P50/P90 completion simulator. The wind-down gate and the simulator are real logic; every part, campaign and dollar in it is invented.

## Slideshow generation

Slideshow generation rebuilds the weekly executive deck inside the app, on top of the weekly ETL that built the data the deck and the KPI files read.

### Problem

The executive deck was assembled by hand from queries that drifted between runs, and the KPI files planners needed every Monday were built by hand too. Each cycle cost hours, and a number in the deck could disagree with the number in the app.

### What it does

- **Regenerates the deck.** A Regenerate button rebuilds the 77-slide executive deck from the current data, with a PPTX download.
- **Keeps the composer out of the way.** Composer controls are hidden while they are a work in progress.
- **The weekly ETL.** A weekly GitHub Actions run built the data behind the deck, and the accessories KPI numbers were built by the same run.
- **A weekly CSV.** A Part Miss by Lag CSV was published every KPI Monday until the scheduled run was stopped.
- **The schedule was later stopped.** The scheduled Monday run was later stopped; the in-app regenerate still works on demand.

### Architecture

<figure class="arch">
<svg viewBox="0 0 640 250" role="img" aria-label="Slideshow architecture. A weekly GitHub Actions run, whose schedule was later stopped, pulls the week's demand data and builds tables that are verified before anything reads them. The verified tables are the one source for the in-app Regenerate button, which rebuilds the executive deck as a PPTX, and for the accessories KPIs and the Part Miss by Lag CSV.">
<defs><marker id="at6" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
<g fill="none" stroke="currentColor" stroke-width="1.4" style="color:var(--color-muted)">
<g stroke-dasharray="5 4"><rect x="2" y="100" width="108" height="56" rx="10"/></g>
<rect x="134" y="100" width="108" height="56" rx="10"/>
<rect x="266" y="100" width="108" height="56" rx="10"/>
<rect x="398" y="100" width="108" height="56" rx="10"/>
<rect x="398" y="10" width="108" height="56" rx="10"/>
<rect x="530" y="10" width="108" height="56" rx="10"/>
<rect x="530" y="100" width="108" height="56" rx="10"/>
<rect x="530" y="190" width="108" height="56" rx="10"/>
<path d="M110 128H134" marker-end="url(#at6)"/>
<path d="M242 128H266" marker-end="url(#at6)"/>
<path d="M374 128H398" marker-end="url(#at6)"/>
<path d="M452 100V66" marker-end="url(#at6)"/>
<path d="M506 38H530" marker-end="url(#at6)"/>
<path d="M506 128H530" marker-end="url(#at6)"/>
<path d="M506 146C518 146 518 218 530 218" marker-end="url(#at6)"/>
</g>
<g fill="currentColor" font-family="var(--font-sans)" font-size="13" text-anchor="middle" style="color:var(--color-fg)">
<text x="56" y="126" font-weight="600">Weekly run</text><text x="56" y="142" font-size="11" style="fill:var(--color-muted)">schedule stopped</text>
<text x="188" y="126" font-weight="600">Build tables</text><text x="188" y="142" font-size="11" style="fill:var(--color-muted)">week's demand</text>
<text x="320" y="126" font-weight="600">Verify</text><text x="320" y="142" font-size="11" style="fill:var(--color-muted)">before any read</text>
<text x="452" y="126" font-weight="600">Verified set</text><text x="452" y="142" font-size="11" style="fill:var(--color-muted)">one source</text>
<text x="452" y="36" font-weight="600">Regenerate</text><text x="452" y="52" font-size="11" style="fill:var(--color-muted)">in-app button</text>
<text x="584" y="36" font-weight="600">Exec deck</text><text x="584" y="52" font-size="11" style="fill:var(--color-muted)">PPTX download</text>
<text x="584" y="126" font-weight="600">KPI files</text><text x="584" y="142" font-size="11" style="fill:var(--color-muted)">accessories</text>
<text x="584" y="216" font-weight="600">Weekly CSV</text><text x="584" y="232" font-size="11" style="fill:var(--color-muted)">Part Miss by Lag</text>
</g>
</svg>
<figcaption>Slideshow generation architecture</figcaption>
</figure>

The deck and the KPI files came from one weekly run, so the number in the deck matched the number in the app.

- **A weekly GitHub Actions run.** It pulled the week's demand data and built the tables.
- **Verified before use.** The build was checked before anything read it.
- **One source, several outputs.** The deck, the accessories KPIs and the Part Miss by Lag CSV all read the same verified tables.
- **Regenerate in the app.** The app rebuilds the deck on request and hands back a PPTX.

### Key decisions

- **Generate the deck instead of assembling it.** A generated deck is the same every time for the same data. The cost is that the deck's format constrains the table shape.
- **Hide unfinished controls.** The composer is hidden rather than shipped half-working. The cost is less flexibility for now.
- **A scheduled run.** The weekly schedule made the CSV appear without anyone asking. The cost was a job that ran whether or not anyone needed it.

### Impact

- **Deck:** weekly demand data reached the 77-slide executive deck without a hand-assembled run. The scheduled run saves an estimated 20+ hours per run, an estimate rather than a measured figure.
- **Weekly CSV:** 45 minutes × 8 Mondays is about 6 hours, an estimate.

### About the demo

The window above runs in your browser on mock data: press Regenerate to rebuild a stand-in deck, then download a mock PPTX. The regenerate flow is real logic; the slides and their numbers are invented.

## Modular architecture

The dashboard was refactored into modules so that a new tab is a manifest and one frontend file, and a teammate could ship a tab without touching the shell.

### Problem

The app had grown screen-first: features reached directly into whatever data they needed, so a change in one screen broke another, and the main files were thousands of lines long. Adding a tab meant editing the shell, and nothing stopped one broken tab from breaking the whole app.

### What it does

- **A tab is a manifest plus one frontend file.** The shell discovers it and mounts it behind sign-in.
- **A runtime kill switch.** Any tab can be turned off without a deploy.
- **Broken tabs are skipped.** A tab that fails to import is skipped and reported, and the rest of the app loads.
- **Shared components and one data client.** Screens use the shared button and fetch layers instead of raw elements.
- **A visual harness guards the refactor.** A deterministic 28-shot visual harness catches unintended changes.

### Architecture

<figure class="arch">
<svg viewBox="0 0 640 230" role="img" aria-label="Modular architecture. Each tab is a manifest plus one frontend file. The shell reads the manifests at start-up and discovers the tabs, imports each tab so an import failure is contained, checks the runtime kill switch, and mounts the tab behind sign-in. A tab whose import fails is skipped and reported, and mounted screens reach data only through a lint-guarded data-client facade.">
<defs><marker id="at7" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
<g fill="none" stroke="currentColor" stroke-width="1.4" style="color:var(--color-muted)">
<rect x="2" y="30" width="108" height="56" rx="10"/>
<rect x="134" y="30" width="108" height="56" rx="10"/>
<rect x="266" y="30" width="108" height="56" rx="10"/>
<rect x="398" y="30" width="108" height="56" rx="10"/>
<rect x="530" y="30" width="108" height="56" rx="10"/>
<g stroke-dasharray="5 4"><rect x="266" y="150" width="108" height="56" rx="10"/></g>
<rect x="398" y="150" width="108" height="56" rx="10"/>
<rect x="530" y="150" width="108" height="56" rx="10"/>
<path d="M110 58H134" marker-end="url(#at7)"/>
<path d="M242 58H266" marker-end="url(#at7)"/>
<path d="M374 58H398" marker-end="url(#at7)"/>
<path d="M506 58H530" marker-end="url(#at7)"/>
<path d="M320 86V150" marker-end="url(#at7)" stroke-dasharray="5 4"/>
<path d="M584 86V150" marker-end="url(#at7)"/>
<path d="M530 178H506" marker-end="url(#at7)"/>
</g>
<g fill="currentColor" font-family="var(--font-sans)" font-size="13" text-anchor="middle" style="color:var(--color-fg)">
<text x="56" y="56" font-weight="600">Tab manifest</text><text x="56" y="72" font-size="11" style="fill:var(--color-muted)">+ one UI file</text>
<text x="188" y="56" font-weight="600">Shell</text><text x="188" y="72" font-size="11" style="fill:var(--color-muted)">auto-discovery</text>
<text x="320" y="56" font-weight="600">Import</text><text x="320" y="72" font-size="11" style="fill:var(--color-muted)">errors contained</text>
<text x="452" y="56" font-weight="600">Kill switch</text><text x="452" y="72" font-size="11" style="fill:var(--color-muted)">runtime flag</text>
<text x="584" y="56" font-weight="600">Mounted tab</text><text x="584" y="72" font-size="11" style="fill:var(--color-muted)">behind sign-in</text>
<text x="320" y="176" font-weight="600">Skipped</text><text x="320" y="192" font-size="11" style="fill:var(--color-muted)">and reported</text>
<text x="452" y="176" font-weight="600">Backend</text><text x="452" y="192" font-size="11" style="fill:var(--color-muted)">data</text>
<text x="584" y="176" font-weight="600">Data facade</text><text x="584" y="192" font-size="11" style="fill:var(--color-muted)">one data client</text>
</g>
</svg>
<figcaption>Modular architecture</figcaption>
</figure>

The shell owns sign-in, navigation and discovery, and tabs plug into it through a manifest.

- **Manifests.** Each tab declares itself in a manifest the shell reads at start-up.
- **Auto-discovery.** The shell finds and mounts tabs; nothing is registered by hand.
- **Kill switch.** A runtime flag turns a tab off for everyone.
- **Import isolation.** A tab whose import fails is skipped and reported instead of crashing the shell.
- **A data-client facade.** Screens reach data through one small facade, and lint guards stop imports past it.

### Key decisions

- **Refactor behind a visual harness.** The whole refactor ran behind the 28-shot deterministic harness, and the route table stayed byte-identical at 165 routes. The cost was building the harness first.
- **Delete the legacy agent behind a guard.** The old agent, 24.1k lines, was deleted, and an import guard stops it coming back. The cost is that anything still depending on it had to move first.
- **Discovery over registration.** A contributor adds files and does not edit the shell. The cost is a manifest format to keep stable.
- **Tabs share one process.** Per-tab processes are a proposal only and were not built, so a tab that hangs can still affect the others. A failed import is isolated; a slow tab is not.

### Impact

All figures below: measured (local) from the repository.

- **The refactor:** 445 files, 44 commits, 11 sessions.
- **Lines of code:** 242,563 to 217,514, 10.3% fewer.
- **Raw buttons:** 405 to 2.
- **Unwrapped fetches:** 46 to 8, all allowlisted.
- **Main app file:** 3,141 to 597 lines.
- **Data client:** 5,048 lines to a 93-line facade.
- **Engine:** 2,008 to 852 lines.
- **Legacy agent:** 24.1k lines deleted behind an import guard.
- **Route table:** byte-identical, 165 routes.
- **Contributor tabs:** the like-part tab was contributed by a teammate, the first tab built on the shell from outside.

### About the demo

The window above runs in your browser on mock data: stand-in tab manifests, auto-discovery, a kill switch, and a deliberately broken tab that gets skipped and reported. The discovery, kill-switch and skip logic are real; the tabs are invented.

## Admin

Admin is where access and usage are managed: who can see which tabs, which Ask data categories they can query, and how the dashboard is actually being used.

### Problem

Access was managed by editing code, and nobody could see who used the dashboard. The sign-in table held one stage user, so the People view showed 1.

### What it does

- **Tab access per person and per group.** Admins grant or remove tabs without a code change.
- **Ask data categories.** Admins choose which data categories Ask can answer from for each person.
- **An audit log.** Every access change is recorded.
- **Dry-run and check actions.** An admin can preview a change and check what a person can see before saving.
- **A default-deny gate.** It is built but not yet enforcing; enforcement stays off until a server flag is set.
- **Usage per person.** Active days over 30 days, visits over the last week and the last 30 days, top tab, Ask request count and LLM spend, plus a per-tab LLM usage ledger on the Status view.

### Architecture

<figure class="arch">
<svg viewBox="0 0 640 340" role="img" aria-label="Admin architecture. An admin, who manages access without holding full access, edits per-person and per-group grants; every change is written to the audit log, and a default-deny gate that is built but not enforcing until a server flag is set sits between the grants and the tabs and Ask data a person sees. Separately, the request log is grouped into visits with gaps under 30 minutes for per-person usage, and an LLM ledger built from the same requests records spend per tab for the Status view.">
<defs><marker id="at8" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
<g fill="none" stroke="currentColor" stroke-width="1.4" style="color:var(--color-muted)">
<rect x="2" y="30" width="108" height="56" rx="10"/>
<rect x="134" y="30" width="108" height="56" rx="10"/>
<g stroke-dasharray="5 4"><rect x="266" y="30" width="108" height="56" rx="10"/></g>
<rect x="398" y="30" width="108" height="56" rx="10"/>
<rect x="134" y="130" width="108" height="56" rx="10"/>
<rect x="2" y="260" width="108" height="56" rx="10"/>
<rect x="134" y="260" width="108" height="56" rx="10"/>
<rect x="266" y="260" width="108" height="56" rx="10"/>
<rect x="398" y="260" width="108" height="56" rx="10"/>
<rect x="530" y="260" width="108" height="56" rx="10"/>
<path d="M110 58H134" marker-end="url(#at8)"/>
<path d="M242 58H266" marker-end="url(#at8)"/>
<path d="M374 58H398" marker-end="url(#at8)"/>
<path d="M188 86V130" marker-end="url(#at8)"/>
<path d="M110 288H134" marker-end="url(#at8)"/>
<path d="M242 288H266" marker-end="url(#at8)"/>
<path d="M506 288H530" marker-end="url(#at8)"/>
<path d="M56 316V328H452V316" marker-end="url(#at8)" stroke-dasharray="5 4" opacity="0.55"/>
</g>
<g fill="currentColor" font-family="var(--font-sans)" font-size="13" text-anchor="middle" style="color:var(--color-fg)">
<text x="56" y="56" font-weight="600">Admin</text><text x="56" y="72" font-size="11" style="fill:var(--color-muted)">not full access</text>
<text x="188" y="56" font-weight="600">Grants</text><text x="188" y="72" font-size="11" style="fill:var(--color-muted)">person, group</text>
<text x="320" y="56" font-weight="600">Default-deny</text><text x="320" y="72" font-size="11" style="fill:var(--color-muted)">not enforcing</text>
<text x="452" y="56" font-weight="600">Person sees</text><text x="452" y="72" font-size="11" style="fill:var(--color-muted)">tabs, Ask data</text>
<text x="188" y="156" font-weight="600">Audit log</text><text x="188" y="172" font-size="11" style="fill:var(--color-muted)">every change</text>
<text x="56" y="286" font-weight="600">Request log</text><text x="56" y="302" font-size="11" style="fill:var(--color-muted)">every request</text>
<text x="188" y="286" font-weight="600">Visits</text><text x="188" y="302" font-size="11" style="fill:var(--color-muted)">30 min gaps</text>
<text x="320" y="286" font-weight="600">Usage view</text><text x="320" y="302" font-size="11" style="fill:var(--color-muted)">per person</text>
<text x="452" y="286" font-weight="600">LLM ledger</text><text x="452" y="302" font-size="11" style="fill:var(--color-muted)">spend per tab</text>
<text x="584" y="286" font-weight="600">Status view</text><text x="584" y="302" font-size="11" style="fill:var(--color-muted)">per-tab spend</text>
</g>
</svg>
<figcaption>Admin architecture</figcaption>
</figure>

Access rules and usage both sit in the backend, and the Admin views read them.

- **Grants.** Per-person and per-group grants decide which tabs and Ask categories a person sees.
- **Admins are separate from full access.** Being an admin lets you manage access; it does not grant every tab.
- **The default-deny gate.** Built, not yet enforcing, and switched on by a server flag.
- **Usage from the request log.** A visit is a run of requests with gaps under 30 minutes.
- **An LLM usage ledger.** Spend is recorded per tab and shown on the Status view.

### Key decisions

- **Usage from the request log, not sign-ins.** Sign-ins showed one user; the request log shows what people actually did. The cost is defining a visit, which here is requests with gaps under 30 minutes.
- **Admins separate from full access.** Managing access and seeing everything are different powers. The cost is one more role to explain.
- **Build the gate before enforcing it.** The default-deny gate is built but off until a server flag is set, so turning it on is a decision, not a deploy. The cost is a gate that does nothing until someone switches it on.

### Impact

- **A real usage count is now readable** from production traffic. It replaces the resume's user-count claim once it is read; no count is stated here, so this is not measured yet.
- **Access changes** no longer need a code change, and each one is in the audit log.

### About the demo

The window above runs in your browser on mock data: per-person usage, LLM spend, access grants and the audit log for stand-in people. The visit counting and the grant logic are real; every person and number in it is invented.
