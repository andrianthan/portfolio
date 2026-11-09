/**
 * The per-project demo rule: which demo belongs to which project.
 *
 * The rule is a plain function so it can be tested on its own, without a
 * browser. The browser check measures the page and hands the measurement
 * here; the problems this returns are the gate's failures.
 */

/**
 * Which demo belongs to which project, stated by the check itself.
 *
 * A project heading's id starts with the prefix of the demo it owns, and
 * the demo's island carries the component's name. This table is the check's
 * own statement of that pairing, deliberately written out here rather than
 * read out of the template: the template's lookup is the thing under test,
 * so the expectation cannot come from it.
 *
 * Every multi-project work page is covered, so a demo moved onto the wrong
 * project is caught wherever it happens.
 */
export const DEMO_BY_PREFIX = [
  { prefix: 'qa-analyst', component: 'QaDemo' },
  { prefix: 'guideline-chatbot', component: 'GuideDemo' },
  { prefix: 'image-search', component: 'ImageSearchDemo' },
  { prefix: 'grants-agent', component: 'GrantsDemo' },
  { prefix: 'ir-updater', component: 'IrDemo' },
  { prefix: 'case-note-coach', component: 'NoteCoachDemo' },
  { prefix: 'dashboard', component: 'DashboardDemo' },
  { prefix: 'part-summary', component: 'PartSummaryDemo' },
  { prefix: 'ask-sdp', component: 'AskSdpDemo' },
  { prefix: 'forecast-lab', component: 'ForecastLabDemo' },
  { prefix: 'campaigns', component: 'CampaignsDemo' },
  { prefix: 'slideshow-generation', component: 'SlidesDemo' },
  { prefix: 'modular-architecture', component: 'ModularDemo' },
  { prefix: 'admin', component: 'AdminDemo' },
  { prefix: 'wafer-analysis-copilot', component: 'CopilotDemo' },
  { prefix: 'wafer-risk-model', component: 'RiskDemo' },
  { prefix: 'membership-intake', component: 'IntakeDemo' },
  { prefix: 'opportunity-bot', component: 'ListingsDemo' },
];

/** The demo a project heading id owns, or null when it owns none. */
export function demoForPrefix(id) {
  // The longest matching prefix wins, so the answer does not depend on the
  // order the table is written in.
  let hit = null;
  for (const d of DEMO_BY_PREFIX) {
    if (!id.startsWith(d.prefix)) continue;
    if (!hit || d.prefix.length > hit.prefix.length) hit = d;
  }
  return hit ? hit.component : null;
}

/**
 * The problems with the demos the project sections of a page hold.
 *
 * A project section must hold the demo its own heading id maps to, and it
 * must not hold any other project's demo. A project that maps to no demo
 * holds none: the template renders no demo slot for it, so a demo there
 * would be a demo on a project that owns none.
 *
 * `projects` is a list of `{ id, demos }`, where `demos` names the demo
 * components the section holds.
 */
export function findDemoProblems(path, projects) {
  const problems = [];
  for (const project of projects) {
    const expected = demoForPrefix(project.id);
    if (expected === null) {
      // A project with no demo of its own. The rule is that it holds none,
      // not that it holds one.
      if (project.demos.length > 0) {
        problems.push(
          `${path}: the project "${project.id}" holds the "${project.demos.join(', ')}" demo, but it maps to no demo`,
        );
      }
      continue;
    }
    if (project.demos.length === 0) {
      problems.push(`${path}: the project "${project.id}" holds no demo, expected the "${expected}" demo`);
      continue;
    }
    if (project.demos.length > 1) {
      problems.push(
        `${path}: the project "${project.id}" holds ${project.demos.length} demos (${project.demos.join(', ')}), expected only the "${expected}" demo`,
      );
    }
    // The section must hold its own demo, and it must not hold another
    // project's demo either. Both are checked here rather than by the count
    // alone, so the failure names the demo that is in the wrong place.
    if (!project.demos.includes(expected)) {
      problems.push(`${path}: the project "${project.id}" does not hold the "${expected}" demo, expected it to`);
    }
    for (const other of DEMO_BY_PREFIX) {
      if (other.component === expected) continue;
      if (project.demos.includes(other.component)) {
        problems.push(
          `${path}: the project "${project.id}" holds the "${other.component}" demo, which belongs to another project`,
        );
      }
    }
  }
  return problems;
}
