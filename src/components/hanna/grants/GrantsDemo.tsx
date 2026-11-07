import '../../qa/qa.css';
import '../hanna.css';
import { useMemo, useState } from 'react';
import { GRANTS, DEFAULT_CRITERIA } from './catalog';
import { scoreGrant, visibleAt, type Scored } from './score';
import { initEditor, parseCommand, preview, apply, undo, TOKEN_TTL_MS } from './criteria';

type Tab = 'grants' | 'digest' | 'tracker' | 'edit';
const TABS: [Tab, string][] = [['grants', 'Grants'], ['digest', 'Digest'], ['tracker', 'Tracker'], ['edit', 'Edit criteria']];
const money = (n: number) => `$${n.toLocaleString('en-US')}`;
const SUGGESTIONS = ['raise the score threshold to 7', 'set reporting burden weight to 4', 'set the sheet threshold to 4'];

function Row({ s, dim }: { s: Scored; dim?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <li className={`hn-row${dim ? ' dim' : ''}`}>
      <button type="button" className="hn-head" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span><span className="hn-title">{s.grant.title}</span><br /><span className="hn-sub">{s.grant.funder} · {money(s.grant.amount)} · due in {s.grant.deadlineDays} days</span></span>
        <span className="hn-score">{s.score.toFixed(1)}</span>
      </button>
      {open && (
        <ul className="hn-flags" aria-label="Score breakdown">
          {s.flags.map((f) => <li key={f.id}><b>{f.label}</b> {Math.round(f.value * 100)}%: {f.reason}</li>)}
        </ul>
      )}
    </li>
  );
}

