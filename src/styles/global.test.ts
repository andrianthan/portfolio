import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/global.css'), 'utf8');

describe('global.css after the redesign', () => {
  it('has dropped every home-only rule', () => {
    for (const gone of ['body::before', 'body::after', '.hero', '.chat', '.intro-', '.topics', '.stat', '.job', '.prow', '.plist', '.globe', '.skills-legend', '#theme-toggle', '.reveal', '.tl', '.about', '.bar-nav', '.avatar', 'cursor']) {
      expect(css, gone).not.toContain(gone);
    }
  });

  it('keeps the rules the work and project pages still use', () => {
    for (const kept of ['.detail', '.prose', '.flow', '.node', '.dec', '.facts', '.next', '.meta', '.kicker', '.lede', 'header.ph', '.shot', '.bar']) {
      expect(css, kept).toContain(kept);
    }
  });
});
