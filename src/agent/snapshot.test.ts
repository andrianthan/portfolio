import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { buildSnapshot, slugify, splitSections, stripMarkdown, type SnapshotEntryInput, type SnapshotInput } from './snapshot';
import { profile } from '../data/profile';

const contentDir = path.resolve(process.cwd(), 'src/content');

function readEntries(collection: 'work' | 'projects'): SnapshotEntryInput[] {
  const dir = path.join(contentDir, collection);
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => {
      const { data, content } = matter(fs.readFileSync(path.join(dir, name), 'utf8'));
      return {
        collection,
        id: name.replace(/\.md$/, '').toLowerCase(),
        title: collection === 'work' ? data.company : data.name,
        summary: data.summary,
        listed: data.listed !== false,
        cleared: data.cleared === true,
        body: content,
      };
    });
}

const realInput: SnapshotInput = {
  roles: readEntries('work'),
  projects: readEntries('projects'),
  profile,
};
const snapshot = buildSnapshot(realInput);

const marker = '[' + 'to confirm';

describe('snapshot of the real content', () => {
  it('has a version and at least one chunk', () => {
    expect(snapshot.version).toBe(1);
    expect(snapshot.chunks.length).toBeGreaterThan(0);
  });

  it('is sorted by id and has no duplicate ids', () => {
    const ids = snapshot.chunks.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(ids);
  });

  it('never carries the to-confirm marker', () => {
    for (const chunk of snapshot.chunks) {
      expect(chunk.text.toLowerCase()).not.toContain(marker);
    }
  });

  it('only carries role and project chunks for listed entries', () => {
    const listed = new Map(realInput.roles.concat(realInput.projects).map((e) => [`${e.collection === 'work' ? 'role' : 'project'}:${e.id}`, e]));
    for (const chunk of snapshot.chunks) {
      const key = chunk.id.split('#')[0];
      if (!key.startsWith('role:') && !key.startsWith('project:')) continue;
      const entry = listed.get(key);
      expect(entry).toBeDefined();
      expect(entry!.listed).toBe(true);
    }
  });

  it('only carries body sections for cleared entries', () => {
    const entries = new Map(realInput.roles.concat(realInput.projects).map((e) => [`${e.collection === 'work' ? 'role' : 'project'}:${e.id}`, e]));
    for (const chunk of snapshot.chunks) {
      if (!chunk.id.includes('#')) continue;
      const entry = entries.get(chunk.id.split('#')[0]);
      expect(entry).toBeDefined();
      expect(entry!.cleared).toBe(true);
    }
  });

  it('carries the tesla summary with its numbers as facts', () => {
    const tesla = snapshot.chunks.find((c) => c.id === 'role:tesla');
    expect(tesla).toBeDefined();
    expect(tesla!.text).toContain('32% better than baseline');
    expect(tesla!.facts).toContain('32%');
    expect(tesla!.text).not.toContain('**');
  });

  it('points a cleared entry at its own route', () => {
    const tesla = snapshot.chunks.find((c) => c.id === 'role:tesla')!;
    expect(tesla.url).toBe('/work/tesla');
  });

  it('carries the profile chunks', () => {
    expect(snapshot.chunks.some((c) => c.id === 'about:bio')).toBe(true);
    expect(snapshot.chunks.some((c) => c.id === 'contact:links')).toBe(true);
    for (const group of profile.skillGroups) {
      expect(snapshot.chunks.some((c) => c.id === `skill:${group.slug}`)).toBe(true);
    }
    expect(snapshot.chunks.some((c) => c.id === 'about:outside')).toBe(true);
    const about = snapshot.chunks.find((c) => c.id === 'about:bio')!;
    expect(about.text.startsWith(profile.oneLine)).toBe(true);
  });
});

describe('snapshot builder', () => {
  const fakeRole = (over: Partial<SnapshotEntryInput> = {}): SnapshotEntryInput => ({
    collection: 'work',
    id: 'acme',
    title: 'Acme',
    summary: 'Shipped a thing with **32%** fewer bugs.',
    listed: true,
    cleared: false,
    body: '## Problem\nThe problem was real.',
    ...over,
  });

  it('drops an entry that is not listed', () => {
    const s = buildSnapshot({ roles: [fakeRole({ listed: false })], projects: [], profile });
    expect(s.chunks.some((c) => c.id.startsWith('role:'))).toBe(false);
  });

  it('gives an uncleared entry only a summary chunk', () => {
    const s = buildSnapshot({ roles: [fakeRole()], projects: [], profile });
    const roles = s.chunks.filter((c) => c.id.startsWith('role:'));
    expect(roles).toHaveLength(1);
    expect(roles[0].url).toBe('/#experience');
  });

  it('adds body sections for a cleared entry and points at the detail page', () => {
    const s = buildSnapshot({ roles: [fakeRole({ cleared: true })], projects: [], profile });
    const body = s.chunks.find((c) => c.id === 'role:acme#problem');
    expect(body).toBeDefined();
    expect(body!.text).toBe('The problem was real.');
    expect(body!.url).toBe('/work/acme');
  });

  it('drops a section that still carries the to-confirm marker', () => {
    const s = buildSnapshot({
      roles: [fakeRole({ cleared: true, body: `## Problem\n${marker} later.` })],
      projects: [],
      profile,
    });
    expect(s.chunks.some((c) => c.id === 'role:acme#problem')).toBe(false);
  });

  it('builds a cleared project chunk', () => {
    const s = buildSnapshot({
      roles: [],
      projects: [{ collection: 'projects', id: 'thing', title: 'Thing', summary: 'A thing.', listed: true, cleared: true, body: '## Results\nIt worked.' }],
      profile,
    });
    expect(s.chunks.some((c) => c.id === 'project:thing')).toBe(true);
    expect(s.chunks.some((c) => c.id === 'project:thing#results')).toBe(true);
  });
});

