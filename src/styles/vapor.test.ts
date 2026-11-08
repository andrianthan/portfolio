import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const vapor = read('src/styles/vapor.css');
const global = read('src/styles/global.css');

/**
 * The nav's labels, taken from the nav itself rather than from a list written
 * out in a test: a renamed or added link has to change the fit model, or the
 * model measures a nav that is not the one the site ships.
 */
function navLabels(): string[] {
  const bar = fs.readFileSync(path.join(process.cwd(), 'src/components/TopBar.astro'), 'utf8');
  const nav = bar.match(/<nav class="vnav"[\s\S]*?<\/nav>/)?.[0] ?? '';
  const labels: string[] = [];
  for (const link of nav.matchAll(/<a\b[^>]*>([^<]*)<\/a>/g)) {
    const text = link[1].trim();
    if (text) labels.push(text.toUpperCase());
  }
  return labels;
}

describe('vapor backdrop', () => {
  it('layers do not follow the cursor and never move by top, left or margin', () => {
    const layers = vapor.match(/\.vb-(neb|far|mid|near)\s*\{[^}]*\}/g) ?? [];
    expect(layers.length).toBe(4);
    for (const rule of layers) {
      expect(rule).not.toMatch(/--nx|--ny|--mx|--my/);
      expect(rule).not.toMatch(/\b(top|left|margin)\s*:/);
    }
  });
  it('keeps the backdrop behind content and out of the pointer path', () => {
    expect(vapor).toMatch(/\.vb\s*\{[^}]*position:\s*fixed[^}]*z-index:\s*-1[^}]*pointer-events:\s*none/);
  });
  it('has a reduced-motion block that stills the layers', () => {
    expect(vapor).toContain('@media (prefers-reduced-motion: reduce)');
  });
  it('loads after global.css (so its rules win ties) and the old cursor field is gone', () => {
    const base = fs.readFileSync(path.join(process.cwd(), 'src/layouts/Base.astro'), 'utf8');
    expect(base).toContain("import '../styles/vapor.css'");
    expect(base.indexOf("import '../styles/global.css'")).toBeGreaterThanOrEqual(0);
    expect(base.indexOf("import '../styles/global.css'")).toBeLessThan(base.indexOf("import '../styles/vapor.css'"));
    expect(global).not.toContain('vapor.css');
    expect(global).not.toContain('body::before');
    expect(global).not.toContain('html:hover body::after');
    expect(global).not.toContain('(hover: none)');
  });
});

