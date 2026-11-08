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
