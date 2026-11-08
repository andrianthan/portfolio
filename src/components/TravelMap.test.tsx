import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import TravelMap, { dotClass } from './TravelMap';
import world from '../data/world-dots.json';

const render = (selected: string | null) => renderToStaticMarkup(<TravelMap selected={selected} />);
const count = (s: string, needle: string) => s.split(needle).length - 1;
const selectedCircles = (html: string) => {
  const m = html.match(/<g class="[^"]*dot-selected[^"]*"[^>]*>(.*?)<\/g>/g) ?? [];
  return m.reduce((n, g) => n + count(g, '<circle'), 0);
};

describe('TravelMap', () => {
  it('is decorative: aria-hidden and not focusable', () => {
    const html = render(null);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toMatch(/tabindex/i);
  });
  it('dotClass distinguishes visited, selected and other land', () => {
    const a = dotClass('JPN', null);
    const b = dotClass('JPN', 'JPN');
    const c = dotClass('', null);
    expect(new Set([a, b, c]).size).toBe(3);
    expect(dotClass('', 'JPN')).toBe(c);
    expect(dotClass('KOR', 'JPN')).toBe(a);
  });
  it('lights more dots when a country is selected', () => {
    expect(selectedCircles(render(null))).toBe(0);
    expect(selectedCircles(render('JPN'))).toBeGreaterThan(0);
  });
  it('renders one circle per world dot', () => {
    expect(count(render(null), '<circle')).toBe(world.dots.length);
  });
  it('stays small', () => {
    expect(render(null).length).toBeLessThan(60000);
  });
});
