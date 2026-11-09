import { describe, it, expect } from 'vitest';
import { DEMO_BY_PREFIX, demoForPrefix, demosOwnedBy, findDemoProblems } from './demos.mjs';

describe('demoForPrefix', () => {
  it('maps each project heading id to the demo it owns', () => {
    expect(demoForPrefix('membership-intake-automation')).toBe('IntakeDemo');
    expect(demoForPrefix('opportunity-bot')).toBe('ListingsDemo');
    expect(demoForPrefix('wafer-analysis-copilot')).toBe('CopilotDemo');
    expect(demoForPrefix('dashboard')).toBe('DashboardDemo');
  });
  it('gives a project with no demo of its own no demo', () => {
    // The template renders no demo slot for a project that maps to nothing,
    // so the mapping has to agree: a heading id that is not in the table
    // owns no demo.
    expect(demoForPrefix('some-project-with-no-demo')).toBe(null);
    expect(demoForPrefix('work-log')).toBe(null);
  });
  it('does not depend on the order the table is written in', () => {
    // The longest matching prefix wins, so no prefix can shadow another.
    for (const a of DEMO_BY_PREFIX) {
      for (const b of DEMO_BY_PREFIX) {
        if (a === b) continue;
        expect(b.prefix.startsWith(a.prefix), `${a.prefix} shadows ${b.prefix}`).toBe(false);
      }
    }
  });
});

describe('findDemoProblems', () => {
  const path = '/work/akpsi/';

  it('says nothing when every project holds its own demo', () => {
    const projects = [
      { id: 'membership-intake-automation', demos: ['IntakeDemo'] },
      { id: 'opportunity-bot', demos: ['ListingsDemo'] },
    ];
    expect(findDemoProblems(path, projects)).toEqual([]);
  });

  it('allows a project that owns no demo to hold no demo', () => {
    // A project the template renders without a demo slot is legitimate, so
    // the rule must not require a demo of it.
    const projects = [
      { id: 'membership-intake-automation', demos: ['IntakeDemo'] },
      { id: 'a-project-with-no-demo', demos: [] },
      { id: 'opportunity-bot', demos: ['ListingsDemo'] },
    ];
    expect(findDemoProblems(path, projects)).toEqual([]);
  });

  it('fails a project that owns no demo but holds one', () => {
    const projects = [{ id: 'a-project-with-no-demo', demos: ['IntakeDemo'] }];
    const problems = findDemoProblems(path, projects);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('a-project-with-no-demo');
    expect(problems[0]).toContain('maps to no demo');
  });

  it('fails a project that does not hold its own demo', () => {
    const projects = [{ id: 'membership-intake-automation', demos: ['ListingsDemo'] }];
    const problems = findDemoProblems(path, projects);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.join(' ')).toContain('does not hold the "IntakeDemo" demo');
  });

  it('fails a project that holds another project\'s demo', () => {
    const projects = [{ id: 'opportunity-bot', demos: ['IntakeDemo'] }];
    const problems = findDemoProblems(path, projects);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.join(' ')).toContain('belongs to another project');
  });

  it('fails a project that holds no demo at all when it owns one', () => {
    const projects = [{ id: 'opportunity-bot', demos: [] }];
    const problems = findDemoProblems(path, projects);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('holds no demo');
  });

  it('fails a project that holds more than one demo', () => {
    const projects = [{ id: 'opportunity-bot', demos: ['ListingsDemo', 'IntakeDemo'] }];
    const problems = findDemoProblems(path, projects);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.join(' ')).toContain('holds 2 demos');
  });

  it('lets the Dashboard hold its own demo and the Tabs demo', () => {
    const projects = [{ id: 'dashboard', demos: ['DashboardDemo', 'ModularDemo'] }];
    expect(demosOwnedBy('dashboard')).toEqual(['DashboardDemo', 'ModularDemo']);
    expect(findDemoProblems('/work/tesla/', projects)).toEqual([]);
  });

  it('fails the Dashboard without its Tabs demo', () => {
    const problems = findDemoProblems('/work/tesla/', [{ id: 'dashboard', demos: ['DashboardDemo'] }]);
    expect(problems.join(' ')).toContain('does not hold the "ModularDemo" demo');
  });

  it('fails a project other than the Dashboard that holds the Tabs demo', () => {
    const problems = findDemoProblems('/work/tesla/', [{ id: 'part-summary', demos: ['PartSummaryDemo', 'ModularDemo'] }]);
    expect(problems.join(' ')).toContain('belongs to another project');
  });
});
