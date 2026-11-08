import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const base = fs.readFileSync(path.join(root, 'src/layouts/Base.astro'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

describe('vapor fonts', () => {
  it('self-hosts exactly the title and pixel faces through fontsource', () => {
    expect(pkg.dependencies['@fontsource-variable/orbitron']).toBeTruthy();
    expect(pkg.dependencies['@fontsource/silkscreen']).toBeTruthy();
    expect(base).toContain("import '@fontsource-variable/orbitron/index.css'");
    expect(base).toContain("import '@fontsource/silkscreen/400.css'");
  });
  it('does not pull the vapor faces from a third-party host', () => {
    expect(base).not.toMatch(/fonts\.googleapis\.com[^"]*(Orbitron|Silkscreen)/);
  });
  it('preloads both self-hosted faces so the first paint already uses them', () => {
    const preloads = base.match(/<link rel="preload"[^>]*>/g) ?? [];
    expect(preloads).toHaveLength(2);
    for (const tag of preloads) {
      expect(tag).toContain('as="font"');
      expect(tag).toContain('type="font/woff2"');
      expect(tag).toContain('crossorigin');
    }
    expect(base).toContain('orbitron-latin-wght-normal.woff2');
    expect(base).toContain('silkscreen-latin-400-normal.woff2');
  });
});
