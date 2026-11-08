import { useEffect, useRef, useState } from 'react';
import { scrollToSection } from './scrollTo';
import { useTerminal } from './useTerminal';
import { pickSuggestions } from './suggestions';
import { visibleLines, renderAnswer } from './clip';

// Real links: they work without JavaScript, and the prompt routes to the same places.
const TOPICS = [
  { label: 'Experience', href: '#experience' },
  { label: 'Projects', href: '#projects' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

type Source = { title: string; url: string };

/**
 * The agent returns one source per retrieved chunk, and the chunks of one page
 * share a title and a url, so one answer can carry the same link many times over.
 * Keep the first of each url: the home box shows one link per page.
 */
export function uniqueSources(sources: Source[]): Source[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  });
}

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
  const [open, setOpen] = useState<Set<number>>(new Set());
  const shown = visibleLines(term.lines);

  useEffect(() => {
    const element = out.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [term.lines]);

  return (
    <div className="intro-term">
      <div className="intro-out" role="log" aria-live="polite" ref={out} onClick={term.flush}>
        {shown.map((line) => {
          const expanded = open.has(line.id);
          const answer = line.kind === 'answer' ? renderAnswer(line.text, expanded) : null;
          return (
          <div
            key={line.id}
            className={`intro-line-out intro-${line.kind}${line.status ? ` intro-${line.status}` : ''}${line.refused ? ' intro-refused' : ''}`}
          >
            {line.kind === 'input' ? <span className="intro-mark">&gt;</span> : null}
            {line.kind === 'answer' ? <span className="intro-arrow" aria-hidden="true">↳</span> : null}
            <span className="intro-text">{answer ? answer.text : line.text}</span>
            {answer?.showToggle ? (
              <button
                type="button"
                className="intro-more"
                aria-expanded={answer.expanded}
                onClick={() =>
                  setOpen((s) => {
                    const n = new Set(s);
                    if (n.has(line.id)) n.delete(line.id);
                    else n.add(line.id);
                    return n;
                  })
                }
              >
                {answer.expanded ? 'Show less' : 'Show more'}
              </button>
            ) : null}
            {line.sources && line.sources.length > 0 ? (
              <span className="intro-sources">
                {uniqueSources(line.sources).map((source, index) => (
                  <a key={`${source.url}-${index}`} href={source.url}>
                    {source.title}
                  </a>
                ))}
              </span>
            ) : null}
          </div>
          );
        })}
        {term.busy ? <div className="intro-line-out intro-info intro-think">{term.spinner} thinking</div> : null}
      </div>
      <div className="intro-suggest" role="group" aria-label="Suggested questions">
        <button type="button" className="intro-refresh" aria-label="Show other questions" onClick={() => setPage((p) => p + 1)}>
          ↻
        </button>
        {chips.map((question) => (
          <button key={question} type="button" className="intro-chip" aria-disabled={term.busy ? true : undefined} onClick={() => { if (!term.busy) void term.submit(question); }}>
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
