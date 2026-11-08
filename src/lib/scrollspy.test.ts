import { describe, it, expect } from 'vitest';
import { activeSection } from './scrollspy';

const tops = (...t: number[]) => ['top', 'experience', 'projects', 'about', 'outside'].map((id, i) => ({ id, top: t[i] }));

describe('activeSection', () => {
  it('is the first section at the very top of the page', () => {
    expect(activeSection(tops(0, 700, 1500, 2300, 3100), 120)).toBe('top');
  });
  it('switches when a section crosses the offset', () => {
    expect(activeSection(tops(-600, 100, 900, 1700, 2500), 120)).toBe('experience');
    expect(activeSection(tops(-1400, -700, 100, 900, 1700), 120)).toBe('projects');
  });
  it('stays on the last section past the end', () => {
    expect(activeSection(tops(-3000, -2300, -1500, -800, -200), 120)).toBe('outside');
  });
  it('falls back to the first id when nothing has crossed yet', () => {
    expect(activeSection(tops(300, 900, 1700, 2500, 3300), 120)).toBe('top');
  });
  it('activates the last section at the bottom of the page even if it never crossed the offset', () => {
    // The last section is too short to reach the offset line: the page ends first.
    expect(activeSection(tops(-3000, -2300, -1500, -800, 308), 120, true)).toBe('outside');
    // At the bottom the reader is looking at the last section, whatever crossed the line.
    expect(activeSection(tops(0, 700, 1500, 2300, 3100), 120, true)).toBe('outside');
  });
  it('keeps the old behaviour when not at the bottom', () => {
    expect(activeSection(tops(-3000, -2300, -1500, -800, 308), 120, false)).toBe('about');
    expect(activeSection(tops(-3000, -2300, -1500, -800, 308), 120)).toBe('about');
  });
  it('activates the last section at the bottom when it has crossed the offset too', () => {
    expect(activeSection(tops(-3000, -2300, -1500, -800, -200), 120, true)).toBe('outside');
  });
});
