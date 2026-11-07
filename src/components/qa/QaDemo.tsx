import './qa.css';
import { useEffect, useReducer, useRef, useState } from 'react';
import { init, reduce, current, stats, LOW_CONFIDENCE } from './review';
import { SCENES, SceneArt, type Scene } from './scenes';
import GuidePanel from '../guide/GuideDemo';

const MARK = { accept: '✓', reject: '✕', relabel: '✎' } as const;

export default function QaDemo() {
  const [s, dispatch] = useReducer(reduce, SCENES, init);
  const [relabeling, setRelabeling] = useState(false);
  const [tab, setTab] = useState<'review' | 'ask'>('review');
  const [pending, setPending] = useState<{ q: string; nonce: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const it = current(s) as Scene | null;
  const st = stats(s);

  useEffect(() => { if (relabeling) input.current?.focus(); }, [relabeling]);

  function onKey(e: React.KeyboardEvent) {
    if (tab !== 'review' || relabeling || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'a' || k === 'arrowright') { e.preventDefault(); dispatch({ type: 'accept' }); }
    else if (k === 'r' || k === 'arrowleft') { e.preventDefault(); dispatch({ type: 'reject' }); }
    else if (k === 'f') { e.preventDefault(); setRelabeling(true); }
    else if (k === 'u' || k === 'z') { e.preventDefault(); dispatch({ type: 'undo' }); }
  }

  const pct = Math.round((st.reviewed / st.total) * 100);

  return (
    <div className="qa" ref={root} tabIndex={0} onKeyDown={onKey} role="group"
      aria-label="Sample label review tool. Keys: A accept, R reject, F fix label, U undo.">
      <div className="qa-top">
        <span className="qa-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="qa-tabs" role="tablist" aria-label="Tool sections">
          <button role="tab" type="button" aria-selected={tab === 'review'} className={tab === 'review' ? 'on' : ''} onClick={() => setTab('review')}>Label review</button>
          <button role="tab" type="button" aria-selected={tab === 'ask'} className={tab === 'ask' ? 'on' : ''} onClick={() => setTab('ask')}>Ask guide</button>
        </span>
        <span className="qa-sample">sample data</span>
      </div>
      <div hidden={tab !== 'review'}>
      <div className="qa-body">
        <ol className="qa-queue" aria-label="Review queue">
          {s.items.map((x, i) => {
            const v = s.verdicts[x.id];
            const on = it?.id === x.id;
            return (
              <li key={x.id} className={on ? 'on' : v ? 'done' : ''} aria-current={on ? 'true' : undefined}>
                <span className="qa-n">{i + 1}</span>
                <span className="qa-l">{v?.kind === 'relabel' ? v.label : x.label}</span>
                <span className="qa-m" aria-label={v ? v.kind : on ? 'current' : 'pending'}>{v ? MARK[v.kind] : on ? '●' : ''}</span>
              </li>
            );
          })}
        </ol>
        <div className="qa-main">
          {it ? (
            <>
              <SceneArt scene={it} />
              <div className="qa-panel">
                <p className="qa-meta">
                  <span>AI label</span> <b>{it.label}</b> <span>{Math.round(it.confidence * 100)}%</span>
                  {it.confidence < LOW_CONFIDENCE && <em>low confidence</em>}
                </p>
                {relabeling ? (
                  <form className="qa-fix" onSubmit={(e) => { e.preventDefault(); dispatch({ type: 'relabel', label: input.current?.value ?? '' }); setRelabeling(false); root.current?.focus(); }}>
                    <label htmlFor="qa-label">Correct label</label>
                    <input id="qa-label" ref={input} autoComplete="off" onKeyDown={(e) => { if (e.key === 'Escape') { setRelabeling(false); root.current?.focus(); } }} />
                    <button type="submit">Save</button>
                  </form>
                ) : (
                  <div className="qa-actions">
                    <button className="ok" onClick={() => dispatch({ type: 'accept' })}>Accept <kbd>A</kbd></button>
                    <button onClick={() => dispatch({ type: 'reject' })}>Reject <kbd>R</kbd></button>
                    <button onClick={() => setRelabeling(true)}>Fix label <kbd>F</kbd></button>
                    <button onClick={() => dispatch({ type: 'undo' })} disabled={s.history.length === 0}>Undo <kbd>U</kbd></button>
                    <button onClick={() => { setPending({ q: `is a ${it.label} a class I should label?`, nonce: Date.now() }); setTab('ask'); }}>Ask guide</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="qa-done">
              <p><b>Queue clear.</b></p>
              <p>{st.reviewed} reviewed · {st.agreement}% agreement · {st.secondLook} flagged for a second look</p>
              <div className="qa-actions">
                <button onClick={() => dispatch({ type: 'undo' })}>Undo last</button>
                <button className="ok" onClick={() => dispatch({ type: 'reset' })}>Start over</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="qa-foot" role="status" aria-live="polite">
        <div className="qa-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
        <span><b>{st.reviewed}</b>/{st.total} reviewed</span>
        <span><b>{st.agreement === null ? '–' : `${st.agreement}%`}</b> agreement</span>
        <span><b>{st.secondLook}</b> second look</span>
      </div>
      </div>
      <div hidden={tab !== 'ask'}><GuidePanel pending={pending} /></div>
    </div>
  );
}
