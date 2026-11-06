# Portfolio

Static portfolio site built with Astro, using content collections for work history and projects.

## Commands

- `npm run dev` starts the dev server.
- `npm run build` builds to `dist/` and then runs the post-build safety check (`scripts/check-build.mjs`).
- `npm test` runs the unit tests (vitest).

## Content gate

- Each entry has `listed` (show on the home page) and `cleared` (generate a detail page); `cleared` defaults to `false`.
- The build fails if any output contains a `[to confirm` marker or the body of an uncleared entry.
- The build also fails on a built route for an uncleared entry, a broken internal link, or an `<img>` without `alt`.

## Where content lives

- `src/content/work/` for roles.
- `src/content/projects/` for projects.
