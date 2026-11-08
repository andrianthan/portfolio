import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const vapor = read('src/styles/vapor.css');
const global = read('src/styles/global.css');

describe('vapor backdrop', () => {
  it('moves layers with transform only', () => {
    const layers = vapor.match(/\.vb-(neb|far|mid|near)\s*\{[^}]*\}/g) ?? [];
    expect(layers.length).toBe(4);
    for (const rule of layers) {
      expect(rule).toContain('transform:');
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
  it('is sticky, with matching scroll padding, only where the bar is one row tall', () => {
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
