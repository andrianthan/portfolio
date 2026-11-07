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
cleared: true
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

**Estimated outcomes:**

- **Time spent finding grants:** about 6 hours a week before, about 1 hour a week of review after
- **Grants a person reviews each week:** about 40 before, about 10 after
- **Junk grants cut from the review pile:** about 70%

These figures are estimates, not measured results.

### About the demo

The window above is a stand-in that runs in your browser: twelve made-up grants and funders, seven stand-in flags modeled on the shape of the real framework, and a deterministic scorer. The threshold, the digest and the tracker are live, and the Edit criteria tab runs a real preview, apply and undo with an expiring one-time token. Nothing here is real grant data.

## IR Updater Bot

A Microsoft Teams bot that lets residential-program staff file an incident report without leaving chat. Staff type a short command, fill a guided five-step form, and the bot creates the record in Salesforce for a supervisor to review. It replaced a paid add-on.

### Problem

To file an incident report, staff had to log into Salesforce directly, which meant training, access and finding their way around a complex layout. Frontline staff needed a way to report from the tool they already had open.

### What it does

- **Starts from a command** typed in Teams, then walks through five short steps.
- **Fills in what it can**: staff, youth and enrollment details come from lookups, so staff don't retype them.
- **Reviews before sending**, with an edit button on every step.
- **Creates a Draft** incident plus one linked record for each youth involved. A supervisor reviews and approves it in Salesforce.

### Architecture

<figure class="arch">
<svg viewBox="0 0 640 170" role="img" aria-label="Incident bot architecture. Staff type a command in a Teams chat and fill a guided form. A bot service routes the messages to one serverless function, which builds the incident record and writes it to Salesforce as a Draft. The function replies back through the bot service, and the form's state travels inside each card, so nothing is stored outside Salesforce.">
<defs><marker id="ah5" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
<g fill="none" stroke="currentColor" stroke-width="1.4" style="color:var(--color-muted)">
<rect x="5" y="30" width="120" height="56" rx="10"/>
<rect x="175" y="30" width="120" height="56" rx="10"/>
<rect x="345" y="30" width="120" height="56" rx="10"/>
<rect x="515" y="30" width="120" height="56" rx="10"/>
<path d="M125 58H175" marker-end="url(#ah5)"/>
<path d="M295 58H345" marker-end="url(#ah5)"/>
<path d="M465 58H515" marker-end="url(#ah5)"/>
<path d="M405 86V132H65V90" stroke-dasharray="5 4" marker-end="url(#ah5)"/>
</g>
<g fill="currentColor" font-family="var(--font-sans)" font-size="13" text-anchor="middle" style="color:var(--color-fg)">
<text x="65.0" y="56" font-weight="600">Teams chat</text><text x="65.0" y="72" font-size="11" style="fill:var(--color-muted)">/ir and a form</text>
<text x="235.0" y="56" font-weight="600">Bot service</text><text x="235.0" y="72" font-size="11" style="fill:var(--color-muted)">routes messages</text>
<text x="405.0" y="56" font-weight="600">One function</text><text x="405.0" y="72" font-size="11" style="fill:var(--color-muted)">builds the record</text>
<text x="575.0" y="56" font-weight="600">Salesforce</text><text x="575.0" y="72" font-size="11" style="fill:var(--color-muted)">Draft incident</text>
<text x="235" y="152" font-size="11" style="fill:var(--color-muted)">replies through the bot service, form state travels inside each card</text>
</g>
</svg>
<figcaption>Incident bot architecture</figcaption>
</figure>

- Teams talks to a bot service, which calls one serverless function. The function validates the form, builds the incident and the linked youth records, and writes them to Salesforce.
- Replies go back to Teams through the bot service. There is no database, queue or session store: the form's state travels inside each card, and nothing lives outside Salesforce.

### Key decisions

- **One function**, which keeps the infrastructure and the cost as small as possible.
- **State in the card**, so the bot is stateless and a restart loses nothing.
- **Draft only**: staff can create reports but not approve them, so a supervisor always reviews.
- **Dependent picklists** with a rule that drops an invalid type and sub-type pair before anything is sent.
- **Adding a form field is a one-file change**: the card input, the state key, the payload and the review card.

### Impact

- **Vendor cost avoided:** $30k+ across this tool and the grants agent above, which also replaced a paid add-on
- **Form:** 5 steps, and a submit takes 1 to 3 seconds
- **Running cost:** about $1 to $2 a month
- **Verification:** a 54-check smoke test run after every deploy (53 passing, one transient), and 22 documented failure scenarios with fixes

**Estimated outcomes:**

- **Time to file an incident report:** about 15 minutes in Salesforce directly, about 3 minutes in Teams
- **Staff using it:** about 25
- **Reports filed per month:** about 80

These figures are estimates, not measured results.

### About the demo

