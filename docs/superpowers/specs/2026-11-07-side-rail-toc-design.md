# Side-rail table of contents on the multi-project detail pages

Status: approved by Andrian in chat on 2026-11-07 ("yeah go build"). Supersedes the sticky-top-list placement from `2026-11-07-sticky-toc` for wide viewports; the sticky-top list stays for narrow ones.

## Intent

The reader wants the "Projects on this page" index to live at the side of the screen, not in the content column, so it can be used at any point while reading a long write-up. The first implementation made it a sticky block at the top of the column; that is the right behaviour for a narrow screen and the wrong shape for a wide one.

## Design

A fixed rail in the left gutter at wide viewports.

```
 ┌────────────────────────────────────────────────────────────────┐
 │ ← experience                                    andrian than  │
 ├─────────────────┬──────────────────────────────────────────────┤
 │                 │  Hanna Center                                 │
 │  PROJECTS       │  Software Engineer Intern · Dec 2025 – Jun 2026│
 │                 │                                              │
 │  01  Grants     │  ┌────────────────────────────────────────┐  │
 │      Agent      │  │  grants list demo                       │  │
 │  02  IR         │  └────────────────────────────────────────┘  │
 │      Updater    │                                              │
 │  03  Case       │  01  Grants Agent                           │
 │      Note       │  ...                                        │
 │                 │                                              │
 │ (fixed, in the  │                                              │
 │  left gutter)   │                                              │
 └─────────────────┴──────────────────────────────────────────────┘
```

- **Left, not right.** Reading order, and the convention on documentation sites. One line to flip if it changes.
- **1200px and up.** The detail page's content column is 46rem (736px) centred, so below 1200px there is no gutter for a rail to live in.
- **Fixed to the viewport.** It sits in the gutter with nothing scrolling behind it, so it never collides with the prev/next links at the foot of the page.
- **Below 1200px the existing sticky-top list is unchanged** (900–1199px: sticky at the top of the column; below 900px: in flow). It already works well at those widths.
- **Number and title, no down-arrow.** The arrow meant "jump down to it", which the rail now does for every entry.
- **About 200px wide**, so the project titles fit on one line.
- **The rail takes no space in the column.** The list currently occupies ~220px above the first project; as a fixed rail the write-ups start right under the page header.

## Also in this change: the demos say they are mock data

Andrian asked for it explicitly: the demos on these pages run on mock data, because these are internal tools, and the page should say so rather than leave a visitor wondering whether the records are real. One visible line near the top of any page that shows a demo — a small "Sample data" label and a sentence saying the demos run on mock data and that these are internal tools, so there is nothing to sign up for. It must be visible with JavaScript off, clear AA in both themes, and must not appear on a page with no demos.

## Constraints

- CSS only, one file (`src/styles/projects.css`). No JavaScript, no component, no dependency.
- Colors only through the `--color-*` tokens; the rail has no background of its own, so the page's glow and dot grid show through it.
- The rail must not cover the top bar's back link: the bar is 56rem wide while the content column is 46rem, so the bar reaches 80px further into the gutter on each side. The rail therefore starts below the bar rather than beside it.
- Lighthouse mobile on every page ≥ 95 in every category; no horizontal scroll at 320/375/414/768px; `npm test` green; `npm run build` ends with `check-build: ok`.
- The content gate, the agent engine, the build script and the dependencies are untouched.

## Carried over from the previous change

The pages with a TOC use `scroll-behavior: auto`, because a smooth jump raced the `client:visible` demo hydration and landed the reader in the wrong project. That stays: with a permanent rail, landing on the right project matters more, not less.
