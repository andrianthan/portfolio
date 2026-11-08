import '../../qa/qa.css';
import './partsummary.css';
import { useState } from 'react';
import { MOCK_PARTS } from '../fixtures';
import { SUBTABS, initialState, search, selectTab, type PSState, type SubTab } from './partsummary';
import { dataFor, type Matrix } from './partdata';

function LineChart({ values, label, unit }: { values: number[]; label: string; unit: string }) {
  const w = 240, h = 90, pad = 8;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / (values.length - 1);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <div>
      <svg className="ps-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${label}: ${values.join(', ')} ${unit}, oldest to newest`}>
        <polyline points={pts.join(' ')} fill="none" stroke="var(--color-accent)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        {pts.map((p, i) => {
          const [x, y] = p.split(',');
          return <circle key={i} cx={x} cy={y} r={2.5} fill="var(--color-accent)" />;
        })}
      </svg>
      <p className="ps-note">Last 12 weeks, {unit}. Low {min}, high {max}.</p>
    </div>
  );
}

function Heatmap({ m, caption, corner }: { m: Matrix; caption: string; corner: string }) {
  const max = Math.max(...m.cells.flat());
  return (
    <div className="ps-scroll" tabIndex={0} role="region" aria-label={`${caption}, scrolls horizontally`}>
      <table className="ps-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{corner}</th>
            {m.cols.map((c) => <th key={c} scope="col">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {m.rows.map((r, ri) => (
            <tr key={r}>
              <th scope="row">{r}</th>
              {m.cells[ri].map((v, ci) => (
                <td key={ci} style={{ background: `color-mix(in srgb, var(--color-accent) ${Math.round((v / max) * 60)}%, transparent)` }}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The part summary demo. `partId` and `tab` open a part on the first render;
 * they exist so the render test can reach the tabs, and both default to the
 * closed state.
 */
export default function PartSummaryDemo({ partId, tab }: { partId?: string; tab?: SubTab } = {}) {
  const [state, setState] = useState<PSState>(() => {
    const opened = partId ? search(initialState, partId, MOCK_PARTS) : initialState;
    return tab ? selectTab(opened, tab) : opened;
  });
  const [text, setText] = useState('');
  const part = state.partId ? MOCK_PARTS.find((p) => p.id === state.partId) ?? null : null;
  const data = part ? dataFor(part.id) : null;

  const run = (q: string) => { setText(q); setState((s) => search(s, q, MOCK_PARTS)); };

  return (
    <div className="qa ps" role="group" aria-label="Sample part summary">
      <div className="qa-top">
        <span className="qa-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="qa-title">Part summary</span>
        <span className="qa-sample">sample data</span>
      </div>
      <div className="ps-body">
        <form className="ps-search" onSubmit={(e) => { e.preventDefault(); run(text); }}>
          <input
            type="search" value={text} onChange={(e) => setText(e.target.value)}
            aria-label="Search for a part" placeholder="Part id or name, e.g. P-1001"
          />
          <button type="submit">Search</button>
        </form>
        <div className="ps-chips" role="group" aria-label="Try a sample part">
          {MOCK_PARTS.map((p) => (
            <button key={p.id} type="button" onClick={() => run(p.id)}>{p.id}</button>
          ))}
        </div>
        <p className="ps-msg" role="status" aria-live="polite">{state.message}</p>

        {part && data && (
          <section className="ps-result" aria-label={`Summary for ${part.id}`}>
            <h3 className="ps-head"><span>{part.id}</span> {part.name} <em>{part.system}</em></h3>
            <div className="ps-tabs" role="group" aria-label="Summary sections">
              {SUBTABS.map((t) => (
                <button
                  key={t.id} type="button" aria-pressed={state.tab === t.id}
                  className={state.tab === t.id ? 'on' : ''}
                  onClick={() => setState((s) => selectTab(s, t.id))}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="ps-panel">
              {state.tab === 'overview' && (
                <>
                  <p className="ps-tag">AI-generated, mock</p>
                  <ul className="ps-insights">
                    {data.insights.map((i) => <li key={i}>{i}</li>)}
                  </ul>
                </>
              )}
              {state.tab === 'consumption' && <LineChart values={data.consumption} label={`Sample consumption for ${part.id}`} unit="units per week" />}
              {state.tab === 'failures' && <LineChart values={data.failureRate} label={`Sample failure rate for ${part.id}`} unit="failures per 1,000 units" />}
              {state.tab === 'location' && <Heatmap m={data.locationMatrix} caption="Sample repair counts by region and build year" corner="Region" />}
              {state.tab === 'codes' && <Heatmap m={data.codeMatrix} caption="Sample repair counts by correction code and sub-system" corner="Code" />}
              {state.tab === 'breakdown' && (
                <div className="ps-scroll" tabIndex={0} role="region" aria-label="Sample symptom breakdown, scrolls horizontally">
                  <table className="ps-table">
                    <caption>Sample symptom breakdown</caption>
                    <thead><tr><th scope="col">Symptom</th><th scope="col">Code</th><th scope="col">Share</th></tr></thead>
                    <tbody>
                      {data.breakdown.map((b) => (
                        <tr key={b.code}>
                          <th scope="row">{b.symptom}</th>
                          <td>{b.code}</td>
                          <td>
                            <span className="ps-share">
                              <span className="ps-bar" aria-hidden="true"><i style={{ width: `${b.share}%` }} /></span>
                              {b.share}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
