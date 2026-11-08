import { describe, it, expect } from 'vitest';
import { WORKLOG, PUBLIC_NUMBERS, type WorklogDoc } from './content';

const doc: WorklogDoc = WORKLOG;

const stringsOf = (d: WorklogDoc): string[] => [
  d.title, d.subtitle, d.note,
  d.headline.label, d.headline.value, d.headline.detail,
  ...d.sections.flatMap((s) => [s.title, ...s.entries.flatMap((e) => [e.label, e.detail])]),
];

describe('the mock work log', () => {
  it('has a headline, a note and at least five sections', () => {
    expect(doc.headline.value).not.toBe('');
    expect(doc.note.length).toBeGreaterThan(20);
    expect(doc.sections.length).toBeGreaterThanOrEqual(5);
    expect(doc.sections.every((s) => s.entries.length > 0)).toBe(true);
  });

  it('gives every section and every entry a unique id', () => {
    const ids = doc.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of doc.sections) {
      expect(s.id).toMatch(/^[a-z0-9-]+$/);
      expect(s.entries.every((e) => e.label.length > 0)).toBe(true);
    }
  });

  it('names no real person', () => {
    const banned = ['Krutarth', 'Krutharth', 'Ananthan', 'Anthan', 'Ragini', 'Sahel', 'Pritish', 'Ram', 'British', 'Adiga', 'Saheel', 'Ramji', 'Miguel', 'Grace', 'Chen', 'sranji', 'krumenta'];
    const text = stringsOf(doc).join(' ').toLowerCase();
    for (const name of banned) expect(text).not.toContain(name.toLowerCase());
  });

  it('leaks no internal identifier', () => {
    const banned = ['3006', 'SDP_DEFAULT_DENY', 'LTD', 'UIO', 'CDD', 'DEPROD', 'SDPDB', 'ClickHouse', 'MSSQL', 'Vertica', 'DuckDB', 'sdp-dashboard-unification', 'sdp_kpi', 'AGENTS.md', 'Cybercab', 'Cyberealc', 'North Star', 'RhinoInsight', 'Hyperresearch', 'ZipLabs', 'Demand Engine', 'SDP MT', 'sdp-', '/api/', 'localhost', 'Ragini'];
    const text = stringsOf(doc);
    for (const needle of banned) {
      for (const s of text) expect(s.toLowerCase()).not.toContain(needle.toLowerCase());
    }
  });

  it('carries no ticket, commit, part or document id', () => {
    const text = stringsOf(doc).join(' ');
    expect(text).not.toMatch(/#\d+/);
    expect(text).not.toMatch(/\b[0-9a-f]{7,40}\b/);
    expect(text).not.toMatch(/\b\d{6,}-[A-Z0-9]{2}-[A-Z0-9]\b/);
  });

  it('states every number from the public resume and no other', () => {
    const text = stringsOf(doc).join(' ');
    const found = text.match(/\$?\d[\d,]*(?:\.\d+)?(?:[kKmM])?[%+]?/g) ?? [];
    for (const token of found) {
      expect(PUBLIC_NUMBERS).toContain(token);
    }
    for (const allowed of PUBLIC_NUMBERS) {
      expect(found).toContain(allowed);
    }
  });

  it('keeps the impact metrics that are the point of the page', () => {
    const text = stringsOf(doc).join(' ');
    expect(text).toContain('32%');
    expect(text).toContain('0.854');
    expect(text).toContain('0.80');
    expect(text).toContain('35/35');
    expect(text).toContain('17/17');
    expect(text).toContain('165');
  });

  it('states the deck saving as an estimate of 20+ hours per run, not as measured', () => {
    const entry = doc.sections
      .flatMap((s) => s.entries ?? [])
      .find((e) => e.label === 'Executive reporting');
    expect(entry).toBeDefined();
    const detail = entry!.detail;
    expect(detail).toContain('20+');
    expect(detail).toMatch(/estimate/i);
    expect(detail).not.toMatch(/measured (saving|hours)|timed at/i);
    expect(detail).not.toMatch(/\bnot (timed|measured)\b/i);
  });

  it('uses the page\'s current section names, not the retired ones', () => {
    const titles = doc.sections.map((s) => s.title);
    expect(titles).not.toContain('Planning app');
    expect(titles).not.toContain('Evals and CI');
    expect(titles).not.toContain('Data pipelines');
    expect(titles).toContain('Dashboard');
    expect(titles).toContain('Modular architecture');
    expect(titles).toContain('Slideshow generation');
  });

  it('says its figures come from the public resume, and that no internal figure appears', () => {
    // The page's About-the-demo sentence says the same thing, so the two
    // sides of the frame cannot contradict each other.
    expect(doc.note).toContain('public resume');
    expect(doc.note).toContain('no part number, person or internal figure');
  });
});
