import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/global.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

describe('the site focus ring', () => {
  it('covers links, buttons and selects in one rule', () => {
    const rule = css.match(/[^{}]*focus-visible[^{}]*\{[^}]*\}/g)?.join('\n') ?? '';
    // the calendar's year switch is a <select>: it needs the same ring as everything else
    expect(rule).toMatch(/\ba:focus-visible\b/);
    expect(rule).toMatch(/\bbutton:focus-visible\b/);
    expect(rule).toMatch(/\bselect:focus-visible\b/);
  });

  it('draws the ring in the accent colour, offset so it clears the control', () => {
    const rule = css.match(/[^{}]*select:focus-visible[^{}]*\{[^}]*\}/)?.[0] ?? '';
    expect(rule).toContain('outline: 2px solid var(--color-accent)');
    expect(rule).toContain('outline-offset: 3px');
  });

  it('does not leave a select on the user-agent outline alone', () => {
    expect(css).not.toMatch(/select[^{}]*\{[^}]*outline:\s*none/);
    expect(css).not.toMatch(/select[^{}]*\{[^}]*outline:\s*0/);
  });
});
