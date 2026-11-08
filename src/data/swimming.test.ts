import { describe, it, expect } from 'vitest';
import { swimEvents, swimPercentileLine, swimContextLine } from './swimming';

describe('swimming facts', () => {
  it('lists the six events and times in order', () => {
    expect(swimEvents).toEqual([
      { name: '50 Free', time: ':24' },
      { name: '100 Free', time: ':53' },
      { name: '200 Free', time: '1:53' },
      { name: '100 Back', time: ':59' },
      { name: '100 Breast', time: '1:04' },
      { name: '100 Fly', time: ':57' },
    ]);
  });
  it('pins the exact copy', () => {
    expect(swimPercentileLine).toBe('80th percentile competitive swimmer');
    expect(swimContextLine).toBe('High school, ages 14 to 18 · short course yards');
  });
  it('makes no source claim and names no standard', () => {
    const all = JSON.stringify([swimEvents, swimPercentileLine, swimContextLine]).toLowerCase();
    expect(all).not.toMatch(/estimated|source|http|per |standard|aa|usa swimming/);
  });
});
