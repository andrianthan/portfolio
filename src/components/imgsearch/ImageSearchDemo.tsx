import '../qa/qa.css';
import './imgsearch.css';
import { useMemo, useState } from 'react';
import { CATALOG, type Img } from './catalog';
import { ShapeArt } from '../qa/scenes';
import { searchText, neighbors, findDuplicates, DUP_THRESHOLD } from './search';
import { DIM_NAMES } from './embed';

type Tab = 'search' | 'similar' | 'dups';
const CHIPS = ['faded lane marking at night', 'traffic cone', 'stop sign at night', 'worn crosswalk'];
const byId = new Map(CATALOG.map((c) => [c.id, c]));

const describe = (i: Img) => `${i.shape}, ${i.time}${i.worn > 0 ? ', worn' : ''}`;

function Thumb({ img, score, selected, onClick }: { img: Img; score?: number; selected?: boolean; onClick?: () => void }) {
  const inner = (
    <>
      <svg viewBox="0 0 320 180" aria-hidden="true" className="igs-art">
        <ShapeArt shape={img.shape} night={img.time === 'night'} worn={img.worn} dx={(img.x - 0.5) * 60} scale={img.scale} />
      </svg>
      <span className="igs-cap"><span>{img.id.replace('img-', '#')}</span><span>{describe(img)}</span></span>
      {score !== undefined && <span className="igs-score">{score.toFixed(2)}</span>}
    </>
  );
  return onClick
    ? <button type="button" className={`igs-thumb${selected ? ' on' : ''}`} onClick={onClick} aria-pressed={selected} aria-label={`Image ${img.id}: ${describe(img)}`}>{inner}</button>
    : <div className="igs-thumb" role="img" aria-label={`Image ${img.id}: ${describe(img)}`}>{inner}</div>;
}

export default function ImageSearchDemo() {
  const [tab, setTab] = useState<Tab>('search');
  const [query, setQuery] = useState('');
  const [asked, setAsked] = useState('');
  const [picked, setPicked] = useState<string>(CATALOG[0].id);
  const [threshold, setThreshold] = useState(DUP_THRESHOLD);

  const result = useMemo(() => (asked ? searchText(CATALOG, asked) : null), [asked]);
  const near = useMemo(() => neighbors(CATALOG, picked, 4), [picked]);
  const groups = useMemo(() => findDuplicates(CATALOG, threshold), [threshold]);
  const defaultGroups = useMemo(() => findDuplicates(CATALOG, DUP_THRESHOLD).length, []);

  const ask = (q: string) => { setQuery(q); setAsked(q.trim()); setTab('search'); };

  return (
    <div className="qa igs" role="group" aria-label="Sample image search tool">
      <div className="qa-top">
        <span className="qa-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="qa-title">Image search</span>
        <span className="qa-sample">sample data</span>
      </div>
      <div className="qa-body">
        <ol className="qa-queue igs-modes" aria-label="Modes">
          {([['search', 'Search by text', ''], ['similar', 'Similar images', ''], ['dups', 'Duplicates', String(defaultGroups)]] as const).map(([id, label, n], i) => (
            <li key={id} className={tab === id ? 'on' : ''}>
              <button type="button" onClick={() => setTab(id)} aria-pressed={tab === id}>
                <span className="qa-n">{i + 1}</span><span className="qa-l">{label}</span><span className="qa-m">{n}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="qa-main">
          {tab === 'search' && (
            <>
              <form className="gd-form" onSubmit={(e) => { e.preventDefault(); ask(query); }}>
                <label htmlFor="igs-q" className="sr-only">Describe the image you want</label>
                <input id="igs-q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Describe a scene…" autoComplete="off" />
                <button type="submit" className="ok">Search</button>
              </form>
              <div className="gd-chips">{CHIPS.map((c) => <button key={c} type="button" onClick={() => ask(c)}>{c}</button>)}</div>
              {!result && <p className="gd-empty">Describe a road scene in words. Images and text are compared in one shared space.</p>}
              {result && (
                <>
                  {result.hits.length > 0
                    ? <div className="igs-grid">{result.hits.map((h) => <Thumb key={h.id} img={byId.get(h.id)!} score={h.score} />)}</div>
                    : <p className="gd-a refused">No images to show: none of those words are known to this demo.</p>}
                  <ul className="gd-trace" aria-label="Steps that ran">{result.trace.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </>
              )}
            </>
          )}
          {tab === 'similar' && (
            <>
              <p className="igs-hint">Pick an image to see its nearest neighbors.</p>
              <div className="igs-grid igs-pick">{CATALOG.map((c) => <Thumb key={c.id} img={c} selected={c.id === picked} onClick={() => setPicked(c.id)} />)}</div>
              <p className="igs-hint"><b>Nearest to #{picked.replace('img-', '')}</b></p>
              <div className="igs-grid">{near.map((h) => <Thumb key={h.id} img={byId.get(h.id)!} score={h.score} />)}</div>
            </>
          )}
          {tab === 'dups' && (
            <>
              <label className="igs-slider">
                <span>Match threshold <b>{threshold.toFixed(3)}</b></span>
                <input type="range" min="0.9" max="0.999" step="0.001" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
              </label>
              <p className="igs-hint">{groups.length === 0 ? 'No near-duplicates at this threshold.' : `${groups.length} near-duplicate group${groups.length === 1 ? '' : 's'}. Review one image per group.`}</p>
              {groups.map((g, i) => (
                <div key={i} className="igs-dup">
                  <div className="igs-grid">{g.map((id) => <Thumb key={id} img={byId.get(id)!} />)}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
      <div className="qa-foot">
        <span><b>{CATALOG.length}</b> images</span>
        <span>{DIM_NAMES.length}-attribute stand-in space, not CLIP</span>
      </div>
    </div>
  );
}
