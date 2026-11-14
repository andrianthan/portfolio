import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AskSdpDemo from './AskSdpDemo';

const html = renderToStaticMarkup(<AskSdpDemo />);

describe('AskSdpDemo', () => {
  it('labels the window as sample data', () => {
    expect(html).toContain('sample data');
  });

  it('names the demo for assistive tech', () => {
    expect(html).toContain('aria-label="Sample Ask SDP chat"');
  });

  it('ties the hint to the input with aria-describedby', () => {
    const described = html.match(/aria-describedby="([^"]+)"/);
    expect(described).not.toBeNull();
    const id = described![1];
    expect(html).toContain(`<p id="${id}" class="ask-hint">`);
  });

  it('labels the preset button group', () => {
    expect(html).toContain('role="group" aria-label="Sample questions"');
  });

  it('puts the log in a focusable labelled region', () => {
    expect(html).toContain('role="log"');
    expect(html).toContain('aria-label="Conversation"');
    expect(html).toContain('tabindex="0"');
  });

  it('says every number must come from a tool result', () => {
    expect(html).toContain('Every number in an answer must come from a tool result');
    expect(html).toContain('a question with a figure the data does not hold is refused');
  });
});
