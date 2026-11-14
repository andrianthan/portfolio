import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { WALL_COLS, WALL_ROWS, WALL_LABEL, WALL_GAP_Y, wallHeight } from './wall';
import YearWall from './YearWall';

const css = fs.readFileSync(path.join(process.cwd(), 'src/components/gym/gym.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

const YEARS = 1; // the wall shows one year at a time

/**
 * The `calc()` the wall reserves its height with, read out of the stylesheet.
 *
 * The wall's height is reserved in CSS (so the block below it does not move when the
 * island hydrates) and drawn from `wallHeight()` in TypeScript. For the two to agree
 * the CSS has to express the same arithmetic — and a test that only checked that the
 * right custom property *names* appeared would not notice if the operators changed.
 *
 * So this reads the expression out of the css and substitutes the geometry constants
 * and a container width for the `var()` references, leaving only arithmetic that can
 * be evaluated and compared with `wallHeight()`.
 */
function wallCalc(width: number): string {
  const rule = css.match(/\.gym-wall\s*\{([^}]*)\}/)?.[1] ?? '';
  const body = rule.match(/calc\(([^;]*)\)/)?.[1];
  if (!body) throw new Error('the .gym-wall rule reserves its height with no calc()');
  return body
    .replace(/var\(--wall-years\)/g, String(YEARS))
    .replace(/var\(--wall-rows\)/g, String(WALL_ROWS))
    .replace(/var\(--wall-cols\)/g, String(WALL_COLS))
    .replace(/var\(--wall-label\)/g, String(WALL_LABEL))
    .replace(/var\(--wall-gap-y\)/g, String(WALL_GAP_Y))
    .replace(/100cqw/g, String(width));
}

/**
 * Evaluate the wall's css arithmetic for a container width.
 *
 * The expression uses only `+ - * /`, parentheses and plain numbers once the
 * references are substituted, so it is evaluated with a small shunting-yard parser
 * rather than by handing a string to `eval`.
 */
function evalWallCalc(expr: string): number {
  const tokens = expr.replace(/\s+/g, ' ').match(/\d+\.?\d*|[()+\-*/]/g);
  if (!tokens) throw new Error(`no arithmetic in ${expr}`);
  let i = 0;
  const peek = () => tokens[i];

  // a value: a number, or a parenthesised expression
  const value = (): number => {
    const t = peek();
    if (t === '(') {
      i++;
      const v = expression();
      if (peek() !== ')') throw new Error(`expected ) in ${expr}`);
      i++;
      return v;
    }
    if (t === undefined || !/^\d/.test(t)) throw new Error(`expected a number in ${expr}, got ${t}`);
    i++;
    return Number(t);
  };

  // a product: value (('*' | '/') value)*
  const product = (): number => {
    let v = value();
    for (;;) {
      const t = peek();
      if (t === '*') { i++; v *= value(); }
      else if (t === '/') { i++; v /= value(); }
      else return v;
    }
  };

  // a sum: product (('+' | '-') product)*
  const expression = (): number => {
    let v = product();
    for (;;) {
      const t = peek();
      if (t === '+') { i++; v += product(); }
      else if (t === '-') { i++; v -= product(); }
      else return v;
    }
  };

  const result = expression();
  if (i !== tokens.length) throw new Error(`trailing input in ${expr}`);
  return result;
}

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
    const rule = css.match(/\.gym-wall\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(rule).toContain('var(--wall-years)');
    expect(rule).toContain('var(--wall-rows)');
    expect(rule).toContain('var(--wall-label)');
    expect(rule).toContain('var(--wall-cols)');
    expect(rule).toContain('var(--wall-gap-y)');
    // the formula holds for every width, so the reserved height is the drawn height
    for (const width of [288, 320, 375, 412, 600, 736]) {
      const cell = (width - WALL_LABEL) / WALL_COLS;
      const cssHeight = YEARS * (WALL_ROWS * cell + WALL_GAP_Y);
      expect(cssHeight).toBeCloseTo(wallHeight(width, YEARS), 10);
    }
  });

  it('the css calc computes the drawn height: the css arithmetic is the drawing formula', () => {
    // this is the check the previous version of this file only claimed to make: the
    // expression is read out of the stylesheet, the geometry constants and a container
    // width are substituted for the var() references, and the arithmetic it expresses
    // is compared with what wallHeight() returns. a calc() with the right property
    // names and the wrong operators fails here.
    for (const width of [288, 320, 375, 412, 600, 736]) {
      const fromCss = evalWallCalc(wallCalc(width));
      expect(fromCss).toBeCloseTo(wallHeight(width, YEARS), 10);
    }
  });

  it('the css calc is the formula the drawing uses, term for term', () => {
    // the same arithmetic, written out: years * (rows * (width - label) / cols + gap).
    // the operators are compared literally, so a changed `+`, a moved division or a
    // dropped factor fails here even where it would still be close enough to pass a
    // numeric comparison at some widths.
    // a width that no constant can produce, so the substitution cannot hit one
    const WIDTH = 137;
    const expected = `${YEARS} * (${WALL_ROWS} * (WIDTH - ${WALL_LABEL}) / ${WALL_COLS} + ${WALL_GAP_Y})`;
    // the operators are spaced the same way on both sides, so only the arithmetic
    // itself is compared, not the stylesheet's formatting
    const spaced = (s: string) => s
      .replace(/\s+/g, ' ')
      .replace(/\s*([()+\-*/])\s*/g, ' $1 ')
      .replace(/\s+/g, ' ')
      .trim();
    const actual = spaced(wallCalc(WIDTH)).replace(new RegExp(`\\b${WIDTH}\\b`), 'WIDTH');
    expect(actual).toBe(spaced(expected));
  });

  it('carries the geometry as custom properties in the server-rendered html, before any script runs', () => {
    const html = renderToStaticMarkup(<YearWall year={2026} />);
    expect(html).toContain('--wall-years:1');
    expect(html).toContain(`--wall-cols:${WALL_COLS}`);
    expect(html).toContain(`--wall-rows:${WALL_ROWS}`);
    expect(html).toContain(`--wall-label:${WALL_LABEL}px`);
    expect(html).toContain(`--wall-gap-y:${WALL_GAP_Y}px`);
    // the canvas itself carries no inline height: the reserved height is the stylesheet's
    expect(html).not.toMatch(/<canvas[^>]*style="[^"]*height/);
  });
});

describe('wallHeight', () => {
  it('is the drawn height: one block of seven rows, plus the gap', () => {
    const cell = (736 - WALL_LABEL) / WALL_COLS;
    expect(wallHeight(736, 1)).toBeCloseTo(WALL_ROWS * cell + WALL_GAP_Y, 10);
    expect(wallHeight(736, 1)).toBeCloseTo((7 * 736) / 54 + 10, 6);
  });
  it('grows with the width and with the number of years', () => {
    expect(wallHeight(736, 5)).toBeGreaterThan(wallHeight(320, 5));
    expect(wallHeight(736, 6)).toBeGreaterThan(wallHeight(736, 5));
  });
});
