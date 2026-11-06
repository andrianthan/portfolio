import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/terminal.css'), 'utf8');

function token(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  if (!match) throw new Error(`missing token --${name}`);
  return match[1].toLowerCase();
}

function luminance(hex: string): number {
  const channels = [1, 3, 5]
    .map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const first = luminance(a);
  const second = luminance(b);
  const light = Math.max(first, second);
  const dark = Math.min(first, second);
  return (light + 0.05) / (dark + 0.05);
}

describe('terminal palette', () => {
  it('uses the palette from the design spec', () => {
    expect(token('term-bg')).toBe('#1b1917');
    expect(token('term-fg')).toBe('#e9e5de');
    expect(token('term-muted')).toBe('#948d83');
    expect(token('term-rule')).toBe('#34302c');
    expect(token('term-accent')).toBe('#e07a5f');
    expect(token('term-ok')).toBe('#7fb88a');
    expect(token('term-fail')).toBe('#e57373');
  });

  it('keeps every text color at AA against the terminal background', () => {
    const bg = token('term-bg');
    for (const name of ['term-fg', 'term-muted', 'term-accent', 'term-ok', 'term-fail']) {
      expect(contrast(token(name), bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('uses no color outside the token block', () => {
    const hexes = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(new Set(hexes.map((hex) => hex.toLowerCase())).size).toBe(7);
  });
});
