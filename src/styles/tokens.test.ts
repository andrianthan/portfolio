import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');

function hex(name: string): string {
  const m = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  if (!m) throw new Error(`missing hex token --${name}`);
  return m[1].toLowerCase();
}

function luminance(h: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('tokens', () => {
  it('is dark only', () => {
    expect(css).toContain('color-scheme: dark');
    expect(css).not.toContain('data-theme');
    expect(css).not.toContain('prefers-color-scheme');
  });

  it('keeps every token name the rest of the site reads', () => {
    for (const name of [
      'font-sans', 'font-serif', 'font-mono', 'color-bg', 'color-fg', 'color-muted', 'color-rule',
      'color-accent', 'color-num', 'color-chip', 'color-card', 'color-dot', 'color-glow',
      'color-logo-bg', 'color-glass', 'color-mask', 'grad-a', 'grad-b', 'space-sm', 'space-md',
      'space-lg', 'space-xl', 'measure', 'scene-deep', 'scene-mid', 'scene-bright', 'scene-glow',
      'font-title', 'font-pixel', 'title-glow', 'color-card-solid',
    ]) {
      expect(css, `--${name}`).toMatch(new RegExp(`--${name}:`));
    }
  });

  it('keeps text readable against the brightest expected scene color', () => {
    const bright = hex('scene-bright');
    expect(contrast(hex('color-fg'), bright)).toBeGreaterThanOrEqual(7);
    expect(contrast(hex('color-muted'), bright)).toBeGreaterThanOrEqual(4.5);
  });
});
