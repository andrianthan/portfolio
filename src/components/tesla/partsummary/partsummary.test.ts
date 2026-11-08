import { describe, it, expect } from 'vitest';
import { MOCK_PARTS } from '../fixtures';
import { SUBTABS, initialState, matches, search, selectTab } from './partsummary';
import { dataFor } from './partdata';

describe('part summary logic', () => {
  it('has the six sub-tabs in order', () => {
    expect(SUBTABS.map((t) => t.id)).toEqual(['overview', 'consumption', 'failures', 'location', 'codes', 'breakdown']);
  });
  it('finds a part by id, case-insensitively, or by name fragment', () => {
    expect(matches('p-1001', MOCK_PARTS).map((p) => p.id)).toEqual(['P-1001']);
    expect(matches('bearing', MOCK_PARTS).map((p) => p.id)).toEqual(['P-1005']);
    expect(matches('', MOCK_PARTS)).toEqual([]);
  });
  it('opens the overview on a successful search', () => {
    const s = search(initialState, 'P-1003', MOCK_PARTS);
    expect(s.partId).toBe('P-1003');
    expect(s.tab).toBe('overview');
    expect(s.message).toBe('');
  });
  it('says so when nothing matches and keeps the previous part closed', () => {
    const s = search(initialState, 'zzz', MOCK_PARTS);
    expect(s.partId).toBeNull();
    expect(s.message).toMatch(/no part matches/i);
  });
  it('switches sub-tabs only when a part is open', () => {
    expect(selectTab(initialState, 'consumption')).toEqual(initialState);
    const open = search(initialState, 'P-1001', MOCK_PARTS);
    expect(selectTab(open, 'codes').tab).toBe('codes');
  });
  it('never mutates the old state', () => {
    const open = search(initialState, 'P-1001', MOCK_PARTS);
    const frozen = Object.freeze({ ...open });
    expect(() => selectTab(frozen, 'failures')).not.toThrow();
  });
  it('builds deterministic data of the right shape', () => {
    const d = dataFor('P-1002');
    expect(d).toEqual(dataFor('P-1002'));
    expect(d.consumption).toHaveLength(12);
    expect(d.failureRate).toHaveLength(12);
    expect(d.locationMatrix.cells).toHaveLength(4);
    expect(d.locationMatrix.cells[0]).toHaveLength(5);
    expect(d.codeMatrix.cells).toHaveLength(4);
    expect(d.breakdown.reduce((a, b) => a + b.share, 0)).toBe(100);
    expect(d.insights.length).toBeGreaterThanOrEqual(3);
  });
});