describe('text helpers', () => {
  it('slugifies headings', () => {
    expect(slugify('Key decisions')).toBe('key-decisions');
    expect(slugify('Backend and data')).toBe('backend-and-data');
  });

  it('strips markdown and html but keeps the words', () => {
    expect(stripMarkdown('a **bold** claim and `code`')).toBe('a bold claim and code');
    expect(stripMarkdown('<p>hello</p>')).toBe('hello');
    // The heading marker is gone and both words survive. The line break stays because
    // stripMarkdown collapses runs of blank lines only; it keeps the paragraph structure.
    expect(stripMarkdown('## Head\nbody')).toBe('Head\nbody');
  });

  it('splits a body on level two headings', () => {
    const sections = splitSections('## One\nalpha\n## Two\nbeta');
    expect(sections).toHaveLength(2);
    expect(sections[0].heading).toBe('One');
    expect(sections[1].text.trim()).toBe('beta');
  });
});

describe('about:outside chunk', () => {
  const chunk = snapshot.chunks.find((c) => c.id === 'about:outside')!;
  it('is titled Outside of work and points at the section', () => {
    expect(chunk.title).toBe('Outside of work');
    expect(chunk.url).toBe('/#outside');
    expect(chunk.kind).toBe('about');
  });
  it('lists countries with years, states, trails, lifting and swimming', () => {
    expect(chunk.text).toContain('Japan (2023, 2024, 2026)');
    expect(chunk.text).toContain('Indonesia');
    expect(chunk.text).not.toMatch(/Indonesia \(/);
    expect(chunk.text).toContain('Colorado');
    expect(chunk.text).toContain('Point Lobos');
    expect(chunk.text).toContain('Yosemite');
    expect(chunk.text).not.toMatch(/Yosemite[^,.]*\d{4}/);
    expect(chunk.text).toContain('~1,105 lb');
    expect(chunk.text).toContain('50 Free');
  });
  it('gives Point Lobos both of its visit years', () => {
    // The spec lists "Point Lobos (2025, 2026)" and the manifest holds a photo
    // from each year.
    expect(chunk.text).toContain('Point Lobos (California, 2025, 2026)');
  });
  it('carries both spellings of the word it is retrieved by', () => {
    // The retriever is BM25 over raw tokens with no stemming, so the chunk has
    // to carry the American spelling as well as the British one or an American
    // visitor's question retrieves nothing.
    expect(chunk.text).toContain('travelled');
    expect(chunk.text).toContain('traveled');
  });
  it('publishes its swim times so the verifier sees clean numbers', () => {
    // The verifier's number pattern captures a trailing comma, so the compact
    // "50 Free :24," form was published as the token "24," and "1:53" as a bare
    // "1" and a "53,". The chunk spells the times out instead.
    expect(chunk.text).toContain('50 Free in 24 seconds');
    expect(chunk.text).toContain('200 Free in 1 minute 53 seconds');
    // The only facts that still carry a comma are the year lists the spec fixes
    // ("Japan (2023, 2024, 2026)") and the lifting total's thousands separator.
    const commaFacts = chunk.facts.filter((fact) => fact.includes(','));
    expect(commaFacts.every((fact) => /^\d{4},$/.test(fact) || fact === '1,105')).toBe(true);
    // No other fact ends in a stray comma, and no fact is a bare "1" left over
    // from a "1:53" split.
    expect(chunk.facts.some((fact) => fact === '1' && !chunk.text.includes('1 minute'))).toBe(false);
  });
  it('shows no year for any of the ten protected places', () => {
    // These ten never carry a year: Indonesia, Florida, Washington and Oregon
    // among the countries and states, and the six trails that have no year of
    // their own. A name carries a year when one appears inside its own
    // parenthetical -- "Yosemite (California, 2019)" -- or straight after it
    // -- "Yosemite 2019 (California)". The scan stops at the end of the name's
    // own clause, so a year on one place never flags its neighbour.
    const protectedNames = [
      'Indonesia',
      'Florida',
      'Washington',
      'Oregon',
      'Point Reyes',
      'Mission Peak',
      'Castle Rock State Park',
      'Pinnacles National Park',
      'Yosemite',
      'Mount Tamalpais',
    ];
    for (const name of protectedNames) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const withYear = new RegExp(`${escaped}\\s*(?:\\([^)]*\\d{4}[^)]*\\)|[^,.\\n]*\\d{4})`);
      expect(chunk.text, name).toContain(name);
      expect(chunk.text, name).not.toMatch(withYear);
    }
  });
  it('states the lifting and swimming facts in one sentence each', () => {
    const lines = chunk.text.split('\n');
    expect(lines).toHaveLength(4);
    expect(lines[2].startsWith('Lifting:')).toBe(true);
    expect(lines[3].startsWith('Swimming:')).toBe(true);
    // one sentence each: the sentence ends at its own full stop
    expect(lines[2].split('. ')).toHaveLength(1);
    expect(lines[3].split('. ')).toHaveLength(1);
  });
});