describe('vapor scene', () => {
  it('moves the orbit rings with transform only and stills them under reduced motion', () => {
    expect(vapor).toMatch(/@keyframes orbit\s*\{\s*to\s*\{\s*transform:/);
    // later tasks append more reduced-motion blocks, so read all of them
    const rm = vapor.split('@media (prefers-reduced-motion: reduce)').slice(1).join('\n');
    expect(rm).toMatch(/\.ring\s*\{[^}]*animation:\s*none/);
  });
  it('pauses the orbit rings while the hero is off-screen or hidden', () => {
    expect(vapor).toMatch(/\.hero-scene\.is-paused \.ring\s*\{[^}]*animation-play-state:\s*paused/);
  });
  it('keeps the text fallback until the graph has drawn its first frame', () => {
    // the .js class is set in <head>, before the island hydrates, so it cannot be the
    // switch: the fallback holds the centre until the canvas has a frame on it
    expect(vapor).toMatch(/\.ascii\.is-drawn \.ascii-fallback\s*\{\s*display:\s*none/);
    expect(vapor).toMatch(/\.ascii\.is-drawn \.ascii-canvas\s*\{\s*visibility:\s*visible/);
    expect(vapor).not.toMatch(/\.js \.ascii-fallback\s*\{\s*display:\s*none/);
  });
  it('keeps the canvas measurable while it is hidden, so it is never sized from a zero box', () => {
    // a `display: none` canvas has no box to measure: sizing the backing store from
    // that would leave one pixel stretched over the whole graph. the canvas is hidden
    // with `visibility` and taken out of the flow instead.
    const rule = vapor.match(/\.ascii-canvas\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(rule).not.toMatch(/display:\s*none/);
    expect(rule).toMatch(/visibility:\s*hidden/);
    expect(rule).toMatch(/position:\s*absolute/);
    // and it is out of the flow, so the text fallback is not pushed around by it
    expect(rule).toMatch(/inset:\s*0/);
  });
  it('no longer carries the old hero rules', () => {
    expect(global).not.toContain('.avatar');
    expect(global).not.toContain('h1 .w');
    expect(global).not.toContain('@keyframes bi');
  });
  it('is sticky, with matching scroll padding, from 860px up', () => {
    const start = vapor.indexOf('@media (min-width: 860px)');
    expect(start).toBeGreaterThanOrEqual(0);
    let depth = 0, end = vapor.indexOf('{', start);
    for (let k = end; k < vapor.length; k++) {
      if (vapor[k] === '{') depth++;
      else if (vapor[k] === '}' && --depth === 0) { end = k; break; }
    }
    const block = vapor.slice(start, end + 1);
    expect(block).toMatch(/\.vbar\s*\{[^}]*position:\s*sticky/);
    expect(block).toContain('scroll-padding-top');
    expect(global).not.toContain('scroll-padding-top');
  });
  it('keeps chip focus while thinking: aria-disabled, never :disabled', () => {
    expect(vapor).toContain('.intro-chip[aria-disabled="true"]');
    expect(vapor).not.toContain('.intro-chip:disabled');
  });
});

describe('vapor typography', () => {
  it('section headings use the pixel face and no gradient clip', () => {
    const m = vapor.match(/\.sh h2\s*\{[^}]*\}/)?.[0] ?? '';
    expect(m).toContain('var(--font-pixel)');
    expect(m).not.toContain('background-clip: text');
  });
  it('never sets the pixel face below 11px', () => {
    for (const m of vapor.matchAll(/font:\s*\d+\s+(\d+)px[^;]*var\(--font-pixel\)/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(11);
  });
  it('keeps paragraphs on the readable sans', () => {
    expect(vapor).not.toMatch(/(^|\n)\s*(p|\.prose)\s*\{[^}]*var\(--font-pixel\)/);
  });
});

describe('vapor backdrop-filter prefix', () => {
  it('keeps -webkit-backdrop-filter only inside @supports (the minifier merges prefixed pairs)', () => {
    const outside = vapor.replace(/@supports[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
    expect(outside).not.toContain('-webkit-backdrop-filter');
    expect(vapor).toMatch(/@supports\s*\(-webkit-backdrop-filter:\s*blur\(1px\)\)/);
  });
});

describe('vapor backdrop motion', () => {
  const base = fs.readFileSync(path.join(process.cwd(), 'src/layouts/Base.astro'), 'utf8');

  it('drifts each star layer on its ::before, transform only, one tile per loop', () => {
    for (const layer of ['far', 'mid', 'near']) {
      const m = vapor.match(new RegExp(`\\.vb-${layer}::before\\s*\\{[^}]*\\}`))?.[0] ?? '';
      expect(m, layer).toContain('background-image');
      expect(m, layer).toMatch(/animation:\s*vb-drift\s+var\(--dur\)\s+linear\s+infinite/);
      expect(m, layer).toContain('calc(100% + var(--tw))');
      const own = vapor.match(new RegExp(`\\.vb-${layer}\\s*\\{[^}]*\\}`))?.[0] ?? '';
      expect(own, layer).toMatch(/--tw:\s*\d+px/);
      expect(own, layer).toMatch(/--th:\s*\d+px/);
      expect(own, layer).toMatch(/--dur:\s*\d+s/);
      expect(own, layer).not.toContain('background-image');
    }
    const kf = vapor.match(/@keyframes vb-drift\s*\{[^}]*\{[^}]*\}[^}]*\}/)?.[0] ?? '';
    expect(kf).toContain('transform: translate3d(calc(var(--tw) * -1), calc(var(--th) * -1), 0)');
    expect(kf).not.toMatch(/\b(top|left|margin|background-position)\b/);
  });

  it('keeps the star tile sizes and the --tw/--th values identical (a seamless loop)', () => {
    for (const [layer, w, h] of [['far', 173, 157], ['mid', 241, 223], ['near', 331, 307]] as const) {
      const own = vapor.match(new RegExp(`\\.vb-${layer}\\s*\\{[^}]*\\}`))?.[0] ?? '';
      const before = vapor.match(new RegExp(`\\.vb-${layer}::before\\s*\\{[^}]*\\}`))?.[0] ?? '';
      expect(own).toContain(`--tw: ${w}px`);
      expect(own).toContain(`--th: ${h}px`);
      expect(before).toContain(`background-size: ${w}px ${h}px`);
    }
  });

  it('adds two shooting stars that animate transform and opacity only', () => {
    expect(base.match(/class="vb-streak vb-streak-[12]"/g)?.length).toBe(2);
    const kf = vapor.match(/@keyframes vb-streak\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(kf).toContain('opacity');
    expect(kf).toContain('transform');
    expect(kf).not.toMatch(/\b(top|left|right|bottom|margin|width|height)\s*:/);
  });

  it('positions the shooting stars with a selector that outranks .vb i.vb-streak and .vb i', () => {
    for (const n of [1, 2]) {
      expect(vapor).toMatch(new RegExp('\\.vb i\\.vb-streak-' + n + '\\s*\\{[^}]*top:\\s*\\d+%[^}]*left:\\s*\\d+%'));
    }
    expect(vapor).not.toMatch(/(^|[\s}])\.vb-streak-[12]\s*\{/);
  });

  it('stops all backdrop motion under reduced motion', () => {
    const rm = vapor.split('@media (prefers-reduced-motion: reduce)').slice(1).join('\n');
    expect(rm).toMatch(/\.vb i::before\s*\{[^}]*animation:\s*none/);
    expect(rm).toMatch(/\.vb i\.vb-streak\s*\{[^}]*display:\s*none/);
  });
});

describe('mobile nav layout', () => {
  function mediaBlock(header: string): string {
    const start = vapor.indexOf(header);
    expect(start, header).toBeGreaterThan(-1);
    const open = vapor.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < vapor.length; i++) {
      if (vapor[i] === '{') depth++;
      else if (vapor[i] === '}' && --depth === 0) return vapor.slice(open + 1, i);
    }
    throw new Error('unterminated block');
  }

  it('is a fixed three-column grid on small screens, so a late font swap cannot change the row count', () => {
    const block = mediaBlock('@media (max-width: 639px)');
    const nav = block.match(/\.vnav\s*\{[^}]*\}/)?.[0] ?? '';
    expect(nav).toContain('display: grid');
    expect(nav).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(nav).toContain('justify-items: center');
    const link = block.match(/\.vnav a\s*\{[^}]*\}/)?.[0] ?? '';
    expect(link).toContain('white-space: nowrap');
  });

  it('lays the nav links out as exactly two rows of three, at 320, 375 and 414 px', () => {
    const bar = fs.readFileSync(path.join(process.cwd(), 'src/components/TopBar.astro'), 'utf8');
    const nav = bar.match(/<nav class="vnav"[\s\S]*?<\/nav>/)?.[0] ?? '';
    // The links are the only children of the nav, so nothing else takes a cell.
    const cells = nav.match(/<a /g) ?? [];
    expect(cells).toHaveLength(navLabels().length);

    // The small-screen block is the one that applies at 320, 375 and 414 px.
    const block = mediaBlock('@media (max-width: 639px)');
    const rule = block.match(/\.vnav\s*\{[^}]*\}/)?.[0] ?? '';
    const columns = Number(rule.match(/grid-template-columns:\s*repeat\((\d+),[^)]*\)/)?.[1]);
    expect(columns).toBe(3);

    // A fixed column count is what makes the row count fixed: the cells in
    // three columns are two rows at every width, and a late font swap cannot
    // change it.
    expect(cells.length % columns).toBe(0);
    expect(cells.length / columns).toBe(2);
  });
});

describe('header nav row count', () => {
  function mediaBlock(header: string): string {
    const start = vapor.indexOf(header);
    expect(start, header).toBeGreaterThan(-1);
    const open = vapor.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < vapor.length; i++) {
      if (vapor[i] === '{') depth++;
      else if (vapor[i] === '}' && --depth === 0) return vapor.slice(open + 1, i);
    }
    throw new Error('unterminated block');
  }

  const navCells = () => {
    const bar = fs.readFileSync(path.join(process.cwd(), 'src/components/TopBar.astro'), 'utf8');
    const nav = bar.match(/<nav class="vnav"[\s\S]*?<\/nav>/)?.[0] ?? '';
    return (nav.match(/<a /g) ?? []).length;
  };

  it('keeps the six desktop links on one row by never wrapping them', () => {
    // The desktop nav is a flex row. `nowrap` is what pins the row count: with
    // wrapping allowed, a seventh link silently pushes the last one onto a
    // second line of the sticky header.
    const block = mediaBlock('@media (min-width: 900px)');
    const nav = block.match(/\.vnav\s*\{[^}]*\}/)?.[0] ?? '';
    expect(nav).toContain('display: flex');
    expect(nav).toContain('flex-wrap: nowrap');
    expect(navCells()).toBe(navLabels().length);
  });

  it('gives the nav its own full-width row below 900 px, so it is never more than two rows', () => {
    // Between the mobile breakpoint and the desktop one, the nav spans the
    // whole header and is a fixed three-column grid: six cells in three
    // columns are exactly two rows, whatever the font metrics are.
    const nav = vapor.match(/\.vnav\s*\{[^}]*\}/)?.[0] ?? '';
    expect(nav).toContain('display: grid');
    expect(nav).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(nav).toContain('grid-column: 1 / -1');
    const columns = Number(nav.match(/grid-template-columns:\s*repeat\((\d+),[^)]*\)/)?.[1]);
    expect(columns).toBe(3);
    expect(navCells() % columns).toBe(0);
    expect(navCells() / columns).toBe(2);
  });

  it('keeps the scroll padding tall enough for the two-row sticky bar below 900 px', () => {
    // The bar is sticky from 860px, but it is two rows tall until 900px, so the
    // anchor scroll has to clear all of it there or a section heading lands
    // underneath the bar.
    const block = mediaBlock('@media (min-width: 860px) and (max-width: 899px)');
    expect(block).toMatch(/html\s*\{[^}]*scroll-padding-top:\s*1\d\dpx/);
  });

  it('keeps the desktop nav narrow enough to fit the header track it is given', () => {
    // The header is capped at --measure (896px) and its padding, the brand, the
    // theme toggle and the two column gaps take 301px of that, leaving a 563px
    // track for the nav. The six links have to fit inside it or they wrap.
    const tokens = read('src/styles/tokens.css');
    const measure = Number(tokens.match(/--measure:\s*([\d.]+)rem/)?.[1] ?? 0) * 16;
    const spaceMd = Number(tokens.match(/--space-md:\s*(\d+)px/)?.[1] ?? 0);
    const bar = vapor.match(/\.vbar-in\s*\{[^}]*\}/)?.[0] ?? '';
    // The header's column gap is the second value of `gap` when two are given.
    const gapValue = bar.match(/gap:\s*([^;]+);/)?.[1] ?? '';
    const gapParts = gapValue.split(/\s+/);
    const gap = gapParts.length === 2 && gapParts[1].includes('--space-md') ? spaceMd : Number(gapParts[0]);

    // The track is the measure minus the bar padding, the brand, the toggle and
    // the gaps. These are the sizes the built header measures today.
    const track = measure - 2 * spaceMd - 131 - 138 - 2 * gap;
    expect(track).toBe(563);

    // The nav's own width: the six link boxes plus the gaps between them.
    const desktop = mediaBlock('@media (min-width: 900px)');
    const navRule = desktop.match(/\.vnav\s*\{[^}]*\}/)?.[0] ?? '';
    const desktopLink = desktop.match(/\.vnav a\s*\{[^}]*\}/)?.[0] ?? '';
    const baseLink = vapor.match(/\.vnav a\s*\{[^}]*\}/)?.[0] ?? '';
    // The nav's own gap between links: the second value of `gap` when two are
    // given, the only one when a single value is given.
    const navGapParts = (navRule.match(/gap:\s*([^;]+);/)?.[1] ?? '').split(/\s+/);
    const navGap = Number((navGapParts[navGapParts.length - 1] ?? '').replace('px', ''));
    // The desktop block overrides the padding and the tracking; the font size
    // is set once, on the base rule.
    const padX = Number(desktopLink.match(/padding:\s*[\d.]+px\s+([\d.]+)px/)?.[1] ?? 0);
    const fontSize = Number(baseLink.match(/font:\s*400\s*(\d+)px/)?.[1] ?? 0);
    const tracking = Number(desktopLink.match(/letter-spacing:\s*([\d.]+)em/)?.[1] ?? 0);

    // Every label is uppercase pixel text: a monospace advance plus the
    // tracking. The labels come from the nav itself, not from a list written
    // out here, so a renamed or added link is measured too.
    const labels = navLabels();
    expect(labels.length).toBeGreaterThan(0);
    const chars = labels.reduce((n, l) => n + l.length, 0);
    // 406px of text at .14em tracking was measured on the built site for these
    // forty characters; the advance alone is that minus the tracking.
    const advance = (406 - chars * 0.14 * 12) / chars;
    const text = chars * (advance + tracking * fontSize);
    const boxes = labels.length * (2 * padX + 2);
    const need = text + boxes + (labels.length - 1) * navGap;

    expect(need).toBeLessThanOrEqual(track);
    // ...and with room to spare, so a font swap cannot push it over.
    expect(track - need).toBeGreaterThanOrEqual(4);
  });
});

