import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CampaignsDemo from './CampaignsDemo';
import { THRESHOLD } from './campaigns';

const alerts = renderToStaticMarkup(<CampaignsDemo />);
const campaigns = renderToStaticMarkup(<CampaignsDemo initialView="campaigns" />);

describe('CampaignsDemo', () => {
  it('labels the window as sample data', () => {
    expect(alerts).toContain('sample data');
  });

  it('names the demo for assistive tech', () => {
    expect(alerts).toContain('aria-label="Sample Campaigns tab"');
  });

  it('keeps one live-region declaration on the status line', () => {
    // role="status" already implies aria-live="polite"; saying it twice is
    // redundant markup that can drift apart.
    expect(campaigns).toContain('role="status"');
    expect(campaigns).not.toMatch(/role="status"[^>]*aria-live=/);
  });

  it('nests the demo heading under a parent heading', () => {
    // The notice heading is an h3, so the demo needs a heading above it.
    const parent = alerts.match(/<h2[^>]*>[\s\S]*?<\/h2>/);
    expect(parent).not.toBeNull();
    expect(alerts).toContain('class="camp-h"');
    expect(alerts.indexOf(parent![0])).toBeLessThan(alerts.indexOf('class="camp-h"'));
  });

  it('describes the pace share it actually shows', () => {
    // The table shows one pace-share value, so the copy must not claim a
    // figure spread across three windows.
    expect(alerts).toContain(`under ${(THRESHOLD * 100).toFixed(1)}% of service units`);
    expect(alerts).not.toContain('across the 8, 13 and 26 week windows');
  });

  it('puts every scrollable table in a labelled region', () => {
    expect(alerts).toContain('role="region" aria-label="Wind-down alerts table, scrolls horizontally"');
    expect(campaigns).toContain('role="region" aria-label="Campaigns table, scrolls horizontally"');
    expect(alerts).toContain('tabindex="0"');
  });

  it('labels the view button group', () => {
    expect(alerts).toContain('role="group" aria-label="Campaigns views"');
  });
});
