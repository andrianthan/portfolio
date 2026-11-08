import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import AsciiGraph from './AsciiGraph';

const html = renderToStaticMarkup(<AsciiGraph />);
const vapor = fs.readFileSync(path.join(process.cwd(), 'src/styles/vapor.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');
const source = fs.readFileSync(path.join(process.cwd(), 'src/components/ascii/AsciiGraph.tsx'), 'utf8');

describe('AsciiGraph', () => {
  it('is decorative: aria-hidden wrapper, a canvas, and a static text fallback', () => {
    expect(html).toContain('class="ascii"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('<canvas');
    expect(html).toContain('class="ascii-fallback"');
  });
  it('the fallback carries the drawn graph, hub included', () => {
    const pre = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/)?.[1] ?? '';
    expect(pre).toContain('@');
    expect(pre.split('\n').length).toBe(30);
  });
  it('starts with the fallback showing: the canvas is only revealed once a frame is drawn', () => {
    expect(html).not.toContain('is-drawn');
  });
});

describe('the ASCII fallback', () => {
  it('holds the centre until the graph has drawn, then swaps: the canvas is not blank on a slow load', () => {
    expect(vapor).toMatch(/\.ascii\.is-drawn \.ascii-canvas\s*\{[^}]*visibility:\s*visible/);
    expect(vapor).toMatch(/\.ascii\.is-drawn \.ascii-fallback\s*\{[^}]*display:\s*none/);
  });
  it('does not hide the fallback on the .js class alone, which is set before the island hydrates', () => {
    expect(vapor).not.toMatch(/\.js \.ascii-fallback\s*\{[^}]*display:\s*none/);
    expect(vapor).not.toMatch(/\.js \.ascii-canvas\s*\{[^}]*display:\s*block/);
  });
  it('the swap cannot shift the layout: the box has a fixed aspect ratio and is out of flow', () => {
    const rule = vapor.match(/\.ascii\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(rule).toContain('position: absolute');
    expect(rule).toMatch(/aspect-ratio:\s*576\s*\/\s*420/);
  });
  it('keeps the canvas measurable while it is hidden, so it is never sized from a zero box', () => {
    // a `display: none` canvas has no box to measure: sizing the backing store from
    // that would leave one pixel stretched over the whole graph. the canvas is hidden
    // with `visibility` and taken out of the flow instead.
    const rule = vapor.match(/\.ascii-canvas\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(rule).not.toMatch(/display:\s*none/);
    expect(rule).toMatch(/visibility:\s*hidden/);
    expect(rule).toMatch(/position:\s*absolute/);
    expect(rule).toMatch(/inset:\s*0/);
  });
});

describe('the reveal', () => {
  it('waits for the canvas to have a real box before it steps the fallback aside', () => {
    // the reveal is guarded on the measured box being non-zero: a canvas that is
    // still `display: none` measures 0 x 0 and would be sized from that
    expect(source).toContain('canReveal(box.width, box.height)');
    // and it happens inside draw(), after the frame is on the canvas
    const draw = source.match(/const draw = \(now: number\) => \{([\s\S]*?)\n    \};/)?.[1] ?? '';
    expect(draw).toContain('canReveal(');
    expect(draw.indexOf('fillText')).toBeGreaterThan(-1);
    expect(draw.indexOf('fillText')).toBeLessThan(draw.indexOf('canReveal('));
    expect(draw).toContain('setDrawn(true)');
  });
  it('does not reveal the canvas from a bare measurement, before anything is painted', () => {
    // the old code called setDrawn(true) straight after the first draw, whatever the
    // canvas measured; the reveal now lives inside draw(), behind the guard
    const effect = source.match(/useEffect\(\(\) => \{([\s\S]*?)\n  \}, \[\]\);/)?.[1] ?? '';
    expect(effect).not.toMatch(/setDrawn\(true\);\s*\n\s*io\.observe/);
  });
});

describe('the pointer listener', () => {
  it('does no layout work per mouse move while the graph is off-screen', () => {
    const handler = source.match(/const onMove = \(e: PointerEvent\) => \{([\s\S]*?)\n    \};/)?.[1] ?? '';
    expect(handler).toContain('if (!visible) return;');
    // the guard comes before the measurement, so an off-screen graph never reads layout
    expect(handler.indexOf('if (!visible) return;')).toBeLessThan(handler.indexOf('getBoundingClientRect'));
  });
  it('still brightens the nodes when the graph is on screen', () => {
    const handler = source.match(/const onMove = \(e: PointerEvent\) => \{([\s\S]*?)\n    \};/)?.[1] ?? '';
    expect(handler).toContain('pointerFocus(visible');
    expect(handler).toContain('focus = ');
  });
});
