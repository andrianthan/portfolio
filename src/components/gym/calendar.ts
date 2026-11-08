export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = MONTH_NAMES.map((m) => m.slice(0, 3));
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface Cell {
  day: number; iso: string; went: boolean;
  /** after the as-of cutoff: the day has no check-in recorded, and the export never grows */
  future: boolean;
}
export interface MonthView { year: number; month: number; lead: number; cells: Cell[]; count: number; elapsed: number; days: number }

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export function toSet(dates: string[]): Set<string> { return new Set(dates); }

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function monthKey(year: number, month: number): string { return `${year}-${pad(month + 1)}`; }

export function monthView(year: number, month: number, set: Set<string>, asOf: string): MonthView {
  const days = daysInMonth(year, month);
  const lead = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const cells: Cell[] = [];
  let count = 0;
  for (let day = 1; day <= days; day++) {
    const key = iso(year, month, day);
    const went = set.has(key);
    if (went) count++;
    cells.push({ day, iso: key, went, future: key > asOf });
  }
  const elapsed = cells.filter((c) => !c.future).length;
  return { year, month, lead, cells, count, elapsed, days };
}

/** The cutoff date, as it reads on the page: "Nov 8". The year is left out on purpose —
 *  the month heading above already carries it, and a year here could disagree with it. */
export function asOfLabel(asOf: string): string {
  const [, m, d] = asOf.split('-').map(Number);
  return `${MONTH_SHORT[m - 1]} ${d}`;
}

export function summaryText(v: MonthView, asOf: string): string {
  const current = asOf.startsWith(monthKey(v.year, v.month));
  // the as-of month states its cutoff, so the sentence stays true however long the
  // export stays up: the days are counted as of that date, not as of "now"
  return current && v.elapsed < v.days ? `${v.count} of ${v.elapsed} days, as of ${asOfLabel(asOf)}` : `${v.count} of ${v.days} days`;
}

export function shiftMonth(m: { year: number; month: number }, delta: number): { year: number; month: number } {
  const index = m.year * 12 + m.month + delta;
  return { year: Math.floor(index / 12), month: ((index % 12) + 12) % 12 };
}

export function yearsOf(dates: string[]): number[] {
  return [...new Set(dates.map((d) => Number(d.slice(0, 4))))].sort((a, b) => a - b);
}

function dayBefore(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d - 1));
  return iso(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
}

export function phaseSpans(
  phases: { label: string; from: string }[],
  dates: string[],
  asOf: string,
): { label: string; from: string; to: string; count: number }[] {
  return phases.map((p, i) => {
    const next = phases[i + 1]?.from;
    const to = next ? dayBefore(next) : asOf;
    const count = dates.filter((d) => d >= p.from && (next ? d < next : true)).length;
    return { label: p.label.replace(' — ', ': '), from: p.from, to, count };
  });
}

export function dayLabel(isoDate: string, went: boolean, future = false): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dow = DAY_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  // a day past the cutoff has no record either way: it is not a rest day, and it is not
  // "upcoming" either, because the export does not move and the label would go stale
  return `${dow}, ${MONTH_SHORT[m - 1]} ${d}, ${y}: ${future ? 'not yet recorded' : went ? 'went to the gym' : 'rest day'}`;
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

/** The day a navigation key moves the roving focus to, or null for any other key. */
export function nextFocusDay(key: string, focusDay: number, days: number): number | null {
  const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
  let next: number;
  if (key in steps) next = focusDay + steps[key];
  else if (key === 'Home') next = 1;
  else if (key === 'End') next = days;
  else return null;
  return Math.max(1, Math.min(days, next));
}
