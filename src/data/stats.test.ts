import { describe, it, expect } from 'vitest';
import { stats } from './stats';

describe('home stats', () => {
  it('has Andrian\'s four stats, in order', () => {
    expect(stats.map((s) => s.value)).toEqual(['90B+', '95%+', '900+', '150+']);
  });
  it('captions say what each number measures', () => {
    expect(stats[0].caption).toBe('tokens used across my work and personal AI use');
    expect(stats[1].caption).toBe('prompt cache hit rate');
    expect(stats[2].caption).toBe('hours saved across Tesla, Hanna Center and Blue Dome projects');
    expect(stats[3].caption).toBe('people use what I\'ve built, across Tesla, Hanna Center, Blue Dome and Micron');
  });
  it('carries no "estimated" wording', () => {
    for (const s of stats) expect(s.caption.toLowerCase()).not.toContain('estimated');
  });
  it('drops the removed tiles', () => {
    const all = stats.map((s) => `${s.value} ${s.caption}`).join(' ');
    for (const gone of ['32%', '$30k', '200+', '1st of 9', 'IBM', 'hackathon']) expect(all).not.toContain(gone);
  });
});
