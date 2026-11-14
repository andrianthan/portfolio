import '../../qa/qa.css';
import './copilot.css';
import { useEffect, useRef, useState } from 'react';
import { PRESETS, ask, initialChat, type ChatState } from './copilot';

export default function CopilotDemo() {
  const [state, setState] = useState<ChatState>(initialChat);
  const logRef = useRef<HTMLDivElement>(null);
  const { log } = state;
  const last = log[log.length - 1];

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
  }, [last]);

  return (
    <div className="qa cop" role="group" aria-label="Sample wafer copilot chat">
      <div className="qa-top">
        <span className="qa-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="qa-title">Wafer copilot</span>
        <span className="qa-sample">sample data</span>
      </div>
      <div ref={logRef} className="cop-log" role="log" aria-live="polite" aria-label="Conversation" tabIndex={0}>
        {log.length === 0 && <p className="cop-empty">No questions yet. Pick a sample question below.</p>}
        {log.map((t) => (
          <div key={t.turn} className="cop-turn">
            <p className="cop-q"><span className="cop-who">You</span>{t.question}</p>
            <div className="cop-a">
              <span className="cop-who">Copilot</span>
              <ul className="cop-tools" aria-label="Tool calls">
                {t.tools.map((c) => (
                  <li key={c.tool}><b>{c.tool}</b><span>{c.result}</span></li>
                ))}
              </ul>
              <p className="cop-text">{t.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="cop-presets" role="group" aria-label="Sample questions">
        {PRESETS.map((p) => (
          <button key={p} type="button" className="cop-chip" onClick={() => setState((s) => ask(s, p))}>{p}</button>
        ))}
      </div>
      <p className="cop-cap">Answers are scripted from sample rows, not a live model.</p>
    </div>
  );
}
