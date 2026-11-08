import '../../qa/qa.css';
import './asksdp.css';
import { useId, useRef, useState } from 'react';
import { PRESETS, ask, type Answer, type Verdict } from './asksdp';

const VERDICT_LABEL: Record<Verdict, string> = { firm: 'Firm', hold: 'Hold', 'no-action': 'No action' };

export default function AskSdpDemo() {
  const [log, setLog] = useState<Answer[]>([]);
  const [draft, setDraft] = useState('');
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const empty = draft.trim() === '';

  const send = (q: string) => {
    const text = q.trim();
    if (!text) return;
    setLog((l) => [...l, ask(text)]);
    setDraft('');
  };

  return (
    <div className="qa ask" role="group" aria-label="Sample Ask SDP chat">
      <div className="qa-top">
        <span className="qa-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="qa-title">Ask SDP</span>
        <span className="qa-sample">sample data</span>
      </div>
      <div
        className="ask-log" role="log" aria-live="polite" aria-label="Conversation" tabIndex={0}
      >
        {log.length === 0 && <p className="ask-empty">No questions yet. Pick a sample question or type your own.</p>}
        {log.map((a, i) => (
          <div key={i} className="ask-turn">
            <p className="ask-q"><span className="ask-who">You</span>{a.question}</p>
            <div className="ask-a">
              <span className="ask-who">Ask SDP</span>
              {a.tools.length > 0 && (
                <ul className="ask-tools" aria-label="Tool calls">
                  {a.tools.map((t) => (
                    <li key={t.tool}><b>{t.tool}</b><span>{t.result}</span></li>
                  ))}
                </ul>
              )}
              <p className="ask-text">{a.text}</p>
              <span className={`ask-badge ${a.refused ? 'refused' : a.verdict}`}>
                Verdict: {a.refused || !a.verdict ? "Can't answer from sources" : VERDICT_LABEL[a.verdict]}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="ask-presets" role="group" aria-label="Sample questions">
        {PRESETS.map((p) => (
          <button key={p} type="button" className="ask-chip" onClick={() => send(p)}>{p}</button>
        ))}
      </div>
      <form
        className="ask-form"
        onSubmit={(e) => { e.preventDefault(); send(draft); inputRef.current?.focus(); }}
      >
        <label htmlFor={inputId} className="ask-label">Your question</label>
        <div className="ask-row">
          <input
            id={inputId} ref={inputRef} type="text" value={draft} autoComplete="off"
            placeholder="Ask about a part"
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" className="ask-send" disabled={empty}>Send</button>
        </div>
        <p className="ask-hint">{empty ? 'Type a question to enable Send.' : 'Press Enter or Send.'}</p>
      </form>
      <p className="ask-cap">Every number in an answer must come from a tool result.</p>
    </div>
  );
}
