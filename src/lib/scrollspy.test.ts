import { describe, it, expect } from 'vitest';
import { activeSection } from './scrollspy';

const tops = (...t: number[]) => ['top', 'experience', 'projects', 'about'].map((id, i) => ({ id, top: t[i] }));

describe('activeSection', () => {
  it('is the first section at the very top of the page', () => {
    expect(activeSection(tops(0, 700, 1500, 2300), 120)).toBe('top');
  });
  it('switches when a section crosses the offset', () => {
    expect(activeSection(tops(-600, 100, 900, 1700), 120)).toBe('experience');
    expect(activeSection(tops(-1400, -700, 100, 900), 120)).toBe('projects');
  });
  it('stays on the last section past the end', () => {
    expect(activeSection(tops(-3000, -2300, -1500, -200), 120)).toBe('about');
  });
  it('falls back to the first id when nothing has crossed yet', () => {
    expect(activeSection(tops(300, 900, 1700, 2500), 120)).toBe('top');
  });
});
