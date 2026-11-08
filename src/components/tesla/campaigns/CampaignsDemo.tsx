import '../../qa/qa.css';
import './campaigns.css';
import { useState } from 'react';
import { MOCK_CAMPAIGNS, MOCK_PARTS } from '../fixtures';
import { PCTS, THRESHOLD, VIEWS, alerts, assignPlanner, campaignsTouching, paceShare, weeksToFinish, type Pct, type View } from './campaigns';

const UNLISTED = [
  { id: 'B-01', topic: 'Mock bulletin A', requests: 14 },
  { id: 'B-02', topic: 'Mock bulletin B', requests: 9 },
  { id: 'B-03', topic: 'Mock bulletin C', requests: 4 },
];

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const partName = (id: string) => MOCK_PARTS.find((p) => p.id === id)?.name ?? id;

export default function CampaignsDemo() {
  const [view, setView] = useState<View>('alerts');
  const [p, setP] = useState<Pct>('P50');
  const list = alerts(MOCK_CAMPAIGNS);
  const planners = Array.from(new Set(list.map(assignPlanner))).sort();

  return (
    <div className="qa camp" role="group" aria-label="Sample Campaigns tab">
      <div className="qa-top">
        <span className="qa-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="qa-title">Campaigns</span>
        <span className="qa-sample">sample data</span>
      </div>
      <div className="camp-body">
        <div className="camp-views" role="group" aria-label="Campaigns views">
          {VIEWS.map((v) => (
            <button
              key={v.id} type="button" aria-pressed={view === v.id}
              className={view === v.id ? 'on' : ''}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>

        {view === 'alerts' && (
          <section aria-label="Wind-down alerts">
            <p className="camp-meta">
              Wind-down: best pace share across the 8, 13 and 26 week windows is under {pct(THRESHOLD)} of service units, and no other campaign on the part is on pace.
            </p>
            <div className="camp-scroll" tabIndex={0} role="region" aria-label="Wind-down alerts table, scrolls horizontally">
              <table>
                <thead><tr><th>Part</th><th>Campaign</th><th>Pace share</th><th>Planner</th></tr></thead>
                <tbody>
                  {list.map((c) => (
                    <tr key={c.id}>
                      <td>{partName(c.partId)}</td><td>{c.name}</td>
                      <td>{pct(paceShare(c))}</td><td>{assignPlanner(c)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3 className="camp-h">Weekly notice preview</h3>
            <ul className="camp-notices">
              {planners.map((pl) => {
                const mine = list.filter((c) => assignPlanner(c) === pl);
                return (
                  <li key={pl}>
                    <strong>{pl}</strong>: One email per planner, only their parts ({mine.map((c) => partName(c.partId)).join(', ')}).
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {view === 'parts' && (
          <section aria-label="All parts">
            <div className="camp-scroll" tabIndex={0} role="region" aria-label="All parts table, scrolls horizontally">
              <table>
                <thead><tr><th>Part</th><th>System</th><th>Campaigns touching</th></tr></thead>
                <tbody>
                  {MOCK_PARTS.map((pt) => (
                    <tr key={pt.id}>
                      <td>{pt.name}</td><td>{pt.system}</td>
                      <td>{campaignsTouching(pt.id, MOCK_CAMPAIGNS)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {view === 'campaigns' && (
          <section aria-label="Campaigns">
            <div className="camp-sim">
              <label htmlFor="camp-sim-select">Simulate</label>
              <select id="camp-sim-select" value={p} onChange={(e) => setP(e.target.value as Pct)}>
                {PCTS.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
              <span className="camp-meta">P10 is the fast case, P90 the slow case.</span>
            </div>
            <div className="camp-scroll" tabIndex={0} role="region" aria-label="Campaigns table, scrolls horizontally">
              <table>
                <thead><tr><th>Campaign</th><th>Part</th><th>Remaining</th><th>Weekly pace</th><th>Weeks to finish ({p})</th></tr></thead>
                <tbody>
                  {MOCK_CAMPAIGNS.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td><td>{partName(c.partId)}</td>
                      <td>{c.remainingUnits.toLocaleString('en-US')}</td><td>{c.weeklyPace}</td>
                      <td>{weeksToFinish(c, p)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="camp-meta" role="status" aria-live="polite">
              Showing the {p} case: {MOCK_CAMPAIGNS.length} campaigns, longest {Math.max(...MOCK_CAMPAIGNS.map((c) => weeksToFinish(c, p)))} weeks.
            </p>
          </section>
        )}

        {view === 'unlisted' && (
          <section aria-label="Unlisted bulletin demand">
            <p className="camp-meta">Mock table: bulletins with demand but no campaign yet. All figures are made up.</p>
            <div className="camp-scroll" tabIndex={0} role="region" aria-label="Unlisted bulletin demand mock table, scrolls horizontally">
              <table>
                <thead><tr><th>Bulletin</th><th>Topic</th><th>Mock requests</th></tr></thead>
                <tbody>
                  {UNLISTED.map((u) => (
                    <tr key={u.id}><td>{u.id}</td><td>{u.topic}</td><td>{u.requests}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
