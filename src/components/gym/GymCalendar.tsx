import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import data from '../../data/gym-checkins.json';
import { calendarCaption } from '../../data/lifting';
import YearWall from './YearWall';
import {
  MONTH_NAMES, toSet, monthView, summaryText, shiftMonth, monthKey, yearsOf, phaseSpans, dayLabel,
} from './calendar';
import type { Cell } from './calendar';
import './gym.css';

const set = toSet(data.dates);
const years = yearsOf(data.dates);
const asOf = data.asOf;
const first = { year: Number(data.dates[0].slice(0, 4)), month: Number(data.dates[0].slice(5, 7)) - 1 };
const last = { year: Number(asOf.slice(0, 4)), month: Number(asOf.slice(5, 7)) - 1 };
const spans = phaseSpans(data.phases, data.dates, asOf);
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const within = (m: { year: number; month: number }) =>
  monthKey(m.year, m.month) >= monthKey(first.year, first.month) && monthKey(m.year, m.month) <= monthKey(last.year, last.month);

/** The gym check-in calendar: one month at a time, filling green day by day when it scrolls into view. */
export default function GymCalendar() {
  const [cursor, setCursor] = useState(last);
  const [focusDay, setFocusDay] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [filled, setFilled] = useState(false);
  const grid = useRef<HTMLDivElement | null>(null);
  const moved = useRef(false);
  const seen = useRef(false);

  const view = useMemo(() => monthView(cursor.year, cursor.month, set, asOf), [cursor]);
  const title = `${MONTH_NAMES[cursor.month]} ${cursor.year}`;

  // fill when the grid scrolls into view, and again after each month change
  useEffect(() => {
    const el = grid.current;
    if (!el) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof IntersectionObserver === 'undefined') { setFilled(true); return; }
    let raf = 0;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { seen.current = true; setFilled(true); }
    }, { threshold: 0.3 });
    io.observe(el);
    if (seen.current) { setFilled(false); raf = requestAnimationFrame(() => setFilled(true)); }
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [cursor]);

  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    grid.current?.querySelector<HTMLElement>(`[data-day="${focusDay}"]`)?.focus();
  }, [focusDay, cursor]);

  const go = useCallback((delta: number) => {
    const next = shiftMonth(cursor, delta);
    if (!within(next)) return;
    setCursor(next);
    setFocusDay(1);
    setSelected(null);
  }, [cursor]);

  const onKey = (e: ReactKeyboardEvent) => {
    const step = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>)[e.key];
    let next = focusDay;
    if (step !== undefined) next = focusDay + step;
    else if (e.key === 'Home') next = 1;
    else if (e.key === 'End') next = view.days;
    else return;
    e.preventDefault();
    next = Math.max(1, Math.min(view.days, next));
    moved.current = true;
    setFocusDay(next);
    setSelected(view.cells[next - 1].iso);
  };

  const weeks: (Cell | null)[][] = [];
  const flat: (Cell | null)[] = [...Array<null>(view.lead).fill(null), ...view.cells];
  for (let i = 0; i < flat.length; i += 7) weeks.push(flat.slice(i, i + 7));
  const picked = selected ? view.cells.find((c) => c.iso === selected) : null;
  let order = 0;

  return (
    <div className="gym">
      <p className="gym-caption">{calendarCaption}</p>
      <div className="gym-bar">
        <button type="button" className="gym-nav" aria-label="Previous month" aria-disabled={!within(shiftMonth(cursor, -1)) ? true : undefined} onClick={() => go(-1)}>‹</button>
        <h4 className="gym-title">{title}</h4>
        <button type="button" className="gym-nav" aria-label="Next month" aria-disabled={!within(shiftMonth(cursor, 1)) ? true : undefined} onClick={() => go(1)}>›</button>
        <select className="gym-year" aria-label="Year" value={cursor.year} onChange={(e) => {
          const y = Number(e.target.value);
          const m = { year: y, month: Math.min(Math.max(cursor.month, y === first.year ? first.month : 0), y === last.year ? last.month : 11) };
          setCursor(m); setFocusDay(1); setSelected(null);
        }}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <p className="gym-summary">{summaryText(view, asOf)}</p>
      <div ref={grid} role="grid" aria-label={`${title} gym check-ins`} className={`gym-grid${filled ? ' gym-on' : ''}`} onKeyDown={onKey}>
        <div role="row" className="gym-row gym-head">
          {WEEKDAYS.map((d) => <span key={d} role="columnheader" className="gym-dow">{d}</span>)}
        </div>
        {weeks.map((week, w) => (
          <div role="row" className="gym-row" key={w}>
            {week.map((cell, i) => cell ? (
              <button
                key={cell.iso}
                type="button"
                role="gridcell"
                data-day={cell.day}
                tabIndex={cell.day === focusDay ? 0 : -1}
                className={`gym-cell${cell.went ? ' gym-went' : ''}${cell.future ? ' gym-future' : ''}`}
                style={cell.went ? ({ '--d': `${Math.min(order++ * 45, 1500)}ms` } as CSSProperties) : undefined}
                aria-label={dayLabel(cell.iso, cell.went)}
                onMouseEnter={() => setSelected(cell.iso)}
                onFocus={() => { setFocusDay(cell.day); setSelected(cell.iso); }}
                onClick={() => { setFocusDay(cell.day); setSelected(cell.iso); }}
              >{cell.day}</button>
            ) : <span key={`b${i}`} className="gym-blank" aria-hidden="true" />)}
          </div>
        ))}
      </div>
      <p className="gym-status" aria-live="polite">{picked ? dayLabel(picked.iso, picked.went) : ' '}</p>

      <p className="gym-wall-note">{data.dates.length} check-ins since June 2022</p>
      <YearWall />
      <ol className="gym-phases">
        {spans.map((s) => (
          <li key={s.from}><span className="gym-phase-name">{s.label}</span><span className="gym-phase-n">{s.count} check-ins</span></li>
        ))}
      </ol>
    </div>
  );
}
