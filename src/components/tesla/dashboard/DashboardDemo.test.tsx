import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import DashboardDemo from './DashboardDemo';

const css = fs.readFileSync(path.resolve(process.cwd(), 'src/components/tesla/dashboard/dashboard.css'), 'utf8');

const overview = renderToStaticMarkup(<DashboardDemo />);
const worklog = renderToStaticMarkup(<DashboardDemo initialView="worklog" />);

describe('DashboardDemo', () => {
  it('labels the window as sample data', () => {
    expect(overview).toContain('sample data');
  });

  it('names the demo for assistive tech', () => {
    expect(overview).toContain('aria-label="Sample planning dashboard"');
  });

  it('renders the work log inside the dashboard frame, with one set of chrome', () => {
    // The work log is a pane of the dashboard, so it sits inside the frame
    // and the dashboard's own title bar is the only one.
    expect(worklog).toContain('class="dash-wl"');
    expect(worklog).toContain('Field notes');
    // The work log's own window chrome is neutralised by the dashboard's
    // stylesheet rather than drawn a second time.
    expect(css).toContain('.dash .dash-wl .qa-top { display: none; }');
    expect(css).toContain('.dash .dash-wl .qa {');
  });

  it('puts the nav rail in a focusable labelled region', () => {
    // The rail scrolls sideways on a narrow screen, so it must be reachable.
    expect(overview).toContain('class="dash-rail-scroll" tabindex="0" role="region"');
    expect(overview).toContain('aria-label="Dashboard sections, scrolls horizontally"');
    expect(overview).toContain('<nav class="dash-rail" aria-label="Dashboard sections">');
  });

  it('keeps the reply line a live region', () => {
    expect(overview).toContain('class="dash-reply" role="status"');
    expect(overview).toContain('No request sent yet.');
  });
});
