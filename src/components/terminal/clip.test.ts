import { describe, it, expect } from 'vitest';
import { visibleLines, clipAnswer } from './clip';

describe('visibleLines', () => {
  it('drops the agent trace lines and keeps the question and the answer, in order', () => {
    const lines = [
      { id: 1, kind: 'input', text: 'q' },
      { id: 2, kind: 'trace', text: 'orchestrator: routed' },
      { id: 3, kind: 'trace', text: 'verifier: ok' },
      { id: 4, kind: 'answer', text: 'a' },
    ];
    expect(visibleLines(lines).map((l) => l.id)).toEqual([1, 4]);
  });
});

describe('clipAnswer', () => {
  it('leaves a short answer alone', () => {
    expect(clipAnswer('Short answer.')).toEqual({ text: 'Short answer.', clipped: false });
  });
  it('leaves an answer of exactly max characters alone', () => {
    const t = 'x'.repeat(320);
    expect(clipAnswer(t)).toEqual({ text: t, clipped: false });
  });
  it('cuts a long answer at the last sentence end before max', () => {
    const sentence = 'This is a sentence that runs for a while. ';
    const text = sentence.repeat(20);
    const out = clipAnswer(text);
    expect(out.clipped).toBe(true);
    expect(out.text.endsWith('.…')).toBe(true);
    expect(out.text.length).toBeLessThanOrEqual(321);
    expect(out.text.length).toBeGreaterThan(120);
  });
  it('falls back to a word boundary when there is no usable sentence end', () => {
    const text = 'word '.repeat(200);
    const out = clipAnswer(text);
    expect(out.clipped).toBe(true);
    expect(out.text.endsWith('word…')).toBe(true);
    expect(out.text.length).toBeLessThanOrEqual(321);
  });
  it('hard-cuts text with no spaces at all', () => {
    const out = clipAnswer('x'.repeat(1000));
    expect(out.text).toBe('x'.repeat(320) + '…');
    expect(out.clipped).toBe(true);
  });
  it('honours a custom max', () => {
    expect(clipAnswer('a b c d e f g h i j', 9).text.length).toBeLessThanOrEqual(10);
  });
});