The window above is a stand-in that runs in your browser: a Teams-style chat, made-up youth and staff, and the same five-step flow. The dependent picklists, the review screen, the Draft record and the supervisor approval run real logic. Nothing here is real incident data.

## Case Note Coach

An AI assistant that helps licensed clinicians write progress notes, and check notes they already wrote, against one behavioral-health payer's documentation standards. It expands a clinician's keywords into a note ready for the record, explains every decision, and rates notes pasted in.

### Problem

Progress notes fail payer audits or supervisor review when they leave out the elements that show a session was medically necessary. Clinicians needed help writing notes that pass, and a way to learn what a strong note contains without a supervisor reading every one.

### What it does

- **Start a new note:** the clinician pastes keywords. The GPT lists everything that is missing in one message, then writes the note and an **Expansion Breakdown** that explains where each sentence came from and why.
- **Check a note:** the clinician pastes an existing note in any format. The GPT rates it Tier 1, 2 or 3 and says exactly what to fix. It evaluates the note and does not rewrite it.
- **Stays honest:** it never invents symptoms, diagnoses or client responses, and it never softens risk documentation.

### Architecture

<figure class="arch">
<svg viewBox="0 0 640 225" role="img" aria-label="Case note chatbot architecture. A clinician starts either a new note or a note check. An AI assistant with one set of system instructions answers, searching a knowledge base that is layered by authority, from payer rules at the top down to code lookups. The output is a tier verdict, the note itself, and an expansion breakdown that explains each sentence.">
<defs><marker id="ah6" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
<g fill="none" stroke="currentColor" stroke-width="1.4" style="color:var(--color-muted)">
<rect x="5" y="30" width="150" height="56" rx="10"/>
<rect x="245" y="30" width="150" height="56" rx="10"/>
<rect x="485" y="30" width="150" height="56" rx="10"/>
<rect x="185" y="150" width="270" height="56" rx="10"/>
<path d="M155 58H245" marker-end="url(#ah6)"/>
<path d="M395 58H485" marker-end="url(#ah6)"/>
<path d="M320 150V86" stroke-dasharray="5 4" marker-end="url(#ah6)"/>
</g>
<g fill="currentColor" font-family="var(--font-sans)" font-size="13" text-anchor="middle" style="color:var(--color-fg)">
<text x="80" y="54" font-weight="600">Clinician</text><text x="80" y="70" font-size="11" style="fill:var(--color-muted)">new note, or check one</text>
<text x="320" y="54" font-weight="600">AI assistant</text><text x="320" y="70" font-size="11" style="fill:var(--color-muted)">instructions + rules</text>
<text x="560" y="54" font-weight="600">Output</text><text x="560" y="70" font-size="11" style="fill:var(--color-muted)">tier, note, breakdown</text>
<text x="320" y="174" font-weight="600">Knowledge base</text><text x="320" y="190" font-size="11" style="fill:var(--color-muted)">layered by authority: rules, guidance, guides, lookups</text>
<text x="395" y="126" font-size="11" style="fill:var(--color-muted)">file search</text>
</g>
</svg>
<figcaption>Case note chatbot architecture</figcaption>
</figure>

- One assistant with no backend code of its own. A single instructions file is the source of truth for the rules, the routing table and the output format.
- The knowledge base is layered by authority: payer rules first, then audit guidance, sufficiency logic, supporting guides, and structured code and term lookups. When two layers disagree, the higher one wins.
- The flow runs input, service type, a check of each of the three note sections, one message listing every gap, then the note and its breakdown.

### Key decisions

- **No embellishment.** Every sentence must trace to what the clinician said, because the note is a legal record. Gaps are flagged, not filled.
- **An authority hierarchy**, so payer rules override generic advice.
- **Three tiers, with hard fails and soft suggestions kept apart.** Missing administrative details are never graded.
- **Risk documentation in three proportional categories**, not always required in full.
- **Telehealth checks are reminders only** and never block a note.
- **A high-capability reasoning model is required**, because smaller models loosen the ratings.

### Impact

- **Rating:** 3 tiers and 8 hard-fail conditions
- **Knowledge base:** 15 files, including structured lookups of 259 diagnosis codes and 114 intervention terms
- **Rebuild:** 15 to 20 minutes, with the smoke tests re-run after every instruction change

**Estimated outcomes:**

- **Time to write a progress note:** about 15 minutes before, about 6 minutes after
- **Clinicians using it:** about 12
- **Notes checked per week:** about 50

These figures are estimates, not measured results.

### About the demo

The window above is a stand-in that runs in your browser. The real tool is an AI assistant configured with instructions and a knowledge base. The demo uses made-up documentation standards, rule checks for the eight conditions (two of them keyword heuristics), local retrieval for questions, and a note builder where every sentence comes from the input. It is not a language model, and it holds no real clinical content.
