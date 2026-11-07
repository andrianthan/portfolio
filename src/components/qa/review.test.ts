import { describe, it, expect } from 'vitest';
import { init, reduce, stats, current, LOW_CONFIDENCE, type Item } from './review';

const items: Item[] = [
  { id: 'a', label: 'stop sign', confidence: 0.95 },
  { id: 'b', label: 'lane marking', confidence: 0.4 },
  { id: 'c', label: 'cone', confidence: 0.8 },
];

describe('review reducer', () => {
  it('starts on the first item with nothing reviewed', () => {
    const s = init(items);
    expect(current(s)?.id).toBe('a');
    expect(stats(s)).toEqual({ reviewed: 0, total: 3, agreement: null, secondLook: 0, done: false });
  });

  it('accept advances to the next undecided item', () => {
    const s = reduce(init(items), { type: 'accept' });
    expect(current(s)?.id).toBe('b');
    expect(stats(s).reviewed).toBe(1);
  });

  it('reject and relabel are recorded', () => {
    let s = reduce(init(items), { type: 'reject' });
    s = reduce(s, { type: 'relabel', label: 'traffic cone' });
    expect(s.verdicts.a).toEqual({ kind: 'reject' });
    expect(s.verdicts.b).toEqual({ kind: 'relabel', label: 'traffic cone' });
  });

  it('agreement is accepts over reviewed, as a whole percent', () => {
    let s = init(items);
    s = reduce(s, { type: 'accept' });
    s = reduce(s, { type: 'reject' });
    expect(stats(s).agreement).toBe(50);
    s = reduce(s, { type: 'accept' });
    expect(stats(s).agreement).toBe(67);
  });

  it('flags accepted low-confidence items for a second look', () => {
    let s = reduce(init(items), { type: 'accept' });
    s = reduce(s, { type: 'accept' });
    expect(items[1].confidence).toBeLessThan(LOW_CONFIDENCE);
    expect(stats(s).secondLook).toBe(1);
  });

  it('undo reverts the last decision and returns to that item', () => {
    let s = reduce(init(items), { type: 'accept' });
    s = reduce(s, { type: 'undo' });
    expect(current(s)?.id).toBe('a');
    expect(s.verdicts.a).toBeUndefined();
    expect(stats(s).reviewed).toBe(0);
  });

  it('undo with no history is a no-op', () => {
    const s = init(items);
    expect(reduce(s, { type: 'undo' })).toEqual(s);
  });

  it('finishes after the last item and ignores further decisions', () => {
    let s = init(items);
    for (let i = 0; i < 3; i++) s = reduce(s, { type: 'accept' });
    expect(current(s)).toBeNull();
    expect(stats(s).done).toBe(true);
    expect(reduce(s, { type: 'accept' })).toEqual(s);
  });

  it('reset restores the initial state', () => {
    const s = reduce(init(items), { type: 'accept' });
    expect(reduce(s, { type: 'reset' })).toEqual(init(items));
  });

  it('relabel with a blank label is ignored', () => {
    const s = init(items);
    expect(reduce(s, { type: 'relabel', label: '   ' })).toEqual(s);
  });
});
