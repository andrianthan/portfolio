import { describe, it, expect } from 'vitest';
import { parseStored, currentTheme, nextTheme } from './theme';

describe('theme resolution', () => {
  it('parses stored values and maps the legacy dark value to vapor', () => {
    expect(parseStored('light')).toBe('light');
    expect(parseStored('vapor')).toBe('vapor');
    expect(parseStored('dark')).toBe('vapor');
    expect(parseStored('banana')).toBeNull();
    expect(parseStored(null)).toBeNull();
  });
  it('uses the stored choice over the OS preference', () => {
    expect(currentTheme('vapor', true)).toBe('vapor');
    expect(currentTheme('light', false)).toBe('light');
  });
  it('defaults to vapor, and to light only for a light OS with no saved choice', () => {
    expect(currentTheme(null, false)).toBe('vapor');
    expect(currentTheme(null, true)).toBe('light');
  });
  it('flips to the other theme', () => {
    expect(nextTheme('vapor', false)).toBe('light');
    expect(nextTheme('light', false)).toBe('vapor');
    expect(nextTheme(null, true)).toBe('vapor');
    expect(nextTheme(null, false)).toBe('light');
  });
});
