import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  photos, countries, states, trails, headline, photosFor, foodPhotos, hikePhotos, yearsLabel,
} from './outside';
import dots from './world-dots.json';

const root = process.cwd();
const file = (id: string) => join(root, 'public', 'outside', `${id}.webp`);

describe('headline and countries', () => {
  it('states the counts', () => {
    expect(headline).toBe('9 countries · 6 states');
    expect(headline).toBe(`${countries.length} countries · ${states.length} states`);
  });
  it('keeps years sorted', () => {
    for (const c of countries) expect(c.years).toEqual([...c.years].sort((a, b) => a - b));
  });
  it('has no years or areas for Indonesia', () => {
    const id = countries.find((c) => c.name === 'Indonesia')!;
    expect(id.years).toEqual([]);
    expect(id.areas).toEqual([]);
  });
  it('formats years', () => {
    expect(yearsLabel([])).toBe('');
    expect(yearsLabel([2024])).toBe('2024');
    expect(yearsLabel([2023, 2024, 2026])).toBe('2023, 2024, 2026');
  });
});

describe('photos', () => {
  it('has a webp file per photo, no metadata, within budget', () => {
    let total = 0;
    for (const p of photos) {
      const buf = readFileSync(file(p.id));
      total += buf.length;
      const s = buf.toString('latin1');
      expect(s.includes('EXIF'), `${p.id} EXIF`).toBe(false);
      expect(s.includes('XMP'), `${p.id} XMP`).toBe(false);
    }
    expect(total).toBeLessThanOrEqual(3_000_000);
    expect(statSync(join(root, 'public', 'outside')).isDirectory()).toBe(true);
  });
  it('has alt, caption and dimensions', () => {
    for (const p of photos) {
      expect(p.alt.length).toBeGreaterThan(0);
      expect(p.caption.length).toBeGreaterThan(0);
      expect(p.width).toBeGreaterThan(0);
      expect(p.height).toBeGreaterThan(0);
      expect(p.caption.replace(/\b\d{4}\b/g, '')).not.toMatch(/\d/);
    }
  });
  it('filters by kind and country', () => {
    const jp = photosFor('Japan');
    expect(jp.length).toBeGreaterThan(0);
    expect(jp.every((p) => p.country === 'Japan' && p.kind !== 'food')).toBe(true);
    expect(foodPhotos).toHaveLength(19);
    expect(foodPhotos.every((p) => p.kind === 'food')).toBe(true);
    expect(hikePhotos.every((p) => p.kind === 'hike')).toBe(true);
  });
});

describe('trails', () => {
  const noYear = ['Mount Tamalpais', 'Point Reyes', 'Mission Peak', 'Castle Rock State Park', 'Pinnacles National Park', 'Yosemite'];
  it('omits years where required', () => {
    for (const n of noYear) {
      const t = trails.find((x) => x.name === n)!;
      expect(t, n).toBeDefined();
      expect(t.year).toBeUndefined();
    }
    expect(trails.find((t) => t.name === 'Hwangnyeongsan')!.year).toBe(2024);
    expect(trails.filter((t) => t.name.includes('Yosemite')).every((t) => t.year === undefined)).toBe(true);
  });
});

describe('world dots', () => {
  it('covers every listed country and stays in the grid', () => {
    const codes = new Set(dots.dots.map((d) => d[2]));
    for (const c of countries) if (c.code !== 'IDN') expect(codes.has(c.code), c.code).toBe(true);
    for (const [x, y] of dots.dots as [number, number, string][]) {
      expect(x).toBeLessThan(dots.cols);
      expect(y).toBeLessThan(dots.rows);
    }
  });
});
