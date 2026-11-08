import type { MockPart } from '../fixtures';

export type SubTab = 'overview' | 'consumption' | 'failures' | 'location' | 'codes' | 'breakdown';

export const SUBTABS: readonly { id: SubTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'consumption', label: 'Consumption' },
  { id: 'failures', label: 'Failure rates' },
  { id: 'location', label: 'Location × build year' },
  { id: 'codes', label: 'Correction codes' },
  { id: 'breakdown', label: 'Breakdown' },
];

export interface PSState { query: string; partId: string | null; tab: SubTab; message: string }

export const initialState: PSState = { query: '', partId: null, tab: 'overview', message: '' };

export function matches(query: string, parts: readonly MockPart[]): MockPart[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return parts.filter((p) => p.id.toLowerCase() === q || p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
}

export function search(s: PSState, query: string, parts: readonly MockPart[]): PSState {
  const hit = matches(query, parts)[0];
  if (!hit) return { ...s, query, partId: null, message: `No part matches "${query}".` };
  return { ...s, query, partId: hit.id, tab: 'overview', message: '' };
}

export function selectTab(s: PSState, tab: SubTab): PSState {
  if (s.partId === null) return s;
  return { ...s, tab };
}
