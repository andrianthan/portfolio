import { describe, it, expect } from 'vitest';
import { scrambleFrame } from './scramble';

const rand = () => 0.5;

describe('scrambleFrame', () => {
  const target = "Hey, I'm Andrian";

  it('returns the target at full progress', () => {
    expect(scrambleFrame(target, 1, rand)).toBe(target);
  });

  it('keeps the length and the spaces and punctuation at zero progress', () => {
    const out = scrambleFrame(target, 0, rand);
    expect(out).toHaveLength(target.length);
    for (let i = 0; i < target.length; i++) {
      if (/[\s,.'’]/.test(target[i])) expect(out[i]).toBe(target[i]);
      else expect(out[i]).not.toBe(target[i]);
    }
  });

  it('settles the leading characters first', () => {
    const out = scrambleFrame(target, 0.5, rand);
    expect(out.slice(0, 8)).toBe(target.slice(0, 8));
  });

  it('clamps progress outside 0..1', () => {
    expect(scrambleFrame(target, 5, rand)).toBe(target);
    expect(scrambleFrame(target, -5, rand)).toHaveLength(target.length);
  });
});
