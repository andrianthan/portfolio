import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const page = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/work/[slug].astro'), 'utf8');
const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/projects.css'), 'utf8');

describe('the tesla page in the template', () => {
  it('is a multi-project page', () => {
    expect(page).toMatch(/const MULTI = new Set\(\[[^\]]*'tesla'/);
  });

  it('routes the work log section to its window', () => {
    expect(page).toContain("id.startsWith('work-log')");
    expect(page).toContain('WorklogDemo');
  });

  it('renders the window as a visible island', () => {
    expect(page).toMatch(/<WorklogDemo client:visible \/>/);
  });

  it('sizes the sticky contents list for six rows', () => {
    const m = css.match(/--toc-list-height:\s*(\d+)px/);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeGreaterThanOrEqual(280);
  });
});
