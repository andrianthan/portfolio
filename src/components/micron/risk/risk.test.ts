import { describe, it, expect } from 'vitest';
import { WAFERS, type Wafer } from '../fixtures';
import { rank, queue, DEFAULT_QUEUE, topFactors, queueLabel } from './risk';

const mk = (id: string, score: number): Wafer => ({ ...WAFERS[0], id, score });

describe('rank', () => {
  it('orders by score desc', () => {
    const r = rank(WAFERS);
    for (let i = 1; i < r.length; i++) expect(r[i - 1].score).toBeGreaterThanOrEqual(r[i].score);
    expect(r[0].id).toBe('W-0412');
  });
  it('breaks ties by id asc', () => {
    expect(rank([mk('W-2', 0.5), mk('W-1', 0.5), mk('W-3', 0.9)]).map((w) => w.id)).toEqual(['W-3', 'W-1', 'W-2']);
  });
  it('does not mutate', () => {
    const input = [mk('W-1', 0.1), mk('W-2', 0.9)];
    const copy = [...input];
    rank(input);
    expect(input).toEqual(copy);
  });
});

describe('queue', () => {
  it('clamps size', () => {
    expect(queue(WAFERS, -1)).toHaveLength(0);
    expect(queue(WAFERS, 0)).toHaveLength(0);
    expect(queue(WAFERS, 5)).toHaveLength(5);
    expect(queue(WAFERS, 99)).toHaveLength(WAFERS.length);
  });
  it('takes the top of rank', () => {
    expect(queue(WAFERS, 3).map((w) => w.id)).toEqual(rank(WAFERS).slice(0, 3).map((w) => w.id));
  });
  it('default is 4', () => expect(DEFAULT_QUEUE).toBe(4));
});

describe('topFactors', () => {
  it('defaults to 3, sorted desc', () => {
    const f = topFactors(WAFERS[11]);
    expect(f).toHaveLength(3);
    for (let i = 1; i < f.length; i++) expect(f[i - 1].weight).toBeGreaterThanOrEqual(f[i].weight);
  });
  it('honours n', () => expect(topFactors(WAFERS[11], 2)).toHaveLength(2));
});

describe('queueLabel', () => {
  it('formats', () => {
    expect(queueLabel(4, 12)).toBe('4 of 12 wafers in the review queue');
    expect(queueLabel(1, 12)).toBe('1 of 12 wafers in the review queue');
    expect(queueLabel(0, 12)).toBe('0 of 12 wafers in the review queue');
  });
});
