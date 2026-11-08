import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import PartSummaryDemo from './PartSummaryDemo';
import { SUBTABS } from './partsummary';

const css = fs.readFileSync(path.resolve(process.cwd(), 'src/components/tesla/partsummary/partsummary.css'), 'utf8');

const closed = renderToStaticMarkup(<PartSummaryDemo />);
const open = renderToStaticMarkup(<PartSummaryDemo partId="P-1001" />);
const heat = renderToStaticMarkup(<PartSummaryDemo partId="P-1001" tab="location" />);

/**
 * Whether the stylesheet has a rule for `selector` that sets `property`.
 *
 * Tolerant of how the rule is written out: the selector list, the whitespace
 * and the declaration order do not matter, only that the rule is there and
 * says what it has to say.
 */
function ruleSets(selector: string, property: string, value: string): boolean {
  const rules = css.split('}');
  const wanted = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return rules.some((rule) => {
    const [head, ...body] = rule.split('{');
    if (!body.length) return false;
    const selectors = head.split(',').map((s) => s.trim());
    if (!selectors.includes(selector)) return false;
    const declarations = body.join('{');
    return new RegExp(`(^|;)\\s*${property}\\s*:\\s*${wanted}\\s*(;|$)`).test(declarations);
  });
}

describe('PartSummaryDemo', () => {
  it('labels the window as sample data', () => {
    expect(closed).toContain('sample data');
  });

  it('starts with no part open', () => {
    expect(closed).not.toContain('class="ps-tabs"');
    expect(open).toContain('P-1001');
  });

  it('gives every scrollable table a focusable labelled region', () => {
    expect(heat).toMatch(/class="ps-scroll"[^>]*tabindex="0"/);
    expect(heat).toMatch(/class="ps-scroll"[^>]*role="region"/);
    expect(heat).toMatch(/role="region" aria-label="[^"]+"/);
  });

  it('gives the tab buttons a group label', () => {
    expect(open).toMatch(/class="ps-tabs"[^>]*role="group"/);
    expect(open).toMatch(/class="ps-tabs"[^>]*aria-label="/);
    for (const t of SUBTABS) expect(open).toContain(t.label);
  });

  it('marks the tab buttons as pressed toggles, not tabs', () => {
    expect(open).toContain('aria-pressed="true"');
    expect(open).not.toContain('role="tab"');
  });

  it('uses a 16px search input so iOS does not zoom on focus', () => {
    // The input is a text field, so it has to be 16px or iOS zooms on focus.
    expect(closed).toContain('type="search"');
    expect(ruleSets('.ps .ps-search input', 'font', '16px var(--font-sans)')).toBe(true);
  });

  it('lets the top bar wrap, so it cannot clip at the narrowest width', () => {
    expect(ruleSets('.ps .qa-top', 'flex-wrap', 'wrap')).toBe(true);
  });

  it('keeps one live-region declaration on the message line', () => {
    // role="status" already implies aria-live="polite"; saying it twice is
    // redundant markup that can drift apart.
    expect(closed).toContain('role="status"');
    expect(closed).not.toMatch(/role="status"[^>]*aria-live=/);
  });
});
