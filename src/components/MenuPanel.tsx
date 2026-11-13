import type { Ref } from 'react';
import type { MenuRow } from '../lib/commands';

export interface PanelAnswer {
  text: string;
  refused: boolean;
  sources: { title: string; url: string }[];
  open?: { href: string; label: string };
}

interface Props {
  query: string;
  rows: MenuRow[];
  active: number;
  answer: PanelAnswer | null;
  busy: boolean;
  onQuery: (value: string) => void;
  onPick: (row: MenuRow) => void;
  onClose: () => void;
  inputRef?: Ref<HTMLInputElement>;
}

export default function MenuPanel({ query, rows, active, answer, busy, onQuery, onPick, onClose, inputRef }: Props) {
  let last = '';
  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Command menu" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="cmdk-input"
          role="combobox"
          aria-expanded="true"
          aria-controls="cmdk-list"
          aria-activedescendant={rows[active] ? `cmdk-opt-${rows[active].id}` : undefined}
          aria-label="Search or ask"
          placeholder="Search, or ask about Andrian…"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
        <ul className="cmdk-list" id="cmdk-list" role="listbox">
          {rows.map((row, i) => {
            const heading = row.group !== last ? row.group : null;
            last = row.group;
            return (
              <li key={row.id} role="presentation">
                {heading && <p className="cmdk-group">{heading}</p>}
                <div
                  id={`cmdk-opt-${row.id}`}
                  role="option"
                  aria-selected={i === active}
                  className={`cmdk-opt${i === active ? ' on' : ''}`}
                  onClick={() => onPick(row)}
                >
                  {row.href ? (
                    <a href={row.href} rel={row.external ? 'noopener' : undefined} tabIndex={-1} onClick={(e) => e.stopPropagation()}>{row.label}</a>
                  ) : (
                    <span>{row.label}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="cmdk-answer" aria-live="polite">
          {busy && <p className="cmdk-muted">Thinking…</p>}
          {answer && !busy && (
            <>
              <p className={answer.refused ? 'cmdk-muted' : undefined}>{answer.text}</p>
              {answer.sources.length > 0 && (
                <p className="cmdk-sources">
                  {answer.sources.map((s) => <a key={`${s.title}-${s.url}`} href={s.url}>{s.title}</a>)}
                </p>
              )}
              {answer.open && <p className="cmdk-sources"><a href={answer.open.href}>Open {answer.open.label} →</a></p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