describe('personal automation cards', () => {
  it('is two columns on wide screens and one column below 640px', () => {
    expect(vapor).toMatch(/\.auto-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
    // `vapor` is comment-stripped, so the block marker is gone; scope to the
    // whole stylesheet instead of a comment-delimited slice.
    expect(vapor).toMatch(/@media \(max-width: 639px\)\s*\{[^}]*\.auto-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  });
});

describe('simpler chat box', () => {
  it('collapses the empty log instead of reserving space for it', () => {
    expect(vapor).toMatch(/\.intro-out:empty\s*\{[^}]*(display:\s*none|max-height:\s*0|height:\s*0)/);
  });
  it('hides the route row once JavaScript is on, but keeps it for no-JS', () => {
    expect(vapor).toMatch(/\.js \.topics\s*\{\s*display:\s*none/);
  });
  it('lays the chips out on one row with the refresh button, wrapping their text instead of cutting it', () => {
    const rule = vapor.match(/\.js \.intro-suggest\s*\{[^}]*\}/)?.[0] ?? '';
    expect(rule).toContain('display: grid');
    expect(vapor).toMatch(/\.intro-suggest\s*\{[^}]*grid-template-columns:\s*auto repeat\(3, minmax\(0, 1fr\)\)/);
    expect(vapor).not.toMatch(/\.intro-chip[^{]*\{[^}]*text-overflow:\s*ellipsis/);
  });
  it('drops the old placeholder text rule from global.css', () => {
    expect(global).not.toContain('Answers show up here');
  });
});
