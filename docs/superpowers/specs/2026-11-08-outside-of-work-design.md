# Outside of work section — design

Status: draft for Andrian's review (2026-11-08). Branch `feat/vapor-theme`.
Nothing here merges or pushes without his explicit instruction.

## Goal

"Outside of work" becomes its own section of the home page, with its own nav
link. It holds what is now inside About (Lifting, Swimming) plus three new
blocks: where Andrian has travelled, where he has hiked, and food photos.
About keeps only the bio.

## Structure

- New top-level section `#outside`, after About and before the footer.
  Component `src/components/Outside.astro`; eyebrow "Get to know me", heading
  "Outside of work".
- `About.astro` loses `<Lifting />` and `<Swimming />`; `index.astro` renders
  `<Outside />` after `<About />`.
- Order inside the section: **Lifting, Swimming, Travel and hiking, Food.**
  (Achievements first, the lifestyle blocks after.)
- Nav: `TopBar.astro` gains `Outside` (`href="#outside"`, `data-spy="outside"`)
  between About and Resume. The mobile nav is a fixed three-column grid, so six
  items are exactly two rows. `scrollspy` and `nav-spy.ts` learn the new id; the
  existing scroll-spy and nav tests are extended, not loosened.

## Travel and hiking block

**Headline:** "9 countries" and the US states, from Andrian's own list:
Japan, South Korea, Taiwan, Vietnam, Indonesia, Malaysia, Singapore, Thailand,
Mexico; California, Colorado, Florida, New York, Oregon, Washington.

**World map (his choice, option b):** a dot-style world map in the space theme.
Land is a grid of small dots; visited countries are lit violet, the rest dim.
The dots are generated once by `scripts/build-world-dots.mjs` from Natural
Earth data into `src/data/world-dots.json` (committed, so no map library ships
to the browser). The map is decorative (`aria-hidden`); the text list below it
carries the same information.

**Country list (the accessible core).** One entry per country, a native
`<details>` so it works without JavaScript, each showing its years and its
areas as chips. With JavaScript, opening a country also lights it on the map
and shows its approved photos. Data lives in `src/data/outside.ts`:

| Country | Areas | Years |
|---|---|---|
| South Korea | Seoul, Busan, Incheon, Jeju | 2024 |
| Japan | Tokyo, Osaka, Kyoto, Kamakura, Hakone, Lake Kawaguchi (Mt. Fuji) | 2023, 2024, 2026 |
| Vietnam | Ho Chi Minh City, Hanoi, Ha Long Bay, Mekong Delta | 2024 |
| Taiwan | Taipei; Jiufen, Shifen and Yehliu | 2024 |
| Thailand | Bangkok, Koh Tao, Koh Phangan, Koh Lanta, Chumphon | 2023, 2024 |
| Mexico | Riviera Maya | 2025 |
| Singapore | Singapore | 2023 |
| Malaysia | Kuala Lumpur | 2023 |
| Indonesia | (no photo data) | none shown |

The years and areas come from Andrian's Apple Photos map, read locally. Places
and years with no photo evidence (Indonesia, Florida, Washington, Oregon) are
listed without a year.

**Hiking** sits in the same block as a "Trails" list, each trail with its place
and a year only where known: Hwangnyeongsan (Busan, 2024), Jeju Island trail
(2024), Ha Long Bay (2024), Rocky Mountains (Colorado, 2025), Point Lobos
(2025, 2026), Hawk Hill (Marin Headlands, 2024), Mount Tamalpais (no year), Point Reyes, Mission Peak,
Castle Rock State Park, Pinnacles National Park, Yosemite. No distances or
elevation.

## Photos

Only photos Andrian approved appear. He approved 31 photos from a local review
sheet (codes below) and sent 15 food photos directly. Four of the 31 are food
(`jp-tokyo-03`, `jp-osaka-01`, `jp-osaka-06`, `jp-kyoto-01`) and go in the Food
gallery, so the section has 27 hike and travel photos and 19 food photos, 46 in
all, 2.9 MB.

