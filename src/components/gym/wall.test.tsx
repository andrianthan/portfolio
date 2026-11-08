import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import data from '../../data/gym-checkins.json';
import { yearsOf } from './calendar';
import { WALL_COLS, WALL_ROWS, WALL_LABEL, WALL_GAP_Y, wallHeight } from './wall';
import YearWall from './YearWall';

const css = fs.readFileSync(path.join(process.cwd(), 'src/components/gym/gym.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

describe('the year wall', () => {
  it('reserves its height in CSS from the container width, so the block below it never moves', () => {
    const rule = css.match(/\.gym-wall\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(rule).toContain('height:');
    // the height is a function of the container's width, not a fixed pixel value
    expect(rule).toMatch(/height:\s*calc\([^;]*cqw[^;]*\)/);
    // and the wrapper is the query container the width is measured against
    expect(css).toMatch(/\.gym-wall-wrap\s*\{[^}]*container-type:\s*inline-size/);
  });

  it('the reserved height is the same formula the drawing uses', () => {
    // the CSS calc is: years * (rows * (100cqw - label) / cols + gap)
    const rule = css.match(/\.gym-wall\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(rule).toContain('var(--wall-years)');
    expect(rule).toContain('var(--wall-rows)');
    expect(rule).toContain('var(--wall-label)');
    expect(rule).toContain('var(--wall-cols)');
    expect(rule).toContain('var(--wall-gap-y)');
    // the formula holds for every width, so the reserved height is the drawn height
    for (const width of [288, 320, 375, 412, 600, 736]) {
      const cell = (width - WALL_LABEL) / WALL_COLS;
      const cssHeight = yearsOf(data.dates).length * (WALL_ROWS * cell + WALL_GAP_Y);
      expect(cssHeight).toBeCloseTo(wallHeight(width, yearsOf(data.dates).length), 10);
    }
  });

  it('carries the geometry as custom properties in the server-rendered html, before any script runs', () => {
    const html = renderToStaticMarkup(<YearWall />);
    const years = yearsOf(data.dates).length;
    expect(html).toContain('--wall-years:5');
    expect(html).toContain(`--wall-years:${years}`);
    expect(html).toContain(`--wall-cols:${WALL_COLS}`);
    expect(html).toContain(`--wall-rows:${WALL_ROWS}`);
    expect(html).toContain(`--wall-label:${WALL_LABEL}px`);
    expect(html).toContain(`--wall-gap-y:${WALL_GAP_Y}px`);
    // the canvas itself carries no inline height: the reserved height is the stylesheet's
    expect(html).not.toMatch(/<canvas[^>]*style="[^"]*height/);
  });
});

describe('wallHeight', () => {
  it('is the drawn height: one block of seven rows per year, plus the gap', () => {
    const years = yearsOf(data.dates).length;
    expect(years).toBe(5);
    const cell = (736 - WALL_LABEL) / WALL_COLS;
    expect(wallHeight(736, years)).toBeCloseTo(years * (WALL_ROWS * cell + WALL_GAP_Y), 10);
    expect(wallHeight(736, years)).toBeCloseTo(505, 6);
  });
  it('grows with the width and with the number of years', () => {
    expect(wallHeight(736, 5)).toBeGreaterThan(wallHeight(320, 5));
    expect(wallHeight(736, 6)).toBeGreaterThan(wallHeight(736, 5));
  });
});
