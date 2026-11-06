import { describe, it, expect } from 'vitest';
import { profile } from './profile';

// Built from parts so the literal draft marker never appears in a source file.
const DRAFT_MARKER = '[' + 'to confirm';

describe('profile', () => {
  it('has three about paragraphs and none of them is a draft', () => {
    expect(profile.about).toHaveLength(3);
    for (const p of profile.about) {
      expect(p.trim().length).toBeGreaterThan(20);
      expect(p.toLowerCase()).not.toContain(DRAFT_MARKER);
    }
  });

  it('has a one-line summary with no digits so the numeric rail can never ground it', () => {
    expect(profile.oneLine.length).toBeGreaterThan(10);
    expect(profile.oneLine).not.toMatch(/\d/);
    expect(profile.oneLine).not.toContain('\n');
  });

  it('groups skills with stable slugs and no duplicates', () => {
    expect(profile.skillGroups.length).toBeGreaterThanOrEqual(4);
    const slugs = profile.skillGroups.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const g of profile.skillGroups) {
      expect(g.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(g.label.length).toBeGreaterThan(0);
      expect(g.items.length).toBeGreaterThan(0);
      expect(new Set(g.items).size).toBe(g.items.length);
      for (const item of g.items) {
        expect(item.trim().length).toBeGreaterThan(0);
        expect(item.toLowerCase()).not.toContain(DRAFT_MARKER);
      }
    }
  });

  it('has reachable contact links', () => {
    expect(profile.contact.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(profile.contact.linkedin.startsWith('https://')).toBe(true);
    expect(profile.contact.github.startsWith('https://')).toBe(true);
    expect(profile.contact.resume).toBe('/resume.pdf');
  });

  it('carries the unaffiliated disclaimer verbatim', () => {
    expect(profile.disclaimer).toBe('Unaffiliated personal portfolio. Inspired by Claude Code. Not an Anthropic product.');
  });
});
