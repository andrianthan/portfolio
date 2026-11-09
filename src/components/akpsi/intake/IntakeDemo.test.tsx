import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import IntakeDemo from './IntakeDemo';

const html = renderToStaticMarkup(<IntakeDemo />);

// The demo is a pure state machine: it must not reach the network, a model or
// a timer. The markup cannot show that on its own, so the island's own source
// is scanned as well.
const dir = path.resolve(process.cwd(), 'src/components/akpsi/intake');
const sources = fs
  .readdirSync(dir)
  .filter((f) => /\.(ts|tsx|css)$/.test(f) && !/\.test\./.test(f))
  .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'))
  .join('\n');

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
});
