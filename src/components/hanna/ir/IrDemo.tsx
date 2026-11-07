import '../../qa/qa.css';
import '../hanna.css';
import './ir.css';
import { useEffect, useRef, useState } from 'react';
import {
  TYPES, SEVERITIES, YOUTH, STAFF, FLAG_OPTIONS,
  initForm, setField, validateStep, next, back, edit, buildPayload, createRecord, approve,
  type Form, type FormData, type Step, type RecordState,
} from './index';

interface Msg { from: 'you' | 'bot'; text: string }
const STEP_TITLES = ['Who and when', 'Type and severity', 'Staff and narrative', 'Resolution', 'Flags'];

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return <div className="ir-field"><label htmlFor={id}>{label}</label>{children}</div>;
}

function StepFields({ form, onChange }: { form: Form; onChange: (p: Partial<FormData>) => void }) {
  const d = form.data;
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  switch (form.step) {
    case 1: return (
      <>
        <Field id="ir-when" label="When did it happen?"><input id="ir-when" type="datetime-local" value={d.occurredAt} onChange={(e) => onChange({ occurredAt: e.target.value })} /></Field>
        <fieldset className="ir-checks"><legend>Youth involved</legend>
          {YOUTH.map((y) => <label key={y}><input type="checkbox" checked={d.youth.includes(y)} onChange={() => onChange({ youth: toggle(d.youth, y) })} /> {y}</label>)}
        </fieldset>
      </>
    );
    case 2: return (
      <>
        <Field id="ir-type" label="Incident type">
          <select id="ir-type" value={d.type} onChange={(e) => onChange({ type: e.target.value })}>
            <option value="">Choose…</option>{Object.keys(TYPES).map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field id="ir-sub" label="Sub-type">
          <select id="ir-sub" value={d.subType} disabled={!d.type} onChange={(e) => onChange({ subType: e.target.value })}>
            <option value="">{d.type ? 'Choose…' : 'Pick a type first'}</option>{(TYPES[d.type] ?? []).map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field id="ir-sev" label="Severity">
          <select id="ir-sev" value={d.severity} onChange={(e) => onChange({ severity: e.target.value })}>
            <option value="">Choose…</option>{SEVERITIES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </>
    );
    case 3: return (
      <>
        <Field id="ir-staff" label="Staff member">
          <select id="ir-staff" value={d.staff} onChange={(e) => onChange({ staff: e.target.value })}>
            <option value="">Choose…</option>{STAFF.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field id="ir-narr" label="What happened?"><textarea id="ir-narr" rows={3} value={d.narrative} onChange={(e) => onChange({ narrative: e.target.value })} /></Field>
      </>
    );
    case 4: return <Field id="ir-res" label="How was it resolved?"><textarea id="ir-res" rows={3} value={d.resolution} onChange={(e) => onChange({ resolution: e.target.value })} /></Field>;
    case 5: return (
      <fieldset className="ir-checks"><legend>Flags (optional)</legend>
        {FLAG_OPTIONS.map((f) => <label key={f}><input type="checkbox" checked={d.flags.includes(f)} onChange={() => onChange({ flags: toggle(d.flags, f) })} /> {f}</label>)}
      </fieldset>
    );
    default: return null;
  }
}

export default function IrDemo() {
  const [log, setLog] = useState<Msg[]>([{ from: 'bot', text: 'IR Bot: type /ir to start an incident report.' }]);
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [record, setRecord] = useState<RecordState | null>(null);
  const [count, setCount] = useState(0);
  const [draft, setDraft] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView?.({ block: 'nearest' }); }, [log, form, record]);

  const say = (m: Msg) => setLog((l) => [...l, m]);

  function send(text: string) {
    const t = text.trim();
    if (!t) return;
    say({ from: 'you', text: t });
    setDraft('');
    if (t.toLowerCase() === '/ir') {
      setForm(initForm()); setErrors([]); setRecord(null);
      say({ from: 'bot', text: 'Starting a new incident report. Five short steps, then a review.' });
    } else say({ from: 'bot', text: 'I only know one command here: /ir.' });
  }

  function goNext() {
    if (!form) return;
    if (form.step !== 6) {
      const e = form.step === 5 ? [] : validateStep(form.step, form.data);
      setErrors(e);
      if (e.length) return;
    }
    setForm(next(form));
  }

  function submit() {
    if (!form) return;
    const n = count + 1;
    const rec = createRecord(buildPayload(form.data), n);
    setCount(n); setRecord(rec); setForm(null);
    say({ from: 'bot', text: `Created a Draft incident (${rec.id}) and ${rec.payload.youthRecords.length} linked youth record${rec.payload.youthRecords.length === 1 ? '' : 's'}.` });
  }

  const d = form?.data;
  return (
    <div className="qa ir" role="group" aria-label="Sample incident report bot in a team chat">
      <div className="qa-top">
        <span className="qa-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="qa-title">Team chat · IR Bot</span>
        <span className="qa-sample">sample data</span>
      </div>
      <div className="hn-body ir-log" role="log" aria-live="polite" aria-label="Conversation">
        {log.map((m, i) => <p key={i} className={`ir-msg ${m.from}`}><span className="ir-who">{m.from === 'bot' ? 'IR Bot' : 'You'}</span>{m.text.replace(/^IR Bot: /, '')}</p>)}

        {form && form.step !== 6 && (
          <section className="ir-card" aria-label={`Step ${form.step} of 5: ${STEP_TITLES[form.step - 1]}`}>
            <h4>Step {form.step} of 5 · {STEP_TITLES[form.step - 1]}</h4>
            <StepFields form={form} onChange={(p) => { setErrors([]); setForm(setField(form, p)); }} />
            {errors.length > 0 && <ul className="ir-errors" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
            <div className="hn-actions">
              {form.step > 1 && <button type="button" onClick={() => { setErrors([]); setForm(back(form)); }}>Back</button>}
              <button type="button" className="ok" onClick={goNext}>{form.step === 5 ? 'Review' : 'Next'}</button>
            </div>
          </section>
        )}

        {form && form.step === 6 && d && (
          <section className="ir-card" aria-label="Review">
            <h4>Review</h4>
            <dl className="ir-review">
              {([
                [1, 'When', d.occurredAt.replace('T', ' ')], [1, 'Youth', d.youth.join(', ')],
                [2, 'Type', `${d.type}: ${d.subType}`], [2, 'Severity', d.severity],
                [3, 'Staff', d.staff], [3, 'Narrative', d.narrative],
                [4, 'Resolution', d.resolution], [5, 'Flags', d.flags.join(', ') || 'None'],
              ] as [Step, string, string][]).map(([step, k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v}</dd><button type="button" onClick={() => setForm(edit(form, step))} aria-label={`Edit ${k}`}>Edit</button></div>
              ))}
            </dl>
            <div className="hn-actions">
              <button type="button" onClick={() => setForm(back(form))}>Back</button>
              <button type="button" className="ok" onClick={submit}>Submit</button>
            </div>
          </section>
        )}

        {record && (
          <section className="ir-card" aria-label="Incident record">
            <h4>{record.id} <span className={`hn-status ir-status ${record.status.toLowerCase()}`}>{record.status}</span></h4>
            <p className="hn-sub">{record.payload.incident.type}: {record.payload.incident.subType} · {record.payload.incident.severity} · {record.payload.incident.staff}</p>
            <ul className="hn-list">{record.payload.youthRecords.map((y) => <li key={y.youth} className="hn-row">Linked youth record: {y.youth}</li>)}</ul>
            <div className="hn-actions">
              <button type="button" onClick={() => setRecord(approve(record))} disabled={record.status === 'Approved'}>Supervisor: approve</button>
            </div>
            <p className="hn-note">Staff can only create Drafts. A supervisor reviews and approves.</p>
          </section>
        )}
        <div ref={end} />
      </div>
      <div className="qa-foot ir-foot">
        <div className="hn-chips"><button type="button" onClick={() => send('/ir')}>/ir</button></div>
        <form className="hn-form" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
          <label htmlFor="ir-in" className="sr-only">Message the bot</label>
          <input id="ir-in" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message the bot: /ir" autoComplete="off" />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}
