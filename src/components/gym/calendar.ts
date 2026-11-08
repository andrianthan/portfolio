export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const DAY_MS = 86_400_000;
/** Whole days since the epoch for a YYYY-MM-DD string (UTC, so month/year/DST boundaries are exact). */
const dayNumber = (isoDate: string): number => {
  const [y, m, d] = isoDate.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
};

export function toSet(dates: string[]): Set<string> { return new Set(dates); }

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function yearsOf(dates: string[]): number[] {
  return [...new Set(dates.map((d) => Number(d.slice(0, 4))))].sort((a, b) => a - b);
}

/** The year after stepping `delta` places through `years`, or null when that runs off either end. */
export function shiftYear(years: number[], current: number, delta: number): number | null {
  const i = years.indexOf(current);
  if (i < 0) return null;
  return years[i + delta] ?? null;
}

/** The longest run of consecutive calendar days in a list of ISO dates (duplicates ignored). */
function longestRun(dates: string[]): number {
  const days = [...new Set(dates.map(dayNumber))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  days.forEach((d, i) => {
    run = i > 0 && d - days[i - 1] === 1 ? run + 1 : 1;
    if (run > best) best = run;
  });
  return best;
}

const perWeek = (checkIns: number, firstDay: string, lastDay: string): string => {
  const weeks = (dayNumber(lastDay) - dayNumber(firstDay) + 1) / 7;
  return weeks > 0 ? (checkIns / weeks).toFixed(1) : '0.0';
};

export interface YearStats { checkIns: number; perWeek: string; longestStreak: number; bestMonth: { name: string; count: number } }
export interface OverallStats { checkIns: number; perWeek: string; longestStreak: number; since: string }

/** Metrics for one calendar year. The first year counts weeks from the first check-in and
 *  the as-of year up to the as-of date; a streak is clipped to the days inside the year. */
export function yearStats(year: number, dates: string[], asOf: string): YearStats {
  const prefix = `${year}-`;
  const inYear = dates.filter((d) => d.startsWith(prefix));
  const firstDate = [...dates].sort()[0];
  const from = firstDate && firstDate.startsWith(prefix) ? firstDate : `${year}-01-01`;
  const to = asOf.startsWith(prefix) ? asOf : `${year}-12-31`;
  const perMonth = new Array<number>(12).fill(0);
  for (const d of new Set(inYear)) perMonth[Number(d.slice(5, 7)) - 1]++;
  let best = 0;
  perMonth.forEach((n, i) => { if (n > perMonth[best]) best = i; });
  return {
    checkIns: inYear.length,
    perWeek: perWeek(inYear.length, from, to),
    longestStreak: longestRun(inYear),
    bestMonth: { name: perMonth[best] > 0 ? MONTH_NAMES[best] : '\u2014', count: perMonth[best] },
  };
}

/** Metrics across the whole history, from the first check-in to the as-of date. */
export function overallStats(dates: string[], asOf: string): OverallStats {
  const firstDate = [...dates].sort()[0];
  const [y, m] = firstDate.split('-').map(Number);
  return {
    checkIns: dates.length,
    perWeek: perWeek(dates.length, firstDate, asOf),
    longestStreak: longestRun(dates),
    since: `${MONTH_NAMES[m - 1]} ${y}`,
  };
}

/** A year as weeks (columns) by weekdays (rows), Sunday first, for the overview wall. */
export function weekGrid(year: number, set: Set<string>): { cols: number; cells: { col: number; row: number; went: boolean }[] } {
  const jan1 = new Date(Date.UTC(year, 0, 1)).getUTCDay();
  const total = daysInMonth(year, 1) === 29 ? 366 : 365;
  const cells: { col: number; row: number; went: boolean }[] = [];
  for (let i = 0; i < total; i++) {
    const t = new Date(Date.UTC(year, 0, 1 + i));
    const key = iso(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
    const slot = i + jan1;
    cells.push({ col: Math.floor(slot / 7), row: slot % 7, went: set.has(key) });
  }
  return { cols: Math.floor((total - 1 + jan1) / 7) + 1, cells };
}

export function formatHours(sessions: number, hoursEach: number): string {
  return `${((sessions * hoursEach) / 1000).toFixed(1)}k`;
}
