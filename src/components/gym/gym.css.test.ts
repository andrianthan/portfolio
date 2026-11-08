import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('./gym.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

describe('gym.css', () => {
  it('the year arrows dim with aria-disabled, not the disabled attribute', () => {
    expect(css).toMatch(/\.gym-nav\[aria-disabled="true"\]\s*\{[^}]*opacity/);
  });
  it('is rid of the month calendar and phase list styles', () => {
    for (const dead of ['.gym-grid', '.gym-row', '.gym-dow', '.gym-cell', '.gym-blank', '.gym-went', '.gym-future', '.gym-status', '.gym-summary', '.gym-phases', '.gym-year']) {
      expect(css).not.toContain(dead);
    }
  });
  it('has no animation or transition, so reduced-motion needs no override', () => {
    expect(css).not.toMatch(/\btransition\s*:|@keyframes|\banimation\s*:/);
  });
  it('stat items go two to a row under 640px', () => {
    expect(css).toMatch(/@media \(max-width: 639px\)\s*\{[^}]*\.gym-stats[^}]*repeat\(2,/);
  });
});
