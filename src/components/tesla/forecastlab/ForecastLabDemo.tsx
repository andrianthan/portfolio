import '../../qa/qa.css';
import './forecastlab.css';
import { useState } from 'react';
import { MOCK_PARTS, series } from '../fixtures';
import { initialState, toggle, setBacktest, dryRun, commit, forecastSeries, type FLState, type PreviewRow } from './forecastlab';

const W = 240;
const H = 120;

function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0';
}

function path(vals: number[], lo: number, hi: number): string {
  return vals
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${((i / (vals.length - 1)) * (W - 20) + 10).toFixed(1)} ${(H - 10 - ((v - lo) / (hi - lo || 1)) * (H - 20)).toFixed(1)}`)
    .join(' ');
}

export default function ForecastLabDemo() {
  const [state, setState] = useState<FLState>(initialState);
  const [rows, setRows] = useState<PreviewRow[]>([]);

  const first = state.selected[0];
  const part = MOCK_PARTS.find((p) => p.id === first);
  const vals = first ? forecastSeries(first) : [];
  const back = first ? series(Number(first.replace(/\D/g, '')) + 11, vals.length, 500, 200) : [];
  const all = state.backtest ? [...vals, ...back] : vals;
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const chartLabel = part
    ? `Sample 12 week forecast for ${part.name}, units per week: ${vals.join(', ')}.${state.backtest ? ` Backtest overlay: ${back.join(', ')}.` : ''}`
    : '';

  const canPreview = state.selected.length > 0;
  const previewed = state.phase === 'previewed';
  const committed = state.phase === 'committed';

  return (
    <div className="qa fl" role="group" aria-label="Sample Forecast Lab">
      <div className="qa-top">
        <span className="qa-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="qa-title">Forecast Lab</span>
        <span className="qa-sample">sample data</span>
      </div>
      <div className="fl-grid">
        <div className="fl-side">
          <fieldset className="fl-set">
            <legend>Select parts to firm</legend>
            {MOCK_PARTS.map((p) => (
              <label key={p.id} className="fl-check">
                <input
                  type="checkbox" checked={state.selected.includes(p.id)}
                  onChange={() => { setState((s) => toggle(s, p.id)); setRows([]); }}
                />
                <span>{p.name} <em>{p.id}</em></span>
              </label>
            ))}
          </fieldset>
          <label className="fl-check">
            <input type="checkbox" checked={state.backtest} onChange={(e) => setState((s) => setBacktest(s, e.target.checked))} />
            <span>Backtest (off by default)</span>
          </label>
        </div>
        <div className="fl-main">
          {part ? (
            <figure className="fl-fig">
              <figcaption>{part.name}: 12 week forecast{state.backtest ? ', with backtest overlay' : ''}</figcaption>
              <svg className="fl-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={chartLabel}>
                <path d={path(vals, lo, hi)} fill="none" stroke="var(--color-accent)" strokeWidth={2} />
                {state.backtest && (
                  <path d={path(back, lo, hi)} fill="none" stroke="var(--color-muted)" strokeWidth={1.5} strokeDasharray="4 3" />
                )}
              </svg>
            </figure>
          ) : (
            <p className="fl-note">Select a part to see its forecast.</p>
          )}
          <div className="fl-actions">
            <button
              type="button" disabled={!canPreview}
              onClick={() => { const r = dryRun(state); setState(r.state); setRows(r.rows); }}
            >
              Preview (dry run)
            </button>
            <button type="button" className="ok" disabled={!previewed} onClick={() => setState((s) => commit(s))}>
              Commit to firming system
            </button>
          </div>
          <p className="fl-note">
            {!canPreview
              ? 'Preview is unavailable until you select at least one part.'
              : committed
                ? 'Commit is unavailable: this preview was already committed. Change the selection to start over.'
                : previewed
                  ? 'Review the preview below, then commit.'
                  : 'Commit is unavailable until you run a preview.'}
          </p>
          <div role="status" aria-live="polite">
            {(previewed || committed) && rows.length > 0 && (
              <p className="fl-banner">Dry run: nothing has been sent</p>
            )}
            {committed && <p className="fl-done">Committed (mock)</p>}
          </div>
          {(previewed || committed) && rows.length > 0 && (
            <div className="fl-scroll" tabIndex={0} role="region" aria-label="Preview table, scrolls horizontally">
              <table className="fl-table">
                <caption>Proposed firm quantities, units per week</caption>
                <thead>
                  <tr><th scope="col">Part</th><th scope="col">Current</th><th scope="col">Proposed</th><th scope="col">Delta</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.partId}>
                      <th scope="row">{r.partId}</th>
                      <td>{r.current}</td>
                      <td>{r.proposed}</td>
                      <td>{signed(r.delta)} {r.delta > 0 ? '(increase)' : r.delta < 0 ? '(decrease)' : '(no change)'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
