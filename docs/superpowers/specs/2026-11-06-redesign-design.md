# Site redesign: chat-first, open and atmospheric

Status: approved by Andrian in chat on 2026-11-06 ("go"). Reference feel: pszostak.pl (atmosphere, centered chat hero, gradient headings), without its pill shapes and without bento boxes. The engine, routing, thinking animation and all honesty rules from the earlier specs are unchanged.

## Why
The current home page reads as plain and clunky: a stack of loosely related parts (intro, pill, buttons, graph, stats) in a narrow left-aligned column, mixed mono and sans type, thin borders and pills everywhere.

## Look
- Atmosphere: near-black background (`#0a0a0f`) with a soft purple radial glow behind the hero and a faint dot grid. Light theme stays (soft lavender-white); the theme still follows the system unless the visitor toggles.
- One sans (Inter) for everything visible; JetBrains Mono only inside the chat card and small labels.
- Display type uses a purple-to-pink gradient on the name and section titles. Body text stays plain high-contrast.
- No pills. Nav is plain text links with an underline on hover. Buttons and topic chips are rounded rectangles (8-10px radius) or plain text with an arrow.
- Open, airy sections: no boxed cards, no hairline-bordered grids on the home page.

## Structure
1. Top bar: brand, text links (Experience, Projects, About), a Resume button (rectangle), theme toggle. The text links hide under 640px.
2. Hero, centered: round headshot, "Hi, I'm Andrian." with the name in gradient, a plain status line ("Graduating Spring 2027 · San Jose, CA"), then a glass chat card: greeting line, reserved log area, topic links (Experience, Projects, About, Contact), prompt. Under the card: "Open the full terminal →".
3. Stats: one centered row of large gradient numbers, no borders.
4. Experience: centered eyebrow + gradient title; the existing timeline restyled open (logos kept, no row borders, no "current" pill).
5. Projects: centered eyebrow + title; open rows (name, tag, one line, arrow). The "screenshot" placeholder boxes are removed.
6. About: photo beside the paragraphs, no frame box.
7. How this site answers: eyebrow + title, one honest paragraph (rules and retrieval, no LLM, every number verified), the agent graph, link to /terminal.
8. Footer: Email, LinkedIn, GitHub, Resume.

## Unchanged
- Agent engine, routing (#experience, #projects, #about, #contact), typo tolerance, thinking animation, quiet refusals, /terminal page and its no-JS fallback, content gate, build script, vercel.json, dependencies.
- Detail pages (/work, /projects) inherit the new tokens and keep their structure.

## Acceptance
- Lighthouse mobile on /: every category >= 95. No horizontal scroll at 320/375/414/768. Reduced motion: no animation, instant scroll. No-JS: topic links and nav work, prompt hidden. Contrast AA for text in both themes. `npm test` green, `npm run build` ends with `check-build: ok`.
