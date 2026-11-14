import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import RiskDemo from './RiskDemo';
import { WAFERS } from '../fixtures';
import { rank, DEFAULT_QUEUE, queueLabel } from './risk';

const html = renderToStaticMarkup(<RiskDemo />);
const body = html.match(/<tbody>.*<\/tbody>/s)?.[0] ?? '';
const rows = body.match(/<tr[^>]*>/g) ?? [];

describe('RiskDemo', () => {
  it('names the window and labels sample data', () => {
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Sample wafer risk ranking"');
    expect(html).toContain('sample data');
  });
  it('renders 12 rows in rank order', () => {
    expect(rows).toHaveLength(12);
    const ids = [...html.matchAll(/<tbody>.*<\/tbody>/gs)][0][0].match(/W-04\d\d/g)!;
    const order = rank(WAFERS).map((w) => w.id);
    expect(ids.filter((id, i) => ids.indexOf(id) === i).slice(0, 12)).toEqual(order);
  });
  it('has the range input with default and valuetext', () => {
    expect(html).toMatch(/<input[^>]*type="range"/);
    expect(html).toContain('min="0"');
    expect(html).toContain('max="12"');
    expect(html).toContain(`value="${DEFAULT_QUEUE}"`);
    expect(html).toContain(`aria-valuetext="${queueLabel(DEFAULT_QUEUE, 12)}"`);
  });
  it('marks the first DEFAULT_QUEUE rows queued', () => {
    rows.forEach((r, i) => {
      if (i < DEFAULT_QUEUE) expect(r).toContain('data-queued="true"');
      else expect(r).not.toContain('data-queued="true"');
    });
  });
  it('has aria-pressed buttons, polite factors panel and scroll wrapper', () => {
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('class="risk-scroll"');
  });
  it('has the exact caption', () => {
    expect(html).toContain('Scores are sample values for illustration, not the output of a trained model.');
  });
});
