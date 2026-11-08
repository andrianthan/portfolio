import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

function block(header: string): string {
  const start = css.indexOf(header);
  if (start === -1) throw new Error(`missing ${header}`);
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i);
  }
  throw new Error('unterminated');
}
function token(body: string, name: string): string {
  const m = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(body);
  if (!m) throw new Error(`missing --${name}`);
  return m[1].toLowerCase();
}
function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const themes: [string, string][] = [
  ['vapor', ':root {'],
  ['light', ':root[data-theme="light"]'],
];

describe.each(themes)('%s palette', (_name, header) => {
  const body = block(header);
  it.each([['fg', 'bg'], ['muted', 'bg'], ['accent', 'bg'], ['num', 'bg'], ['fg', 'card'], ['muted', 'card']])(
    '%s on %s is AA',
    (fg, bg) => {
      expect(ratio(token(body, `color-${fg}`), token(body, `color-${bg}`))).toBeGreaterThanOrEqual(4.5);
    },
  );
});

describe('palette hue', () => {
  it('has no pink: the vapor accent and gradient stops are violet or lavender', () => {
    const body = block(':root {');
    for (const name of ['color-accent', 'color-num', 'grad-a', 'grad-b']) {
      const hex = token(body, name);
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      expect(b).toBeGreaterThan(r); // blue leads red: purple side of magenta
      expect(b).toBeGreaterThan(g);
    }
  });
});
