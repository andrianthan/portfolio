---
company: Tesla
title: AI Software Engineer Intern
project: Service Demand Planning Copilot
dates: Jun 2026 – Dec 2026
start: "2026-06"
end: "2026-12"
summary: "Built and shipped the unified planning dashboard (React and FastAPI) that brings eight scattered data sources into one app, including Ask SDP, a tool-calling LLM copilot whose answers **can't contain invented numbers**, and Forecast Lab, with Chronos-2 forecasts **32% better than baseline** on backtest."
stack: [LLM agents, FastAPI, React, DuckDB, GitHub Actions, Evals]
logo: /logos/tesla.svg
current: true
listed: true
cleared: true
order: 1
---
## Dashboard

The unified planning dashboard is the React and FastAPI app planners live in, and I shipped it end to end. Overview, Part Summary, Ask, Forecast Lab, Campaigns, the KPI tabs, Home and Admin sit in one app, and the work was making it open fast, stay correct on real data, and stay easy for other people to extend.

### Problem

Planning data was scattered across about eight live database sources, around seven of them DuckDB or parquet files. Each source had its own Streamlit dashboard, so answering one question meant clicking through several tools with different layouts and filters. That friction was the problem the unified dashboard exists to solve: one place, one sign-in, one navigation, one data layer. The code had a matching problem. The app had grown screen-first, features reached directly into whatever data they needed so a change in one screen could break another, and adding a tab meant editing the shell.

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

The rule behind the design: the request path only reads, and all building happens at startup or in the background. The same information leaves the database once, not once per person or per page view.

- **A warm registry, built at startup.** Each worker holds the last good copy in memory. A request gets that copy, or an instant "warming up" reply while the first build finishes.
  - Building ahead of time instead of per request keeps users from waiting on several backends.
  - A "warming up" reply instead of queueing stops waiting requests from piling up and competing with the build.
- **A shared disk snapshot.** A build is written to disk once as an atomic snapshot, every worker loads that file instead of querying the backends, and a restart reads it too.
  - One shared build instead of one per worker means concurrent requests share one build instead of starting their own.
- **A browser cache.** A stale-while-revalidate cache answers from its own copy and refreshes in the background, so going back to a page asks the server for nothing.
  - The cache prevents repeated requests to the server when a planner goes back to a page.
- **Bounded resources.** Connections are pooled, DuckDB runs as one shared connection with a memory limit, a semaphore bounds how much warms at once, and a 3500 MB ceiling stops hot-part warming.
  - Pooling and a ceiling keep memory and connections bounded; hot-part warming stopped at 15 of 25 parts.
- **A light first load.** Gzip is on and charts load only when they are needed.
  - Sending less up front beats relying on a fast network.
- **Read-only requests.** Only a build touches the databases, and the dashboard's reads are SELECT-only.
  - Read-only means a bad query can be slow but cannot damage data.
- **A data path that fails loud.** The weekly ETL streams its input, builds are verified before an atomic swap, a loader never deletes the live database before its replacement is verified, and freshness is polled every 10 minutes with gates that stop stale data being served as current.
  - Failing loud instead of reporting green means stale data no longer goes unnoticed.

A second rule keeps the code modular: the shell owns sign-in, navigation and discovery, and tabs plug into it through a manifest, so new work adds files instead of changing the shell.

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

<div data-slot="dashboard-tabs"></div>

- **Manifests and auto-discovery.** A tab is a manifest plus one frontend file. The shell finds it, mounts it behind sign-in, and nothing is registered by hand.
  - Discovery instead of registration means a contributor adds files and never edits the shell.
- **Kill switch.** A runtime flag turns any tab off for everyone without a deploy.
  - A kill switch lets a broken tab be turned off at once, without a redeploy.
- **Import isolation.** A tab whose import fails is skipped and reported instead of crashing the shell.
  - Isolated imports mean one broken tab does not take the app down.
  - Tabs share one process instead of running one each, so a tab that hangs can still affect the others. Per-tab processes are a proposal only.
- **Reusable components.** Screens use a shared button and fetch layer instead of writing their own, and lint rules keep them on it.
  - Reusing shared building blocks means AI coding tools reuse what already exists instead of regenerating new components each time, so there is less new code to review and less drift between screens.
