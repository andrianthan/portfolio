import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ThemeToggle from './ThemeToggle';

describe('ThemeToggle', () => {
  it('is labelled vapor / light', () => {
    const html = renderToStaticMarkup(<ThemeToggle />);
    expect(html).toContain('id="theme-toggle"');
    expect(html).toContain('vapor / light');
    expect(html).toContain('aria-label="vapor / light theme"');
  });
});
