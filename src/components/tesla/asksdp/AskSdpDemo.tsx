import '../../qa/qa.css';
import './asksdp.css';
import { useEffect, useId, useRef, useState } from 'react';
import { PRESETS, initialAsk, scrollToBottom, sendQuestion, type AskState, type Verdict } from './asksdp';

const VERDICT_LABEL: Record<Verdict, string> = { firm: 'Firm', hold: 'Hold', 'no-action': 'No action' };

export default function AskSdpDemo() {
  const [state, setState] = useState<AskState>(initialAsk);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const { log, draft } = state;
  const empty = draft.trim() === '';

  // A preset click and the send button take the same path, so a preset always
  // leaves the demo in the state the question would have left it in.
  const send = (q: string) => setState((s) => sendQuestion(s, q));

  // The newest turn is the one to show, so the scroll follows the last answer
  // rather than the length of the log: a capped log keeps its length, and a
  // tall answer still has to be scrolled into view.
  const lastAnswer = log[log.length - 1];
  useEffect(() => {
    scrollToBottom(logRef.current);
  }, [lastAnswer]);

  return (
    <div className="qa ask" role="group" aria-label="Sample Ask SDP chat">
      <div className="qa-top">
        <span className="qa-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="qa-title">Ask SDP</span>
        <span className="qa-sample">sample data</span>
      </div>
      <div
        ref={logRef} className="ask-log" role="log" aria-live="polite" aria-label="Conversation" tabIndex={0}
      >
        {log.length === 0 && <p className="ask-empty">No questions yet. Pick a sample question or type your own.</p>}
        {log.map((a) => (
          // The turn's own number is the key, so the key stays with the turn
          // when the capped log slides and the older turns fall away.
          <div key={a.turn} className="ask-turn">
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
                {a.refused || !a.verdict ? "Can't answer from sources" : `Verdict: ${VERDICT_LABEL[a.verdict]}`}
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
            id={inputId} ref={inputRef} type="text" value={draft} autoComplete="off" aria-describedby={hintId}
            placeholder="Ask about a part"
            onChange={(e) => setState((s) => ({ ...s, draft: e.target.value }))}
          />
          <button type="submit" className="ask-send" disabled={empty}>Send</button>
        </div>
        <p id={hintId} className="ask-hint">{empty ? 'Type a question to enable Send.' : 'Press Enter or Send.'}</p>
      </form>
      <p className="ask-cap">Every number in an answer must come from a tool result, and a question with a figure the data does not hold is refused.</p>
    </div>
  );
}
