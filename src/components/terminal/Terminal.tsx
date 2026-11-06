import { useEffect, useRef } from 'react';
import { useTerminal } from './useTerminal';

const CHIPS = ['/help', '/experience', '/projects', '/resume', '/about', '/skills', '/contact', '/hire'];

export interface TerminalProps {
  /** Home-page panel: no auto-run, no focus grab, an empty-state hint, no back link. */
  embedded?: boolean;
}

export default function Terminal({ embedded = false }: TerminalProps = {}) {
  const term = useTerminal({ autoHelp: !embedded });
  const input = useRef<HTMLInputElement | null>(null);
  const log = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = log.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [term.lines]);

  return (
    <div className={embedded ? 'term-app term-app-embedded' : 'term-app'}>
      <div className="term-bar">
        {embedded ? (
          <span className="term-title">andrian@portfolio · terminal</span>
        ) : (
          <h1 className="term-title">andrian@portfolio · terminal</h1>
        )}
        <span className="term-bar-actions">
          <button type="button" className="term-sound" aria-pressed={term.soundOn} onClick={term.toggleSound}>
            {`sound ${term.soundOn ? 'on' : 'off'}`}
          </button>
          {embedded ? (
            <a className="term-back" href="/terminal">full screen ↗</a>
          ) : (
            <a className="term-back" href="/">← site</a>
          )}
        </span>
      </div>

      <div className="term-log" role="log" aria-live="polite" ref={log} onClick={term.flush}>
        {embedded && term.lines.length === 0 && !term.busy ? (
          <div className="term-line term-status-info">
            Ask about Andrian's work in plain words, or tap a command below. Answers come from this site's content: rules and retrieval, no LLM.
          </div>
        ) : null}
        {term.lines.map((line) => (
          <div
            key={line.id}
            className={`term-line term-${line.kind}${line.status ? ` term-status-${line.status}` : ''}${line.refused ? ' term-refused' : ''}`}
          >
            {line.kind === 'input' ? <span className="term-caret">&gt;</span> : null}
            <span className="term-text">{line.text}</span>
            {line.sources && line.sources.length > 0 ? (
              <span className="term-sources">
                {line.sources.map((source) => (
                  <a key={`${source.title}-${source.url}`} href={source.url}>
                    {source.title}
                  </a>
                ))}
              </span>
            ) : null}
          </div>
        ))}
        {term.busy ? <div className="term-line term-status-info">{term.spinner} thinking</div> : null}
      </div>

      <form
        className="term-prompt"
        onSubmit={(event) => {
          event.preventDefault();
          void term.submit();
        }}
      >
        <label className="term-label" htmlFor="term-input" aria-hidden="true">
          &gt;
        </label>
        <input
          id="term-input"
          ref={input}
          className="term-input"
          aria-label="Terminal command"
          autoComplete="off"
          spellCheck={false}
          placeholder="ask about the work, or type /help"
          value={term.value}
          onChange={(event) => term.change(event.target.value)}
          onKeyDown={term.keyDown}
        />
        <span className="term-cursor" aria-hidden="true" />
      </form>

      <div className="term-chips">
        {CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            className="term-chip"
            onClick={() => {
              term.runCommand(chip);
              input.current?.focus();
            }}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
