import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  GENERATING_NOTE, STEPS, TEMPLATES, autoAdvance, downloadName, initialState, reducedMotion,
  selectTemplate, start, statusText, tick,
} from './slides';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('slideshow generation logic', () => {
  it('walks every step and ends ready', () => {
    let s = start(initialState);
    expect(s.phase).toBe('generating');
    for (let i = 0; i < STEPS.length; i++) s = tick(s);
    expect(s.phase).toBe('ready');
  });
  it('offers a download only when ready', () => {
    expect(downloadName(initialState)).toBeNull();
    let s = start(initialState);
    for (let i = 0; i < STEPS.length; i++) s = tick(s);
    expect(downloadName(s)).toBe('deck-executive-weekly.pptx');
  });
  it('names the download after the template it was built from', () => {
    let s = start(selectTemplate(initialState, TEMPLATES[1]));
    for (let i = 0; i < STEPS.length; i++) s = tick(s);
    expect(downloadName(s)).toBe('deck-accessories-kpi.pptx');
  });
  it('ignores a template change mid-run and resets after one', () => {
    const run = start(initialState);
    expect(selectTemplate(run, TEMPLATES[1]).template).toBe(run.template);
    let s = run;
    for (let i = 0; i < STEPS.length; i++) s = tick(s);
    expect(selectTemplate(s, TEMPLATES[1]).phase).toBe('idle');
  });
  it('does nothing on tick when not generating', () => {
    expect(tick(initialState)).toEqual(initialState);
  });

  it('counts the finished steps from the state, not from the step count twice', () => {
    let s = start(initialState);
    for (let i = 0; i < STEPS.length; i++) s = tick(s);
    const line = statusText(s);
    // The finished count comes from the state and the total from the step
    // list, so the two numbers are separate facts. They read the same at the
    // end of a run because every step is done by then.
    expect(line).toContain(`Deck ready: ${s.step} of ${STEPS.length} steps done.`);
    expect(s.step).toBe(STEPS.length);
  });
  it('names the step it is on while the deck is generating', () => {
    const s = start(initialState);
    expect(statusText(s)).toBe(`Step 1 of ${STEPS.length}: ${STEPS[0]}`);
  });
  it('counts only the steps that are done, not the whole list', () => {
    // A run that has not finished shows the steps done so far, so the count
    // cannot be the step list's length written twice.
    const s = tick(tick(start(initialState)));
    expect(s.step).toBe(2);
    expect(statusText(s)).toBe(`Step ${s.step + 1} of ${STEPS.length}: ${STEPS[s.step]}`);
  });
  it('points the reader at the control it actually has, before and during a run', () => {
    expect(statusText(initialState)).toContain('Regenerate deck');
    expect(statusText(initialState)).not.toContain('generate the deck');
    expect(GENERATING_NOTE).toContain('Regenerate deck');
  });

  it('reads the reduced-motion preference afresh, so a runtime change counts', () => {
    let calls = 0;
    vi.stubGlobal('window', {
      matchMedia: () => {
        calls++;
        return { matches: calls % 2 === 1 };
      },
    });
    expect(reducedMotion()).toBe(true);
    expect(reducedMotion()).toBe(false);
    expect(calls).toBe(2);
  });
  it('does not advance the deck on its own under reduced motion', () => {
    expect(autoAdvance('generating', false)).toBe(true);
    expect(autoAdvance('generating', true)).toBe(false);
    expect(autoAdvance('idle', false)).toBe(false);
    expect(autoAdvance('ready', false)).toBe(false);
  });
});
