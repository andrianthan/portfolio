import { describe, it, expect } from 'vitest';
import { CATALOG } from './catalog';
import { imageVec, textVec, DIM_NAMES, DISCRETE } from './embed';
import { searchText, neighbors, findDuplicates, DUP_THRESHOLD } from './search';

describe('catalog', () => {
  it('has unique ids and fixed, deterministic contents', () => {
    expect(new Set(CATALOG.map((c) => c.id)).size).toBe(CATALOG.length);
    expect(CATALOG.length).toBe(27);
  });
});

describe('embeddings', () => {
  it('image vectors share one space with text vectors', () => {
    expect(imageVec(CATALOG[0]).length).toBe(DIM_NAMES.length);
    expect(textVec('faded lane marking at night').vec.length).toBe(DIM_NAMES.length);
  });

  it('maps words and synonyms to attributes and reports ignored words', () => {
    const t = textVec('worn dashed markings in the snow');
    expect(t.matched).toEqual(expect.arrayContaining(['lane', 'worn']));
    expect(t.ignored).toContain('snow');
  });
});

describe('semantic search', () => {
  it('finds night-time worn lane markings first', () => {
    const r = searchText(CATALOG, 'faded lane marking at night');
    expect(r.hits.length).toBeGreaterThan(0);
    const top = CATALOG.find((c) => c.id === r.hits[0].id)!;
    expect(top.shape).toBe('lane');
  });

  it('every hit for "cone" is a cone', () => {
    const r = searchText(CATALOG, 'traffic cone');
    expect(r.hits.length).toBeGreaterThan(0);
    for (const h of r.hits.slice(0, 3)) expect(CATALOG.find((c) => c.id === h.id)!.shape).toBe('cone');
  });

  it('night queries rank night images above day images of the same object', () => {
    const r = searchText(CATALOG, 'stop sign at night');
    const top = CATALOG.find((c) => c.id === r.hits[0].id)!;
    expect(top.shape).toBe('stop');
    expect(top.time).toBe('night');
  });

  it('returns no hits for words it does not know', () => {
    const r = searchText(CATALOG, 'giraffe on a bicycle');
    expect(r.hits).toEqual([]);
    expect(r.trace.join(' ')).toMatch(/no known/i);
  });

  it('scores are descending and trace only lists what ran', () => {
    const r = searchText(CATALOG, 'pothole');
    for (let i = 1; i < r.hits.length; i++) expect(r.hits[i - 1].score).toBeGreaterThanOrEqual(r.hits[i].score);
    expect(r.trace.some((t) => /pothole/i.test(t))).toBe(true);
  });

  it('is deterministic', () => {
    expect(searchText(CATALOG, 'faded crosswalk')).toEqual(searchText(CATALOG, 'faded crosswalk'));
  });
});

describe('similar images', () => {
  it('neighbors exclude the image itself and rank same-object images first', () => {
    const id = CATALOG.find((c) => c.shape === 'cone' && c.time === 'day' && c.worn === 0)!.id;
    const n = neighbors(CATALOG, id, 4);
    expect(n.map((x) => x.id)).not.toContain(id);
    expect(CATALOG.find((c) => c.id === n[0].id)!.shape).toBe('cone');
  });
});

describe('near-duplicates', () => {
  it('finds the three planted duplicate groups and nothing else', () => {
    const groups = findDuplicates(CATALOG, DUP_THRESHOLD);
    expect(groups.length).toBe(3);
    for (const g of groups) {
      expect(g.length).toBe(2);
      const [a, b] = g.map((id) => CATALOG.find((c) => c.id === id)!);
      expect(a.shape).toBe(b.shape);
      expect(a.time).toBe(b.time);
    }
  });

  it('a stricter threshold finds fewer groups, a looser one finds at least as many', () => {
    expect(findDuplicates(CATALOG, 0.99999).length).toBeLessThanOrEqual(3);
    expect(findDuplicates(CATALOG, 0.9).length).toBeGreaterThanOrEqual(3);
  });

  it('DISCRETE marks the dimensions used for text matching', () => {
    expect(DISCRETE).toBeLessThan(DIM_NAMES.length);
  });
});
