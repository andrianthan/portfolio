import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SECTION_IDS } from './tesla-facts';

const page = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/work/[slug].astro'), 'utf8');
const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/projects.css'), 'utf8');

const DEMOS: Record<string, string> = {
  'dashboard': 'DashboardDemo', 'part-summary': 'PartSummaryDemo', 'ask-sdp': 'AskSdpDemo',
  'forecast-lab': 'ForecastLabDemo', 'campaigns': 'CampaignsDemo', 'slideshow-generation': 'SlidesDemo',
  'admin': 'AdminDemo',
};

describe('the tesla page in the template', () => {
  it('is a multi-project page', () => {
    expect(page).toMatch(/const MULTI = new Set\(\[[^\]]*'tesla'/);
  });

  it('routes every section to its own demo island, visible-hydrated', () => {
    for (const id of SECTION_IDS) {
      expect(page, id).toContain(`id.startsWith('${id}')`);
      expect(page, id).toMatch(new RegExp(`<${DEMOS[id]} client:visible />`));
    }
  });

  it('shows the tabs demo under the dashboard section', () => {
    expect(page).toMatch(/<ModularDemo client:visible \/>/);
    expect(page).toContain('id="dashboard-tabs"');
  });

  it('no longer renders the work log as a page section', () => {
    expect(page).not.toContain("id.startsWith('work-log')");
    expect(page).not.toMatch(/<WorklogDemo client:visible \/>/);
  });

  it('sizes the sticky contents list for seven rows', () => {
    const m = css.match(/--toc-list-height:\s*(\d+)px/);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeGreaterThanOrEqual(480);
  });
});
