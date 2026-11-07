import { describe, it, expect } from 'vitest';
import fixture from '../../agent/fixtures/snapshot.json';
import { fallbackSections } from './fallback';
import type { Snapshot } from '../../agent/types';

const snapshot = fixture as unknown as Snapshot;

describe('fallback sections', () => {
  it('covers the content the agent serves', () => {
    const sections = fallbackSections(snapshot);
    const headings = sections.map((section) => section.heading);
    expect(headings).toContain('Experience');
    expect(headings).toContain('Projects');
    expect(headings).toContain('Skills');
    expect(headings).toContain('Contact');
    expect(headings).toContain('About');
  });

  it('lists every listed role and project', () => {
    const sections = fallbackSections(snapshot);
    const roles = sections.find((section) => section.heading === 'Experience')!;
    // One item per role entry, not per chunk: a cleared multi-project role
    // carries a summary chunk plus one body chunk per section.
    const entries = new Set(
      snapshot.chunks.filter((c) => c.kind === 'role').map((c) => c.id.split('#')[0]),
    );
    expect(roles.items.length).toBe(entries.size);
  });

  it('links every item', () => {
    for (const section of fallbackSections(snapshot)) {
      for (const item of section.items) {
        expect(item.url.length).toBeGreaterThan(0);
        expect(item.label.length).toBeGreaterThan(0);
      }
    }
  });

  it('never shows a draft marker', () => {
    const marker = '[' + 'to confirm';
    for (const section of fallbackSections(snapshot)) {
      for (const item of section.items) expect(item.text.toLowerCase()).not.toContain(marker);
    }
  });
});