- **A data-client facade.** Screens reach data through one small facade, and lint guards stop imports past it.
  - A facade instead of screens reaching into data means a change in one screen cannot break another.

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
- **Scalability:** more people can contribute without stepping on each other. A new tab is a manifest and one frontend file, and a tab that fails to import is skipped instead of breaking the app. The like-part tab, contributed by a teammate, is the first built on the shell from outside.
- **A smaller shell:** the main app file went from 3,141 to 597 lines, so adding a tab no longer means editing a huge file, measured (local) from the repository.
- **Nothing broke:** the route table is byte-identical at 165 routes, measured (local) from the repository.
- **Cost to watch:** stage RAM idles at 1.75 GB and reached 3.6 to 4.0 GB after opening every deep-dive tab on a cold part, against the 3500 MB ceiling, measured (stage). Production runs one worker and is not yet verified.

The figures are a mix of local and stage runs, so treat them as medium confidence.

## Part Summary

Part Summary is the one-stop page for a single part: search for it, and the sub-tabs show its status, consumption, failure rates and breakdowns in one place.

### Problem

To understand one part, planners pulled each view from a separate report: consumption from one place, failure rates from another, location and correction-code breakdowns from somewhere else. Investigating a demand spike meant assembling those by hand before any thinking could start.

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

- **Six sub-tabs for one part.** Overview (AI-generated insights on current status), consumption over time, failure rates and their trend, a location by build-year matrix, a correction-code matrix, and a breakdown of customer symptoms next to correction codes.
  - One playbook powers both Ask and the sub-tabs, instead of two separate investigations.
  - A narrowing path that ends in a verdict replaces a wall of charts, and captions that could mislead were removed.
- **Slices per sub-tab.** Each sub-tab fetches its own slice, so opening Overview does not pay for the matrices.
  - Fetching a slice per sub-tab instead of one big load means opening Overview does not pay for the matrices.
- **Single-flight and pooled SQL clients.** Two requests for the same slice share one query, and connections are reused instead of opened per request.
  - Sharing queries and connections prevents repeated work on repeat opens.
- **Request limiting.** Submitting a part sends a burst of requests at once, one for each slice. The number running against the backend at one time is capped, and the rest wait their turn.
  - Limiting the burst instead of sending every slice at once keeps a single part search from overloading the database.
- **Weekly demand aggregation.** Demand is aggregated to weeks before it reaches the page.
  - Weekly aggregation instead of raw rows means the page handles far less data.
- **Stream in, retry on timeout.** Results stream in as they arrive, and a slice that times out is retried instead of leaving a blank chart.
  - Streaming with a retry instead of all-or-nothing means a slow slice does not blank the page.

### Impact

- **Spike investigation time:** about 2 hours before, about 25 minutes after, planner-reported. It was reported by planners, not measured, and it is not multiplied by the number of users.
- **Back-navigation speed:** the measured numbers are in the Dashboard section above.

## Ask SDP

Ask SDP is a tool-calling copilot over live consumption data: planners ask a question in plain language, and every number in the answer comes from a tool result, never from the model's imagination. A golden-set eval harness in CI grades every change to it.

### Problem

Demand planners were already asking an LLM questions about consumption data, and the answers read well and were sometimes fiction. A confident invented number is worse than no answer: it flows into a planning decision, and nobody can tell afterwards which figures were real. The copilot could also regress silently, since a prompt change that improved tone could quietly loosen grounding, and the team pushed untested code straight to main.

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

- **Routing floor first.** A code-gated floor sends data questions to a tool before the model can free-form an answer, so a data question cannot reach the model ungated. On the routing evals it takes tool-routing coverage to 35/35 with 0% free-route answers.
  - A routing floor in code instead of trusting the model means a data question always reaches a tool first.
- **Parallel tool calls.** When a question needs more than one source, the tool calls run at the same time.
  - Running calls in parallel instead of one after another makes the wait the slowest call, not the sum.
- **A cache for repeated lookups.** Information that was already fetched is served from the cache instead of being queried again.
  - Caching allows us to prevent repeated requests to the data source.
- **Optimized queries.** The slowest lookups behind the tools were rewritten to run faster.
  - Some queries pulled far more of the database than the answer needed, so they were rewritten to fetch only the small piece of information required.
- **Streaming.** The answer reaches the planner as it is written, not after it finishes.
  - Streaming instead of waiting for the whole answer lets the planner start reading right away.
- **Output rail.** The rail extracts every number in a draft answer and checks each one against the tool results in the conversation. A figure with no source is stripped, and the answer ships without it.
  - Checking in code instead of in the prompt means an invented figure cannot ship.
- **A restricted Python tool.** Numeric questions go to a Python tool that runs in a separate process with restricted builtins, an import allow-list, and CPU and time limits, returning a checked result into the conversation.
  - A restricted Python tool lets the copilot compute instead of guess. It limits what generated code can do, but it is not a hard jail.
