import '../../qa/qa.css';
import './modular.css';
import { useState } from 'react';
import {
  MANIFESTS, discover, mountable, tabsReport, toggleKill,
} from './modular';

// A mock of the shell's start-up step: read every tab manifest, import what
// it can, mount the rest, and keep a kill switch per tab.
//
// The demo must stay honest about what this is: the shell imports the tabs
// into one bundle. They do not run as separate processes.

export default function ModularDemo() {
  const [killed, setKilled] = useState<string[]>([]);
  const discovery = discover(MANIFESTS, killed);
  const report = tabsReport(discovery);

  // Every tab the shell could mount: the ones it mounted now plus the ones the
  // kill switch took down, so a killed tab can be brought back. mountable() is
  // the same predicate discover() uses, so a tab that can never mount never
  // gets a kill switch.
  const switchable = MANIFESTS.filter(mountable);

  return (
    <div className="qa mod" role="group" aria-label="Sample contributor tab discovery">
      <div className="qa-top">
        <span className="qa-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="qa-title">Tab discovery</span>
        <span className="qa-sample">sample data</span>
      </div>
      <div className="qa-body mod-grid">
        <section className="mod-tree" aria-label="Module folder layout">
          <h3 className="mod-h">modules/</h3>
          <ul className="mod-files">
            {MANIFESTS.map((m) => {
              const broken = m.entry === null;
              return (
                <li key={m.id} className={broken ? 'mod-file broken' : 'mod-file'}>
                  <span className="mod-dir">modules/{m.id}/</span>
                  <span className="mod-path">tab.json</span>
                  {broken ? (
                    <span className="mod-path missing">tab.ts — missing entry</span>
                  ) : (
                    <span className="mod-path">tab.ts</span>
                  )}
                  <span className="mod-owner">owner: {m.owner}</span>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="mod-main" aria-label="Shell tab navigation">
          <h3 className="mod-h">Shell nav</h3>
          {discovery.mounted.length === 0 ? (
            <p className="mod-note">No tabs are mounted: every valid tab is behind the kill switch.</p>
          ) : (
            <nav className="mod-nav" aria-label="Mounted tabs">
              {discovery.mounted.map((m) => (
                <span key={m.id} className="mod-tab">{m.title}</span>
              ))}
            </nav>
          )}
          <h3 className="mod-h">Kill switch</h3>
          <div className="mod-kill" role="group" aria-label="Kill switch per tab">
            {switchable.map((m) => {
              const on = killed.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={on}
                  className={on ? 'on' : ''}
                  onClick={() => setKilled((k) => toggleKill(k, m.id))}
                >
                  {m.id}
                </button>
              );
            })}
          </div>
          <p className="mod-note">
            A killed tab drops out of the nav; every other tab keeps running.
          </p>
          <h3 className="mod-h">Discovery log</h3>
          {/* The brief names the class "mono"; there is no global .mono utility, so
              .mod .mod-log in modular.css does all the styling. */}
          <pre className="mono mod-log" tabIndex={0} role="region" aria-label="Tab discovery report">{report.join('\n')}</pre>
          <p className="mod-status" role="status">
            {discovery.mounted.length} mounted, {discovery.skipped.length} skipped.
            {discovery.skipped.length === 0
              ? ' Every tab imported cleanly.'
              : ` Skipped: ${discovery.skipped.map((s) => `${s.id} (${s.reason})`).join(', ')}.`}
          </p>
          <p className="mod-cap">
            Tabs do not run as separate processes. The shell reads the manifests and
            imports the entries into one bundle.
          </p>
        </section>
      </div>
    </div>
  );
}
