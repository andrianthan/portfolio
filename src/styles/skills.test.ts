import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/global.css'), 'utf8');
const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('skills globe styles', () => {
  it('fills brand icon paths via the child selector only, so glyph strokes are not overwritten', () => {
    // Brand SVGs are direct children of .globe-node; glyph SVGs live inside
    // span.globe-glyph and must keep their own fill="none" + strokes.
    expect(rules).toContain('.globe-node > svg path { fill: currentColor; }');
    expect(rules).not.toContain('.globe-node svg path { fill: currentColor; }');
  });
  it('does not declare a transition on .globe-node that nothing else sets', () => {
    expect(rules).not.toMatch(/transition:\s*none;\s*\}\s*\}\s*$/);
  });
});
