# Tesla page: the Dashboard section closes with design considerations, not speedups

Status: pending approval.

## Why

The Dashboard section's Impact block reads like a benchmark report: "over 10x faster",
"over 20x faster", "about 50x faster", "about 40x less data", "about 5x smaller",
"about 6x faster". Ratios like these are the one place on the page that reads like a
press release. The rest of the page is built the opposite way: every claim states its
basis, "measured (local)", "planner-reported", "an estimate", "not booked", "not
measured".

Andrian's call: that slot should carry the general things he had to keep in mind while
building the dashboard, not measurements. He named one of them himself: integrated
backend loading for the UI.

Scope for now: the Dashboard section only. The other six sections keep their Impact
blocks as they are, including the uncommitted rounding in Part Summary and Ask SDP.

## Where the speedups came from

The ratios are uncommitted work, ported into the working tree from `origin/main` commit
`3421507` ("content: round Tesla page figures to relative speedups, drop prod detail",
2026-11-16). That commit replaced absolute measurements with ratios across the page
and cut it from 86 distinct numeric tokens to 14. `HEAD` still has the raw numbers.
This change does not reinstate them: the Dashboard section keeps no figures at all.

## What replaces it

`### Impact` in the Dashboard section becomes `### What I kept in mind`, and holds the
design considerations that governed the work. No numbers, no ratios.

The section reads at a higher altitude than the Architecture block above it. Architecture
is the inventory of mechanisms; this is the list of what mattered. The overlap is
thematic, not verbatim.

- **One app, one sign-in, one navigation.** Planners were clicking between eight
  dashboards with different layouts and filters. Making them one tool was the whole
  point, so every screen had to feel like part of the same tool.
- **The backend had to load data in a way the UI could use directly.** Data was fetched
  and shaped for the screen that shows it, not handed to the front end to sort out.
- **Nothing a planner did should be able to damage data.** A bad query can be slow; it
  should never be able to change a row.
- **Stale data was worse than no data.** A number that looks current and is not is how a
  planning decision goes wrong, so every path to the screen had to know how fresh the
  data was.
- **Nothing was allowed to grow without a bound.** Connections were pooled, one shared
  DuckDB connection ran under a memory limit, a semaphore capped how much warmed at
  once, and a ceiling stopped hot-part warming before the process got too large. Memory
  still climbs when every deep-dive tab is opened on a cold part, so it is watched
  against that ceiling.
- **Other people had to be able to add to it.** A new tab is a manifest and one file, so
  the next person adds files instead of learning the shell. The like-part tab,
  contributed by a teammate, is the first piece built on the shell from outside, and the
  route table is byte-identical to before, so none of the existing paths moved.
- **A broken tab could not be allowed to take the app down.** A tab that fails to import
  is skipped and reported, and any tab can be turned off without a deploy.

## Where the surviving facts go

The current Impact block has four bullets that are not speedups. They are handled like
this:

- **Scalability**, including the teammate's like-part tab, folds into the considerations
  list as the evidence for the extensibility point.
- **Nothing broke**, the route table being byte-identical, folds into the same bullet.
- **Cost to watch**, memory climbing on a cold part, folds into the bounded-resources
  bullet.
- **A smaller shell**, the main app file being about 5x smaller, is dropped. The point it
  made, that adding a tab no longer means editing a huge file, is already carried by
  the extensibility bullet.

No outcome fact is lost that is worth keeping.

## Tests

`src/content/work/tesla.test.ts` changes in three places.

1. "gives every section its subsections in order": the Dashboard section's third
   subsection is `What I kept in mind`; the other six keep `Impact`.
2. "labels every impact claim with a basis word": there are now six Impact blocks, not
   seven. Each of the six still needs a basis label, and they still have them.
3. New: "states no figure in the dashboard considerations". The new section must contain
   no numeric token. This is the guard that keeps the preference from drifting back.

`src/content/work/tesla-facts.ts`: the `40` and `5` that the uncommitted rounding added
to `ALLOWED_NUMBERS` were there for the speedup bullets being removed. They go back out
if nothing else on the page uses them, which leaves the file matching `HEAD`.

## Unchanged

- The other six sections' Impact blocks: Part Summary, Ask SDP, Forecast Lab, Campaigns,
  Slideshow generation, Admin.
- The Architecture blocks, the eight architecture figures, the Problem blocks, the
  frontmatter, the summary line.
- The number allowlist beyond the two tokens named above.
- The other work pages: Micron, AKPsi, Blue Dome, Hanna Center.

## Acceptance

- `npm test` is green.
- `npm run build` ends with `check-build: ok`.
- The Dashboard section holds no numeric token, so the page's distinct numeric tokens
  drop from 14 to 8.
- The new test fails if a figure is added back to the considerations section.
