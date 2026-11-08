import { describe, it, expect } from 'vitest';
import { initialState, toggle, setBacktest, dryRun, commit } from './forecastlab';

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
});
