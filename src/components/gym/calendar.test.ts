import { describe, it, expect } from 'vitest';
import data from '../../data/gym-checkins.json';
import {
  MONTH_NAMES, toSet, daysInMonth, yearsOf, shiftYear, yearStats, overallStats, weekGrid, formatHours,
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

describe('yearsOf / shiftYear', () => {
  it('lists the years and steps through them, null off either end', () => {
    const years = yearsOf(data.dates);
    expect(years).toEqual([2022, 2023, 2024, 2025, 2026]);
    expect(MONTH_NAMES.length).toBe(12);
    expect(shiftYear(years, 2026, -1)).toBe(2025);
    expect(shiftYear(years, 2022, 1)).toBe(2023);
    expect(shiftYear(years, 2026, 1)).toBeNull();
    expect(shiftYear(years, 2022, -1)).toBeNull();
    expect(shiftYear(years, 1999, 1)).toBeNull();
  });
});

describe('yearStats', () => {
  it('counts check-ins, best month and a streak across a month boundary', () => {
    const dates = ['2023-01-05', '2023-01-31', '2023-02-01', '2023-02-02', '2023-02-10', '2023-02-20', '2024-03-01'];
    const s = yearStats(2023, dates, '2024-06-30');
    expect(s.checkIns).toBe(6);
    expect(s.longestStreak).toBe(3); // Jan 31, Feb 1, Feb 2
    expect(s.bestMonth).toEqual({ name: 'February', count: 4 });
  });
  it('averages over the whole year for a middle year', () => {
    const dates = ['2022-06-01', '2023-03-01', '2023-03-02', '2024-01-01'];
    // 365 days = 52.142857 weeks
    expect(yearStats(2023, dates, '2024-06-30').perWeek).toBe((2 / (365 / 7)).toFixed(1));
  });
  it('starts the first year at the first check-in and ends the as-of year at asOf', () => {
    const dates = ['2022-12-18', '2022-12-25', '2023-01-01'];
    // Dec 18..Dec 31 = 14 days = 2 weeks, 2 check-ins
    expect(yearStats(2022, dates, '2023-01-14').perWeek).toBe('1.0');
    // Jan 1..Jan 14 = 14 days = 2 weeks, 1 check-in
    expect(yearStats(2023, dates, '2023-01-14').perWeek).toBe('0.5');
  });
  it('handles a year with a single check-in', () => {
    const s = yearStats(2024, ['2022-06-01', '2024-07-04'], '2025-01-01');
    expect(s.checkIns).toBe(1);
    expect(s.longestStreak).toBe(1);
    expect(s.bestMonth).toEqual({ name: 'July', count: 1 });
    expect(s.perWeek).toBe((1 / (366 / 7)).toFixed(1));
  });
  it('clips a streak crossing Dec 31 to the days inside the year', () => {
    const dates = ['2023-12-30', '2023-12-31', '2024-01-01', '2024-01-02', '2024-01-03'];
    expect(yearStats(2023, dates, '2024-02-01').longestStreak).toBe(2);
    expect(yearStats(2024, dates, '2024-02-01').longestStreak).toBe(3);
    expect(overallStats(dates, '2024-02-01').longestStreak).toBe(5);
  });
  it('breaks a best-month tie toward the earlier month, and ignores duplicate dates in streaks', () => {
    const s = yearStats(2024, ['2024-02-03', '2024-05-04', '2024-05-04'], '2025-01-01');
    expect(s.longestStreak).toBe(1);
    expect(s.bestMonth.name).toBe('February');
  });
  it('per-year counts add up to the total on the real data', () => {
    const total = yearsOf(data.dates).reduce((n, y) => n + yearStats(y, data.dates, asOf).checkIns, 0);
    expect(total).toBe(861);
  });
  it('never uses the old phase wording', () => {
    expect(JSON.stringify(yearStats(2022, data.dates, asOf)).toLowerCase()).not.toMatch(/slower|estimated|reconstructed/);
  });
});

describe('overallStats', () => {
  it('reads the real history: 861 check-ins since June 2022', () => {
    const s = overallStats(data.dates, asOf);
    expect(s.checkIns).toBe(861);
    expect(s.since).toBe('June 2022');
    const weeks = (Date.UTC(2026, 10, 8) - Date.UTC(2022, 5, 1)) / 86_400_000 / 7 + 1 / 7;
    expect(s.perWeek).toBe((861 / weeks).toFixed(1));
    expect(s.longestStreak).toBeGreaterThanOrEqual(yearStats(2026, data.dates, asOf).longestStreak);
  });
  it('counts a streak across a year boundary and a leap day', () => {
    expect(overallStats(['2023-12-31', '2024-01-01'], '2024-01-07').longestStreak).toBe(2);
    expect(overallStats(['2024-02-28', '2024-02-29', '2024-03-01'], '2024-03-07').longestStreak).toBe(3);
  });
  it('averages from the first check-in to asOf, inclusive', () => {
    expect(overallStats(['2024-01-01', '2024-01-08'], '2024-01-14').perWeek).toBe('1.0'); // 2 / 2 weeks
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
