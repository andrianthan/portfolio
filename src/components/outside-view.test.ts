import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (f: string) => fs.readFileSync(path.resolve(process.cwd(), f), 'utf8');

describe('Travel hike photos', () => {
  const src = read('src/components/Travel.astro');
  it('shows only travel photos inside the country details', () => {
    expect(src).toMatch(/photosFor\(c\.name\)\.filter\(\(p\) => p\.kind === 'travel'\)/);
  });
  it('renders hike photos once, in the Trails grid', () => {
    expect(src.match(/hikePhotos\.map/g) ?? []).toHaveLength(1);
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
  it('lights the dots of the nine countries with one rule', () => {
    const css = read('src/components/outside.css');
    const rule = css.match(/\.travel:has\(details\[data-c="KOR"\]\[open\]\)[^{]*\{[^}]*\}/);
    expect(rule).toBeTruthy();
    for (const code of ['KOR', 'JPN', 'VNM', 'TWN', 'THA', 'MEX', 'SGP', 'MYS', 'IDN']) {
      expect(rule![0]).toContain(`details[data-c="${code}"][open]`);
    }
    expect(rule![0]).toContain('fill: var(--color-fg); r: .72px;');
  });
});

describe('Country list affordance', () => {
  it('draws a chevron that flips when the details is open', () => {
    const css = read('src/components/outside.css');
    expect(css).toMatch(/\.country summary::after \{[^}]*content: "↓"/);
    expect(css).toMatch(/\.country\[open\] summary::after \{[^}]*content: "↑"/);
  });
});
