---
company: Hanna Center
title: Software Engineer Intern
project: AI Agents & Workflow Automation
dates: Dec 2025 – Jun 2026
start: "2025-12"
end: "2026-06"
summary: "Built in-house LLM agents with non-technical staff: a grant-research agent that scrapes 39 funder sources and scores them in two stages against staff-editable criteria, replacing an enterprise platform, plus a Teams-to-Salesforce incident bot and a clinical-note GPT. **Avoided $30k+** in vendor and subscription cost."
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

- **Scheduled scraping.** A scheduler starts the day's run, and a workflow fans out to one scraper per source. It scrapes the funder sources every morning and removes duplicates.
  - A managed scraping service instead of a headless browser keeps the deployment light.
- **Processing and storage.** A processing step filters off-mission items, extracts details with an LLM, embeds them and writes them to a database with vector search.
- **Two-stage scoring.** The evaluator retrieves candidate grants by vector similarity and runs a cheap pre-filter model. A stronger model then scores the survivors on a seven-flag framework, with a reason for every flag.
  - A cheap model first and a stronger model second means most grants never reach the expensive step.
- **Criteria in a document.** The scoring criteria live in a document that staff edit directly, or in plain English through a custom GPT.
  - Criteria in a document means non-technical staff change the scoring without code.
- **Safe edits through the GPT.** Every edit is previewed, applied with a one-time token that expires, and recorded so it can be reversed.
  - Preview, apply and undo means a bad edit is never permanent, and server-side validation of whitelisted settings and checked values rejects a malformed one.
- **Outputs.** Grants above the sheet cutoff are logged to a shared tracker where staff approve or skip them, a daily email lists grants above the email cutoff, and a digest goes out on Fridays.

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

## IR Updater Bot

A Microsoft Teams bot that lets residential-program staff file an incident report without leaving chat. Staff type a short command, fill a guided five-step form, and the bot creates the record in Salesforce for a supervisor to review. It replaced a paid add-on.

### Problem

To file an incident report, staff had to log into Salesforce directly, which meant training, access and finding their way around a complex layout. Frontline staff needed a way to report from the tool they already had open.

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

- **A command and a guided form.** Staff type a short command in Teams and walk through five short steps. Staff, youth and enrollment details come from lookups, so staff don't retype them, and a review screen has an edit button on every step.
- **One serverless function.** Teams talks to a bot service, which calls one function that validates the form, builds the incident and the linked youth records, and writes them to Salesforce.
  - One function keeps the infrastructure and the cost as small as possible.
- **State in the card.** The form's state travels inside each card, so there is no database, queue or session store.
  - Keeping state in the card means the bot is stateless and a restart loses nothing.
- **Draft records.** It creates a Draft incident plus one linked record for each youth involved, and a supervisor reviews and approves it in Salesforce.
  - Draft only means staff can create reports but not approve them, so a supervisor always reviews.
- **Dependent picklists.** Type and sub-type depend on each other, and a rule drops an invalid pair before anything is sent.
  - Dropping an invalid pair up front keeps bad data out of Salesforce.
- **Easy to extend.** Adding a form field is a one-file change: the card input, the state key, the payload and the review card.

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

## Case Note Coach

An AI assistant that helps licensed clinicians write progress notes, and check notes they already wrote, against one behavioral-health payer's documentation standards. It expands a clinician's keywords into a note ready for the record, explains every decision, and rates notes pasted in.

### Problem

Progress notes fail payer audits or supervisor review when they leave out the elements that show a session was medically necessary. Clinicians needed help writing notes that pass, and a way to learn what a strong note contains without a supervisor reading every one.

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

- **One assistant, no backend.** The assistant has no backend code of its own. A single instructions file is the source of truth for the rules, the routing table and the output format, and the flow runs input, service type, a check of each of the three note sections, one message listing every gap, then the note and its breakdown.
- **Two modes.** To start a note, the clinician pastes keywords and the GPT writes the note plus an Expansion Breakdown that explains where each sentence came from and why. To check a note, the clinician pastes an existing one in any format and the GPT rates it Tier 1, 2 or 3 and says exactly what to fix, without rewriting it.
  - No embellishment: every sentence must trace to what the clinician said, because the note is a legal record, so gaps are flagged, not filled. It never invents symptoms, diagnoses or client responses, and never softens risk documentation.
- **A knowledge base layered by authority.** Payer rules come first, then audit guidance, sufficiency logic, supporting guides, and structured code and term lookups.
  - An authority hierarchy means that when two layers disagree, the higher one wins, so payer rules override generic advice.
- **Three tiers.** Hard fails and soft suggestions are kept apart, and missing administrative details are never graded.
  - Keeping hard fails apart from soft suggestions means a note is not failed for a minor gap.
- **Risk and telehealth checks.** Risk documentation is in three proportional categories, not always required in full, and telehealth checks are reminders only.
  - Proportional risk categories mean the documentation asked for matches the risk, and reminders mean a telehealth detail never blocks a note.
- **A high-capability reasoning model.** The assistant is run on one.
  - Smaller models loosen the ratings.

### Impact

- **Rating:** 3 tiers and 8 hard-fail conditions
- **Knowledge base:** 15 files, including structured lookups of 259 diagnosis codes and 114 intervention terms
- **Rebuild:** 15 to 20 minutes, with the smoke tests re-run after every instruction change

**Estimated outcomes:**

- **Time to write a progress note:** about 15 minutes before, about 6 minutes after
- **Clinicians using it:** about 12
- **Notes checked per week:** about 50

These figures are estimates, not measured results.
