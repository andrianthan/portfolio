import { describe, it, expect } from 'vitest';
import { COMMANDS, completeCommand, recall } from './useTerminal';

describe('tab completion', () => {
  it('completes a unique command', () => {
    expect(completeCommand('/who')).toBe('/whoami');
    expect(completeCommand('/hel')).toBe('/help');
  });

  it('leaves an ambiguous command alone', () => {
    expect(completeCommand('/s')).toBe('/s');
  });

  it('leaves an unknown command alone', () => {
    expect(completeCommand('/zzz')).toBe('/zzz');
  });

  it('leaves plain text alone', () => {
    expect(completeCommand('tell me about tesla')).toBe('tell me about tesla');
  });

  it('lists every slash command the agent answers', () => {
    for (const command of ['/help', '/experience', '/projects', '/resume', '/about', '/skills', '/contact', '/clear', '/sound', '/hire', '/coffee', '/whoami']) {
      expect(COMMANDS).toContain(command);
    }
  });
});

describe('history recall', () => {
  it('returns nothing for an empty history', () => {
    expect(recall([], -1, -1)).toEqual({ value: '', index: -1 });
  });

  it('walks up to the newest command first', () => {
    expect(recall(['newest', 'older'], -1, -1)).toEqual({ value: 'newest', index: 0 });
  });

  it('keeps walking up', () => {
    expect(recall(['newest', 'older'], 0, -1)).toEqual({ value: 'older', index: 1 });
  });

  it('walks back down to an empty draft', () => {
    expect(recall(['newest', 'older'], 0, 1)).toEqual({ value: '', index: -1 });
  });
});
