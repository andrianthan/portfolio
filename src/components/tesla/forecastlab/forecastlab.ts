import { series } from '../fixtures';

export type Phase = 'idle' | 'previewed' | 'committed';
export interface FLState { selected: string[]; backtest: boolean; phase: Phase }
export interface PreviewRow { partId: string; current: number; proposed: number; delta: number }

export const initialState: FLState = { selected: [], backtest: false, phase: 'idle' };

export function toggle(s: FLState, partId: string): FLState {
  const selected = s.selected.includes(partId) ? s.selected.filter((p) => p !== partId) : [...s.selected, partId];
  return { ...s, selected, phase: 'idle' };
}

export function setBacktest(s: FLState, on: boolean): FLState {
  return { ...s, backtest: on };
}

function partNumber(partId: string): number {
  return Number(partId.replace(/\D/g, '')) || 0;
}

function field(partId: string, salt: number): number {
  return series(partNumber(partId) * 7 + salt, 1, 500, 200)[0];
}

export function rowFor(partId: string): PreviewRow {
  const current = field(partId, 1);
  const proposed = field(partId, 2);
  return { partId, current, proposed, delta: proposed - current };
}

// Weekly forecast values for the chart, deterministic per part.
export function forecastSeries(partId: string): number[] {
  return series(partNumber(partId) * 7 + 3, 12, 500, 200);
}

export function dryRun(s: FLState): { state: FLState; rows: PreviewRow[] } {
  if (s.selected.length === 0) return { state: s, rows: [] };
  return { state: { ...s, phase: 'previewed' }, rows: s.selected.map(rowFor) };
}

export function commit(s: FLState): FLState {
  return s.phase === 'previewed' ? { ...s, phase: 'committed' } : s;
}
