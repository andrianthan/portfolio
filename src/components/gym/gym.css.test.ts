import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(new URL('./gym.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const globalCss = fs.readFileSync(path.join(process.cwd(), 'src/styles/global.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

describe('gym.css', () => {
  it('marks future days with a dashed border, not reduced opacity', () => {
    const rule = css.match(/\.gym-future\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule![1]).toContain('border-style: dashed');
    expect(rule![1]).not.toContain('opacity');
  });
  it('the year switch is a plain select, so the site focus ring covers it', () => {
    // it must not be styled in a way that hides the ring (no outline: none of its own)
    const rule = css.match(/\.gym-year[^{}]*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule![1]).not.toMatch(/outline:\s*(none|0)/);
    expect(globalCss).toMatch(/select:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--color-accent\)/);
  });
});
