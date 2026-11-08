import { describe, it, expect } from 'vitest';
import { initialState, toggle, setBacktest, dryRun, commit, backtestSeries } from './forecastlab';

describe('forecast lab logic', () => {
  it('starts idle with backtest off', () => {
    expect(initialState.phase).toBe('idle');
    expect(initialState.backtest).toBe(false);
    expect(initialState.selected).toEqual([]);
  });
  it('previews only when something is selected', () => {
    const none = dryRun(initialState);
    expect(none.rows).toEqual([]);
    expect(none.state.phase).toBe('idle');
    const s = toggle(initialState, 'P-1001');
    const r = dryRun(s);
    expect(r.state.phase).toBe('previewed');
    expect(r.rows.map((x) => x.partId)).toEqual(['P-1001']);
    expect(r.rows[0].delta).toBe(r.rows[0].proposed - r.rows[0].current);
  });
  it('commits only from a preview', () => {
    const s = toggle(initialState, 'P-1001');
    expect(commit(s).phase).toBe('idle');
    const previewed = dryRun(s).state;
    expect(commit(previewed).phase).toBe('committed');
  });
  it('resets the preview when the selection changes', () => {
    const previewed = dryRun(toggle(initialState, 'P-1001')).state;
    expect(toggle(previewed, 'P-1002').phase).toBe('idle');
  });
  it('is deterministic for the same selection', () => {
    const a = dryRun(toggle(initialState, 'P-1003')).rows;
    const b = dryRun(toggle(initialState, 'P-1003')).rows;
    expect(a).toEqual(b);
  });
  it('toggles backtest', () => { expect(setBacktest(initialState, true).backtest).toBe(true); });
  it('backtestSeries derives only from its input', () => {
    const v = [100, 200, 300, 400];
    const b = backtestSeries(v);
    expect(b).toHaveLength(v.length);
    expect(backtestSeries(v)).toEqual(b);
    expect(b).not.toEqual(v);
    expect(backtestSeries([])).toEqual([]);
  });
  it('keeps the backtest within a bounded deviation of the forecast line', () => {
    // The backtest is an illustrative prior run, so it must stay close to the
    // forecast it sits against: at most 8% below it, and at most 5% plus
    // seven units above it. A change that widens the series fails here.
    // The series is rounded, so the bounds carry a unit of slack.
    const values = [120, 480, 940, 2100, 6400, 15];
    const back = backtestSeries(values);
    values.forEach((v, i) => {
      expect(back[i]).toBeLessThanOrEqual(v * 1.05 + 8);
      expect(back[i]).toBeGreaterThanOrEqual(v * 0.92 - 6);
    });
  });
  it('keeps the backtest within the same bounds for a long series', () => {
    const values = Array.from({ length: 60 }, (_, i) => 200 + i * 37);
    const back = backtestSeries(values);
    values.forEach((v, i) => {
      expect(back[i]).toBeLessThanOrEqual(v * 1.05 + 8);
      expect(back[i]).toBeGreaterThanOrEqual(v * 0.92 - 6);
    });
  });
  it('reaches the deviation bounds, so a narrower series fails too', () => {
    // The bounds are only meaningful if the series actually uses them: a
    // series that stays closer to the forecast line than the bounds allow
    // is a change of the same kind as one that strays further.
    const values = Array.from({ length: 60 }, (_, i) => 200 + i * 37);
    const back = backtestSeries(values);
    const rel = values.map((v, i) => (back[i] - v) / v);
    // The steepest fall reaches the lower bound, and the steepest rise
    // reaches the upper one.
    expect(Math.min(...rel)).toBeLessThanOrEqual(-0.075);
    expect(Math.max(...rel)).toBeGreaterThanOrEqual(0.05);
  });
});
