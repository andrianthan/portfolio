import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Skills section', () => {
  const astro = readFileSync(new URL('./Skills.astro', import.meta.url), 'utf8');
  it('follows the section convention and wires the globe', () => {
    expect(astro).toContain('<section class="s" id="skills">');
    expect(astro).toContain('class="eyebrow"');
    expect(astro).toContain('<SkillsGlobe />');
    expect(astro).toContain('class="grad"');
  });
  it('is wired into the home page after ProjectCards', () => {
    const index = readFileSync(new URL('../pages/index.astro', import.meta.url), 'utf8');
    expect(index.indexOf('<ProjectCards />')).toBeLessThan(index.indexOf('<Skills />'));
    expect(index).toContain("import Skills from '../components/Skills.astro'");
  });
});
