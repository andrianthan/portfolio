import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import data from '../../data/gym-checkins.json';
import { yearStats } from './calendar';
import GymCalendar, { YearMetrics } from './GymCalendar';

const html = renderToStaticMarkup(<GymCalendar />);

describe('GymCalendar', () => {
  it('opens on the as-of year with the caption and its title', () => {
    expect(html).toContain('Gym check-ins');
    expect(html).toContain('<h4 class="gym-title">2026</h4>');
  });
  it('offers previous/next year arrows, no month or select controls', () => {
    expect(html).toContain('aria-label="Previous year"');
    expect(html).toContain('aria-label="Next year"');
    expect(html).not.toContain('Previous month');
    expect(html).not.toContain('<select');
  });
  it('at the newest year only the next arrow is aria-disabled, and never the disabled attribute', () => {
    const next = html.match(/<button[^>]*aria-label="Next year"[^>]*>/)![0];
    const prev = html.match(/<button[^>]*aria-label="Previous year"[^>]*>/)![0];
    expect(next).toContain('aria-disabled="true"');
    expect(prev).not.toContain('aria-disabled');
    expect(html).not.toMatch(/<button[^>]*\sdisabled/);
  });
  it('carries the selected year metrics as text in a polite live region', () => {
    const s = yearStats(2026, data.dates, data.asOf);
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain(`<b>${s.checkIns}</b><span>Check-ins</span>`);
    expect(html).toContain(`<b>${s.perWeek}</b><span>Avg per week</span>`);
    expect(html).toContain('Longest streak');
    expect(html).toContain('Best month');
  });
  it('metrics text follows the year', () => {
    for (const y of [2022, 2023, 2024, 2025, 2026]) {
      const s = yearStats(y, data.dates, data.asOf);
      const m = renderToStaticMarkup(<YearMetrics year={y} />);
      expect(m).toContain(`<b>${s.checkIns}</b>`);
      expect(m).toContain(`<b>${s.bestMonth.name}</b><span>Best month · ${s.bestMonth.count}</span>`);
    }
    expect(renderToStaticMarkup(<YearMetrics year={2022} />)).not.toBe(renderToStaticMarkup(<YearMetrics year={2026} />));
  });
  it('shows no phase list and no dev-flavoured wording', () => {
    expect(html).not.toContain('gym-phases');
    expect(html.toLowerCase()).not.toMatch(/slower start|building consistency|estimated|reconstructed|synced|connected/);
  });
  it('the wall is decorative', () => {
    expect(html).toMatch(/<canvas[^>]*aria-hidden="true"/);
  });
});
