import { describe, it, expect } from 'vitest';
import data from '../../data/gym-checkins.json';
import {
  MONTH_NAMES, toSet, daysInMonth, monthView, summaryText, shiftMonth, monthKey, yearsOf, phaseSpans, dayLabel, weekGrid, formatHours, nextFocusDay,
} from './calendar';

const set = toSet(data.dates);
const asOf = data.asOf;

describe('daysInMonth', () => {
  it('handles leap years and 30/31-day months', () => {
    expect(daysInMonth(2024, 1)).toBe(29);
    expect(daysInMonth(2025, 1)).toBe(28);
    expect(daysInMonth(2025, 8)).toBe(30);
    expect(daysInMonth(2025, 7)).toBe(31);
  });
});

describe('monthView', () => {
  it('lays out Aug 2025: starts on a Friday (5 blanks), 31 cells, 20 went', () => {
    const v = monthView(2025, 7, set, asOf);
    expect(v.lead).toBe(5);
    expect(v.cells.length).toBe(31);
    expect(v.count).toBe(20);
    expect(v.days).toBe(31);
    expect(v.elapsed).toBe(31);
    expect(v.cells.every((c) => !c.future)).toBe(true);
    expect(v.cells[0]).toEqual({ day: 1, iso: '2025-08-01', went: true, future: false });
  });
  it('marks days after asOf as future in the current month', () => {
    const v = monthView(2026, 10, set, asOf);
    expect(v.lead).toBe(0);
    expect(v.count).toBe(5);
    expect(v.elapsed).toBe(8);
    expect(v.cells.filter((c) => c.future).length).toBe(22);
    expect(v.cells[8].future).toBe(true);
    expect(v.cells[7].future).toBe(false);
  });
});

describe('summaryText', () => {
  it('reads "N of D days" for a finished month', () => {
    expect(summaryText(monthView(2025, 7, set, asOf), asOf)).toBe('20 of 31 days');
  });
  it('reads "N of D days so far" for the current month', () => {
    expect(summaryText(monthView(2026, 10, set, asOf), asOf)).toBe('5 of 8 days so far');
  });
});

describe('navigation helpers', () => {
  it('shifts across year boundaries', () => {
    expect(shiftMonth({ year: 2025, month: 11 }, 1)).toEqual({ year: 2026, month: 0 });
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
  });
  it('builds sortable month keys and lists the years', () => {
    expect(monthKey(2025, 7)).toBe('2025-08');
    expect(yearsOf(data.dates)).toEqual([2022, 2023, 2024, 2025, 2026]);
    expect(MONTH_NAMES.length).toBe(12);
  });
});

describe('phaseSpans', () => {
  it('splits the history into the four phases and the counts add up to 861', () => {
    const spans = phaseSpans(data.phases, data.dates, asOf);
    expect(spans.length).toBe(4);
    expect(spans.map((s) => s.label)).toEqual([
      'Summer 2022: slower start',
      'Late 2022: building consistency',
      '2023: increasingly consistent',
      'Nov 2023–present: consistent',
    ]);
    expect(spans.reduce((n, s) => n + s.count, 0)).toBe(861);
    expect(spans[0].count).toBe(18);
    expect(spans[3].to).toBe(asOf);
  });
});

describe('dayLabel', () => {
  it('describes a day for assistive tech', () => {
    expect(dayLabel('2025-08-01', true)).toBe('Fri, Aug 1, 2025: went to the gym');
    expect(dayLabel('2025-08-06', false)).toBe('Wed, Aug 6, 2025: rest day');
  });
  it('calls days that have not happened yet upcoming, not rest days', () => {
    expect(dayLabel('2026-11-10', false, true)).toBe('Tue, Nov 10, 2026: upcoming');
  });
});

describe('weekGrid', () => {
  it('puts every check-in of a year on the grid exactly once', () => {
    for (const year of [2022, 2023, 2024, 2025, 2026]) {
      const g = weekGrid(year, set);
      const went = g.cells.filter((c) => c.went).length;
      expect(went).toBe(data.dates.filter((d) => d.startsWith(String(year))).length);
      expect(g.cols === 53 || g.cols === 54).toBe(true);
      for (const c of g.cells) { expect(c.row).toBeGreaterThanOrEqual(0); expect(c.row).toBeLessThan(7); }
    }
  });
});

describe('formatHours', () => {
  it('rounds to one decimal in thousands', () => {
    expect(formatHours(861, 1.9)).toBe('1.6k');
    expect(formatHours(1000, 2)).toBe('2.0k');
  });
});

describe('nextFocusDay', () => {
  it('maps each navigation key', () => {
    expect(nextFocusDay('ArrowLeft', 10, 30)).toBe(9);
    expect(nextFocusDay('ArrowRight', 10, 30)).toBe(11);
    expect(nextFocusDay('ArrowUp', 10, 30)).toBe(3);
    expect(nextFocusDay('ArrowDown', 10, 30)).toBe(17);
    expect(nextFocusDay('Home', 10, 30)).toBe(1);
    expect(nextFocusDay('End', 10, 30)).toBe(30);
  });
  it('clamps to 1..days', () => {
    expect(nextFocusDay('ArrowLeft', 1, 30)).toBe(1);
    expect(nextFocusDay('ArrowUp', 3, 30)).toBe(1);
    expect(nextFocusDay('ArrowRight', 30, 30)).toBe(30);
    expect(nextFocusDay('ArrowDown', 28, 30)).toBe(30);
  });
  it('returns null for other keys', () => {
    expect(nextFocusDay('Tab', 5, 30)).toBeNull();
    expect(nextFocusDay('Enter', 5, 30)).toBeNull();
  });
});
