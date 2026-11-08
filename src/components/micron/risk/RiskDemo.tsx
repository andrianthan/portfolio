import '../../qa/qa.css';
import './risk.css';
import { useState } from 'react';
import { WAFERS } from '../fixtures';
import { DEFAULT_QUEUE, queueLabel, rank, topFactors } from './risk';

const RANKED = rank(WAFERS);

export default function RiskDemo() {
  const [size, setSize] = useState(DEFAULT_QUEUE);
  const [selected, setSelected] = useState(RANKED[0].id);
  const sel = RANKED.find((w) => w.id === selected) ?? RANKED[0];
  const label = queueLabel(size, RANKED.length);

  return (
    <div className="qa risk" role="group" aria-label="Sample wafer risk ranking">
      <div className="qa-top">
        <span className="qa-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="qa-title">Wafer risk ranking</span>
        <span className="qa-sample">sample data</span>
      </div>
      <div className="risk-ctl">
        <label htmlFor="risk-size">Review queue size</label>
        <input
          id="risk-size"
          type="range"
          min={0}
          max={RANKED.length}
          step={1}
          value={size}
          aria-valuetext={label}
          onChange={(e) => setSize(Number(e.target.value))}
        />
        <p className="risk-label">{label}</p>
      </div>
      <div className="risk-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Wafer</th>
              <th scope="col">Tool path</th>
              <th scope="col">Z-score</th>
              <th scope="col">Failure rate</th>
              <th scope="col">Size</th>
              <th scope="col">Score</th>
            </tr>
          </thead>
          <tbody>
            {RANKED.map((w, i) => (
              <tr key={w.id} data-queued={i < size ? 'true' : undefined}>
                <td>
                  <button type="button" className="risk-pick" aria-pressed={w.id === sel.id} onClick={() => setSelected(w.id)}>{w.id}</button>
                </td>
                <td>{w.path.join(' → ')}</td>
                <td>{w.z.toFixed(1)}</td>
                <td>{Math.round(w.failRate * 100)}%</td>
                <td>{w.size}</td>
                <td>{w.score.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="risk-factors" aria-live="polite">
        <p className="risk-fhead">Top factors for {sel.id}</p>
        <ul>
          {topFactors(sel).map((f) => (
            <li key={f.label}><span>{f.label}</span><b>{f.weight.toFixed(2)}</b></li>
          ))}
        </ul>
      </div>
      <p className="risk-cap">Scores are sample values for illustration, not the output of a trained model.</p>
    </div>
  );
}
