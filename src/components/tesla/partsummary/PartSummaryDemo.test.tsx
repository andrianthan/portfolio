import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PartSummaryDemo from './PartSummaryDemo';
import { SUBTABS } from './partsummary';

const closed = renderToStaticMarkup(<PartSummaryDemo />);
const open = renderToStaticMarkup(<PartSummaryDemo partId="P-1001" />);
const heat = renderToStaticMarkup(<PartSummaryDemo partId="P-1001" tab="location" />);

describe('PartSummaryDemo', () => {
  it('labels the window as sample data', () => {
    expect(closed).toContain('sample data');
  });

  it('starts with no part open', () => {
    expect(closed).not.toContain('class="ps-tabs"');
    expect(open).toContain('P-1001');
  });

  it('gives every scrollable table a focusable labelled region', () => {
    expect(heat).toContain('class="ps-scroll" tabindex="0" role="region" aria-label=');
    expect(heat).toMatch(/role="region" aria-label="[^"]+"/);
  });

  it('gives the tab buttons a group label', () => {
    expect(open).toContain('class="ps-tabs" role="group" aria-label=');
    for (const t of SUBTABS) expect(open).toContain(t.label);
  });

  it('marks the tab buttons as pressed toggles, not tabs', () => {
    expect(open).toContain('aria-pressed="true"');
    expect(open).not.toContain('role="tab"');
  });

  it('uses a 16px search input so iOS does not zoom on focus', () => {
    expect(closed).toContain('type="search"');
  });
});
