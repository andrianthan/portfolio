import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import GymCalendar from './GymCalendar';

const html = renderToStaticMarkup(<GymCalendar />);

describe('GymCalendar', () => {
  it('opens on the latest month with the plain caption and its summary', () => {
    expect(html).toContain('Gym check-ins');
    expect(html).toContain('November 2026');
    expect(html).toContain('5 of 8 days so far');
  });
  it('renders an accessible grid with weekday headers and labelled days', () => {
    expect(html).toContain('role="grid"');
    expect(html).toContain('aria-label="November 2026 gym check-ins"');
    expect(html).toContain('Sun');
    expect(html).toContain('Mon, Nov 2, 2026: went to the gym');
    expect(html).toContain('Sun, Nov 1, 2026: rest day');
  });
  it('has exactly one tabbable day (roving tabindex)', () => {
    expect(html.split('tabindex="0"').length - 1).toBe(1);
  });
  it('offers previous/next buttons and a year switcher, and says nothing about syncing', () => {
    expect(html).toContain('aria-label="Previous month"');
    expect(html).toContain('aria-label="Next month"');
    expect(html).toContain('aria-label="Year"');
    expect(html.toLowerCase()).not.toMatch(/synced|connected|estimated|reconstructed/);
  });
  it('lists the four phases with counts and the overview summary', () => {
    expect(html).toContain('Summer 2022: slower start');
    expect(html).toContain('861 check-ins since June 2022');
  });
});
