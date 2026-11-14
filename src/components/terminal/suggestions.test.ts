import { describe, it, expect } from 'vitest';
import fixture from '../../agent/fixtures/snapshot.json';
import { runAgent } from '../../agent/run';
import type { Snapshot } from '../../agent/types';
import { SUGGESTIONS, pickSuggestions } from './suggestions';

const snapshot = fixture as unknown as Snapshot;

describe('suggestions', () => {
  it('has six unique questions', () => {
    expect(SUGGESTIONS.length).toBe(6);
    expect(new Set(SUGGESTIONS).size).toBe(6);
  });
  it('every question gets a grounded answer, never a refusal', () => {
    for (const q of SUGGESTIONS) {
      const result = runAgent(snapshot, q);
      expect(result.refused, q).toBe(false);
      expect(result.answer, q).not.toBeNull();
    }
  });
  it('rotates a window of three and wraps', () => {
    expect(pickSuggestions(0)).toEqual(SUGGESTIONS.slice(0, 3));
    expect(pickSuggestions(1)).toEqual(SUGGESTIONS.slice(3, 6));
    expect(pickSuggestions(2)).toEqual(SUGGESTIONS.slice(0, 3));
    expect(pickSuggestions(1, 4)).toEqual([SUGGESTIONS[4], SUGGESTIONS[5], SUGGESTIONS[0], SUGGESTIONS[1]]);
  });
});
