import { describe, it, expect } from 'vitest';
import data from './gym-checkins.json';

describe('gym check-in data', () => {
  it('has 879 unique, sorted ISO dates from 2022-06-01 to 2026-11-08', () => {
    expect(data.dates.length).toBe(879);
    expect(new Set(data.dates).size).toBe(879);
    expect([...data.dates].sort()).toEqual(data.dates);
    for (const d of data.dates) expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(data.dates[0]).toBe('2022-06-01');
    expect(data.dates[data.dates.length - 1]).toBe('2026-11-08');
    expect(data.asOf).toBe('2026-11-08');
  });
  it('has the four phases in order, each starting on a check-in date', () => {
    expect(data.phases.map((p) => p.label)).toEqual([
      'Summer 2022 — slower start',
      'Late 2022 — building consistency',
      '2023 — increasingly consistent',
      'Nov 2023–present — consistent',
    ]);
    for (const p of data.phases) expect(data.dates).toContain(p.from);
  });
  it('carries nothing but dates and phase boundaries (no times, names or brands)', () => {
    expect(Object.keys(data).sort()).toEqual(['asOf', 'dates', 'phases']);
  });
});
