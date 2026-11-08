import '../../qa/qa.css';
import './slides.css';
import { useEffect, useState } from 'react';
import {
  GENERATING_NOTE, STEPS, TEMPLATES, autoAdvance, downloadName, initialState, reducedMotion,
  selectTemplate, start, statusText, tick, type SlideState,
} from './slides';

const STEP_MS = 700;

export default function SlidesDemo() {
  const [state, setState] = useState<SlideState>(initialState);
  const [reduced, setReduced] = useState(false);
  const [showMock, setShowMock] = useState(false);
  const generating = state.phase === 'generating';
  const ready = state.phase === 'ready';
  const name = downloadName(state);

  useEffect(() => {
    // The preference is read here rather than cached at mount, so a change to
    // it at runtime takes effect straight away.
    const reducedNow = reducedMotion();
    setReduced(reducedNow);
    if (!autoAdvance(state.phase, reducedNow)) return;
    const id = window.setTimeout(() => setState((s) => tick(s)), STEP_MS);
    return () => window.clearTimeout(id);
    // state.step is load-bearing: it re-arms the timer once per step, so a
    // "tidy the deps" pass that dropped it would silently break auto-advance.
  }, [state.phase, state.step]);

  return (
    <div className="qa sl" role="group" aria-label="Sample slideshow generation">
      <div className="qa-top">
        <span className="qa-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="qa-title">Slideshow generation</span>
        <span className="qa-sample">sample data</span>
      </div>
      <div className="sl-body">
        <div className="sl-templates" role="group" aria-label="Deck template">
          {TEMPLATES.map((t) => (
            <button
              key={t} type="button" aria-pressed={state.template === t}
              className={state.template === t ? 'on' : ''}
              disabled={generating}
              onClick={() => { setShowMock(false); setState((s) => selectTemplate(s, t)); }}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="sl-actions">
          <button
            type="button" className="sl-go" disabled={generating}
            onClick={() => { setShowMock(false); setState((s) => start(s)); }}
          >
            Regenerate deck
          </button>
          {generating && reduced && (
            <button type="button" onClick={() => setState((s) => tick(s))}>Next step</button>
          )}
        </div>
        {generating && <p className="sl-note">{GENERATING_NOTE}</p>}
        <ol className="sl-steps" aria-label="Generation steps">
          {STEPS.map((label, i) => {
            const done = i < state.step;
            const current = generating && i === state.step;
            return (
              <li key={label} className={done ? 'done' : current ? 'cur' : ''}>
                <span className="sl-mark" aria-hidden="true">{done ? '✓' : i + 1}</span>
                <span>{label}</span>
                <span className="sl-sr">{done ? ' (done)' : current ? ' (in progress)' : ' (waiting)'}</span>
              </li>
            );
          })}
        </ol>
        <p className="sl-status" role="status" aria-live="polite">{statusText(state)}</p>
        <svg className="sl-strip" viewBox="0 0 240 40" aria-hidden="true" focusable="false">
          {[0, 1, 2, 3].map((i) => (
            <g key={i} opacity={ready || (generating && i < state.step) ? 1 : 0.35}>
              <rect x={i * 60 + 2} y={2} width={56} height={36} rx={3} fill="var(--color-card)" stroke="var(--color-accent)" />
              <rect x={i * 60 + 8} y={9} width={24} height={4} fill="var(--color-accent)" />
              <rect x={i * 60 + 8} y={18} width={42} height={3} fill="var(--color-rule)" />
              <rect x={i * 60 + 8} y={25} width={32} height={3} fill="var(--color-rule)" />
            </g>
          ))}
        </svg>
        {ready && name && (
          <div className="sl-dl">
            <button type="button" className="sl-link" onClick={() => setShowMock(true)}>Download</button>
            {showMock && <span className="sl-mock" role="status">Mock download: {name}</span>}
          </div>
        )}
        <p className="sl-cap">Composer controls are work in progress and hidden.</p>
      </div>
    </div>
  );
}
