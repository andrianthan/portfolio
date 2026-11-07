import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import SkillsGlobe from './SkillsGlobe';
import { GLOBE_SKILLS } from '../lib/skillIcons';

const html = renderToStaticMarkup(<SkillsGlobe items={GLOBE_SKILLS} />);
const count = (needle: string) => html.split(needle).length - 1;

describe('SkillsGlobe static markup', () => {
  it('renders one node per item with its label', () => {
    expect(count('class="globe-node"')).toBe(GLOBE_SKILLS.length);
    for (const item of GLOBE_SKILLS) expect(html).toContain(item.label);
  });
  it('renders an icon svg in every node', () => {
    expect(count('<svg')).toBe(GLOBE_SKILLS.length);
  });
  it('keeps the animated structure aria-hidden and exposes a plain list', () => {
    expect(count('aria-hidden="true"')).toBeGreaterThanOrEqual(2);
    expect(count('<li>')).toBe(GLOBE_SKILLS.length);
    expect(html).toContain('sr-only');
  });
  it('renders the wireframe canvas', () => {
    expect(count('<canvas class="globe-wire"')).toBe(1);
  });
});
