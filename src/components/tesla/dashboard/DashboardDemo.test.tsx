import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import DashboardDemo from './DashboardDemo';

const css = fs.readFileSync(path.resolve(process.cwd(), 'src/components/tesla/dashboard/dashboard.css'), 'utf8');

/**
 * Whether the stylesheet has a rule for `selector` that sets `property`.
 *
 * Tolerant of how the rule is written out: the selector list, the whitespace
 * and the declaration order do not matter, only that the rule is there and
 * says what it has to say.
 */
function ruleSets(selector: string, property: string, value: string): boolean {
  const rules = css.split('}');
  return rules.some((rule) => {
    const [head, ...body] = rule.split('{');
    if (!body.length) return false;
    const selectors = head.split(',').map((s) => s.trim());
    if (!selectors.includes(selector)) return false;
    const declarations = body.join('{');
    return new RegExp(`(^|;)\\s*${property}\\s*:\\s*${value}\\s*(;|$)`).test(declarations);
  });
}

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
    // stylesheet rather than drawn a second time: its title bar is taken out
    // of the page, and its frame is flattened.
    expect(ruleSets('.dash .dash-wl .qa-top', 'display', 'none')).toBe(true);
    expect(ruleSets('.dash .dash-wl .qa', 'border', '0')).toBe(true);
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
