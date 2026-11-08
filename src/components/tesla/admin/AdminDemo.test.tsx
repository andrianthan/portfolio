import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AdminDemo from './AdminDemo';

const usage = renderToStaticMarkup(<AdminDemo />);
const access = renderToStaticMarkup(<AdminDemo view="access" />);
const audit = renderToStaticMarkup(<AdminDemo view="audit" />);
const count = (needle: string, html = usage) => html.split(needle).length - 1;

describe('AdminDemo', () => {
  it('labels the window as sample data', () => {
    expect(usage).toContain('sample data');
  });

  it('names the demo for assistive tech', () => {
    expect(usage).toContain('aria-label="Sample admin dashboard"');
  });

  it('offers the three admin sections and starts on Usage', () => {
    for (const label of ['Usage', 'Access', 'Audit']) {
      expect(usage).toContain(`>${label}</button>`);
    }
    expect(count('aria-pressed="true"')).toBe(1);
    expect(usage).toContain('aria-pressed="true" class="on">Usage</button>');
  });

  it('shows a usage row per mock user', () => {
    for (const name of ['User 1', 'User 2', 'User 3', 'User 4', 'User 5', 'User 6']) {
      expect(usage).toContain(name);
    }
    for (const head of ['Active days', 'Visits 7d', 'Visits 30d', 'Top tab', 'Ask count', 'LLM spend']) {
      expect(usage).toContain(head);
    }
  });

  it('says that usage comes from the request log, not sign-ins', () => {
    expect(usage).toContain('Usage is computed from the request log, not sign-ins.');
  });

  it('shows a dollar spend for every user', () => {
    expect(usage).toMatch(/\$0\.\d\d/);
    expect(count('$0.00')).toBe(1);
  });

  it('puts the usage table in a labelled scrollable region', () => {
    expect(usage).toContain('role="region" aria-label="Per-user usage table, scrolls horizontally"');
    expect(usage).toContain('tabindex="0"');
  });
});

describe('AdminDemo access view', () => {
  it('keeps the gate visibly off in production', () => {
    expect(access).toContain('Default-deny gate');
    expect(access).toContain('Built; off in production.');
  });

  it('starts the gate off', () => {
    expect(access).toContain('aria-pressed="false" class="">Default-deny gate</button>');
  });

  it('asks the check line and answers it', () => {
    expect(access).toContain('Can User 4 open admin?');
    // The gate is off and User 4 has no entry, so the legacy rules allow it.
    expect(access).toMatch(/Can User 4 open admin\?.*?class="yes">Yes</s);
  });

  it('offers a checkbox per user and tab', () => {
    expect(count('type="checkbox"', access)).toBe(42);
    expect(access).toContain('role="region" aria-label="User by tab access grid, scrolls horizontally"');
  });

  it('labels every checkbox with its user and tab', () => {
    expect(access).toContain('aria-label="User 4 admin"');
    expect(access).toContain('aria-label="User 1 overview"');
  });

  it('says plainly that the gate is not enforcing', () => {
    expect(access).toContain('The gate is built but off in production');
  });
});

describe('AdminDemo audit view', () => {
  it('starts the audit log empty and says so', () => {
    expect(audit).toContain('No changes yet.');
    expect(audit).toContain('Grant or revoke a tab in Access to record one.');
  });

  it('says every change is recorded', () => {
    expect(audit).toContain('Every grant and revoke is recorded here.');
  });
});
