import '../../qa/qa.css';
import './dashboard.css';
import { useEffect, useState } from 'react';
import WorklogDemo from '../worklog/WorklogDemo';
import { WORKLOG } from '../worklog/content';
import { NAV, SCOPES, initialReply, initialWarm, isView, replyLine, resetReply, restart, scopeBars, scopeKpis, sendRequest, stepDelayMs, warmStep, type ReplyState, type Scope, type View, type WarmState } from './dashboard';

/**
 * The dashboard demo. `initialView` sets the pane shown first; it exists so
 * the render test can check the work log pane, and defaults to the overview.
 * `initialScope` sets the scope filter the overview starts on.
 */
export default function DashboardDemo({
  initialView = 'overview',
  initialScope = 'all',
}: { initialView?: View; initialScope?: Scope } = {}) {
  const [view, setView] = useState<View>(initialView);
  const [scope, setScope] = useState<Scope>(initialScope);
  const [warm, setWarm] = useState<WarmState>(initialWarm);
  const [restarts, setRestarts] = useState(0);
  const [replyState, setReplyState] = useState<ReplyState>(initialReply);
  const bars = scopeBars(scope);
  const max = 100;
  const warming = warm.status !== 'warm';
  const line = replyLine(replyState.reply, replyState.count);

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
                  onClick={() => { if (isView(n.id)) setView(n.id); }}
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
              <div className="dash-filters" role="group" aria-label="Overview scope">
                <span className="dash-filters-label">Scope</span>
                {SCOPES.map((s) => (
                  <button
                    key={s.id} type="button"
                    aria-pressed={scope === s.id}
                    className={scope === s.id ? 'on' : ''}
                    onClick={() => setScope(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="dash-kpis">
                {scopeKpis(scope).map((k) => (
                  <div key={k.label} className="dash-kpi">
                    <span className="dash-kpi-v">{k.value}</span>
                    <span className="dash-kpi-l">{k.label}</span>
                  </div>
                ))}
              </div>
              <svg
                className="dash-chart" viewBox="0 0 240 80" role="img"
                aria-label={`Sample weekly demand bar chart for ${scope === 'all' ? 'all parts' : scope}`} preserveAspectRatio="none"
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
                  <button type="button" onClick={() => { setWarm((s) => restart(s)); setRestarts((n) => n + 1); setReplyState(resetReply()); }}>Restart server</button>
                  <button type="button" disabled={warm.status === 'warm'} onClick={() => setWarm((s) => warmStep(s))}>Warm step</button>
                  <button type="button" onClick={() => setReplyState((s) => sendRequest(s, warm))}>Request</button>
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
