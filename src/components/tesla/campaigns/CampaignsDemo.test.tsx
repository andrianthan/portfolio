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

  it('leaves the window title as text, so it adds no heading level', () => {
    // The page's own project heading is the h2 above this demo, so the demo
    // must not put a second h2 inside it. The only heading in the widget is
    // the h3, which nests under the page's heading correctly.
    expect(alerts).toContain('<span class="qa-title">Campaigns</span>');
    expect(alerts).not.toContain('<h2');
    expect(alerts).toContain('<h3 class="camp-h">');
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
