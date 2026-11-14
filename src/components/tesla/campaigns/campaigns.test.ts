import { describe, it, expect } from 'vitest';
import { MOCK_CAMPAIGNS } from '../fixtures';
import { THRESHOLD, WINDOWS, alerts, assignPlanner, isWindDown, paceShare, weeksToFinish } from './campaigns';

const [c1, c2, c3, c4] = MOCK_CAMPAIGNS;

describe('campaigns logic', () => {
  it('uses the 8/13/26 week windows and a 10% threshold', () => {
    expect([...WINDOWS]).toEqual([8, 13, 26]);
    expect(THRESHOLD).toBe(0.1);
  });
  it('computes pace share of service units', () => {
    expect(paceShare(c1)).toBeCloseTo(300 / 1500);
    expect(paceShare(c4)).toBeCloseTo(20 / 2000);
  });
  it('flags a campaign as winding down when its best window share is under the threshold', () => {
    expect(isWindDown(c4)).toBe(true);   // 1% pace share
    expect(isWindDown(c2)).toBe(true);   // 3.3%
    expect(isWindDown(c1)).toBe(false);  // 20%
    expect(isWindDown(c3)).toBe(false);  // 16%
  });
  it('orders the P10 case faster than P50 faster than P90', () => {
    const [a, b, d] = (['P10', 'P50', 'P90'] as const).map((p) => weeksToFinish(c1, p));
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(d);
    expect(weeksToFinish(c1, 'P50')).toBe(Math.ceil(c1.remainingUnits / c1.weeklyPace));
  });
  it('lists alerts by largest remaining units first', () => {
    const a = alerts(MOCK_CAMPAIGNS);
    expect(a.map((c) => c.id)).toEqual(['C-02', 'C-04']);
  });
  it('assigns each alert to a mock planner', () => {
    for (const c of MOCK_CAMPAIGNS) expect(assignPlanner(c)).toMatch(/^Planner [A-F]$/);
  });
});
