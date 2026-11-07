import { describe, it, expect } from 'vitest';
import { GRANTS, FLAGS, DEFAULT_CRITERIA } from './catalog';
import { scoreGrant, visibleAt } from './score';

describe('grant scoring', () => {
  it('has seven flags and a fixed fictional catalog', () => {
    expect(FLAGS).toHaveLength(7);
    expect(GRANTS.length).toBe(12);
    expect(new Set(GRANTS.map((g) => g.id)).size).toBe(12);
  });
  it('defaults match the documented cutoffs', () => {
    expect(DEFAULT_CRITERIA.sheetThreshold).toBe(5.0);
    expect(DEFAULT_CRITERIA.emailThreshold).toBe(6.0);
  });
  it('every flag returns a value in 0..1 with a reason', () => {
    const s = scoreGrant(GRANTS[0], DEFAULT_CRITERIA);
    expect(s.flags).toHaveLength(7);
    for (const f of s.flags) { expect(f.value).toBeGreaterThanOrEqual(0); expect(f.value).toBeLessThanOrEqual(1); expect(f.reason.length).toBeGreaterThan(5); }
  });
  it('score is 0..10 with one decimal', () => {
    for (const g of GRANTS) { const s = scoreGrant(g, DEFAULT_CRITERIA); expect(s.score).toBeGreaterThanOrEqual(0); expect(s.score).toBeLessThanOrEqual(10); expect(Math.round(s.score * 10) / 10).toBe(s.score); }
  });
  it('an ineligible grant scores below an equivalent eligible one', () => {
    const a = GRANTS.find((g) => g.eligible)!;
    const b = { ...a, id: 'x', eligible: false };
    expect(scoreGrant(b, DEFAULT_CRITERIA).score).toBeLessThan(scoreGrant(a, DEFAULT_CRITERIA).score);
  });
  it('heavier reporting burden lowers the score', () => {
    const a = { ...GRANTS[0], reporting: 'light' as const }; const b = { ...a, reporting: 'heavy' as const };
    expect(scoreGrant(b, DEFAULT_CRITERIA).score).toBeLessThan(scoreGrant(a, DEFAULT_CRITERIA).score);
  });
  it('raising a flag weight changes the score of a grant that is strong on it', () => {
    const g = GRANTS.find((x) => x.mission.length >= 2)!;
    const base = scoreGrant(g, DEFAULT_CRITERIA).score;
    const w = { ...DEFAULT_CRITERIA, weights: { ...DEFAULT_CRITERIA.weights, mission: DEFAULT_CRITERIA.weights.mission * 4 } };
    expect(scoreGrant(g, w).score).not.toBe(base);
  });
  it('visibleAt keeps only scores at or above the threshold, sorted high to low', () => {
    const all = GRANTS.map((g) => scoreGrant(g, DEFAULT_CRITERIA));
    const v = visibleAt(all, 6.0);
    expect(v.every((s) => s.score >= 6.0)).toBe(true);
    for (let i = 1; i < v.length; i++) expect(v[i - 1].score).toBeGreaterThanOrEqual(v[i].score);
  });
  it('the catalog straddles both thresholds so the slider has something to show', () => {
    const all = GRANTS.map((g) => scoreGrant(g, DEFAULT_CRITERIA).score);
    expect(all.some((s) => s < DEFAULT_CRITERIA.sheetThreshold)).toBe(true);
    expect(all.some((s) => s >= DEFAULT_CRITERIA.sheetThreshold && s < DEFAULT_CRITERIA.emailThreshold)).toBe(true);
    expect(all.some((s) => s >= DEFAULT_CRITERIA.emailThreshold)).toBe(true);
  });
  it('is deterministic', () => {
    expect(scoreGrant(GRANTS[3], DEFAULT_CRITERIA)).toEqual(scoreGrant(GRANTS[3], DEFAULT_CRITERIA));
  });
});
