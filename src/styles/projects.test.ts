import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/projects.css'), 'utf8');

// Comments carry braces and words that look like selectors, so they come out
// before anything is parsed.
const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');

/** The body of the block whose braces start after `start`. */
function body(text: string, start: number): string {
  const open = text.indexOf('{', start);
  if (open === -1) throw new Error('unterminated block');
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(open + 1, i);
    }
  }
  throw new Error('unterminated block');
}

/** The body of the `@media (min-width: Npx)` block. */
function media(minWidth: number): string {
  const header = `@media (min-width: ${minWidth}px)`;
  const start = rules.indexOf(header);
  if (start === -1) throw new Error(`missing ${header}`);
  return body(rules, start);
}

/** The declarations of the first rule with exactly this selector. */
function rule(text: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(?:^|[{}])\\s*${escaped}\\s*\\{`).exec(text);
  if (!match) throw new Error(`missing rule ${selector}`);
  return body(text, match.index + match[0].length - 1);
}

describe('the project index', () => {
  const rail = media(1200);
  const railToc = rule(rail, '.toc');

  it('has a rail block from 1200px', () => {
    expect(rules).toContain('@media (min-width: 1200px)');
  });

  it('pins the index to the viewport as a fixed rail', () => {
    expect(railToc).toContain('position: fixed');
    expect(railToc).toContain('top: var(--toc-rail-top)');
  });

  it('places the rail beside the column, in rem so it follows the measure', () => {
    expect(railToc).toMatch(/left:[^;]*23rem/);
    expect(railToc).not.toContain('368px');
  });

  it('never lets the rail grow wider than the gutter it sits in', () => {
    expect(railToc).toMatch(/width:\s*min\(/);
  });

  it('gives the rail no background of its own', () => {
    expect(railToc).toContain('background: none');
  });

  it('hides the down arrow in the rail', () => {
    expect(rule(rail, '.toc .go')).toContain('display: none');
  });

  it('keeps the stuck list from 900px', () => {
    expect(rule(media(900), '.toc')).toContain('position: sticky');
  });
});
