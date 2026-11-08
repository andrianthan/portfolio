import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('./gym.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

describe('gym.css', () => {
  it('marks future days with a dashed border, not reduced opacity', () => {
    const rule = css.match(/\.gym-future\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule![1]).toContain('border-style: dashed');
    expect(rule![1]).not.toContain('opacity');
  });
});
