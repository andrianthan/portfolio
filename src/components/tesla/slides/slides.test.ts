import { describe, it, expect } from 'vitest';
import { STEPS, TEMPLATES, downloadName, initialState, selectTemplate, start, tick } from './slides';

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
});
