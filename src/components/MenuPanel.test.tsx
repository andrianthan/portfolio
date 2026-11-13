import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import MenuPanel from './MenuPanel';
import type { MenuRow } from '../lib/commands';

const rows: MenuRow[] = [
  { id: 'home', label: 'Home', group: 'Go to', href: '/' },
  { id: 'github', label: 'GitHub', group: 'Contact', href: 'https://g/h', external: true },
  { id: 'ask', label: 'Ask: hi', group: 'Ask' },
];
const noop = () => {};
const base = { query: '', rows, active: 1, answer: null, busy: false, onQuery: noop, onPick: noop, onClose: noop };

describe('MenuPanel', () => {
  const html = renderToStaticMarkup(<MenuPanel {...base} />);

  it('is a labelled modal dialog with a combobox input', () => {
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-label="Command menu"');
    expect(html).toContain('role="combobox"');
  });

  it('renders one option per row and marks only the active one selected', () => {
    expect((html.match(/role="option"/g) ?? []).length).toBe(3);
    expect((html.match(/aria-selected="true"/g) ?? []).length).toBe(1);
    expect(html).toContain('aria-activedescendant="cmdk-opt-github"');
  });

  it('links external rows safely and shows group headings', () => {
    expect(html).toContain('href="https://g/h"');
    expect(html).toContain('rel="noopener"');
    expect(html).toContain('Go to');
    expect(html).toContain('Contact');
  });

  it('shows an answer with sources in a polite live region', () => {
    const out = renderToStaticMarkup(
      <MenuPanel {...base} answer={{ text: 'Built a copilot.', refused: false, sources: [{ title: 'Tesla', url: '/experience' }], open: { href: '/experience', label: 'experience' } }} />,
    );
    expect(out).toContain('aria-live="polite"');
    expect(out).toContain('Built a copilot.');
    expect(out).toContain('href="/experience"');
    expect(out).toContain('Tesla');
  });

  it('shows a thinking state while busy', () => {
    expect(renderToStaticMarkup(<MenuPanel {...base} busy />)).toContain('Thinking');
  });
});
