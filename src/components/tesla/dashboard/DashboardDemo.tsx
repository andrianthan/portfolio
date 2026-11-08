import '../../qa/qa.css';
import './dashboard.css';
import { useEffect, useState } from 'react';
import WorklogDemo from '../worklog/WorklogDemo';
import { WORKLOG } from '../worklog/content';
import { series } from '../fixtures';
import { NAV, initialWarm, replyLine, request, restart, stepDelayMs, warmStep, type WarmState } from './dashboard';

type View = 'overview' | 'worklog';

const KPIS = [
  { label: 'Parts tracked', value: '1,284' },
  { label: 'At-risk parts', value: '37' },
  { label: 'Forecast accuracy', value: '91%' },
  { label: 'Open campaigns', value: '6' },
];

/**
 * The dashboard demo. `initialView` sets the pane shown first; it exists so
 * the render test can check the work log pane, and defaults to the overview.
 */
export default function DashboardDemo({ initialView = 'overview' }: { initialView?: View } = {}) {
  const [view, setView] = useState<View>(initialView);
  const [warm, setWarm] = useState<WarmState>(initialWarm);
  const [restarts, setRestarts] = useState(0);
  const [reply, setReply] = useState<{ status: number; body: string } | null>(null);
  const [requests, setRequests] = useState(0);
  const bars = series(7, 12, 60, 30);
  const max = Math.max(...bars);
  const warming = warm.status !== 'warm';
  const line = replyLine(reply, requests);

  useEffect(() => {
    if (!warming) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setTimeout(() => setWarm((s) => warmStep(s)), stepDelayMs(warm.status));
    return () => window.clearTimeout(id);
  }, [warming, warm.status, warm.hot, restarts]);

  const pct = Math.min(100, (warm.rssMb / (warm.ceilingMb * 1.15)) * 100);
  const ceilPct = (warm.ceilingMb / (warm.ceilingMb * 1.15)) * 100;

  return (
    <div className="qa dash" role="group" aria-label="Sample planning dashboard">
      <div className="qa-top">
        <span className="qa-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="qa-title">Planning dashboard</span>
        <span className="qa-sample">sample data</span>
      </div>
      <div className="dash-grid">
        <nav className="dash-rail" aria-label="Dashboard sections">
          {/* The rail scrolls sideways on a narrow screen, so it is a focusable
              region in its own right rather than only a set of links. */}
          <div
            className="dash-rail-scroll" tabIndex={0} role="region"
            aria-label="Dashboard sections, scrolls horizontally"
          >
            {NAV.map((n) =>
              n.target ? (
                <a key={n.id} href={`#${n.target}`}>{n.label}</a>
              ) : (
                <button
                  key={n.id} type="button"
                  aria-pressed={view === n.id}
                  className={view === n.id ? 'on' : ''}
                  onClick={() => setView(n.id as View)}
                >
                  {n.label}
                </button>
              ),
            )}
          </div>
        </nav>
        <div className="dash-main">
          {view === 'worklog' ? (
            // The work log is a pane of this dashboard, not a window of its
            // own, so it renders without the second set of chrome.
            <section className="dash-wl" aria-label="Work log">
              <p className="dash-wl-h">{WORKLOG.title} · {WORKLOG.subtitle}</p>
              <WorklogDemo />
            </section>
          ) : (
            <>
              <div className="dash-kpis">
                {KPIS.map((k) => (
                  <div key={k.label} className="dash-kpi">
                    <span className="dash-kpi-v">{k.value}</span>
                    <span className="dash-kpi-l">{k.label}</span>
                  </div>
                ))}
              </div>
              <svg
                className="dash-chart" viewBox="0 0 240 80" role="img"
                aria-label="Sample weekly demand bar chart" preserveAspectRatio="none"
              >
                {bars.map((v, i) => {
                  const h = (v / max) * 70;
                  return <rect key={i} x={i * 20 + 3} y={78 - h} width={14} height={h} fill="var(--color-accent)" opacity={0.85} />;
                })}
              </svg>
              <section className="dash-server" aria-label="Server">
                <div className="dash-row">
                  <strong>Server</strong>
                  <span className={`dash-pill ${warm.status}`}>{warm.status}</span>
                  <span>hot parts {warm.hot}/{warm.total}</span>
                </div>
                <div className="dash-rss" role="img" aria-label={`RSS ${warm.rssMb} MB of ${warm.ceilingMb} MB ceiling`}>
                  <i style={{ width: `${pct}%` }} />
                  <b style={{ left: `${ceilPct}%` }} />
                </div>
                <p className="dash-meta">RSS {warm.rssMb} MB, ceiling {warm.ceilingMb} MB</p>
                <div className="dash-actions">
                  <button type="button" onClick={() => { setWarm((s) => restart(s)); setRestarts((n) => n + 1); setReply(null); }}>Restart server</button>
                  <button type="button" disabled={warm.status === 'warm'} onClick={() => setWarm((s) => warmStep(s))}>Warm step</button>
                  <button type="button" onClick={() => { setRequests((n) => n + 1); setReply(request(warm)); }}>Request</button>
                </div>
                <p className="dash-meta">Restart, then Request. Warm step is available while the server is warming.</p>
                <p className="dash-reply" role="status" aria-live="polite">
                  {/* The visible line repeats for an identical request, so the
                      count is what the live region announces on the repeat. */}
                  {line.announced && <span className="dash-sr">{line.announced}</span>}
                  {line.visible}
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
