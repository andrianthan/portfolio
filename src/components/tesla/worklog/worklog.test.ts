import { describe, it, expect } from 'vitest';
import { WORKLOG } from './content';
import { currentSection, initialState, selectHeadline, selectSection, toggleEntry, visibleEntries } from './worklog';

describe('the work log window', () => {
  it('starts on the headline', () => {
    expect(initialState.view).toBe('headline');
    expect(currentSection(initialState, WORKLOG)).toBeNull();
  });

  it('shows the headline as three entries', () => {
    const entries = visibleEntries(initialState, WORKLOG);
    expect(entries.map((e) => e.label)).toEqual([WORKLOG.headline.label, 'Scope', 'Evidence']);
    expect(entries[0].detail).toBe(WORKLOG.headline.detail);
  });

  it('switches to a section and back', () => {
    const onAsk = selectSection(initialState, 'ask-sdp');
    expect(currentSection(onAsk, WORKLOG)?.title).toBe('Ask SDP');
    expect(visibleEntries(onAsk, WORKLOG).length).toBeGreaterThan(0);
    const back = selectHeadline(onAsk);
    expect(back.view).toBe('headline');
    expect(visibleEntries(back, WORKLOG)[0].label).toBe(WORKLOG.headline.label);
  });

  it('ignores a section that does not exist', () => {
    expect(selectSection(initialState, 'nope')).toEqual(initialState);
  });

  it('expands and collapses an entry, and never mutates the old state', () => {
    const once = toggleEntry(initialState, 'a');
    expect(once.expanded).toEqual(['a']);
    const twice = toggleEntry(once, 'a');
    expect(twice.expanded).toEqual([]);
    expect(initialState.expanded).toEqual([]);
  });

  it('keeps every section reachable', () => {
    for (const s of WORKLOG.sections) {
      expect(currentSection(selectSection(initialState, s.id), WORKLOG)?.id).toBe(s.id);
    }
  });
});
