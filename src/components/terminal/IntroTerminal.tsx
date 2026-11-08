import { useEffect, useRef, useState } from 'react';
import { scrollToSection } from './scrollTo';
import { useTerminal } from './useTerminal';
import { pickSuggestions } from './suggestions';

// Real links: they work without JavaScript, and the prompt routes to the same places.
const TOPICS = [
  { label: 'Experience', href: '#experience' },
  { label: 'Projects', href: '#projects' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

/** The chat panel on the home page's first screen: type a route or a question, or pick a suggestion. */
export default function IntroTerminal() {
  const term = useTerminal({
    autoHelp: false,
    onNavigate: (target) => scrollToSection(target.href),
    thinkMs: 700,
    quietRefusals: true,
  });
  const out = useRef<HTMLDivElement | null>(null);
  const [page, setPage] = useState(0);
  const chips = pickSuggestions(page);

  useEffect(() => {
    const element = out.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [term.lines]);

  return (
    <div className="intro-term">
      <div className="intro-out" role="log" aria-live="polite" ref={out} onClick={term.flush}>
        {term.lines.map((line) => (
          <div
            key={line.id}
            className={`intro-line-out intro-${line.kind}${line.status ? ` intro-${line.status}` : ''}${line.refused ? ' intro-refused' : ''}`}
          >
            {line.kind === 'input' ? <span className="intro-mark">&gt;</span> : null}
            {line.kind === 'answer' ? <span className="intro-arrow" aria-hidden="true">↳</span> : null}
            <span className="intro-text">{line.text}</span>
            {line.sources && line.sources.length > 0 ? (
              <span className="intro-sources">
                {line.sources.map((source) => (
                  <a key={`${source.title}-${source.url}`} href={source.url}>
                    {source.title}
                  </a>
                ))}
              </span>
            ) : null}
          </div>
        ))}
        {term.busy ? <div className="intro-line-out intro-info intro-think">{term.spinner} thinking</div> : null}
      </div>
      <div className="intro-suggest" role="group" aria-label="Suggested questions">
        <button type="button" className="intro-refresh" aria-label="Show other questions" onClick={() => setPage((p) => p + 1)}>
          ↻
        </button>
        {chips.map((question) => (
          <button key={question} type="button" className="intro-chip" disabled={term.busy} onClick={() => void term.submit(question)}>
            <span aria-hidden="true">↳ </span>{question}
          </button>
        ))}
      </div>
      <form
        className="intro-prompt"
        onSubmit={(event) => {
          event.preventDefault();
          void term.submit();
        }}
      >
        <label className="intro-caret" htmlFor="intro-input" aria-hidden="true">
          &gt;
        </label>
        <input
          id="intro-input"
          className="intro-input"
          aria-label="Ask anything about Andrian — a question or a route"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Ask anything about Andrian…"
          value={term.value}
          onChange={(event) => term.change(event.target.value)}
          onKeyDown={term.keyDown}
        />
      </form>
      <nav className="topics" aria-label="Jump to">
        {TOPICS.map((topic) => (
          <a key={topic.href} href={topic.href}>
            {topic.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
