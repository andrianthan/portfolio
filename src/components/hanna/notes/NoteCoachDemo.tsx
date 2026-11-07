import '../../qa/qa.css';
import '../hanna.css';
import './notes.css';
import { useEffect, useRef, useState } from 'react';
import { buildIndex, answer } from '../../guide/retrieve';
import { KB, KB_LABEL } from './kb';
import { parseInput, generate, type Provenance } from './builder';
import { evaluate, type Verdict } from './tiers';

const INDEX = buildIndex(KB);
const NEW_EXAMPLE = `Individual psychotherapy
Dx: F41.1 GAD
Symptoms: racing thoughts, difficulty sleeping, avoidance of work tasks
Impairment: called out sick twice this week, avoiding calls with manager
CBT targeting catastrophic thinking about job performance
Client receptive, practiced thought challenging in session
Continue CBT, assign thought record homework for the week`;
const CHECK_EXAMPLE = `D: Client came in for session. Talked about the week.
I: Listened and validated feelings. Discussed work stress.
P: Build rapport and gather information.`;
const QUESTIONS = ['do I need an ICD-10 code?', 'what counts as functional impairment?', 'what is the weather in paris'];

type Mode = 'idle' | 'build' | 'check';
interface Msg {
  from: 'you' | 'bot'; text?: string; lines?: string[];
  note?: { d: string; i: string; p: string }; breakdown?: Provenance[]; verdict?: Verdict; cite?: string;
}
const TIER = { 1: 'Tier 1 · Sufficient', 2: 'Tier 2 · Sufficient with suggestions', 3: 'Tier 3 · Insufficient' } as const;

function sections(text: string): { d: string; i: string; p: string } | null {
  const grab = (k: string) => text.match(new RegExp(`^\\s*${k}\\s*:\\s*([\\s\\S]*?)(?=^\\s*[DIP]\\s*:|$)`, 'im'))?.[1].trim() ?? '';
  const out = { d: grab('D'), i: grab('I'), p: grab('P') };
  return out.d || out.i || out.p ? out : null;
}

export default function NoteCoachDemo() {
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'bot', text: 'Pick a starter, or ask a documentation question. Answers quote the sample standards and cite the passage. Everything here is made up.' }]);
  const [mode, setMode] = useState<Mode>('idle');
  const [draft, setDraft] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView?.({ block: 'nearest' }); }, [msgs]);
  const push = (...m: Msg[]) => setMsgs((cur) => [...cur, ...m]);

  function start(m: Mode) {
    setMode(m);
    push(m === 'build'
      ? { from: 'bot', text: 'Paste your session details. Keywords and short lines are fine. I will list everything that is missing in one message, and I will not add anything you did not tell me.' }
      : { from: 'bot', text: 'Paste a note with its sections labeled D:, I: and P:. I will rate it and tell you exactly what to fix. I do not rewrite it.' });
    setDraft(m === 'build' ? NEW_EXAMPLE : CHECK_EXAMPLE);
  }

  function send() {
    const text = draft.trim();
    if (!text) return;
    push({ from: 'you', text });
    setDraft('');
    const oneLineQuestion = !text.includes('\n') && /\?\s*$/.test(text);
    if (mode === 'idle' || oneLineQuestion) {
      const a = answer(INDEX, text, 'hybrid', KB_LABEL, 'passage');
      push({ from: 'bot', text: a.text, cite: a.citations.length ? `Cited: ${a.citations.map((c) => `passage ${c}`).join(', ')}` : undefined, lines: a.result.trace });
      return;
    }
    if (mode === 'build') {
      const g = generate(parseInput(text));
      if (!g.ok) { push({ from: 'bot', text: g.reason, lines: g.missing }); return; }
      push({ from: 'bot', text: 'Here is the note. Copy the D, I and P text into your record.', note: g.note, verdict: g.verdict, breakdown: g.provenance });
      return;
    }
    const s = sections(text);
    if (!s) { push({ from: 'bot', text: 'I could not find D:, I: or P: sections. Label them like the example and send again.' }); return; }
    const v = evaluate({ service: 'individual', ...s });
    push({ from: 'bot', text: 'Sufficiency review. I evaluate the note; I do not rewrite it.', verdict: v });
  }

  return (
    <div className="qa nc" role="group" aria-label="Sample case note chatbot">
      <div className="qa-top">
        <span className="qa-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="qa-title">Case Note Coach</span>
        <span className="qa-sample">sample data</span>
      </div>
      <div className="hn-body nc-log" role="log" aria-live="polite" aria-label="Conversation">
        {msgs.map((m, idx) => (
          <div key={idx} className={`nc-turn ${m.from}`}>
            <span className="ir-who">{m.from === 'bot' ? 'Coach' : 'You'}</span>
            {m.text && <p className={m.from === 'you' ? 'nc-you' : 'nc-bot'}>{m.text}</p>}
            {m.verdict && (
              <div className="nc-verdict">
                <p className={`nc-tier t${m.verdict.tier}`}>{TIER[m.verdict.tier]}</p>
                {m.verdict.hardFails.length > 0 && <ul className="nc-list" aria-label="Hard fails">{m.verdict.hardFails.map((f) => <li key={f.id}><b>Rule {f.id}: {f.label}.</b> {f.fix}</li>)}</ul>}
                {m.verdict.suggestions.length > 0 && <ul className="nc-list soft" aria-label="Suggestions">{m.verdict.suggestions.map((s) => <li key={s}>{s}</li>)}</ul>}
              </div>
            )}
            {m.note && (
              <pre className="nc-note" aria-label="Generated note">{`D: ${m.note.d}\n\nI: ${m.note.i}\n\nP: ${m.note.p}`}</pre>
            )}
            {m.breakdown && (
              <details className="nc-break">
                <summary>Expansion breakdown</summary>
                <ul className="nc-list soft">{m.breakdown.map((b, k) => <li key={k}>{b.sentence} <span className="nc-from">from: {b.from.join(', ')}</span></li>)}</ul>
              </details>
            )}
            {m.lines && !m.verdict && !m.note && <ul className="nc-list soft" aria-label={m.cite ? 'Steps that ran' : 'Details'}>{m.lines.map((l, k) => <li key={k}>{l}</li>)}</ul>}
            {m.cite && <p className="nc-cite">{m.cite}</p>}
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="qa-foot nc-foot">
        <div className="hn-chips">
          <button type="button" onClick={() => start('build')} aria-pressed={mode === 'build'}>Start a new note</button>
          <button type="button" onClick={() => start('check')} aria-pressed={mode === 'check'}>Check a note</button>
          {QUESTIONS.map((q) => <button key={q} type="button" onClick={() => { setDraft(q); }}>{q}</button>)}
        </div>
        <form className="nc-form" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <label htmlFor="nc-in" className="sr-only">Message the coach</label>
          <textarea id="nc-in" rows={mode === 'idle' ? 1 : 6} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={mode === 'idle' ? 'Ask a documentation question…' : 'Paste here…'} />
          <button type="submit" className="ok">Send</button>
        </form>
        <p className="hn-note">Two of the eight checks (a copied section, and the intervention matching the diagnosis) are keyword heuristics in this demo.</p>
      </div>
    </div>
  );
}
