import '../qa/qa.css';
import './guide.css';
import { useMemo, useRef, useState } from 'react';
import { CLAUSES, GUIDE_VERSION } from './rulebook';
import { buildIndex, answer, type Answer, type Mode } from './retrieve';

const INDEX = buildIndex(CLAUSES);
const CHIPS = [
  'does a partially hidden stop sign still count?',
  'can I label a faded lane marking?',
  'what about a cone on its side?',
  'what is the weather in paris',
];
const MODES: { id: Mode; label: string }[] = [
  { id: 'hybrid', label: 'Hybrid' }, { id: 'keyword', label: 'Keyword' }, { id: 'vector', label: 'Vector' },
];

interface Msg { q: string; a: Answer }

function VectorMap({ query2d }: { query2d: [number, number] | null }) {
  const pts = INDEX.map2d;
  const xs = [...pts.map((p) => p[0]), ...(query2d ? [query2d[0]] : [])];
  const ys = [...pts.map((p) => p[1]), ...(query2d ? [query2d[1]] : [])];
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const sx = (x: number) => 14 + ((x - x0) / (x1 - x0 || 1)) * 232;
  const sy = (y: number) => 106 - ((y - y0) / (y1 - y0 || 1)) * 92;
  return (
    <svg viewBox="0 0 260 120" className="gd-map" role="img" aria-label="2D map of clause vectors. Nearby clauses have similar meaning.">
      {pts.map((p, i) => (
        <g key={CLAUSES[i].id}>
          <circle cx={sx(p[0])} cy={sy(p[1])} r="4" fill="var(--color-muted)" />
          <text x={sx(p[0]) + 6} y={sy(p[1]) + 3} fontSize="9" fill="var(--color-muted)">{CLAUSES[i].id}</text>
        </g>
      ))}
      {query2d && <circle cx={sx(query2d[0])} cy={sy(query2d[1])} r="5.5" fill="var(--color-accent)" stroke="var(--color-card)" strokeWidth="1.5" />}
    </svg>
  );
}

export default function GuideDemo() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [mode, setMode] = useState<Mode>('hybrid');
  const [showMap, setShowMap] = useState(false);
  const [draft, setDraft] = useState('');
  const log = useRef<HTMLDivElement>(null);

  const last = msgs[msgs.length - 1]?.a;
  const scores = useMemo(() => new Map((last?.result.hits ?? []).map((h) => [h.clause.id, h])), [last]);

  function ask(q: string, m: Mode = mode) {
    const text = q.trim();
    if (!text) return;
    setMsgs((cur) => [...cur, { q: text, a: answer(INDEX, text, m) }]);
    setDraft('');
    requestAnimationFrame(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); });
  }

  function switchMode(m: Mode) {
    setMode(m);
    setMsgs((cur) => {
      const lastQ = cur[cur.length - 1]?.q;
      return lastQ ? [...cur.slice(0, -1), { q: lastQ, a: answer(INDEX, lastQ, m) }] : cur;
    });
  }

  return (
    <div className="qa gd" role="group" aria-label="Sample guideline chatbot">
      <div className="qa-top">
        <span className="qa-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="qa-title">Guideline chatbot</span>
        <span className="qa-sample">guide {GUIDE_VERSION} · sample data</span>
      </div>
      <div className="qa-body">
        <ol className="qa-queue gd-clauses" aria-label="Guide clauses">
          {CLAUSES.map((c) => {
            const h = scores.get(c.id);
            return (
              <li key={c.id} className={h ? 'on' : ''}>
                <span className="qa-n">{c.id}</span>
                <span className="qa-l">{c.title}</span>
                <span className="qa-m">{h ? (mode === 'hybrid' ? '●' : (h.keyword ?? h.vector ?? 0).toFixed(2)) : ''}</span>
              </li>
            );
          })}
        </ol>
        <div className="qa-main gd-main">
          <div className="gd-log" ref={log} role="log" aria-live="polite" aria-label="Conversation">
            {msgs.length === 0 && <p className="gd-empty">Ask about a labeling edge case. Answers quote the guide and cite the clause. If no clause applies, it says so.</p>}
            {msgs.map((m, i) => (
              <div key={i} className="gd-turn">
                <p className="gd-q">{m.q}</p>
                <p className={`gd-a${m.a.refused ? ' refused' : ''}`}>{m.a.text}</p>
                {m.a.citations.length > 0 && <p className="gd-cite">Cited: {m.a.citations.map((c) => `clause ${c}`).join(', ')}</p>}
                {i === msgs.length - 1 && (
                  <ul className="gd-trace" aria-label="Steps that ran">{m.a.result.trace.map((t, j) => <li key={j}>{t}</li>)}</ul>
                )}
              </div>
            ))}
          </div>
          {showMap && <VectorMap query2d={last && !last.refused ? last.result.query2d : null} />}
          <div className="gd-chips">
            {CHIPS.map((c) => <button key={c} type="button" onClick={() => ask(c)}>{c}</button>)}
          </div>
          <form className="gd-form" onSubmit={(e) => { e.preventDefault(); ask(draft); }}>
            <label htmlFor="gd-in" className="sr-only">Ask about a labeling edge case</label>
            <input id="gd-in" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask about an edge case…" autoComplete="off" />
            <button type="submit" className="ok">Ask</button>
          </form>
        </div>
      </div>
      <div className="qa-foot">
        <span className="gd-seg" role="group" aria-label="Retrieval mode">
          {MODES.map((m) => (
            <button key={m.id} type="button" aria-pressed={mode === m.id} className={mode === m.id ? 'on' : ''} onClick={() => switchMode(m.id)}>{m.label}</button>
          ))}
        </span>
        <button type="button" className="gd-maptoggle" aria-pressed={showMap} onClick={() => setShowMap((v) => !v)}>{showMap ? 'Hide' : 'Show'} vector map</button>
      </div>
    </div>
  );
}
