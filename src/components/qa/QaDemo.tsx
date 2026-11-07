import './qa.css';
import { useEffect, useReducer, useRef, useState } from 'react';
import { init, reduce, current, stats, LOW_CONFIDENCE } from './review';
import { SCENES, SceneArt, type Scene } from './scenes';

export default function QaDemo() {
  const [s, dispatch] = useReducer(reduce, SCENES, init);
  const [relabeling, setRelabeling] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const it = current(s) as Scene | null;
  const st = stats(s);

  useEffect(() => { if (relabeling) input.current?.focus(); }, [relabeling]);

  function onKey(e: React.KeyboardEvent) {
    if (relabeling || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'a' || k === 'arrowright') { e.preventDefault(); dispatch({ type: 'accept' }); }
    else if (k === 'r' || k === 'arrowleft') { e.preventDefault(); dispatch({ type: 'reject' }); }
    else if (k === 'f') { e.preventDefault(); setRelabeling(true); }
    else if (k === 'u' || k === 'z') { e.preventDefault(); dispatch({ type: 'undo' }); }
  }

  return (
    <div className="qa" ref={root} tabIndex={0} onKeyDown={onKey} aria-label="Label review demo. Keys: A accept, R reject, F fix label, U undo.">
      <p className="qa-note">Interactive sample · fictional scenes and numbers</p>
      <div className="qa-stats" role="status" aria-live="polite">
        <span><b>{st.reviewed}</b>/{st.total} reviewed</span>
        <span><b>{st.agreement === null ? '–' : `${st.agreement}%`}</b> agreement</span>
        <span><b>{st.secondLook}</b> for second look</span>
      </div>
      {it ? (
        <>
          <SceneArt scene={it} />
          <p className="qa-meta">
            AI says <b>{it.label}</b> ({Math.round(it.confidence * 100)}%)
            {it.confidence < LOW_CONFIDENCE && <em> · low confidence</em>}
          </p>
          {relabeling ? (
            <form className="qa-fix" onSubmit={(e) => { e.preventDefault(); dispatch({ type: 'relabel', label: input.current?.value ?? '' }); setRelabeling(false); root.current?.focus(); }}>
              <label htmlFor="qa-label">Correct label</label>
              <input id="qa-label" ref={input} autoComplete="off" onKeyDown={(e) => { if (e.key === 'Escape') { setRelabeling(false); root.current?.focus(); } }} />
              <button type="submit">Save</button>
            </form>
          ) : (
            <div className="qa-actions">
              <button onClick={() => dispatch({ type: 'accept' })}>Accept <kbd>A</kbd></button>
              <button onClick={() => dispatch({ type: 'reject' })}>Reject <kbd>R</kbd></button>
              <button onClick={() => setRelabeling(true)}>Fix label <kbd>F</kbd></button>
              <button onClick={() => dispatch({ type: 'undo' })} disabled={s.history.length === 0}>Undo <kbd>U</kbd></button>
            </div>
          )}
        </>
      ) : (
        <div className="qa-done">
          <p><b>Queue clear.</b> {st.reviewed} reviewed, {st.agreement}% agreement, {st.secondLook} flagged for a second look.</p>
          <div className="qa-actions">
            <button onClick={() => dispatch({ type: 'undo' })}>Undo last</button>
            <button onClick={() => dispatch({ type: 'reset' })}>Start over</button>
          </div>
        </div>
      )}
    </div>
  );
}
