import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ALLOWED_NUMBERS, BANNED_TERMS, SECTION_TITLES } from './tesla-facts';

const raw = fs.readFileSync(path.resolve(process.cwd(), 'src/content/work/tesla.md'), 'utf8');
const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const prose = body.replace(/<svg[\s\S]*?<\/svg>/g, '');

const stripTags = (s: string) => s.replace(/<[^>]+>/g, ' ');
const stripCommas = (s: string) => s.replace(/,/g, '');

function numberTokens(text: string): string[] {
  return stripTags(text).match(/\$?\d(?:[\d,]*\d)?(?:\.\d+)?(?:[kKmM](?![A-Za-z]))?[%+]?/g) ?? [];
}

const allowedSet = new Set(ALLOWED_NUMBERS.map(stripCommas));
function isAllowedNumber(token: string): boolean {
  const t = stripCommas(token);
  if (allowedSet.has(t)) return true;
  return t.startsWith('$') && allowedSet.has(t.slice(1));
}

function forbiddenClaims(text: string): string[] {
  const out: string[] = [];
  const sentences = stripTags(text).split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    if (/default[- ]deny/i.test(s) && /(enforc|is on\b|turned on|enabled)/i.test(s) && !/\b(not|off|built|until|flag|yet)\b/i.test(s)) {
      out.push(s);
    }
    if (/per[- ]tab process/i.test(s) && /\b(runs?|built|shipped|isolated)\b/i.test(s) && !/\b(not|no|proposal|only|yet)\b/i.test(s)) {
      out.push(s);
    }
  }
  if (stripTags(text).toLowerCase().includes('50+ users')) out.push('50+ users');
  return out;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
    for (const needle of BANNED_TERMS) {
      const re = new RegExp('(^|[^A-Za-z0-9])' + escapeRe(needle) + '($|[^A-Za-z0-9])', 'i');
      expect(body, `banned term "${needle}"`).not.toMatch(re);
    }
    expect(prose).not.toMatch(/#\d+/);
    expect(body).not.toMatch(/\b\d{6,}-[A-Z0-9]{2}-[A-Z0-9]\b/);
    expect(prose).not.toMatch(/\b(?=[0-9a-f]*[a-f])(?=[0-9a-f]*\d)[0-9a-f]{7,40}\b/i);
  });

  it('states only numbers from the facts file', () => {
    for (const token of numberTokens(prose)) expect(isAllowedNumber(token), `unlisted number "${token}"`).toBe(true);
  });

  it('labels every impact claim with a basis word', () => {
    const impacts = body.split(/^### Impact$/m).slice(1).map((s) => s.split(/^### /m)[0]);
    expect(impacts).toHaveLength(8);
    const basis = /(measured \((local|stage)\)|planner-reported|estimate|not booked|not measured)/i;
    for (const imp of impacts) expect(imp, imp.slice(0, 80)).toMatch(basis);
  });

  it('never makes a forbidden claim', () => {
    expect(forbiddenClaims(prose)).toEqual([]);
  });
});

describe('test helpers', () => {
  it('does not split a list comma into a number', () => {
    expect(numberTokens('4, 6 and 9 weeks')).toEqual(['4', '6', '9']);
  });
  it('reads a number glued to a unit', () => {
    expect(numberTokens('71ms')).toEqual(['71']);
  });
  it('normalises thousands separators', () => {
    expect(stripCommas('1,375')).toBe(stripCommas('1375'));
    expect(isAllowedNumber('1,375')).toBe(true);
  });
  it('passes a hedged default-deny sentence', () => {
    expect(forbiddenClaims('default-deny is not enforced yet')).toEqual([]);
    expect(forbiddenClaims('default-deny is enforced everywhere')).toHaveLength(1);
  });
});
