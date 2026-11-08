import { describe, it, expect } from 'vitest';
import { MOCK_PARTS, MOCK_PLANNERS, MOCK_CAMPAIGNS, MOCK_USERS, series } from './fixtures';

describe('shared mock data', () => {
  it('has five parts with fake ids', () => {
    expect(MOCK_PARTS).toHaveLength(5);
    for (const p of MOCK_PARTS) expect(p.id).toMatch(/^P-\d{4}$/);
  });
  it('points every campaign at a mock part', () => {
    const ids = new Set(MOCK_PARTS.map((p) => p.id));
    expect(MOCK_CAMPAIGNS).toHaveLength(6);
    for (const c of MOCK_CAMPAIGNS) expect(ids.has(c.partId)).toBe(true);
  });
  it('names nobody real', () => {
    for (const n of [...MOCK_PLANNERS, ...MOCK_USERS.map((u) => u.name)]) expect(n).toMatch(/^(Planner [A-F]|User [1-6])$/);
  });
  it('builds the same series every time', () => {
    expect(series(3, 8, 100, 10)).toEqual(series(3, 8, 100, 10));
    expect(series(3, 8, 100, 10)).toHaveLength(8);
    expect(series(3, 8, 100, 10)).not.toEqual(series(4, 8, 100, 10));
    for (const v of series(1, 20, 100, 10)) { expect(v).toBeGreaterThanOrEqual(90); expect(v).toBeLessThanOrEqual(110); }
  });
});
