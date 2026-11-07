import { FLAGS, type Criteria, type FlagId } from './catalog';

// Mirrors a two-phase-commit editor: a preview returns a one-time token, apply consumes it,
// every apply is recorded so it can be undone. Pure functions; time and counters are passed in.
export const TOKEN_TTL_MS = 15 * 60 * 1000;

export type Command =
  | { kind: 'threshold'; which: 'sheet' | 'email'; value: number }
  | { kind: 'weight'; flag: FlagId; value: number }
  | { kind: 'undo' };

interface Pending { before: Criteria; after: Criteria; expiresAtMs: number }
export interface EditorState { criteria: Criteria; pending: Record<string, Pending>; history: Criteria[]; counter: number }

export type PreviewResult =
  | { ok: true; token: string; diff: string; expiresAtMs: number }
  | { ok: false; error: string };

export function parseCommand(text: string): Command | null {
  const t = text.toLowerCase().trim();
  if (t === 'undo') return { kind: 'undo' };
  const th = t.match(/threshold\s+to\s+(\d+(?:\.\d+)?)/);
  if (th) return { kind: 'threshold', which: t.includes('sheet') ? 'sheet' : 'email', value: Number(th[1]) };
  const w = t.match(/weight\s+to\s+(\d+)/);
  if (w) {
    const flag = FLAGS.find((f) => t.includes(f.label.toLowerCase())) ?? FLAGS.find((f) => new RegExp(`\\b${f.id}\\b`).test(t));
    if (flag) return { kind: 'weight', flag: flag.id, value: Number(w[1]) };
  }
  return null;
}

export const initEditor = (criteria: Criteria): EditorState => ({ criteria, pending: {}, history: [], counter: 0 });

const labelOf = (id: FlagId) => FLAGS.find((f) => f.id === id)!.label;

export function preview(s: EditorState, cmd: Command, nowMs: number): { state: EditorState; result: PreviewResult } {
  if (cmd.kind === 'undo') return { state: s, result: { ok: false, error: 'Type "undo" on its own to undo the last applied change.' } };
  let after: Criteria;
  let diff: string;
  if (cmd.kind === 'threshold') {
    if (!(cmd.value >= 0 && cmd.value <= 10)) return { state: s, result: { ok: false, error: 'A threshold must be between 0 and 10.' } };
    const key = cmd.which === 'sheet' ? 'sheetThreshold' : 'emailThreshold';
    after = { ...s.criteria, [key]: cmd.value };
    diff = `${cmd.which === 'sheet' ? 'Sheet' : 'Email'} threshold: ${s.criteria[key]} → ${cmd.value}`;
  } else {
    if (!Number.isInteger(cmd.value) || cmd.value < 0 || cmd.value > 5) return { state: s, result: { ok: false, error: 'A weight must be a whole number from 0 to 5.' } };
    after = { ...s.criteria, weights: { ...s.criteria.weights, [cmd.flag]: cmd.value } };
    diff = `${labelOf(cmd.flag)} weight: ${s.criteria.weights[cmd.flag]} → ${cmd.value}`;
  }
  const counter = s.counter + 1;
  const token = `t${counter}`;
  const expiresAtMs = nowMs + TOKEN_TTL_MS;
  const state: EditorState = { ...s, counter, pending: { ...s.pending, [token]: { before: s.criteria, after, expiresAtMs } } };
  return { state, result: { ok: true, token, diff, expiresAtMs } };
}

export function apply(s: EditorState, token: string, nowMs: number): { state: EditorState; ok: boolean; message: string } {
  const p = s.pending[token];
  if (!p) return { state: s, ok: false, message: 'That token is unknown or was already used.' };
  const { [token]: _used, ...rest } = s.pending;
  if (nowMs > p.expiresAtMs) return { state: { ...s, pending: rest }, ok: false, message: 'That token expired. Preview the change again.' };
  return { state: { ...s, criteria: p.after, history: [...s.history, p.before], pending: rest }, ok: true, message: 'Applied. The grants below are re-scored.' };
}

export function undo(s: EditorState): { state: EditorState; ok: boolean; message: string } {
  const prev = s.history[s.history.length - 1];
  if (!prev) return { state: s, ok: false, message: 'Nothing to undo.' };
  return { state: { ...s, criteria: prev, history: s.history.slice(0, -1) }, ok: true, message: 'Undone.' };
}
