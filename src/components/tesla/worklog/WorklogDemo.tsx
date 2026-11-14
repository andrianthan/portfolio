import '../../qa/qa.css';
import './worklog.css';
import { useState } from 'react';
import { WORKLOG } from './content';
import {
  currentSection, initialState, selectHeadline, selectSection, toggleEntry,
  visibleEntries, type WorklogState,
} from './worklog';

// A mock recreation of the internship work log. The chrome reuses the site's
// .qa window classes; the tabs, rows and expansion live in worklog.css.
export default function WorklogDemo() {
  const [state, setState] = useState<WorklogState>(initialState);
  const entries = visibleEntries(state, WORKLOG);
  const section = currentSection(state, WORKLOG);
  const panel = state.sectionId ?? 'headline';

  return (
    <div className="qa wl" role="group" aria-label="Sample internship work log">
      <div className="qa-top">
        <span className="qa-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="qa-title">{WORKLOG.title} · {WORKLOG.subtitle}</span>
        <span className="qa-sample">sample data</span>
      </div>
      <div className="wl-tabs" role="group" aria-label="Work log sections">
        <button
          type="button" aria-pressed={section === null}
          className={section === null ? 'on' : ''}
          onClick={() => setState(selectHeadline(state))}
        >
          Headline
        </button>
        {WORKLOG.sections.map((s) => (
          <button
            key={s.id} type="button" aria-pressed={section?.id === s.id}
            className={section?.id === s.id ? 'on' : ''}
            onClick={() => setState(selectSection(state, s.id))}
          >
            {s.title}
          </button>
        ))}
      </div>
      <div className="wl-body" role="region" aria-label={section ? section.title : 'Headline'}>
        {entries.map((e) => {
          const key = `${panel}:${e.label}`;
          const open = state.expanded.includes(key);
          const detailId = `wl-${key.replace(/[^a-z0-9]+/gi, '-')}`;
          return (
            <div key={key} className="wl-entry">
              <button
                type="button" aria-expanded={open} aria-controls={detailId}
                onClick={() => setState(toggleEntry(state, key))}
              >
                <span className="wl-label">{e.label}</span>
                <span className="wl-chev" aria-hidden="true">{open ? '−' : '+'}</span>
              </button>
              {open && <p id={detailId} className="wl-detail">{e.detail}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
