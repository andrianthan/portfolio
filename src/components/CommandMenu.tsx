import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ContactLinks } from '../data/profile';
import { runAgent } from '../agent/run';
import { buildRows, menuItems, type MenuRow } from '../lib/commands';
import { getSnapshot } from './terminal/useTerminal';
import MenuPanel, { type PanelAnswer } from './MenuPanel';

export default function CommandMenu({ contact }: { contact: ContactLinks }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [answer, setAnswer] = useState<PanelAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);

  const items = useMemo(() => menuItems(contact), [contact]);
  const rows = useMemo(() => buildRows(items, query), [items, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActive(0);
    setAnswer(null);
    pillRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      } else if (event.key === 'Escape') {
        setOpen((value) => {
          if (value) pillRef.current?.focus();
          return false;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const ask = useCallback(async (question: string) => {
    setBusy(true);
    setAnswer(null);
    try {
      const result = runAgent(await getSnapshot(), question);
      const nav = result.effects?.navigate;
      setAnswer({
        text: result.answer.text,
        refused: result.refused,
        sources: result.answer.sources,
        open: nav ? { href: nav.href, label: nav.label } : undefined,
      });
    } catch {
      setAnswer({ text: 'The agent data could not be loaded. Try the terminal page instead.', refused: true, sources: [] });
    } finally {
      setBusy(false);
    }
  }, []);

  const pick = useCallback((row: MenuRow) => {
    if (row.group === 'Ask') void ask(query.trim());
    else if (row.href) window.location.assign(row.href);
  }, [ask, query]);

  const onPanelKey = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((i) => Math.min(i + 1, rows.length - 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (event.key === 'Enter' && rows[active]) { event.preventDefault(); pick(rows[active]); }
  };

  return (
    <>
      <button ref={pillRef} type="button" className="cmdk-pill" aria-label="Open command menu" aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <kbd>⌘K</kbd>
      </button>
      {open && (
        <div onKeyDown={onPanelKey}>
          <MenuPanel
            query={query}
            rows={rows}
            active={Math.min(active, Math.max(rows.length - 1, 0))}
            answer={answer}
            busy={busy}
            onQuery={(value) => { setQuery(value); setActive(0); setAnswer(null); }}
            onPick={pick}
            onClose={close}
            inputRef={inputRef}
          />
        </div>
      )}
    </>
  );
}
