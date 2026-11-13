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
});
