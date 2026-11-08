import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import IntroTerminal from './IntroTerminal';

const html = renderToStaticMarkup(<IntroTerminal />);

describe('IntroTerminal', () => {
  it('renders a labelled prompt', () => {
    expect(html).toContain('id="intro-input"');
    expect(html).toContain('aria-label="Ask anything about Andrian — a question or a route"');
    expect(html).toContain('for="intro-input"');
  });

  it('keeps the visible placeholder inside the accessible name', () => {
    // WCAG 2.5.3 (Label in Name): the visible label must be contained in the accessible name
    const input = html.match(/<input[^>]*id="intro-input"[^>]*>/)?.[0] ?? '';
    const placeholder = input.match(/placeholder="([^"]+)"/)?.[1] ?? '';
    const label = input.match(/aria-label="([^"]+)"/)?.[1] ?? '';
    expect(placeholder).toBe('Ask anything about Andrian…');
    expect(label).toContain('Ask anything about Andrian');
  });

  it('renders the four topic links as real anchors', () => {
    // the chips are the no-JS navigation path, so they must be links, not buttons
    const chips = [...html.matchAll(/<a href="(#[^"]+)">([^<]+)<\/a>/g)].map((m) => ({
      href: m[1],
      label: m[2],
    }));
    expect(chips).toEqual([
      { href: '#experience', label: 'Experience' },
      { href: '#projects', label: 'Projects' },
      { href: '#about', label: 'About' },
      { href: '#contact', label: 'Contact' },
    ]);
  });

  it('renders an accessible, initially empty output log', () => {
    expect(html).toContain('role="log"');
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain('Commands:');
    expect(html).not.toContain('intro-line-out');
  });
});

describe('IntroTerminal suggestions', () => {
  it('renders three suggestion chips and a refresh button as buttons', () => {
    expect(html.split('class="intro-chip"').length - 1).toBe(3);
    expect(html).toMatch(/<button[^>]*class="intro-chip"/);
    expect(html).toContain('aria-label="Show other questions"');
  });
});

describe('IntroTerminal chip focus', () => {
  it('does not natively disable the chips', () => {
    expect(html).not.toMatch(/class="intro-chip"[^>]*disabled/);
    expect(html).not.toMatch(/<button[^>]*disabled[^>]*class="intro-chip"/);
  });
});

describe('IntroTerminal, simplified', () => {
  it('has no greeting and no empty placeholder text in the markup', () => {
    expect(html).not.toContain('Answers show up here');
    expect(html).not.toContain('hey there');
  });
  it('keeps the log region in the DOM (a live region must exist before it is updated) but empty', () => {
    expect(html).toMatch(/<div class="intro-out"[^>]*role="log"[^>]*><\/div>/);
  });
});
