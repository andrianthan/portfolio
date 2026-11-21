# Tesla page: the Dashboard section closes with design considerations, not speedups

Status: implemented 2026-11-21. Shipped in `f8bd2e7` and the follow-up that answered
the review.

## Why

The Dashboard section's Impact block read like a benchmark report: "over 10x faster",
"over 20x faster", "about 50x faster", "about 40x less data", "about 5x smaller",
"about 6x faster". Ratios like these are the one place on the page that reads like a
press release. The rest of the page is built the opposite way: every claim states its
basis, "measured (local)", "planner-reported", "an estimate", "not booked", "not
measured".

Andrian's call: that slot should carry the general things he had to keep in mind while
building the dashboard, not measurements. He named one of them himself: integrated
backend loading for the UI.

Scope: the Dashboard section only. The other six sections keep their Impact blocks,
including the ratio wording in Part Summary and Ask SDP.

## Where the speedups came from

The ratios were uncommitted work in the working tree, ported from `origin/main` commit
`3421507` ("content: round Tesla page figures to relative speedups, drop prod detail",
2026-11-16). That commit replaced absolute measurements with ratios across the page and
cut it from 86 distinct numeric tokens to 14. `HEAD` still had the raw numbers. This
change does not reinstate them: the Dashboard section keeps no figures at all.

## What replaces it

`### Impact` in the Dashboard section becomes `### What I kept in mind`, and holds the
design considerations that governed the work. No figures, in digits or in words.

The section states what had to be true, and the Architecture block above it states how
each of those was built. The first draft of this section failed that test: five of its
seven bullets restated the Architecture block almost verbatim, and a review caught it.
The rule for the rewrite was that no bullet may repeat a mechanism that the
Architecture block already spells out.

- **The backend had to load data in a way the UI could use directly.** Data was fetched and shaped for the screen that shows it, not handed to the front end to sort out.
- **The opening screen had to be worth waiting for.** A slow open would have sent planners back to the dashboards they already knew.
- **What a planner does must not change the data.** The numbers drive planning calls, so the app only ever reads them.
- **Stale data is worse than no data.** A number that looks current and is not is how a planning decision goes wrong, so freshness had to be known on every path to a screen.
- **The next person had to be able to add to it.** The like-part tab, contributed by a teammate, now runs on the shell, and the route table is byte-identical to before, so none of the existing paths moved.
- **Memory is watched against a ceiling.** It climbs when every deep-dive tab is opened on a cold part.

## Where the surviving facts go

The old Impact block had four bullets that were not speedups. They are handled like
this:

- **Scalability**, including the teammate's like-part tab, folds into the extensibility
  point, which now carries the proof instead of repeating the mechanism.
- **Nothing broke**, the route table being byte-identical, folds into the same bullet.
- **Cost to watch**, memory climbing on a cold part, is the memory bullet.
- **A smaller shell**, the main app file being about 5x smaller, is dropped. The point
  it made, that adding a tab no longer means editing a huge file, is carried by the
  extensibility bullet.

Part Summary's Impact pointed at "the measured numbers in the Dashboard section above".
That pointer dangles once the Dashboard holds no numbers, so it now states the fact
itself: going back to the dashboard makes no network requests at all, measured (local).

## The GitHub link

Andrian asked for the GitHub contact link to go as well. It was in three places: the
top bar icon, the command menu item, and the agent snapshot's contact line. All three
are gone, and `ContactLinks` no longer carries the field.

While editing those files, the dead `profile.contact.resume` reference was found:
commit `42396cf` removed the resume from the site but left the footer and the command
menu reading it, so every page shipped `<a>Resume</a>` with no href and the menu had a
Resume row that did nothing. Both are gone. `public/resume.pdf` does not exist, so the
broken-link check could never have caught it.

`src/agent/route.ts` also treated "github" as a contact keyword, so "where's your
GitHub" routed to contact and answered with a LinkedIn URL. The keyword is dropped.

## Tests

`src/content/work/tesla.test.ts`:

1. "gives every section its subsections in order": the Dashboard section's third
   subsection is `What I kept in mind`; the other six keep `Impact`.
2. "labels every impact claim with a basis word": there are now six Impact blocks, not
   seven. Each of the six still needs a basis label, and they still have them.
3. "states no figure in the dashboard considerations": the new section must contain no
   numeric token and no number word. This is the guard that keeps the preference from
   drifting back.
4. "keeps the facts file and the page in step": `ALLOWED_NUMBERS` and the numbers the
   page states are the same set. The allowlist had drifted to about 130 entries the
   page no longer used, and an entry left behind would have let a figure back onto the
   page without anyone adding it on purpose. It now holds the eleven numbers the page
   states.

`src/content/work/tesla-facts.ts`: `ALLOWED_NUMBERS` is pruned to the eleven live
tokens: `10, 12, 2, 25%, 26, 3, 32%, 5, 50, 50%, 90`.

The agent fixture (`src/agent/fixtures/snapshot.json`) was stale for 17 of its 30
chunks, most of them unrelated to this change, and is regenerated. The number
assertions in `src/agent/respond.test.ts` and `src/agent/run.test.ts` are now checked
against the content the site actually serves.

## Unchanged

- The other six sections' Impact blocks: Part Summary, Ask SDP, Forecast Lab, Campaigns,
  Slideshow generation, Admin.
- The Architecture blocks, the eight architecture figures, the Problem blocks, the
  frontmatter, the summary line.
- The other work pages: Micron, AKPsi, Blue Dome, Hanna Center.

## Acceptance

- `npm test` is green.
- `npm run build` ends with `check-build: ok`.
- The Dashboard section holds no numeric token and no number word.
- The page's distinct numeric tokens are the eleven the allowlist holds.
- A figure added back to the considerations section fails the test.
