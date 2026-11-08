import { useState } from 'react';
import data from '../../data/gym-checkins.json';
import { calendarCaption } from '../../data/lifting';
import YearWall from './YearWall';
import { yearsOf, shiftYear, yearStats } from './calendar';
import './gym.css';

const years = yearsOf(data.dates);
const asOfYear = Number(data.asOf.slice(0, 4));

/** The selected year's numbers, as plain text: the text equivalent of the decorative wall. */
export function YearMetrics({ year }: { year: number }) {
  const s = yearStats(year, data.dates, data.asOf);
  const items: [string, string][] = [
    [String(s.checkIns), 'Check-ins'],
    [s.perWeek, 'Avg per week'],
    [`${s.longestStreak} ${s.longestStreak === 1 ? 'day' : 'days'}`, 'Longest streak'],
    [s.bestMonth.name, `Best month · ${s.bestMonth.count}`],
  ];
  return (
    <ul className="gym-stats">
      {items.map(([value, label]) => <li key={label}><b>{value}</b><span>{label}</span></li>)}
    </ul>
  );
}

/** The gym wall, one year at a time, with previous/next year arrows and that year's metrics. */
export default function GymCalendar() {
  const [year, setYear] = useState(years.includes(asOfYear) ? asOfYear : years[years.length - 1]);
  const prev = shiftYear(years, year, -1);
  const next = shiftYear(years, year, 1);
  const go = (target: number | null) => { if (target !== null) setYear(target); };

  return (
    <div className="gym">
      <p className="gym-caption">{calendarCaption}</p>
      <div className="gym-bar">
        <button type="button" className="gym-nav" aria-label="Previous year" aria-disabled={prev === null ? true : undefined} onClick={() => go(prev)}>{'‹'}</button>
        <h4 className="gym-title">{year}</h4>
        <button type="button" className="gym-nav" aria-label="Next year" aria-disabled={next === null ? true : undefined} onClick={() => go(next)}>{'›'}</button>
      </div>
      <YearWall year={year} />
      <div aria-live="polite"><YearMetrics year={year} /></div>
    </div>
  );
}
