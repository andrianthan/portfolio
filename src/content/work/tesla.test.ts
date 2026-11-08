import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ALLOWED_NUMBERS, BANNED_TERMS, SECTION_TITLES } from './tesla-facts';

const raw = fs.readFileSync(path.resolve(process.cwd(), 'src/content/work/tesla.md'), 'utf8');
const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const prose = body.replace(/<svg[\s\S]*?<\/svg>/g, '');

describe('the tesla page body', () => {
  it('has the eight sections in order', () => {
    const heads = [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
    expect(heads).toEqual([...SECTION_TITLES]);
  });

  it('gives every section its subsections in order', () => {
    const sections = body.split(/^## /m).slice(1);
    expect(sections).toHaveLength(8);
    for (const s of sections) {
      const subs = [...s.matchAll(/^### (.+)$/gm)].map((m) => m[1].trim());
      expect(subs).toEqual(['Problem', 'What it does', 'Architecture', 'Key decisions', 'Impact', 'About the demo']);
    }
  });

  it('carries no to-confirm marker and no raster image', () => {
    expect(body.toLowerCase()).not.toContain('[to confirm');
    expect(body).not.toMatch(/<img/i);
    expect(body).not.toMatch(/!\[[^\]]*\]\(/);
  });

  it('names no real person, team or internal identifier', () => {
    for (const needle of BANNED_TERMS) expect(body.toLowerCase()).not.toContain(needle.toLowerCase());
    expect(body).not.toMatch(/#\d+/);
    expect(body).not.toMatch(/\b\d{6,}-[A-Z0-9]{2}-[A-Z0-9]\b/);
    expect(body).not.toMatch(/\b[0-9a-f]{7,40}\b/);
  });

  it('states only numbers from the facts file', () => {
    const found = prose.match(/\$?\d[\d,]*(?:\.\d+)?(?:[kKmM])?[%+]?/g) ?? [];
    for (const token of found) expect(ALLOWED_NUMBERS, `unlisted number "${token}"`).toContain(token);
  });

  it('labels every impact claim with a basis word', () => {
    const impacts = body.split(/^### Impact$/m).slice(1).map((s) => s.split(/^### /m)[0]);
    expect(impacts).toHaveLength(8);
    const basis = /(measured \((local|stage)\)|planner-reported|estimate|not booked|not measured)/i;
    for (const imp of impacts) expect(imp, imp.slice(0, 80)).toMatch(basis);
  });

  it('never makes a forbidden claim', () => {
    const lower = prose.toLowerCase();
    expect(lower).not.toMatch(/default-deny[^.]*\b(enforc(es|ing|ed)|on)\b(?![^.]*(not|off|built))/);
    expect(lower).not.toContain('50+ users');
    expect(lower).not.toMatch(/per-tab process(es)?[^.]*\b(runs|run|built|shipped)\b(?![^.]*\bnot\b)/);
  });
});
