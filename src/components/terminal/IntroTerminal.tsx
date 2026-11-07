import { useEffect, useRef } from 'react';
import { scrollToSection } from './scrollTo';
import { useTerminal } from './useTerminal';

// Real links: they work without JavaScript, and the prompt routes to the same places.
const TOPICS = [
  { label: 'Experience', href: '#experience' },
  { label: 'Projects', href: '#projects' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

/** The chat card on the home page's first screen: type a route or a question. */
export default function IntroTerminal() {
  const term = useTerminal({
    autoHelp: false,
    onNavigate: (target) => scrollToSection(target.href),
    thinkMs: 700,
    quietRefusals: true,
  });
  const out = useRef<HTMLDivElement | null>(null);

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
      <nav className="topics" aria-label="Topics">
        {TOPICS.map((topic) => (
          <a key={topic.href} href={topic.href}>
            {topic.label}
          </a>
        ))}
      </nav>
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
          aria-label="Ask a question or type a route"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Ask anything about Andrian…"
          value={term.value}
          onChange={(event) => term.change(event.target.value)}
          onKeyDown={term.keyDown}
        />
      </form>
    </div>
  );
}
