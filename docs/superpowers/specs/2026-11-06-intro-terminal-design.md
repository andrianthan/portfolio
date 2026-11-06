# Intro terminal: design

Status: approved by Andrian in chat on 2026-11-06 ("intro screen on top", then "go"). Reference look: refact0r.dev (one quiet screen: name, one line, route links). The base spec and the agentic-terminal spec stay binding where this one is silent.

## Goal
The first screen of the home page is a minimal intro: the name, one greeting line, and a prompt. A visitor types a route or a question and the page takes them to the right place. Visitors who do not type can click the same routes as links.

## Intro screen
- Fills the first viewport (100svh), content top-anchored so a growing output area never re-centres the layout.
- h1 "Andrian Than." (existing blur-in treatment), then the line: "hey there! i'm andrian. i build AI agents people can trust." Then the prompt line (`>`, input, blinking cursor), then route chips.
- Chips are real anchors: /about #about, /experience #experience, /projects #projects, /contact #contact, /resume /resume.pdf, /terminal (full screen). They work with JavaScript off. The input is hidden without JavaScript.
- The old hero pill, rotating subtitle and button row are removed. The pill text, the Resume/Email/LinkedIn/GitHub links and the hero graph move to a slim band directly below the intro. The "Ask my portfolio" panel is removed.
- Theme: follows the page theme tokens. No terminal palette on the home page.

## Routing
- `AgentResult.effects.navigate?: { href: string; label: string }`, set by the engine for intents that have a place on the page: experience -> #experience, projects -> #projects, about -> #about, contact -> #contact. No target for skills, resume, help, search without a match, easter eggs, or refusals.
- A bare route (a slash command, or a single word the router resolves to one of those intents) navigates: smooth scroll (instant under reduced motion), hash updated, focus moved to the target section heading, one output line `-> experience`.
- Anything else (a question) is answered inline, grounded and verified as today, with an extra source link "open experience" pointing at the target.
- Deterministic. No LLM, no new dependency, no network beyond /agent-data.json.

## Honesty and safety
- Header copy, refusal copy and the disclaimer rules are unchanged. Targets are fixed in code, never taken from content.
- /terminal stays as the full-screen version and keeps its no-JS fallback.

## Acceptance
- Lighthouse mobile on /: every category >= 95. No horizontal scroll at 320/375/414/768. Reduced motion: no smooth scroll, no blink. No-JS: chips navigate, prompt hidden. `npm test` green, `npm run build` ends with `check-build: ok`.
