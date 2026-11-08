import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ModularDemo from './ModularDemo';

const html = renderToStaticMarkup(<ModularDemo />);
const count = (needle: string) => html.split(needle).length - 1;

describe('ModularDemo', () => {
  it('labels the window as sample data', () => {
    expect(html).toContain('sample data');
  });

  it('names the demo for assistive tech', () => {
    expect(html).toContain('aria-label="Sample contributor tab discovery"');
  });

  it('shows the module folder layout for every manifest', () => {
    for (const id of ['overview', 'part-summary', 'campaigns', 'like-part', 'broken-tab']) {
      expect(html).toContain(`modules/${id}/`);
    }
    expect(count('tab.json')).toBe(5);
    expect(count('tab.ts')).toBe(5);
  });

  it('marks the broken tab and its missing entry', () => {
    expect(html).toContain('missing entry');
    expect(html).toContain('broken-tab');
  });

  it('mounts the valid tabs in the shell nav', () => {
    for (const title of ['Overview', 'Part summary', 'Campaigns', 'Like part']) {
      expect(html).toContain(title);
    }
  });

  it('offers a kill switch toggle per mountable tab and starts them all off', () => {
    for (const id of ['overview', 'part-summary', 'campaigns', 'like-part']) {
      expect(html).toContain(`>${id}</button>`);
    }
    expect(count('aria-pressed="false"')).toBe(4);
  });

  it('prints the discovery report in a scrollable region', () => {
    expect(html).toContain('mounted overview');
    expect(html).toContain('skipped broken-tab (failed to import)');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('role="region" aria-label="Tab discovery report"');
  });

  it('says plainly that tabs are not separate processes', () => {
    expect(html).toContain('Tabs do not run as separate processes.');
  });

  it('groups the kill switches and names the region', () => {
    expect(html).toContain('role="group" aria-label="Kill switch per tab"');
    expect(html).toContain('aria-label="Module folder layout"');
    expect(html).toContain('aria-label="Shell tab navigation"');
  });
});
