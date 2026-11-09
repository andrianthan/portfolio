import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Terminal from './Terminal';

const html = renderToStaticMarkup(<Terminal />);
const count = (needle: string) => html.split(needle).length - 1;

describe('Terminal', () => {
  it('renders the shell with the host line and a link back to the site', () => {
    expect(html).toContain('andrian@portfolio · terminal');
    expect(html).toContain('href="/"');
  });

  it('renders an accessible log region', () => {
    expect(html).toContain('role="log"');
    expect(html).toContain('aria-live="polite"');
  });

  it('renders a labelled command input', () => {
    expect(html).toContain('id="term-input"');
    expect(html).toContain('aria-label="Terminal command"');
    expect(html).toContain('for="term-input"');
  });

  it('renders every command chip as a button with text', () => {
    for (const chip of ['/help', '/experience', '/resume', '/about', '/skills', '/contact', '/hire']) {
      expect(html).toContain(`>${chip}</button>`);
    }
    expect(count('<button')).toBeGreaterThanOrEqual(8);
  });

  it('offers a sound toggle that starts off', () => {
    expect(html).toContain('sound off');
    expect(html).toContain('aria-pressed="false"');
  });

  it('starts with an empty log so the island reveals the help on mount', () => {
    expect(html).not.toContain('Commands:');
  });
});
