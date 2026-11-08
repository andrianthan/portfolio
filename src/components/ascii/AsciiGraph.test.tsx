import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AsciiGraph from './AsciiGraph';

const html = renderToStaticMarkup(<AsciiGraph />);

describe('AsciiGraph', () => {
  it('is decorative: aria-hidden wrapper, a canvas, and a static text fallback', () => {
    expect(html).toContain('class="ascii" aria-hidden="true"');
    expect(html).toContain('<canvas');
    expect(html).toContain('class="ascii-fallback"');
  });
  it('the fallback carries the drawn graph, hub included', () => {
    const pre = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/)?.[1] ?? '';
    expect(pre).toContain('@');
    expect(pre.split('\n').length).toBe(30);
  });
});
