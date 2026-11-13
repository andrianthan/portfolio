import { describe, it, expect } from 'vitest';
import { buildGrid, fetchContributions, parseApi, type ContributionDay } from './contributions';

// 2024-01-03 is a Wednesday (weekday 3).
const days: ContributionDay[] = Array.from({ length: 12 }, (_, i) => ({
  date: `2024-01-${String(3 + i).padStart(2, '0')}`,
  count: i,
  level: (i % 5) as 0 | 1 | 2 | 3 | 4,
}));

describe('parseApi', () => {
  it('reads a contributions array', () => {
    expect(parseApi({ contributions: [{ date: '2024-01-03', count: 2, level: 1 }] })).toEqual([
      { date: '2024-01-03', count: 2, level: 1 },
    ]);
  });

  it('rejects anything malformed', () => {
    expect(parseApi(null)).toBeNull();
    expect(parseApi({})).toBeNull();
    expect(parseApi({ contributions: [{ date: 5 }] })).toBeNull();
    expect(parseApi({ contributions: [] })).toBeNull();
  });
});

describe('buildGrid', () => {
  it('sums the total and pads the first week to its weekday', () => {
    const grid = buildGrid(days);
    expect(grid.total).toBe(days.reduce((a, d) => a + d.count, 0));
    expect(grid.weeks[0].slice(0, 3)).toEqual([null, null, null]);
    expect(grid.weeks[0][3]?.date).toBe('2024-01-03');
  });

  it('chunks into weeks of seven, last week may be short of days but keeps 7 slots', () => {
    const grid = buildGrid(days);
    for (const week of grid.weeks) expect(week).toHaveLength(7);
    expect(grid.weeks.flat().filter(Boolean)).toHaveLength(days.length);
  });

  it('sorts unordered input', () => {
    const grid = buildGrid([...days].reverse());
    expect(grid.weeks[0][3]?.date).toBe('2024-01-03');
  });
});

describe('fetchContributions', () => {
  it('returns a grid on success', async () => {
    const f = (async () => new Response(JSON.stringify({ contributions: days }))) as typeof fetch;
    const grid = await fetchContributions('someone', f);
    expect(grid?.total).toBeGreaterThan(0);
  });

  it('returns null on a failed request, a bad status, or bad JSON', async () => {
    expect(await fetchContributions('x', (async () => { throw new Error('down'); }) as typeof fetch)).toBeNull();
    expect(await fetchContributions('x', (async () => new Response('no', { status: 500 })) as typeof fetch)).toBeNull();
    expect(await fetchContributions('x', (async () => new Response('not json')) as typeof fetch)).toBeNull();
  });
});
