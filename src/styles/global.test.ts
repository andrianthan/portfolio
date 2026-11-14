import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/global.css'), 'utf8');
const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('global.css after the redesign', () => {
  it('has dropped every home-only rule', () => {
    for (const gone of ['body::before', 'body::after', '.hero', '.chat', '.intro-', '.topics', '.stat', '.job', '.prow', '.plist', '.globe', '.skills-legend', '#theme-toggle', '.reveal', '.tl', '.about', '.bar-nav', '.avatar', 'cursor']) {
      expect(css, gone).not.toContain(gone);
    }
  });

  it('keeps the rules the work and project pages still use', () => {
    for (const kept of ['.detail', '.prose', '.prose li > ul', '.flow', '.node', '.dec', '.facts', '.next', '.meta', '.kicker', '.lede', 'header.ph', '.shot', '.bar']) {
      expect(css, kept).toContain(kept);
    }
  });
});

describe('the site focus ring', () => {
  it('covers links, buttons and selects in one rule', () => {
    const rule = rules.match(/[^{}]*focus-visible[^{}]*\{[^}]*\}/g)?.join('\n') ?? '';
    // the calendar's year switch is a <select>: it needs the same ring as everything else
    expect(rule).toMatch(/\ba:focus-visible\b/);
    expect(rule).toMatch(/\bbutton:focus-visible\b/);
    expect(rule).toMatch(/\bselect:focus-visible\b/);
  });

  it('draws the ring in the accent colour, offset so it clears the control', () => {
    const rule = rules.match(/[^{}]*select:focus-visible[^{}]*\{[^}]*\}/)?.[0] ?? '';
    expect(rule).toContain('outline: 2px solid var(--color-accent)');
    expect(rule).toContain('outline-offset: 3px');
  });

  it('does not leave a select on the user-agent outline alone', () => {
    expect(rules).not.toMatch(/select[^{}]*\{[^}]*outline:\s*none/);
    expect(rules).not.toMatch(/select[^{}]*\{[^}]*outline:\s*0/);
  });
});
