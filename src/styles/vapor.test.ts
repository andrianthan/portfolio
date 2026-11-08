import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const vapor = read('src/styles/vapor.css');
const global = read('src/styles/global.css');

describe('vapor backdrop', () => {
  it('moves layers with transform only', () => {
    const layers = vapor.match(/\.vb-(neb|far|mid|near)\s*\{[^}]*\}/g) ?? [];
    expect(layers.length).toBe(4);
    for (const rule of layers) {
      expect(rule).toContain('transform:');
      expect(rule).not.toMatch(/\b(top|left|margin)\s*:/);
    }
  });
  it('keeps the backdrop behind content and out of the pointer path', () => {
    expect(vapor).toMatch(/\.vb\s*\{[^}]*position:\s*fixed[^}]*z-index:\s*-1[^}]*pointer-events:\s*none/);
  });
  it('has a reduced-motion block that stills the layers', () => {
    expect(vapor).toContain('@media (prefers-reduced-motion: reduce)');
  });
  it('loads after global.css (so its rules win ties) and the old cursor field is gone', () => {
    const base = fs.readFileSync(path.join(process.cwd(), 'src/layouts/Base.astro'), 'utf8');
    expect(base).toContain("import '../styles/vapor.css'");
    expect(base.indexOf("import '../styles/global.css'")).toBeGreaterThanOrEqual(0);
    expect(base.indexOf("import '../styles/global.css'")).toBeLessThan(base.indexOf("import '../styles/vapor.css'"));
    expect(global).not.toContain('vapor.css');
    expect(global).not.toContain('body::before');
    expect(global).not.toContain('html:hover body::after');
    expect(global).not.toContain('(hover: none)');
  });
});

describe('vapor scene', () => {
  it('moves the orbit rings with transform only and stills them under reduced motion', () => {
    expect(vapor).toMatch(/@keyframes orbit\s*\{\s*to\s*\{\s*transform:/);
    // later tasks append more reduced-motion blocks, so read all of them
    const rm = vapor.split('@media (prefers-reduced-motion: reduce)').slice(1).join('\n');
    expect(rm).toMatch(/\.ring\s*\{[^}]*animation:\s*none/);
  });
  it('pauses the orbit rings while the hero is off-screen or hidden', () => {
    expect(vapor).toMatch(/\.hero-scene\.is-paused \.ring\s*\{[^}]*animation-play-state:\s*paused/);
  });
  it('shows the text fallback only without JavaScript', () => {
    expect(vapor).toMatch(/\.js \.ascii-fallback\s*\{\s*display:\s*none/);
  });
  it('no longer carries the old hero rules', () => {
    expect(global).not.toContain('.avatar');
    expect(global).not.toContain('h1 .w');
    expect(global).not.toContain('@keyframes bi');
  });
  it('is sticky, with matching scroll padding, only where the bar is one row tall', () => {
    const start = vapor.indexOf('@media (min-width: 860px)');
    expect(start).toBeGreaterThanOrEqual(0);
    let depth = 0, end = vapor.indexOf('{', start);
    for (let k = end; k < vapor.length; k++) {
      if (vapor[k] === '{') depth++;
      else if (vapor[k] === '}' && --depth === 0) { end = k; break; }
    }
    const block = vapor.slice(start, end + 1);
    expect(block).toMatch(/\.vbar\s*\{[^}]*position:\s*sticky/);
    expect(block).toContain('scroll-padding-top');
    expect(global).not.toContain('scroll-padding-top');
  });
  it('keeps chip focus while thinking: aria-disabled, never :disabled', () => {
    expect(vapor).toContain('.intro-chip[aria-disabled="true"]');
    expect(vapor).not.toContain('.intro-chip:disabled');
  });
});

describe('vapor typography', () => {
  it('section headings use the pixel face and no gradient clip', () => {
    const m = vapor.match(/\.sh h2\s*\{[^}]*\}/)?.[0] ?? '';
    expect(m).toContain('var(--font-pixel)');
    expect(m).not.toContain('background-clip: text');
  });
  it('never sets the pixel face below 11px', () => {
    for (const m of vapor.matchAll(/font:\s*\d+\s+(\d+)px[^;]*var\(--font-pixel\)/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(11);
  });
  it('keeps paragraphs on the readable sans', () => {
    expect(vapor).not.toMatch(/(^|\n)\s*(p|\.prose)\s*\{[^}]*var\(--font-pixel\)/);
  });
});

describe('vapor backdrop-filter prefix', () => {
  it('keeps -webkit-backdrop-filter only inside @supports (the minifier merges prefixed pairs)', () => {
    const outside = vapor.replace(/@supports[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
    expect(outside).not.toContain('-webkit-backdrop-filter');
    expect(vapor).toMatch(/@supports\s*\(-webkit-backdrop-filter:\s*blur\(1px\)\)/);
  });
});
