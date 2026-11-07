import { describe, it, expect } from 'vitest';
import { DEFAULT_CRITERIA } from './catalog';
import { parseCommand, initEditor, preview, apply, undo, TOKEN_TTL_MS } from './criteria';

describe('parseCommand', () => {
  it('parses threshold changes', () => {
    expect(parseCommand('raise the score threshold to 7')).toEqual({ kind: 'threshold', which: 'email', value: 7 });
    expect(parseCommand('set the sheet threshold to 4.5')).toEqual({ kind: 'threshold', which: 'sheet', value: 4.5 });
  });
  it('parses weight changes by flag label', () => {
    expect(parseCommand('set reporting burden weight to 3')).toEqual({ kind: 'weight', flag: 'reporting', value: 3 });
  });
  it('parses undo and rejects nonsense', () => {
    expect(parseCommand('undo')).toEqual({ kind: 'undo' });
    expect(parseCommand('make it sparkle')).toBeNull();
  });
});

describe('two-phase editor', () => {
  const t0 = 1_000_000;
  const seven = { kind: 'threshold' as const, which: 'email' as const, value: 7 };
  const prev = () => { const p = preview(initEditor(DEFAULT_CRITERIA), seven, t0); if (!p.result.ok) throw new Error('preview failed'); return { state: p.state, result: p.result }; };

  it('preview changes nothing until apply', () => {
    const { state, result } = preview(initEditor(DEFAULT_CRITERIA), seven, t0);
    expect(result.ok).toBe(true);
    expect(state.criteria.emailThreshold).toBe(6);
  });
  it('apply with the token changes the value and records history', () => {
    const p = prev();
    const a = apply(p.state, p.result.token, t0 + 1000);
    expect(a.ok).toBe(true);
    expect(a.state.criteria.emailThreshold).toBe(7);
    expect(a.state.history).toHaveLength(1);
  });
  it('a token is single-use', () => {
    const p = prev();
    const a = apply(p.state, p.result.token, t0);
    expect(apply(a.state, p.result.token, t0).ok).toBe(false);
  });
  it('an expired token is rejected', () => {
    const p = prev();
    expect(apply(p.state, p.result.token, t0 + TOKEN_TTL_MS + 1).ok).toBe(false);
  });
  it('an unknown token is rejected', () => {
    expect(apply(initEditor(DEFAULT_CRITERIA), 'nope', t0).ok).toBe(false);
  });
  it('undo restores the previous criteria', () => {
    const p = prev();
    const a = apply(p.state, p.result.token, t0);
    const u = undo(a.state);
    expect(u.ok).toBe(true);
    expect(u.state.criteria.emailThreshold).toBe(6);
  });
  it('undo with no history is a no-op', () => {
    expect(undo(initEditor(DEFAULT_CRITERIA)).ok).toBe(false);
  });
  it('rejects out-of-range values', () => {
    expect(preview(initEditor(DEFAULT_CRITERIA), { kind: 'threshold', which: 'email', value: 12 }, t0).result.ok).toBe(false);
    expect(preview(initEditor(DEFAULT_CRITERIA), { kind: 'weight', flag: 'mission', value: 99 }, t0).result.ok).toBe(false);
  });
  it('diff text names what changes', () => {
    const { result } = prev();
    expect(result.diff).toContain('6');
    expect(result.diff).toContain('7');
  });
  it('a weight edit applies to the right flag only', () => {
    const p = preview(initEditor(DEFAULT_CRITERIA), { kind: 'weight', flag: 'reporting', value: 4 }, t0);
    if (!p.result.ok) throw new Error('x');
    const a = apply(p.state, p.result.token, t0);
    expect(a.state.criteria.weights.reporting).toBe(4);
    expect(a.state.criteria.weights.mission).toBe(DEFAULT_CRITERIA.weights.mission);
  });
});
