import '../../qa/qa.css';
import './admin.css';
import { useState } from 'react';
import { MOCK_USERS } from '../fixtures';
import {
  MOCK_NOW, canOpen, grant, mockRequests, revoke, usageFor,
  type AuditEntry, type Grants,
} from './admin';

// A mock of the admin surface: per-user usage read from the request log,
// per-tab access grants, and an audit log.
//
// The default-deny gate is built but off in production, so the switch below
// only ever shows what the gate would do. Nothing here is enforced.

const VIEWS = [
  { id: 'usage', label: 'Usage' },
  { id: 'access', label: 'Access' },
  { id: 'audit', label: 'Audit' },
] as const;

type View = (typeof VIEWS)[number]['id'];

/** The tabs an admin can grant, matching the tabs the request log names. */
const TABS = ['overview', 'part-summary', 'ask', 'forecast', 'campaigns', 'slides', 'admin'] as const;

/** The user the check line asks about. */
const CHECK_USER = 'u4';
const CHECK_TAB = 'admin';
const CHECK_NAME = MOCK_USERS.find((u) => u.id === CHECK_USER)?.name ?? CHECK_USER;

const REQUESTS = mockRequests();

const money = (n: number) => `$${n.toFixed(2)}`;

/**
 * The admin demo. `view` sets the section shown first; it exists so the
 * render test can check every section, and defaults to Usage.
 */
export default function AdminDemo({ view: initialView = 'usage' }: { view?: View } = {}) {
  const [view, setView] = useState<View>(initialView);
  const [state, setState] = useState<{ grants: Grants; log: AuditEntry[] }>({ grants: {}, log: [] });
  const [defaultDeny, setDefaultDeny] = useState(false);

  const { grants, log } = state;

  const toggleGrant = (userId: string, tab: string, currentlyGranted: boolean) => {
    setState((s) => {
      const next = currentlyGranted
        ? revoke(s.grants, userId, tab, s.log)
        : grant(s.grants, userId, tab, s.log);
      return { grants: next.grants, log: next.log };
    });
  };

  const isGranted = (userId: string, tab: string) => (grants[userId] ?? []).includes(tab);
  const check = canOpen(CHECK_USER, CHECK_TAB, grants, defaultDeny);

  return (
    <div className="qa adm" role="group" aria-label="Sample admin dashboard">
      <div className="qa-top">
        <span className="qa-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="qa-title">Admin</span>
        <span className="qa-sample">sample data</span>
      </div>
      <div className="adm-body">
        <div className="adm-views" role="group" aria-label="Admin sections">
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

        {view === 'usage' && (
          <section aria-label="Per-user usage">
            <p className="adm-note">Usage is computed from the request log, not sign-ins.</p>
            <div className="adm-scroll" tabIndex={0} role="region" aria-label="Per-user usage table, scrolls horizontally">
              <table>
                <thead>
                  <tr>
                    <th>User</th><th>Active days</th><th>Visits 7d</th><th>Visits 30d</th>
                    <th>Top tab</th><th>Ask count</th><th>LLM spend</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_USERS.map((u) => {
                    const usage = usageFor(u.id, REQUESTS, MOCK_NOW);
                    return (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td className="num">{usage.activeDays}</td>
                        <td className="num">{usage.visits7}</td>
                        <td className="num">{usage.visits30}</td>
                        <td>{usage.topTab}</td>
                        <td className="num">{usage.askCount}</td>
                        <td className="num">{money(usage.llmSpend)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="adm-cap">
              Active days and visits are counted over the last 30 days of the mock request log.
              Visits break when a gap of 30 minutes or more separates two requests.
            </p>
          </section>
        )}

        {view === 'access' && (
          <section aria-label="Tab access">
            <div className="adm-gate">
              <button
                type="button" aria-pressed={defaultDeny}
                className={defaultDeny ? 'on' : ''}
                onClick={() => setDefaultDeny((d) => !d)}
              >
                Default-deny gate
              </button>
              <p className="adm-gate-note">Built; off in production.</p>
            </div>
            <h3 className="adm-h">Grants</h3>
            <div className="adm-grid" tabIndex={0} role="region" aria-label="User by tab access grid, scrolls horizontally">
              <table>
                <thead>
                  <tr>
                    <th className="blank">User</th>
                    {TABS.map((t) => <th key={t}>{t}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_USERS.map((u) => (
                    <tr key={u.id}>
                      <th scope="row">{u.name}</th>
                      {TABS.map((t) => {
                        const on = isGranted(u.id, t);
                        return (
                          <td key={t} className="cell">
                            <input
                              type="checkbox"
                              checked={on}
                              aria-label={`${u.name} ${t}`}
                              onChange={() => toggleGrant(u.id, t, on)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="adm-check" role="status" aria-live="polite">
              Can {CHECK_NAME} open {CHECK_TAB}?{' '}
              {check ? <span className="yes">Yes</span> : <span className="no">No</span>}
            </p>
            <p className="adm-cap">
              The gate is built but off in production, so the switch only shows what it
              would do. Admins are separate from full access.
            </p>
          </section>
        )}

        {view === 'audit' && (
          <section aria-label="Audit log">
            <h3 className="adm-h">Audit log</h3>
            {log.length === 0 ? (
              <p className="adm-empty">No changes yet. Grant or revoke a tab in Access to record one.</p>
            ) : (
              <ul className="adm-log">
                {log.map((e, i) => (
                  <li key={`${e.action}-${e.target}-${i}`}>
                    <span className="adm-who">{e.who}</span>
                    <span>{e.action}</span>
                    <span className="adm-target">{e.target}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="adm-cap">Every grant and revoke is recorded here.</p>
          </section>
        )}
      </div>
    </div>
  );
}
