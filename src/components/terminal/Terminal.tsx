import { useEffect, useRef } from 'react';
import { useTerminal } from './useTerminal';

const CHIPS = ['/help', '/experience', '/about', '/skills', '/contact'];

export default function Terminal() {
  const term = useTerminal();
  const input = useRef<HTMLInputElement | null>(null);
  const log = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = log.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [term.lines]);

  return (
    <div className="term-app">
      <div className="term-bar">
        <h1 className="term-title">andrian@portfolio · terminal</h1>
        <span className="term-bar-actions">
          <button type="button" className="term-sound" aria-pressed={term.soundOn} onClick={term.toggleSound}>
            {`sound ${term.soundOn ? 'on' : 'off'}`}
          </button>
          <a className="term-back" href="/">← site</a>
        </span>
      </div>

      <div className="term-log" role="log" aria-live="polite" ref={log} onClick={term.flush}>
        {term.lines.map((line) => (
          <div
            key={line.id}
            className={`term-line term-${line.kind}${line.status ? ` term-status-${line.status}` : ''}${line.refused ? ' term-refused' : ''}`}
          >
            {line.kind === 'input' ? <span className="term-caret">&gt;</span> : null}
            <span className="term-text">{line.text}</span>
            {line.sources && line.sources.length > 0 ? (
              <span className="term-sources">
                {line.sources.map((source, index) => (
                  <a key={`${source.title}-${source.url}-${index}`} href={source.url}>
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
