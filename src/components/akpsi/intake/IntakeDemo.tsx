import '../../qa/qa.css';
import './intake.css';
import { useState } from 'react';
import { EMAILS } from '../fixtures';
import {
  STAGES,
  advance,
  initialState,
  isComplete,
  stageTitle,
  type IntakeState,
  type Stage,
} from './intake';

/**
 * A mock of the membership intake pipeline: classify the email, answer the
 * question from the knowledge base, validate the attachments, file the folder
 * in Drive and read the availability to propose interview slots.
 *
 * The stepper is a pure state machine over invented sample data. There is no
 * network call, no model and no timer anywhere in it.
 */
export default function IntakeDemo() {
  const [state, setState] = useState<IntakeState>(() => initialState(EMAILS[0].id));

  // The state's own emailId is the only source of truth, so the pipeline can
  // never run against a different email than the one it was reset for.
  const email = EMAILS.find((e) => e.id === state.emailId) ?? EMAILS[0];

  function pick(id: string) {
    setState(initialState(id));
  }

  function process() {
    setState((s) => advance(s, email));
  }

  const done = (s: Stage) => state.completed.includes(s);

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
          return (
            <li key={s} className={on ? 'on' : done(s) ? 'done' : ''}>
              <span className="intake-step-t">{stageTitle(s)}</span>
              {on && <span className="intake-step-s">{state.flagged ? 'needs a person' : 'next'}</span>}
            </li>
          );
        })}
      </ol>

      <div className="intake-out" role="status" aria-live="polite">
        {state.completed.length === 0 && !state.flagged ? (
          <p className="intake-empty">Press Process to run the pipeline on this sample email.</p>
        ) : (
          <ul className="intake-results">
            {done('classify') && (
              <li>
                <span className="intake-k">Classify</span>
                <span className="intake-v">Membership application, answered from the intake mailbox.</span>
              </li>
            )}
            {done('knowledge') && state.answer && (
              <li>
                <span className="intake-k">Answer</span>
                <span className="intake-v">{state.answer}</span>
              </li>
            )}
            {state.flagged && state.stage === 'knowledge' && (
              <li>
                <span className="intake-k">Answer</span>
                <span className="intake-v intake-flag">No knowledge-base answer, so this one is flagged for a person.</span>
              </li>
            )}
            {done('attachments') && (
              <li>
                <span className="intake-k">Attachments</span>
                <span className="intake-v">
                  {email.attachments.map((a) => a.name).join(', ')} — all readable.
                </span>
              </li>
            )}
            {state.flagged && state.stage === 'attachments' && (
              <li>
                <span className="intake-k">Attachments</span>
                <span className="intake-v intake-flag">
                  {state.invalid} is not a readable {email.attachments.find((a) => a.name === state.invalid)?.kind ?? 'file'}, so this one is flagged for a person.
                </span>
              </li>
            )}
            {done('drive') && state.folder && (
              <li>
                <span className="intake-k">Drive</span>
                <span className="intake-v">{state.folder}</span>
              </li>
            )}
            {done('schedule') && (
              <li>
                <span className="intake-k">Slots</span>
                <span className="intake-v">
                  {state.slots.length > 0 ? state.slots.join(' · ') : 'No slot proposed — the availability named no day or time.'}
                </span>
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="intake-actions">
        <button type="button" className="ok" onClick={process} disabled={isComplete(state) || state.flagged}>
          Process
        </button>
        {state.flagged && <span className="intake-note">Held for a person to look at.</span>}
        {isComplete(state) && <span className="intake-note">Interview proposed.</span>}
      </div>

      <p className="intake-cap">Sample pipeline on invented data. The knowledge-base answers and applicant emails are made up.</p>
    </div>
  );
}
