import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { countries } from '../data/outside';

const read = (f: string) => fs.readFileSync(path.resolve(process.cwd(), f), 'utf8');

describe('Travel hike photos', () => {
  const src = read('src/components/Travel.astro');
  it('shows only travel photos inside the country details', () => {
    expect(src).toMatch(/photosFor\(c\.name\)\.filter\(\(p\) => p\.kind === 'travel'\)/);
  });
  it('renders hike photos once, in the Trails grid', () => {
    expect(src.match(/hikePhotos\.map/g) ?? []).toHaveLength(1);
  });
  it('renders every trail year, using the shared years helper', () => {
    // The trails list shows the years the data module carries, so a trail with
    // two visit years shows both. The build gate checks the rendered markup
    // against the data module; this pins the rendering itself.
    expect(src).toContain('yearsLabel(t.years)');
    // The single-year field is gone: a trail reads its years as a list.
    expect(src).not.toMatch(/\bt\.year\b/);
  });
});

describe('Outside eyebrows', () => {
  it('Lifting says Strength and Swimming says In the pool, not the section heading', () => {
    expect(read('src/components/Lifting.astro')).toContain('<p class="eyebrow">Strength</p>');
    expect(read('src/components/Swimming.astro')).toContain('<p class="eyebrow">In the pool</p>');
    expect(read('src/components/Lifting.astro')).not.toContain('Outside of work');
    expect(read('src/components/Swimming.astro')).not.toContain('Outside of work');
  });
});

describe('Outside nav link', () => {
  it('sits between About and Resume', () => {
    const bar = read('src/components/TopBar.astro');
    const a = bar.indexOf('data-spy="about"');
    const o = bar.indexOf('<a href="#outside" data-spy="outside">Outside</a>');
    const r = bar.indexOf('profile.contact.resume');
    expect(a).toBeGreaterThan(-1);
    expect(o).toBeGreaterThan(a);
    expect(r).toBeGreaterThan(o);
  });
});

describe('Travel map', () => {
  it('is rendered server-side, not hydrated', () => {
    const src = read('src/components/Travel.astro');
    expect(src).toContain('<TravelMap selected={null} />');
    expect(src).not.toMatch(/<TravelMap[^>]*client:/);
  });
  it('lights the dots of every country with one rule', () => {
    // The browser check measures the lighting for one country, in a real
    // browser. This covers the other eight: the rule has to name every code
    // the data module lists, or a country silently never lights its dots.
    const css = read('src/components/outside.css');
    const rule = css.match(/\.travel:has\(details\[data-c="KOR"\]\[open\]\)[^{]*\{[^}]*\}/);
    expect(rule).toBeTruthy();
    for (const code of countries.map((c) => c.code)) {
      expect(rule![0], code).toContain(`details[data-c="${code}"][open]`);
    }
    expect(rule![0]).toContain('fill: var(--color-fg); r: .72px;');
  });
});

describe('Country list affordance', () => {
  it('draws a chevron that flips when the details is open', () => {
    // The browser check measures that the affordance actually changes between
    // the closed and the open state. This pins the two states it flips
    // between, so a rename of either one is noticed.
    const css = read('src/components/outside.css');
    expect(css).toMatch(/\.country summary::after \{[^}]*content: "↓"/);
    expect(css).toMatch(/\.country\[open\] summary::after \{[^}]*content: "↑"/);
  });
});

describe('Food caption contrast', () => {
  // The caption used to sit on a gradient that reached fully transparent at the
  // top of its box, so the upper lines of a multi-line caption sat over raw
  // photo pixels and their contrast varied per photo. The caption now sits on
  // an opaque card-coloured band, which makes the contrast a property of the
  // theme's token pair and not of the photograph.
  const tokens = read('src/styles/tokens.css');
  const css = read('src/components/outside.css');

  function themeTokens(selector: string): Record<string, string> {
    const at = tokens.indexOf(selector);
    expect(at, selector).toBeGreaterThan(-1);
    const open = tokens.indexOf('{', at);
    const close = tokens.indexOf('}', open);
    const block = tokens.slice(open, close);
    const out: Record<string, string> = {};
    for (const m of block.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)) out[m[1]] = m[2].toLowerCase();
    return out;
  }

  function luminance(hex: string): number {
    const channels = [1, 3, 5]
      .map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
      .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  function contrast(a: string, b: string): number {
    const first = luminance(a);
    const second = luminance(b);
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
  }

  it('puts the caption on an opaque background, not a fading gradient', () => {
    const rule = css.match(/\.food-grid figcaption \{[^}]*\}/)?.[0] ?? '';
    expect(rule).toBeTruthy();
    // A gradient or an alpha colour would put the photograph back behind the
    // words; the background has to be an opaque token.
    expect(rule).not.toMatch(/linear-gradient/);
    expect(rule).not.toMatch(/rgba?\(/);
    expect(rule).toMatch(/background:\s*var\(--color-card\)/);
    expect(rule).toMatch(/color:\s*var\(--color-fg\)/);
  });

  it('keeps the caption at AA against its background in both themes', () => {
    const themes = {
      vapor: themeTokens(':root {'),
      light: themeTokens(':root[data-theme="light"] {'),
    };
    for (const [name, palette] of Object.entries(themes)) {
      const fg = palette['color-fg'];
      const card = palette['color-card'];
      expect(fg, `${name} --color-fg`).toBeTruthy();
      expect(card, `${name} --color-card`).toBeTruthy();
      expect(contrast(fg, card), `${name} caption contrast`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('Browser check', () => {
  // The behaviours that only a browser can show are measured by
  // `npm run browser-check`. This pins that the script is wired up and still
  // covers them, so the check cannot quietly stop running.
  const script = read('scripts/browser-check.mjs');
  const pkg = JSON.parse(read('package.json'));

  it('is wired up as npm run browser-check', () => {
    expect(pkg.scripts['browser-check']).toBe('node scripts/browser-check.mjs');
  });

  it('drives Chrome over the DevTools Protocol with no npm dependency', () => {
    expect(script).toContain('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    expect(script).toContain('new WebSocket(');
    // The project must not gain a browser driver.
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const name of Object.keys(deps)) {
      expect(name, name).not.toMatch(/playwright|puppeteer|selenium|webdriver/);
    }
  });

  it('measures the nav, the map, the country list and the two tall blocks', () => {
    for (const width of [320, 375, 414, 640, 768, 900, 1024, 1280, 1440]) {
      expect(script, String(width)).toContain(String(width));
    }
    // The nav's row count, the horizontal scroll and the wrapped link.
    expect(script).toContain('nav row count');
    expect(script).toContain('horizontal scroll');
    expect(script).toContain('nav link wrapped to two lines');
    // The map's visibility and its lighting.
    expect(script).toContain('the world map is not visible');
    expect(script).toContain('did not light its dots on the map');
    // The country list's disclosure affordance.
    expect(script).toContain('disclosure affordance did not change');
    // The two blocks that fade in on scroll.
    expect(script).toContain('never faded in');
    // The food captions.
    expect(script).toContain('a food caption is clipped by its figure');
  });
});
