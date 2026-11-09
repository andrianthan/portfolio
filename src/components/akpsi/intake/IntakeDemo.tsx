import '../../qa/qa.css';
import './intake.css';
import { useState } from 'react';
import { EMAILS } from '../fixtures';
import {
  STAGES,
  advance,
  initialState,
  isComplete,
  select,
  stageTitle,
  type IntakeState,
  type Stage,
} from './intake';

/**
 * The sample email a state belongs to. The state's own emailId is the only
 * source of truth, so the pipeline can never run against a different email
 * than the one it was reset for.
 */
function emailFor(state: IntakeState) {
  return EMAILS.find((e) => e.id === state.emailId) ?? EMAILS[0];
}

/**
 * A mock of the membership intake pipeline: classify the email, answer the
 * question from the knowledge base, validate the attachments, file the folder
 * in Drive and read the availability to propose interview slots.
 *
 * The stepper is a pure state machine over invented sample data. There is no
 * network call, no model and no timer anywhere in it.
 *
 * `presses` runs the pipeline that far before the first render. It exists so
 * the render test can show a pipeline that is under way or finished; the demo
 * on the page never passes it.
 */
export default function IntakeDemo({ presses = 0 }: { presses?: number } = {}) {
  const [state, setState] = useState<IntakeState>(() => {
    let s = initialState(EMAILS[0].id);
    for (let i = 0; i < presses; i += 1) s = advance(s, emailFor(s));
    return s;
  });

  const email = emailFor(state);
  const complete = isComplete(state);

  function pick(id: string) {
    // Selecting the applicant that is already selected is not a change, so it
    // must not throw away the progress already made.
    setState((s) => select(s, id));
  }

  function process() {
    // The update is a pure function of the state: the email it runs on comes
    // from the state itself, not from the render closure.
    setState((s) => advance(s, emailFor(s)));
  }

  const done = (s: Stage) => state.completed.includes(s);

  // The rows the pipeline has produced so far, one per stage it has been
  // through. The list is built here so the live region can sit on the last
  // row alone: the rows are appended in stage order, so the last one is
  // always the stage that has just finished.
  const rows: { key: string; value: string; flagged: boolean }[] = [];
  if (done('classify')) {
    rows.push({
      key: 'Classify',
      value: 'Membership application, answered from the intake mailbox.',
      flagged: false,
    });
  }
  if (done('knowledge') && state.answer) {
    rows.push({ key: 'Answer', value: state.answer, flagged: false });
  }
  if (state.flagged && state.stage === 'knowledge') {
    rows.push({
      key: 'Answer',
      value: 'No knowledge-base answer, so this one is flagged for a person.',
      flagged: true,
    });
  }
  if (done('attachments')) {
    rows.push({
      key: 'Attachments',
      value: `${email.attachments.map((a) => a.name).join(', ')} — all readable.`,
      flagged: false,
    });
  }
  if (state.flagged && state.stage === 'attachments') {
    const invalid = email.attachments.find((a) => a.name === state.invalid);
    rows.push({
      key: 'Attachments',
      value: `${state.invalid} is not a readable ${invalid?.kind ?? 'file'}, so this one is flagged for a person.`,
      flagged: true,
    });
  }
  if (done('drive') && state.folder) {
    rows.push({ key: 'Drive', value: state.folder, flagged: false });
  }
  if (done('schedule')) {
    rows.push({
      key: 'Slots',
      value: state.slots.length > 0
        ? state.slots.join(' · ')
        : 'No slot proposed — the availability named no day or time.',
      flagged: false,
    });
  }

  return (
    <div className="qa intake" role="group" aria-label="Sample membership intake pipeline">
      <div className="qa-top">
        <span className="qa-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="qa-title">Membership intake</span>
        <span className="qa-sample">sample data</span>
      </div>

      <div className="intake-list" role="group" aria-label="Sample applicant emails">
        {EMAILS.map((e) => (
          <button
            key={e.id}
            type="button"
            className="intake-pick"
            aria-pressed={e.id === email.id}
            onClick={() => pick(e.id)}
          >
            {e.id}
          </button>
        ))}
      </div>

      <div className="intake-mail">
        <p className="intake-subject"><b>{email.subject}</b></p>
        <p className="intake-q">Question: {email.question}</p>
        <p className="intake-av">Availability: {email.availability}</p>
      </div>

      <ol className="intake-steps" aria-label="Pipeline stages">
        {STAGES.map((s) => {
          const on = state.stage === s;
          // A finished pipeline is not still waiting on a stage: the last row
          // is done and carries no "next" chip.
          const finished = complete && on;
          return (
            <li key={s} className={on ? (finished ? 'done' : 'on') : done(s) ? 'done' : ''}>
              <span className="intake-step-t">{stageTitle(s)}</span>
              {on && !finished && <span className="intake-step-s">{state.flagged ? 'needs a person' : 'next'}</span>}
            </li>
          );
        })}
      </ol>

      <div className="intake-out">
        {rows.length === 0 ? (
          <p className="intake-empty">Press Process to run the pipeline on this sample email.</p>
        ) : (
          <ul className="intake-results">
            {rows.map((r, i) => (
              <li
                key={r.key}
                // The live region is on the last row alone, so a screen reader
                // hears the stage that just finished instead of the whole
                // list every time. A live region around the whole list would
                // re-announce every earlier row on each press.
                {...(i === rows.length - 1 ? { role: 'status', 'aria-live': 'polite' } : {})}
              >
                <span className="intake-k">{r.key}</span>
                <span className={r.flagged ? 'intake-v intake-flag' : 'intake-v'}>{r.value}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="intake-actions">
        <button type="button" className="ok" onClick={process} disabled={complete || state.flagged}>
          Process
        </button>
        {state.flagged && <span className="intake-note">Held for a person to look at.</span>}
        {complete && <span className="intake-note">Interview proposed.</span>}
      </div>

      <p className="intake-cap">Sample pipeline on invented data. The knowledge-base answers and applicant emails are made up.</p>
    </div>
  );
}
