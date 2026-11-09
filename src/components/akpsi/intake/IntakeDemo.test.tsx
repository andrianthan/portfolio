import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import IntakeDemo from './IntakeDemo';

const html = renderToStaticMarkup(<IntakeDemo />);
/** A pipeline that has run all the way to the proposed interview. */
const finished = renderToStaticMarkup(<IntakeDemo presses={5} />);

// The demo is a pure state machine: it must not reach the network, a model or
// a timer. The markup cannot show that on its own, so the island's own source
// is scanned as well.
const dir = path.resolve(process.cwd(), 'src/components/akpsi/intake');
const sources = fs
  .readdirSync(dir)
  .filter((f) => /\.(ts|tsx|css)$/.test(f) && !/\.test\./.test(f))
  .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'))
  .join('\n');
const demoSource = fs.readFileSync(path.join(dir, 'IntakeDemo.tsx'), 'utf8');

describe('IntakeDemo', () => {
  it('names the window and labels sample data', () => {
    expect(html).toMatch(/^<div class="qa intake" role="group" aria-label="Sample membership intake pipeline">/);
    expect(html).toContain('sample data');
    expect(html).toContain('Membership intake');
  });
  it('states that the data is invented', () => {
    expect(html).toContain('Sample pipeline on invented data. The knowledge-base answers and applicant emails are made up.');
  });
  it('lists the five sample applicants', () => {
    expect(html).toContain('Applicant A');
    expect(html).toContain('Applicant E');
    expect(html.match(/aria-pressed=/g) ?? []).toHaveLength(5);
    expect(html).toContain('aria-pressed="true"');
  });
  it('shows the first stage title and the Process button', () => {
    expect(html).toContain('Classify the email');
    expect(html).toContain('>Process</button>');
  });
  it('reads as finished once the pipeline is complete', () => {
    // Every stage row is done, so none of them is left waiting: no row is
    // marked as the one in progress and no "next" chip is shown.
    expect(finished.match(/class="intake-steps"/)).toBeTruthy();
    expect(finished).not.toContain('class="on"');
    expect(finished).not.toContain('>next<');
    expect(finished).toContain('Interview proposed.');
    expect(finished).toMatch(/<button[^>]*disabled/);
  });
  it('marks the stage in focus while the pipeline is under way', () => {
    const underWay = renderToStaticMarkup(<IntakeDemo presses={2} />);
    expect(underWay).toContain('class="on"');
    expect(underWay).toContain('>next<');
    expect(underWay).not.toContain('Interview proposed.');
  });
  it('holds no email address', () => {
    expect(html).not.toContain('@');
  });
  it('makes no network call and schedules no timer in the markup', () => {
    expect(html).not.toContain('fetch(');
    expect(html).not.toContain('XMLHttpRequest');
    expect(html).not.toContain('setTimeout');
  });
  it('makes no network call and schedules no timer in the source', () => {
    expect(sources).not.toContain('fetch(');
    expect(sources).not.toContain('XMLHttpRequest');
    expect(sources).not.toContain('setTimeout');
    expect(sources).not.toContain('setInterval');
    expect(sources).not.toMatch(/Math\.random\(/);
  });
  it('updates the state from the state alone, not from the render closure', () => {
    // The Process button must be a pure function of the state it is handed:
    // the email it runs on comes out of the state, not out of the render.
    const updater = demoSource.match(/setState\(\(s\) => advance\(([\s\S]*?)\)\);/);
    expect(updater, 'the Process updater').toBeTruthy();
    expect(updater![1]).toContain('emailFor(s)');
    expect(updater![1]).not.toMatch(/\bemail\b/);
  });
  it('picks an applicant through select, so the same one keeps its progress', () => {
    // The reset rule lives in select(), which is tested there. The demo has to
    // go through it rather than resetting on its own.
    expect(demoSource).toContain('select(s, id)');
    expect(demoSource).not.toContain('setState(initialState(');
  });
});