export default function GrantsDemo() {
  const [tab, setTab] = useState<Tab>('grants');
  const [editor, setEditor] = useState(() => initEditor(DEFAULT_CRITERIA));
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState<{ text: string; err?: boolean } | null>(null);
  const [pendingToken, setPendingToken] = useState<{ token: string; diff: string } | null>(null);
  const [override, setOverride] = useState<number | null>(null);
  const [decided, setDecided] = useState<Record<string, 'approved' | 'skipped'>>({});

  const c = editor.criteria;
  const emailCut = override ?? c.emailThreshold;
  const scored = useMemo(() => GRANTS.map((g) => scoreGrant(g, c)).sort((a, b) => b.score - a.score), [c]);
  const onSheet = visibleAt(scored, c.sheetThreshold);
  const inEmail = visibleAt(scored, emailCut);

  function runPreview(text: string) {
    const cmd = parseCommand(text);
    if (!cmd) { setMessage({ text: 'I only understand thresholds and weights, for example "raise the score threshold to 7".', err: true }); setPendingToken(null); return; }
    if (cmd.kind === 'undo') { doUndo(); return; }
    const { state, result } = preview(editor, cmd, Date.now());
    setEditor(state);
    if (!result.ok) { setMessage({ text: result.error, err: true }); setPendingToken(null); return; }
    setPendingToken({ token: result.token, diff: result.diff });
    setMessage({ text: `Preview ready. Token ${result.token} expires in ${TOKEN_TTL_MS / 60000} minutes and works once.` });
  }
  function doApply() {
    if (!pendingToken) return;
    const r = apply(editor, pendingToken.token, Date.now());
    setEditor(r.state); setPendingToken(null); setOverride(null);
    setMessage({ text: r.message, err: !r.ok });
  }
  function doUndo() {
    const r = undo(editor);
    setEditor(r.state); setPendingToken(null); setOverride(null);
    setMessage({ text: r.message, err: !r.ok });
  }

  return (
    <div className="qa" role="group" aria-label="Sample grants agent">
      <div className="qa-top">
        <span className="qa-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="hn-tabs" role="tablist" aria-label="Sections">
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" type="button" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
          ))}
        </span>
        <span className="qa-sample">sample data</span>
      </div>

      <div className="hn-body" hidden={tab !== 'grants'}>
        <p className="hn-note">12 made-up grants, scored on seven flags. Click a grant to see why. Dimmed rows fall below the sheet cutoff ({c.sheetThreshold}).</p>
        <ul className="hn-list">{scored.map((s) => <Row key={s.grant.id} s={s} dim={s.score < c.sheetThreshold} />)}</ul>
      </div>

      <div className="hn-body" hidden={tab !== 'digest'}>
        <div className="hn-mail">
          <span className="subj">Daily grants digest: {inEmail.length} new at {emailCut.toFixed(1)} or above</span>
          {inEmail.length === 0 ? <span className="hn-note">Nothing clears the email cutoff today.</span> : (
            <ul className="hn-list">
              {inEmail.map((s) => {
                const best = [...s.flags].sort((a, b) => b.value - a.value)[0];
                return <li key={s.grant.id} className="hn-row"><span className="hn-title">{s.score.toFixed(1)} · {s.grant.title}</span><br /><span className="hn-sub">{s.grant.funder} · {money(s.grant.amount)}. Strongest: {best.label.toLowerCase()}.</span></li>;
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="hn-body" hidden={tab !== 'tracker'}>
        <p className="hn-note">Grants at or above the sheet cutoff ({c.sheetThreshold}) land here for a person to approve or skip.</p>
        <ul className="hn-list">
          {onSheet.map((s) => (
            <li key={s.grant.id} className="hn-row">
              <span className="hn-title">{s.grant.title}</span> <span className="hn-sub">{s.score.toFixed(1)} · {s.grant.funder}</span>
              <div className="hn-actions">
                {decided[s.grant.id]
                  ? <><span className="hn-status">{decided[s.grant.id]}</span><button type="button" onClick={() => setDecided(({ [s.grant.id]: _x, ...r }) => r)}>Reset</button></>
                  : <><button type="button" onClick={() => setDecided((d) => ({ ...d, [s.grant.id]: 'approved' }))}>Approve</button><button type="button" onClick={() => setDecided((d) => ({ ...d, [s.grant.id]: 'skipped' }))}>Skip</button></>}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="hn-body" hidden={tab !== 'edit'}>
        <p className="hn-note">Edit the scoring in plain English. A change is previewed first, applied with a one-time token, and can be undone.</p>
        <div className="hn-kv" aria-label="Current criteria">
          <span>Sheet cutoff <b>{c.sheetThreshold}</b></span><span>Email cutoff <b>{c.emailThreshold}</b></span>
          <span>Mission <b>{c.weights.mission}</b></span><span>Geography <b>{c.weights.geography}</b></span>
          <span>Effort <b>{c.weights.effort}</b></span><span>Reporting <b>{c.weights.reporting}</b></span>
        </div>
        <form className="hn-form" onSubmit={(e) => { e.preventDefault(); runPreview(draft); }}>
          <label htmlFor="hn-edit" className="sr-only">Describe a change</label>
          <input id="hn-edit" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="raise the score threshold to 7" autoComplete="off" />
          <button type="submit">Preview</button>
        </form>
        <div className="hn-chips">{SUGGESTIONS.map((t) => <button key={t} type="button" onClick={() => { setDraft(t); runPreview(t); }}>{t}</button>)}</div>
        {pendingToken && <p className="hn-diff">{pendingToken.diff}</p>}
        <div className="hn-actions">
          <button type="button" className="ok" onClick={doApply} disabled={!pendingToken}>Apply</button>
          <button type="button" onClick={doUndo} disabled={editor.history.length === 0}>Undo</button>
        </div>
        {message && <p className={`hn-msg${message.err ? ' err' : ''}`} role="status">{message.text}</p>}
      </div>

      <div className="qa-foot">
        <span><b>{onSheet.length}</b> on the sheet</span>
        <span><b>{inEmail.length}</b> in the email</span>
        <label className="hn-slider">Email cutoff <input type="range" min="0" max="10" step="0.5" value={emailCut} onChange={(e) => setOverride(Number(e.target.value))} aria-label="Email cutoff, for exploring" /> <b>{emailCut.toFixed(1)}</b></label>
      </div>
    </div>
  );
}