- **Typed verdict.** Every answer ends in a verdict stating what the data supports, as a field the evals can diff, so a conclusion cannot quietly change between runs.
  - Computing the verdict in code instead of asking the model means the model cannot override it.
- **Golden set and gates.** A pull request runs the golden set through separate routing, metrics and grounding gates, and a negative control with a fabricated number feeds the grounding gate.
  - A negative control makes the gate fail on purpose every run, so a gate that never fails cannot hide a problem.

### Impact

- **Faster insight:** planners and analysts get answers to demand questions much faster, without pulling data from several places first. The time saved per question is not measured here.
- **Answer speed:** mean answer time fell from 39 s to 11 s, and the slowest narrative answer from 196 s to 16 s, through parallel tool calls, caching, query optimization and streaming. Quoted from a PR, not re-measured.
- **Fewer dead ends:** 9 of 9 reproduced dead-ends were fixed, which were 8.3% of 109 real turns mined from use.

## Forecast Lab

Forecast Lab is where Chronos-2 forecasts reach planners: a watchlist, shaping controls for business knowledge, and a firming flow that previews a change before it is committed to the firming system.

### Problem

Firming a forecast used to mean exporting a CSV, filling in a template and uploading it by hand. Inside the app, batches of 4 or more parts took 50 to 87 s and batches of 6 or more timed out, and the failures were swallowed, so the forecast overlays came back empty with no error. The baseline forecast also missed shape the business could see coming.

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

- **Generate path.** A planner submits a batch of parts, which goes to the warm Chronos-2 runner in one call. Each part's forecast is displayed as it finishes while the rest populate in the background.
  - Chronos-2 was chosen over LightGBM and TimesFM in the team's own backtest, cutting lag-zero error from $17.0M to $11.6M, 32% better than baseline.
  - A warm runner instead of loading per request removes the start-up cost from every call.
  - One call per batch instead of one per part avoids paying overhead for each part.
  - Showing the first result instead of waiting for the batch lets the page paint fast.
  - The slow batches came from a database query plan that flipped on a 54M-row table, so an index hint fixed it instead of changing the model, with identical forecast output.
- **Shaping and buffer layers.** Planner adjustments sit on top of the generated forecast, recorded as a diff that never changes the model.
  - Shaping layers let planners add what the data does not know without touching the model.
- **Write path.** Firm Selected computes the change and shows a dry-run preview. Only a commit writes to the firming system, and the app then checks with the production system that the firm went through.
  - Every firm is a dry run first and is checked with production afterwards, instead of trusting that the write went through.
- **Failure path.** A failed batch returns an error instead of an empty overlay.
  - Failures used to be swallowed and come back as empty overlays, so they now return an error.
- **Scope.** South America warehouses are part of the same flow, and the backtest switcher is off by default, so planners see the live forecast unless they ask for the backtest.
  - The live forecast is what planners work from, so the backtest is off unless they ask for it.

### Impact

- **From forecast to production in one place:** a planner can now review the production forecast, adjust it and push it live without leaving the tool. That workflow used to mean hopping between several platforms, and updates now reach production far faster. A dry-run preview shows every change before anything is written. The speed-up is not measured here.

## Campaigns

Campaigns tracks the parts linked to service campaigns and warns planners when a campaign is winding down, so the forecast stops carrying demand that will not come back.

### Problem

Campaign demand inflates a part's history, and when a campaign winds down the forecast keeps expecting it. Most campaign-linked parts carried a positive two-year over-forecast, worth tens of millions of dollars at unit cost. That is the size of the problem, not part of the impact.

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

- **One snapshot.** The gate, the views and the notices read the same snapshot of 223 campaign-linked parts across 131 campaigns.
  - One snapshot instead of each view querying live means every planner sees the same numbers.
- **The wind-down gate.** Pace share of service units over 8, 13 and 26 weeks, best of the three, against the 10% threshold. 54 parts are on the alert list.
  - The best of three windows instead of a single one keeps a short dip from triggering an alert.
- **Held for verification.** Parts with unexplained bulletin demand or low-confidence complaint demand are held out of the actionable list.
  - Uncertain parts are held for verification instead of cut, so they are checked and not counted.
- **Four views.** Alerts, all parts, campaigns, and bulletin demand missing from the campaign list, with CSV export and on-hand inventory by warehouse.
- **The simulator.** A completion simulator gives P10/P50/P90 dates, backtested on 94 past campaigns.
  - A completion range instead of a single date shows how uncertain a campaign's end is.
- **Per-planner notices.** One email per planner with only their parts, a consolidated copy to the team, and one listing bulletin demand missing from the campaign list. 6 planners receive alerts.
  - One email per planner instead of one for everyone keeps each notice short enough to read.
