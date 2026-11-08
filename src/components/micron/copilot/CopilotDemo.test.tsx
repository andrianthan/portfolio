import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CopilotDemo from './CopilotDemo';
import { PRESETS } from './copilot';

const html = renderToStaticMarkup(<CopilotDemo />);

describe('CopilotDemo', () => {
  it('names the window for assistive tech', () => {
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Sample wafer copilot chat"');
  });
  it('shows the three presets as buttons', () => {
    for (const p of PRESETS) expect(html).toContain(p);
    expect(html.match(/<button type="button"/g)).toHaveLength(3);
  });
  it('labels the sample data and the empty state', () => {
    expect(html).toContain('sample data');
    expect(html).toContain('No questions yet');
  });
  it('says answers are scripted from sample rows', () => {
    expect(html).toContain('scripted from sample rows');
  });
  it('has no free-text input', () => {
    expect(html).not.toContain('<input');
    expect(html).not.toContain('<textarea');
  });
});
