---
company: Hanna Center
title: Software Engineer Intern
project: AI Agents & Workflow Automation
dates: Dec 2025 – Jun 2026
start: "2025-12"
end: "2026-06"
summary: "Built in-house LLM tools with non-technical staff, including a grant-research agent that replaced an enterprise platform, **avoiding $30k+** in vendor and subscription cost. Wrote the validation framework for agent accuracy, consistency, and safety."
stack: [Python, LLM agents, Salesforce, Agent evals]
logo: /logos/hanna.png
logoFill: true
current: false
listed: true
cleared: false
order: 2
---
## Grants Agent

An agent that finds, scores and tracks grant opportunities for the organization, and replaced an enterprise grant platform. It scrapes funder sources every day, scores each new grant against criteria that staff edit, logs the good ones to a shared sheet, and emails a daily and a weekly digest.

### Problem

Finding grants meant searching many funder websites by hand, and the paid platform that did it for us was expensive. The goal was a tool the team owned, that surfaced only grants worth a person's time, and whose scoring non-technical staff could change themselves.

### What it does

- **Scrapes** the funder sources every morning and removes duplicates.
- **Scores** each new grant on a seven-flag framework, with a reason for every flag.
- **Logs** grants above the sheet cutoff to a shared tracker where staff approve or skip them.
- **Emails** a daily list of grants above the email cutoff, and a digest on Fridays.
- **Lets staff retune the scoring** in plain English through a custom GPT, with a preview before any change.

### Architecture

<figure class="arch">
<svg viewBox="0 0 640 300" role="img" aria-label="Grants agent architecture. A scheduler starts a workflow that fans out to one scraper per grant source. A processing step filters, extracts and removes duplicates and stores grants with vectors in a database. An evaluator pre-filters and then scores grants against an editable criteria document, then writes to a tracking sheet and sends a daily and weekly email. Staff edit the criteria in plain English through a custom GPT and an editor that previews, applies and can undo each change.">
<defs><marker id="ah4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
<g fill="none" stroke="currentColor" stroke-width="1.4" style="color:var(--color-muted)">
<rect x="2" y="30" width="108" height="56" rx="10"/>
<rect x="134" y="30" width="108" height="56" rx="10"/>
<rect x="266" y="30" width="108" height="56" rx="10"/>
<rect x="398" y="30" width="108" height="56" rx="10"/>
<rect x="530" y="30" width="108" height="56" rx="10"/>
<rect x="2" y="130" width="108" height="56" rx="10"/>
<rect x="266" y="130" width="108" height="56" rx="10"/>
<rect x="398" y="130" width="240" height="56" rx="10"/>
<rect x="2" y="230" width="108" height="56" rx="10"/>
<rect x="134" y="230" width="108" height="56" rx="10"/>
<rect x="266" y="230" width="108" height="56" rx="10"/>
<path d="M110 58H134" marker-end="url(#ah4)"/>
<path d="M242 58H266" marker-end="url(#ah4)"/>
<path d="M374 58H398" marker-end="url(#ah4)"/>
<path d="M506 58H530" marker-end="url(#ah4)"/>
<path d="M110 158H266" marker-end="url(#ah4)"/>
<path d="M374 158H398" marker-end="url(#ah4)"/>
<path d="M584 86V108H320V130" stroke-dasharray="5 4" marker-end="url(#ah4)"/>
<path d="M266 258H242" marker-end="url(#ah4)"/>
<path d="M134 258H110" marker-end="url(#ah4)"/>
<path d="M56 230V186" marker-end="url(#ah4)"/>
</g>
<g fill="currentColor" font-family="var(--font-sans)" font-size="13" text-anchor="middle" style="color:var(--color-fg)">
<text x="56.0" y="56" font-weight="600">Scheduler</text><text x="56.0" y="72" font-size="11" style="fill:var(--color-muted)">daily at 6 AM</text>
<text x="188.0" y="56" font-weight="600">Workflow</text><text x="188.0" y="72" font-size="11" style="fill:var(--color-muted)">fans out</text>
<text x="320.0" y="56" font-weight="600">Scrapers</text><text x="320.0" y="72" font-size="11" style="fill:var(--color-muted)">one per source</text>
<text x="452.0" y="56" font-weight="600">Processing</text><text x="452.0" y="72" font-size="11" style="fill:var(--color-muted)">filter, dedupe</text>
<text x="584.0" y="56" font-weight="600">Vector DB</text><text x="584.0" y="72" font-size="11" style="fill:var(--color-muted)">grants + vectors</text>
<text x="56.0" y="156" font-weight="600">Criteria doc</text><text x="56.0" y="172" font-size="11" style="fill:var(--color-muted)">editable by staff</text>
<text x="320.0" y="150" font-weight="600">Evaluator</text><text x="320.0" y="166" font-size="11" style="fill:var(--color-muted)">pre-filter, then score</text>
<text x="518" y="156" font-weight="600">Sheet + email</text><text x="518" y="172" font-size="11" style="fill:var(--color-muted)">tracker, daily, weekly</text>
<text x="56.0" y="256" font-weight="600">Editor</text><text x="56.0" y="272" font-size="11" style="fill:var(--color-muted)">preview, apply, undo</text>
<text x="188.0" y="256" font-weight="600">Custom GPT</text><text x="188.0" y="272" font-size="11" style="fill:var(--color-muted)">plain English</text>
<text x="320.0" y="256" font-weight="600">Staff</text><text x="320.0" y="272" font-size="11" style="fill:var(--color-muted)">non-technical</text>
</g>
</svg>
<figcaption>Grants agent architecture</figcaption>
</figure>

- A scheduler starts the day's run. A workflow fans out to one scraper per source, and a processing step filters off-mission items, extracts details with an LLM, embeds them and writes them to a database with vector search.
- The evaluator retrieves candidate grants by vector similarity, runs a cheap pre-filter model, then a stronger model scores the survivors against the criteria document.
- Scores go to the sheet and the emails. The criteria live in a document that staff can edit, directly or through the custom GPT.

### Key decisions

- **Criteria in a document**, so non-technical staff change the scoring without code.
- **Preview, apply, undo** for every edit made through the GPT: a change is previewed, applied with a one-time token that expires, and recorded so it can be reversed.
- **A cheap model first, a stronger model second**, so most grants never reach the expensive step.
- **Server-side validation** of every edit: whitelisted settings and checked values.
- **A managed scraping service** instead of a headless browser, to keep the deployment light.

### Impact

- **Vendor cost avoided:** $30k+ across this tool and the incident tool below, replacing an enterprise grant platform and a paid add-on
- **Sources covered:** 39, scraped every day at 6 AM and scored at 9 AM
- **Scoring:** 7 flags and 6 department search profiles; the sheet shows grants scoring 5.0 and up, the email 6.0 and up
- **Running cost:** about $16 to $19 a month, of which the LLM is about $2 to $5
- **Editing:** staff change criteria in plain English, with preview and undo

### About the demo

The window above is a stand-in that runs in your browser: twelve made-up grants and funders, seven stand-in flags modeled on the shape of the real framework, and a deterministic scorer. The threshold, the digest and the tracker are live, and the Edit criteria tab runs a real preview, apply and undo with an expiring one-time token. Nothing here is real grant data.
