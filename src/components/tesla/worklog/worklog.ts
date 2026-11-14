import { WORKLOG, type WorklogDoc, type WorklogEntry } from './content';

export type WorklogView = 'headline' | 'section';
export interface WorklogState { view: WorklogView; sectionId: string | null; expanded: string[] }

export const initialState: WorklogState = { view: 'headline', sectionId: null, expanded: [] };

export function selectSection(state: WorklogState, sectionId: string): WorklogState {
  const section = WORKLOG.sections.find((s) => s.id === sectionId);
  if (!section) return state;
  return { ...state, view: 'section', sectionId };
}

export function selectHeadline(state: WorklogState): WorklogState {
  return { ...state, view: 'headline', sectionId: null };
}

export function toggleEntry(state: WorklogState, key: string): WorklogState {
  const expanded = state.expanded.includes(key)
    ? state.expanded.filter((k) => k !== key)
    : [...state.expanded, key];
  return { ...state, expanded };
}

export function currentSection(state: WorklogState, doc: WorklogDoc) {
  if (state.view !== 'section' || state.sectionId === null) return null;
  return doc.sections.find((s) => s.id === state.sectionId) ?? null;
}

// The headline tab shows the headline result plus two entries that stand in for
// the log's front matter: what the document covers, and what it is evidence of.
// Words only — a digit here would have to join the public-number allowlist.
export function visibleEntries(state: WorklogState, doc: WorklogDoc): WorklogEntry[] {
  if (state.view === 'headline' || currentSection(state, doc) === null) {
    return [
      { label: doc.headline.label, detail: doc.headline.detail },
      { label: 'Scope', detail: doc.note },
      { label: 'Evidence', detail: 'Drawn from the six sections of the log, each covering one shipped system and what made it hold up.' },
    ];
  }
  return currentSection(state, doc)!.entries;
}
