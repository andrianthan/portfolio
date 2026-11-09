import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const page = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/work/[slug].astro'), 'utf8');

/**
 * The demo the template's `demoFor` gives a heading id.
 *
 * The function is read out of the template and run, so the test pins what the
 * mapping *returns* rather than the fact that the strings are in the file. A
 * swap that put the listings demo under the intake project left every other
 * gate green, because nothing said which demo belonged to which project.
 */
function demoFor(id: string): string | null {
  const body = page.match(/function demoFor\(id: string\): Demo \| null \{([\s\S]*?)\n\}/);
  expect(body, 'the template\'s demoFor function').toBeTruthy();
  const source = body![1];
  const rules = [...source.matchAll(/if \(id\.startsWith\('([^']+)'\)\) return '([^']+)';/g)];
  expect(rules.length, 'the demoFor rules').toBeGreaterThan(0);
  for (const rule of rules) {
    if (id.startsWith(rule[1])) return rule[2];
  }
  return null;
}

describe('the akpsi page in the template', () => {
  it('is a multi-project page', () => {
    expect(page).toMatch(/const MULTI = new Set\(\[[^\]]*'akpsi'/);
  });

  it('has a demo for both of its projects', () => {
    expect(page).toMatch(/type Demo = [^;]*'intake'/);
    expect(page).toMatch(/type Demo = [^;]*'listings'/);
  });

  it('routes each project heading to its own demo island, visible-hydrated', () => {
    expect(page).toContain("id.startsWith('membership-intake')");
    expect(page).toContain("id.startsWith('opportunity-bot')");
    expect(page).toMatch(/<IntakeDemo client:visible \/>/);
    expect(page).toMatch(/<ListingsDemo client:visible \/>/);
  });

  it('gives the membership intake project the intake demo', () => {
    // The heading ids are the ones the page's own content produces.
    expect(demoFor('membership-intake-automation')).toBe('intake');
  });

  it('gives the opportunity bot project the listings demo', () => {
    expect(demoFor('opportunity-bot')).toBe('listings');
  });

  it('does not give either project the other one\'s demo', () => {
    expect(demoFor('membership-intake-automation')).not.toBe('listings');
    expect(demoFor('opportunity-bot')).not.toBe('intake');
  });
});
