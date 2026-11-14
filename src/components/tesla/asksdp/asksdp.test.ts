import { describe, it, expect } from 'vitest';
import {
  MAX_TURNS, PRESETS, ask, appendTurn, askTurn, initialAsk, sendQuestion,
  scrollToBottom, ungrounded,
} from './asksdp';

describe('ask sdp logic', () => {
  it('offers three preset questions', () => { expect(PRESETS).toHaveLength(3); });
  it('answers every preset with tools, a verdict, and only grounded numbers', () => {
    for (const q of PRESETS) {
      const a = ask(q);
      expect(a.refused).toBe(false);
      expect(a.tools.length).toBeGreaterThan(0);
      expect(a.verdict).not.toBeNull();
      expect(ungrounded(a.text, a.tools.map((t) => t.result))).toEqual([]);
    }
  });
  it('refuses a question no tool can answer', () => {
    const a = ask('what is the meaning of life');
    expect(a.refused).toBe(true);
    expect(a.verdict).toBeNull();
    expect(a.tools).toEqual([]);
  });
  it('does not swallow list commas', () => {
    expect(ungrounded('up 1,375 units', ['1,375, 1,420'])).toEqual([]);
  });
  it('answers about the named part, grounded', () => {
    for (const q of ['How is consumption trending for the Front fascia clip?', 'failure rate for p-1003', 'Should we firm or hold the front fascia clip?']) {
      const a = ask(q);
      expect(a.refused).toBe(false);
      expect(a.text.toLowerCase()).toContain('front fascia clip');
      expect(a.tools.every((t) => t.result.startsWith('P-1003'))).toBe(true);
      expect(ungrounded(a.text, a.tools.map((t) => t.result))).toEqual([]);
    }
  });
  it('does not treat "in order to" as a firm or hold question', () => {
    expect(ask('what do I do in order to win').refused).toBe(true);
  });
  it('flags a number the tools never returned', () => {
    expect(ungrounded('Demand is up 42% on 7 parts', ['up 42%'])).toEqual(['7']);
    expect(ungrounded('No figures here', [])).toEqual([]);
  });

  it('reads the same figure whether or not it carries a unit', () => {
    // A trailing % or full stop is punctuation, not part of the figure, so
    // "45%" and "45" have to be recognised as the same number.
    expect(ungrounded('at 45%', ['45'])).toEqual([]);
    expect(ungrounded('at 45', ['45%'])).toEqual([]);
    expect(ungrounded('at 45.', ['45'])).toEqual([]);
    expect(ungrounded('at 45%', ['45%'])).toEqual([]);
  });
  it('still refuses a figure the data does not hold, with or without a unit', () => {
    // Normalising the token makes the refusal more inclusive, never less:
    // a figure nobody returned is refused either way.
    expect(ungrounded('at 9999%', ['45'])).toEqual(['9999']);
    expect(ungrounded('at 9999', ['45'])).toEqual(['9999']);
    expect(ask('What is the failure rate on the wheel hub bearing at 9999%?').refused).toBe(true);
    expect(ask('What is the failure rate on the wheel hub bearing at 9999?').refused).toBe(true);
  });
  it('keeps a thousands separator part of the figure', () => {
    // The comma inside a number is a separator, so "1,000" is one figure and
    // not the same as "1000".
    expect(ungrounded('1,000 units', ['1000 units'])).toEqual(['1,000']);
    expect(ungrounded('1,000 units', ['1,000 units'])).toEqual([]);
  });

  it('refuses a question whose number the source data does not contain', () => {
    // The invented figure is in the question, not the answer, so the answer
    // text alone would look clean. The demo must still refuse.
    const a = ask('What is the failure rate on the wheel hub bearing at 9999%?');
    expect(a.refused).toBe(true);
    expect(a.verdict).toBeNull();
    expect(a.tools).toEqual([]);
    expect(a.text).toBe("I can't answer that from the data I can reach.");
  });
  it('still answers a question whose numbers the source data does contain', () => {
    // The part id is a number, and the tool results carry it.
    const a = ask('What is the failure rate on P-1005?');
    expect(a.refused).toBe(false);
    expect(a.tools.length).toBeGreaterThan(0);
  });

  it('shows the threshold it applied in the tool results', () => {
    for (const q of PRESETS) {
      const a = ask(q);
      const thresholds = a.tools.filter((t) => t.tool === 'get_threshold');
      expect(thresholds.length).toBe(1);
      expect(thresholds[0].result.length).toBeGreaterThan(0);
    }
  });

  it('routes to the part named first in the question, not the first in the part list', () => {
    // Both parts are named, and the wheel hub bearing is named first.
    const a = ask('What is the failure rate on the wheel hub bearing and the rear door latch?');
    expect(a.refused).toBe(false);
    expect(a.tools.every((t) => t.result.startsWith('P-1005'))).toBe(true);
  });

  it('keeps the log to the most recent turns', () => {
    let log: ReturnType<typeof appendTurn> = [];
    for (let i = 0; i < MAX_TURNS + 5; i++) log = appendTurn(log, ask(PRESETS[0]));
    expect(log).toHaveLength(MAX_TURNS);
  });
  it('gives every turn its own number, so its key stays with its content', () => {
    // The capped log slides: when an older turn falls away, the keys of the
    // turns that remain must not shift with it.
    let s = initialAsk;
    for (let i = 0; i < MAX_TURNS + 5; i++) s = sendQuestion(s, PRESETS[0]);
    expect(s.log).toHaveLength(MAX_TURNS);
    const turns = s.log.map((a) => a.turn);
    // Every turn has a number, and no two share one.
    expect(turns.every((t) => typeof t === 'number')).toBe(true);
    expect(new Set(turns).size).toBe(turns.length);
    // The numbers run in order, and the oldest surviving turn is the sixth.
    expect(turns).toEqual(Array.from({ length: MAX_TURNS }, (_, i) => i + 6));
  });
  it('numbers the turns in the order they were sent', () => {
    const first = sendQuestion(initialAsk, PRESETS[0]);
    expect(first.log[0].turn).toBe(1);
    const second = sendQuestion(first, PRESETS[1]);
    expect(second.log.map((a) => a.turn)).toEqual([1, 2]);
    expect(second.nextTurn).toBe(3);
  });
  it('clears the draft when a question is sent, so a preset behaves like a typed question', () => {
    const s = sendQuestion({ ...initialAsk, draft: PRESETS[0] }, PRESETS[0]);
    expect(s.draft).toBe('');
    expect(s.log).toHaveLength(1);
  });
  it('sends nothing for an empty or whitespace-only question', () => {
    expect(askTurn('')).toBeNull();
    expect(askTurn('   ')).toBeNull();
    const s = sendQuestion({ ...initialAsk, draft: 'hi' }, '   ');
    expect(s.log).toEqual([]);
    expect(s.draft).toBe('hi');
  });

  it('scrolls a tall answer to the bottom of the log region', () => {
    const el = { scrollTop: 0, scrollHeight: 1200, clientHeight: 360 };
    scrollToBottom(el);
    // The newest answer sits at the bottom of a region taller than the window.
    expect(el.scrollTop).toBe(840);
  });
  it('does not scroll past the top of a log that fits', () => {
    const el = { scrollTop: 0, scrollHeight: 100, clientHeight: 360 };
    scrollToBottom(el);
    expect(el.scrollTop).toBe(0);
  });
});
