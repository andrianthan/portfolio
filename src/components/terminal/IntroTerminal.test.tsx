import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import IntroTerminal from './IntroTerminal';

const html = renderToStaticMarkup(<IntroTerminal />);

describe('IntroTerminal', () => {
  it('renders a labelled prompt', () => {
    expect(html).toContain('id="intro-input"');
    expect(html).toContain('aria-label="Ask a question or type a route"');
    expect(html).toContain('for="intro-input"');
  });

  it('renders an accessible, initially empty output log', () => {
    expect(html).toContain('role="log"');
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain('Commands:');
    expect(html).not.toContain('intro-line-out');
  });
});
