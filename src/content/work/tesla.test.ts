import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ALLOWED_NUMBERS, BANNED_TERMS, SECTION_TITLES } from './tesla-facts';

const raw = fs.readFileSync(path.resolve(process.cwd(), 'src/content/work/tesla.md'), 'utf8');
const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const prose = body.replace(/<svg[\s\S]*?<\/svg>/g, '');

/**
 * Removes the markup, keeping the words.
 *
 * A tag is `<` followed by a name and a closing `>`. A bare `<` with no
 * closing `>` is not a tag, and a regex that deletes to the next `>` would
 * swallow the rest of the line — taking any number in it out of the scan
 * below, which is a silent way past the allowlist. So only real tags go.
 */
const stripTags = (s: string) => s.replace(/<[A-Za-z/][^<>]*>/g, ' ');
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

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whether a term appears as a whole word, so "Ragini" does not match "Raginiello". */
function bannedTermMatches(text: string, needle: string): boolean {
  const re = new RegExp('(^|[^A-Za-z0-9])' + escapeRe(needle) + '($|[^A-Za-z0-9])', 'i');
  return re.test(text);
}

/** Whether the text carries something shaped like a commit hash. */
function hasHexId(text: string): boolean {
  return /\b(?=[0-9a-f]*[a-f])(?=[0-9a-f]*\d)[0-9a-f]{7,40}\b/i.test(text);
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
      expect(bannedTermMatches(body, needle), `banned term "${needle}"`).toBe(false);
    }
    expect(prose).not.toMatch(/#\d+/);
    expect(body).not.toMatch(/\b\d{6,}-[A-Z0-9]{2}-[A-Z0-9]\b/);
    // The hex scan runs on the prose: the figure markup holds path data that
    // reads like a hash, and that is not an identifier.
    expect(hasHexId(prose)).toBe(false);
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

  it('says the same thing about the work log as the work log says about itself', () => {
    // The pane's note and the page's About-the-demo sentence both describe
    // what the mock contains, so they cannot contradict each other.
    const about = body.split(/^### About the demo$/m)[1] ?? '';
    expect(about).toContain('public resume');
    expect(about).toContain('no part number, person or internal figure');
    expect(about).not.toMatch(/No real part, person or figure/);
  });

  it('scopes the campaigns time-saved total to what it includes', () => {
    // The three bullets above it add up to less than the stated total, so the
    // total says what it covers.
    const campaigns = body.split(/^## Campaigns$/m)[1] ?? '';
    expect(campaigns).toContain('across the projects on this page');
    expect(campaigns).toContain("Forecast Lab's 80-hour estimate");
  });

  it('gives every modular-architecture figure one shared basis', () => {
    const modular = body.split(/^## Modular architecture$/m)[1] ?? '';
    const impact = modular.split(/^### Impact$/m)[1] ?? '';
    expect(impact).toMatch(/All figures below: measured \(local\)/);
    // The label is stated once, above the list, not on one bullet.
    expect(impact.match(/measured \(local\)/g) ?? []).toHaveLength(1);
  });

  it('does not say a request waits on a build it never waits on', () => {
    expect(prose).not.toMatch(/wait on one build/i);
    expect(prose).toContain('share one build instead of starting their own');
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
  it('flags a claim that tabs run as separate processes', () => {
    expect(forbiddenClaims('Per-tab processes run in isolation.')).toHaveLength(1);
    expect(forbiddenClaims('Per-tab processes are a proposal only')).toEqual([]);
  });
  it('matches a banned term on whole words only', () => {
    expect(bannedTermMatches('the ramparts team', 'Ram')).toBe(false);
    expect(bannedTermMatches('Ram joined the team', 'Ram')).toBe(true);
  });
  it('does not swallow the rest of the line after a bare <', () => {
    // A regex that deletes to the next `>` would take the numbers after a
    // stray bracket out of the scan, which is a silent way past the
    // allowlist, so a bare `<` has to leave the line alone.
    expect(numberTokens('less < than 5 units')).toEqual(['5']);
    expect(numberTokens('a < b and 5 > c')).toEqual(['5']);
  });
  it('scans the prose for hex ids, not the figure markup', () => {
    expect(hasHexId('commit a1b2c3d landed')).toBe(true);
    expect(hasHexId(prose)).toBe(false);
  });
});