Approved travel and hike photos:
`hwangnyeongsan-01 pointlobos-01 pointlobos-02 rockies-01..06 marin-01
jp-tokyo-03 jp-tokyo-08 tw-taipei-02 tw-taipei-07 jp-osaka-01 jp-osaka-05
jp-osaka-06 jp-kyoto-01 jp-hakone-06 jp-fuji-02 jp-fuji-04 jp-fuji-05
vn-hcmc-04 vn-halong-01 vn-halong-02 th-bangkok-01 th-bangkok-03 th-kotao-01
th-kotao-02 sg-02 sg-08`. Every other candidate is rejected and is not used.

Pipeline (a one-off run outside the repo, because it reads Andrian's private
Photos library; its output, `public/outside/*.webp` and
`src/data/outside-photos.json`, is committed):

- Source is the largest local preview of each approved photo; the code-to-file
  map is rebuilt from the Photos library the same way the review sheet was.
- Re-encode to WebP, longest edge 800 px, quality 72, upright. **All
  metadata is stripped, including GPS.** A test reads every file under
  `public/outside/` and fails if it contains an Exif or GPS segment.
- Food photos are cropped to the dish where other people's hands or torsos
  show. No faces of other people are published.
- Each image has a descriptive `alt`, explicit `width` and `height` (no layout
  shift), `loading="lazy"` and `decoding="async"`.

Photos with no approval (Point Reyes, Mission Peak, Castle Rock, Pinnacles,
Yosemite, Korea cities) stay text-only until Andrian approves some.

## Food block

A gallery of the 19 food photos, each with a caption of dish, place and year
taken from the photo's own date and location tags, for example "Pad Thai and
mango sticky rice, Koh Tao, Thailand, 2024". Captions are drafted by Claude and
confirmed by Andrian (see Open items). The gallery is a CSS grid, two columns on
phones, three or four on wide screens; it reserves its space so nothing shifts.

## Agent

The chat agent's snapshot gets one `about:outside` chunk built from the same
`outside.ts` data, so "where have you travelled?" and "do you hike?" are
answered from the page's own facts. Tests that pin the chunk list are updated in
the same commit. No agent code changes.

## Constraints kept

- Lighthouse 95 or higher on mobile for `/`; total image weight for the section
  at most 3 MB, all lazy.
- No horizontal scroll from 320 px up; AA contrast in both themes.
- Motion respects `prefers-reduced-motion`; the map is static, nothing animates
  off-screen.
- All current tests pass; build ends `check-build: ok`.
- No GPS or other metadata in any published image. No location data leaves the
  machine: the Photos database was only ever read locally.

## Testing

Pure-function and data tests for `outside.ts` (every approved code resolves to a
file, every country has a year or an explicit "no year", the headline counts
match the data). The metadata-strip test above. SSR markup tests for the section
and the country list. Scroll-spy and nav tests for the new link. A browser
check at 320, 375 and 1440 px in both themes, as with every layout change on
this branch.

## Risks

- **Weight.** 46 photos can bloat the page. Mitigation: WebP at 800 px,
  lazy loading, a hard 3 MB total budget enforced by a test (currently 2.9 MB).
- **Wrong place or year.** Dates and places come from tags. Mitigation: Andrian
  reviews the captions before the section is cleared.
- **Privacy.** Location metadata and bystanders. Mitigation: metadata stripped
  and tested, crops, approval only.

## Out of scope

Photos Andrian has not approved, a rotating 3D globe, comments or maps with
pins at street level, any change to Lifting or Swimming content, merging or
pushing.

## Open items

- **Food captions.** Drafted from tags; the sushi photo is tagged Seoul. Confirm
  or correct each.
- **State list.** California and Colorado come from his photos, the others from
  his own list; Nevada (Lake Tahoe) is left off.
- **Years** are deliberately left off for Indonesia, Florida, Washington, Oregon,
  Point Reyes, Mission Peak, Castle Rock, Pinnacles, Yosemite and Mount
  Tamalpais, by his decision; they can be added later in `outside.ts`.