- **Dollars as exposure.** Forecast dollar figures are forecast exposure, and time-saved dollars use a placeholder rate.
  - Dollars are exposure, not cash, so the page does not claim savings that are not booked.

### Impact

Estimated impact based on a snapshot.

- **Flagged and actionable:** about $13.3M of forecast cut was flagged across the 54 alert parts, and 44 of them are actionable, about $4.9M. The other 10 parts, about $8.4M, are held for verification and not counted.
- **Expected impact:** about $1.2M to $2.5M of excess forecast exposure removed over 26 weeks, which is 25% to 50% of the actionable $4.9M, an estimate.
- **Backtest evidence:** the shipped model was $6.5M to $9.3M closer to actual use than the books across 36 flagged parts and 23 campaigns, not booked.
- **Time saved:** roughly 300 to 350 hours, about $30k to $35k at a placeholder rate of $100 an hour, not an employer rate. It is an estimate across the projects on this page (this includes Forecast Lab's 80-hour estimate), mostly from spike investigations at about 200 hours.

## Slideshow generation

Slideshow generation rebuilds the weekly executive deck inside the app, on top of the weekly ETL that built the data the deck and the KPI files read.

### Problem

The executive deck was assembled by hand from queries that drifted between runs, and the KPI files planners needed every Monday were built by hand too. Each cycle cost hours, and a number in the deck could disagree with the number in the app.

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

- **A weekly GitHub Actions run.** It pulled the week's demand data and built the tables behind the deck and the accessories KPI numbers.
  - A schedule makes the CSV appear without anyone asking, and the in-app regenerate covers the rest.
- **Verified before use.** The build was checked before anything read it.
  - Verifying the build instead of trusting it keeps a bad run from reaching the deck.
- **One source, several outputs.** The 77-slide executive deck, the accessories KPIs and the Part Miss by Lag CSV, published every KPI Monday, all read the same verified tables.
  - One source instead of separate builds means the deck cannot disagree with the app.
- **Regenerate in the app.** A Regenerate button rebuilds the deck from the current data with a PPTX download, and composer controls stay hidden while they are a work in progress.
  - Generating the deck instead of assembling it by hand makes it the same every time for the same data.
  - Unfinished controls stay hidden instead of shipping half-working.
- **The schedule was later stopped.** The scheduled Monday run was later stopped; the in-app regenerate still works on demand.

### Impact

- **Auto-assembled KPI decks:** the weekly KPI presentation for cross-functional teams used to be assembled by hand. Weekly demand data now reaches the 77-slide executive deck without a hand-assembled run. The scheduled run saves an estimated 20+ hours per run, an estimate rather than a measured figure.
- **More in-depth insight:** AI is integrated into the deck, and its insights give a qualitative and quantitative overview of specific metrics, areas and zones.

## Admin

Admin is where access and usage are managed: who can see which tabs, which Ask data categories they can query, and how the dashboard is actually being used.

### Problem

Access was managed by editing code, and nobody could see who used the dashboard. The sign-in table held one stage user, so the People view showed 1.

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

- **Grants.** Per-person and per-group grants decide which tabs and Ask data categories a person sees, and admins change them without a code change.
  - Grants live in the backend instead of in code, so access changes need no deploy.
- **Admins are separate from full access.** Being an admin lets you manage access; it does not grant every tab.
  - A separate admin role keeps managing access apart from seeing everything.
- **Safe changes.** Every access change is recorded in an audit log, and dry-run and check actions preview a change and show what a person can see before saving.
  - An audit log and dry runs make every change visible and checked before it lands.
- **The default-deny gate.** Built, not yet enforcing, and switched on by a server flag.
  - Building the gate before enforcing it means turning it on is a decision, not a deploy.
- **Usage from the request log.** A visit is a run of requests with gaps under 30 minutes. Per person: active days over 30 days, visits over the last week and 30 days, top tab, Ask request count and LLM spend.
  - The request log shows what people actually did, while sign-ins showed only one user.
- **An LLM usage ledger.** Spend is recorded per tab and shown on the Status view.
  - A per-tab ledger shows where LLM spend comes from.

### Impact

- **Per-user monitoring:** usage is visible per person from production traffic, including active days, visits, top tab, Ask requests and LLM spend. A real user count is now readable and will replace the resume's user-count claim once it is read. No count is stated here, so this is not measured yet.
- **Group and per-person tab restrictions:** admins grant or remove tabs, and choose which Ask data categories each person can use, with no code change.
- **Accountable changes:** every access change is in the audit log, and a dry run previews it before it is saved.
- **Cost visibility:** LLM spend is recorded per tab on the Status view.
