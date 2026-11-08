/**
 * The browser check: the behaviours that only a real browser can show.
 *
 * The unit tests pin the CSS that is supposed to produce them. This measures
 * what the built page actually does, so a regression that leaves the CSS
 * untouched but breaks the layout still fails.
 *
 * No npm dependencies: Chrome is launched with --remote-debugging-port and
 * driven over the DevTools Protocol with Node's built-in WebSocket.
 *
 * Run it with `npm run browser-check`. If Chrome is not installed the check
 * prints a SKIP line and exits 0; anything it does measure and finds broken
 * exits non-zero.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9334;

// The widths the layout has to hold at: the narrowest phone the site supports
// through the widest desktop.
const WIDTHS = [320, 375, 414, 640, 768, 900, 1024, 1280, 1440];
const HEIGHTS = { 320: 720, 375: 812, 414: 896, 640: 900, 768: 1024, 900: 900, 1024: 900, 1280: 900, 1440: 900 };

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The problems the check found. Every one names what was measured and what was
// expected, so a failure says what broke.
const problems = [];
const note = (message) => problems.push(message);

// --- a static server for the built output ---------------------------------

function serve(dir) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = path.join(dir, url);
    if (url.endsWith('/')) file = path.join(file, 'index.html');
    if (!file.startsWith(dir)) {
      res.writeHead(403).end();
      return;
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      const asIndex = path.join(file, 'index.html');
      if (fs.existsSync(asIndex)) {
        res.writeHead(200, { 'content-type': MIME['.html'] }).end(fs.readFileSync(asIndex));
        return;
      }
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' }).end(fs.readFileSync(file));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

// --- the DevTools Protocol client ------------------------------------------

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
  }

  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = () => reject(new Error('could not open the devtools websocket'));
    });
    const cdp = new Cdp(ws);
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && cdp.pending.has(message.id)) {
        const { resolve, reject } = cdp.pending.get(message.id);
        cdp.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
      } else if (message.method) {
        cdp.events.push(message);
      }
    };
    return cdp;
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async waitFor(method, timeoutMs = 20000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const hit = this.events.find((event) => event.method === method);
      if (hit) {
        this.events = this.events.filter((event) => event !== hit);
        return hit;
      }
      await sleep(80);
    }
    throw new Error(`timed out waiting for ${method}`);
  }
}

/** Run an expression in the page and return its value, failing loudly. */
async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) {
    const detail = result.exceptionDetails.exception?.description ?? result.exceptionDetails.text;
    throw new Error(`the page threw while measuring: ${detail}`);
  }
  return result.result.value;
}

// --- the measurements -------------------------------------------------------

// The header nav: how many rows it takes, whether a link wraps, whether the
// page scrolls sideways.
//
// The site sets `overflow-x: clip` on the document, so the document's
// scrollWidth is always its clientWidth and says nothing. What matters is
// whether the content is wider than the viewport, so the check measures the
// widest element of the page proper: the fixed backdrop layers are meant to
// run past the edge and are skipped.
const NAV_MEASUREMENT = `(() => {
  const doc = document.documentElement;
  const nav = document.querySelector('.vnav');
  const links = nav ? [...nav.querySelectorAll('a')] : [];
  const tops = links.map((a) => Math.round(a.getBoundingClientRect().top));
  const rows = [...new Set(tops)].length;
  // A link that wraps onto a second line has more than one line box. The
  // Range gives one rect per line, which is exact: the computed line-height is
  // "normal" here, so dividing the height by it would say nothing.
  const wrapped = links
    .map((a) => {
      const range = document.createRange();
      range.selectNodeContents(a);
      const lines = range.getClientRects().length;
      range.detach();
      return { label: a.textContent.trim(), lines, height: Math.round(a.getBoundingClientRect().height) };
    })
    .filter((l) => l.lines > 1);
  // The widest element of the page proper. The decorative layers are fixed or
  // absolutely placed and deliberately wider than the viewport: the backdrop
  // stars drift past the edge and the hero's orbit rings are scaled up. They
  // are clipped by their own containers and say nothing about a horizontal
  // scroll, so they are left out.
  let widest = { width: 0, tag: '' };
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('.vb') || el.closest('.orbits')) continue;
    const r = el.getBoundingClientRect();
    if (r.width > widest.width) {
      widest = { width: Math.round(r.width), tag: el.tagName + (el.className ? '.' + String(el.className).split(' ')[0] : '') };
    }
  }
  return {
    rows,
    labels: links.map((a) => a.textContent.trim()),
    wrapped,
    scrollWidth: doc.scrollWidth,
    clientWidth: doc.clientWidth,
    horizontalScroll: doc.scrollWidth > doc.clientWidth,
    widest,
    viewport: doc.clientWidth,
  };
})()`;

// The map: is it there, is it visible, is it clipped, and does opening a
// country light that country's dots? The lighting is CSS :has(), so only a
// real browser can show it.
const MAP_MEASUREMENT = `(() => {
  const wrap = document.querySelector('.travel-mapwrap');
  const svg = document.querySelector('#outside svg');
  if (!svg) return { present: false };
  const r = svg.getBoundingClientRect();
  const dots = svg.querySelectorAll('circle');
  const lit = [...dots].filter((c) => {
    const fill = getComputedStyle(c).fill;
    return fill && fill !== 'rgb(42, 37, 82)' && fill !== 'rgba(0, 0, 0, 0)';
  });
  return {
    present: true,
    ariaHidden: svg.getAttribute('aria-hidden'),
    width: Math.round(r.width),
    height: Math.round(r.height),
    visible: r.width > 0 && r.height > 0 && getComputedStyle(svg).visibility !== 'hidden',
    dots: dots.length,
    litDots: lit.length,
    classes: [...new Set([...dots].map((c) => c.getAttribute('class') ?? ''))],
  };
})()`;

// The country list: does the summary show something that changes when the
// details opens? The chevron is a CSS ::after, so its content is read from the
// pseudo element rather than from the DOM.
const DISCLOSURE_MEASUREMENT = `(() => {
  const details = document.querySelector('#outside details.country');
  if (!details) return { present: false };
  const summary = details.querySelector('summary');
  const read = () => {
    const after = getComputedStyle(summary, '::after');
    return {
      content: after.content,
      color: after.color,
      open: details.open,
      bodyHeight: Math.round(details.querySelector('.country-body')?.getBoundingClientRect().height ?? 0),
    };
  };
  const before = read();
  details.open = true;
  const afterOpen = read();
  details.open = false;
  return { present: true, before, afterOpen };
})()`;

// The food captions: is any of them clipped by its figure?
const CAPTION_MEASUREMENT = `(() => {
  const figures = [...document.querySelectorAll('#outside .food-grid figure')];
  const clipped = [];
  for (const fig of figures) {
    const caption = fig.querySelector('figcaption');
    if (!caption) continue;
    const cb = caption.getBoundingClientRect();
    const fb = fig.getBoundingClientRect();
    const style = getComputedStyle(caption);
    const bottom = cb.top + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    if (cb.height > 0 && (bottom > fb.bottom + 0.5 || cb.top < fb.top - 0.5)) {
      clipped.push({ text: caption.textContent.trim().slice(0, 40), captionBottom: Math.round(bottom), figureBottom: Math.round(fb.bottom) });
    }
    // A caption that overflows its own box is clipped by the figure too.
    if (caption.scrollHeight > caption.clientHeight + 1) {
      clipped.push({ text: caption.textContent.trim().slice(0, 40), scrollHeight: caption.scrollHeight, clientHeight: caption.clientHeight });
    }
  }
  return { figures: figures.length, clipped };
})()`;

// --- the run ----------------------------------------------------------------

async function checkWidth(cdp, width, url) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height: HEIGHTS[width] ?? 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp.send('Page.navigate', { url });
  await cdp.waitFor('Page.loadEventFired');
  // Let the fonts, the images and the reveal observer settle.
  await sleep(1200);

  const nav = await evaluate(cdp, NAV_MEASUREMENT);

  // The nav: one row at 900px and up, never more than two below.
  const expectedRows = width >= 900 ? 1 : 2;
  if (nav.rows !== expectedRows) {
    note(`nav row count at ${width}px: expected ${expectedRows}, measured ${nav.rows}`);
  }
  if (nav.rows > 2) {
    note(`nav row count at ${width}px: expected at most 2 rows, measured ${nav.rows}`);
  }
  // No link wraps onto a second line.
  if (nav.wrapped.length > 0) {
    note(`nav link wrapped to two lines at ${width}px: ${nav.wrapped.map((l) => `${l.label} (${l.lines} lines)`).join(', ')}`);
  }
  // No horizontal scroll. The document clips its own overflow, so the check
  // measures the content: nothing of the page proper may be wider than the
  // viewport.
  if (nav.horizontalScroll) {
    note(`horizontal scroll at ${width}px: scrollWidth ${nav.scrollWidth} is wider than clientWidth ${nav.clientWidth}`);
  }
  if (nav.widest.width > nav.viewport + 1) {
    note(`horizontal overflow at ${width}px: the widest element (${nav.widest.tag}) is ${nav.widest.width}px wide in a ${nav.viewport}px viewport`);
  }

  // The map: visible, not clipped.
  const map = await evaluate(cdp, MAP_MEASUREMENT);
  if (!map.present) {
    note(`the world map is missing from the Outside of work section at ${width}px`);
  } else {
    if (!map.visible) note(`the world map is not visible at ${width}px`);
    if (map.width > width) note(`the world map is clipped at ${width}px: it is ${map.width}px wide`);
    if (map.ariaHidden !== 'true') note(`the world map is not aria-hidden at ${width}px`);
  }

  // The map lights a country when its details opens. Close every details, then
  // open one country and check that that country's own dots got brighter.
  const lighting = await evaluate(cdp, `(async () => {
    const details = [...document.querySelectorAll('#outside details.country')];
    details.forEach((d) => { d.open = false; });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const target = details.find((d) => d.querySelector('summary span')?.textContent.trim() === 'Japan') ?? details[0];
    if (!target) return { ok: false };
    const code = target.dataset.c;
    const group = document.querySelector('#outside svg .dot-' + code);
    const dots = group ? [...group.querySelectorAll('circle')] : [];
    const before = dots.map((c) => getComputedStyle(c).fill);
    target.open = true;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const after = dots.map((c) => getComputedStyle(c).fill);
    // "Lit" means brighter, not merely different: a rule that dimmed the dots
    // would change their colour too. (The backslashes are doubled: the
    // expression is a template literal, so a single backslash would be eaten.)
    const rgb = (value) => (value.match(/[\\d.]+/g) ?? [0, 0, 0]).slice(0, 3).map(Number);
    const brightness = (value) => { const [r, g, b] = rgb(value); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const brighter = after.filter((fill, i) => brightness(fill) > brightness(before[i])).length;
    const changed = after.filter((fill, i) => fill !== before[i]).length;
    target.open = false;
    return { ok: true, code, dots: dots.length, changed, brighter };
  })()`);
  if (!lighting.ok) {
    note('the country list has no details to open, so the map lighting could not be measured');
  } else if (lighting.dots === 0) {
    note(`the map has no dots for country ${lighting.code}, so its lighting could not be measured`);
  } else if (lighting.brighter === 0) {
    note(`opening country ${lighting.code} did not light its dots on the map: expected ${lighting.dots} dots of ${lighting.code} to get brighter, measured 0 (${lighting.changed} changed colour)`);
  }

  // The country list's disclosure affordance changes between the two states.
  const disclosure = await evaluate(cdp, DISCLOSURE_MEASUREMENT);
  if (!disclosure.present) {
    note('the country list has no details to open, so the disclosure affordance could not be measured');
  } else if (disclosure.before.content === disclosure.afterOpen.content && disclosure.before.color === disclosure.afterOpen.color) {
    note(`the country list's disclosure affordance did not change when the details opened: the summary's ::after stayed "${disclosure.before.content}" in ${disclosure.before.color}`);
  }

  // The Travel and Food blocks fade in as they come into view. Scroll each of
  // them into view and check that it actually reached full opacity.
  const blocks = await evaluate(cdp, `(async () => {
    const out = {};
    for (const sel of ['.travel', '.food']) {
      const el = document.querySelector(sel);
      if (!el) { out[sel] = null; continue; }
      const prev = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';
      const y = el.getBoundingClientRect().top + window.scrollY;
      // Put the top of the block a little below the top of the viewport, so the
      // observer sees the block enter.
      window.scrollTo({ top: Math.max(0, y - 40), behavior: 'instant' });
      document.documentElement.style.scrollBehavior = prev;
      // The reveal's transition is .6s, so wait past it before reading the
      // opacity: a half-finished fade would be read as a block that never
      // faded in.
      await new Promise((r) => setTimeout(r, 900));
      out[sel] = {
        present: true,
        height: Math.round(el.getBoundingClientRect().height),
        viewport: window.innerHeight,
        opacity: Number(getComputedStyle(el).opacity),
        hasIn: el.classList.contains('in'),
      };
    }
    return out;
  })()`);
  for (const sel of ['.travel', '.food']) {
    const block = blocks[sel];
    if (!block || !block.present) {
      note(`the ${sel} block is missing from the Outside of work section at ${width}px`);
      continue;
    }
    if (block.opacity < 1) {
      note(`the ${sel} block never faded in at ${width}px: expected an opacity of 1, measured ${block.opacity} (the block is ${block.height}px tall in a ${block.viewport}px viewport, so the reveal observer may never reach its threshold)`);
    }
  }

  // The food captions: none of them clipped by its figure.
  const captions = await evaluate(cdp, CAPTION_MEASUREMENT);
  if (captions.figures === 0) {
    note('the food gallery has no figures, so the captions could not be measured');
  } else if (captions.clipped.length > 0) {
    note(`a food caption is clipped by its figure at ${width}px: ${captions.clipped.map((c) => c.text).join('; ')}`);
  }

  return { width, rows: nav.rows, labels: nav.labels, map, lighting, disclosure, blocks, captions };
}

async function main() {
  if (!fs.existsSync(CHROME)) {
    console.log(`SKIP: Chrome is not installed at ${CHROME}, so the browser check did not run.`);
    return 0;
  }
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    console.error(`FAIL: there is no built site at ${distDir}. Run "npm run build" first.`);
    return 1;
  }

  const { server, port } = await serve(distDir);
  const url = `http://127.0.0.1:${port}/`;
  const profile = path.join(os.tmpdir(), `browser-check-profile-${process.pid}`);
  fs.rmSync(profile, { recursive: true, force: true });

  const chrome = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'ignore'] });

  const results = [];
  try {
    await sleep(300);
    let target = null;
    for (let i = 0; i < 80 && !target; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
        if (res.ok) target = await res.json();
      } catch {
        // Chrome is not listening yet.
      }
      if (!target) await sleep(150);
    }
    if (!target) throw new Error('the devtools endpoint never came up');

    const cdp = await Cdp.connect(target.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    for (const width of WIDTHS) {
      const result = await checkWidth(cdp, width, url);
      results.push(result);
      console.log(
        `${String(width).padStart(4)}px  nav rows ${result.rows}  ` +
        `map ${result.map.present ? `${result.map.width}x${result.map.height}, ${result.map.dots} dots` : 'MISSING'}  ` +
        `lit on open ${result.lighting.changed ?? 0}  ` +
        `travel opacity ${result.blocks['.travel']?.opacity ?? 'n/a'}  food opacity ${result.blocks['.food']?.opacity ?? 'n/a'}  ` +
        `captions ${result.captions.figures} (${result.captions.clipped.length} clipped)`,
      );
    }
  } catch (error) {
    note(`the browser check could not run: ${error.message}`);
  } finally {
    chrome.kill('SIGTERM');
    await sleep(400);
    server.close();
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }

  if (problems.length) {
    console.error(`browser-check: ${problems.length} problem(s)`);
    for (const problem of problems) console.error(' - ' + problem);
    return 1;
  }
  console.log(`browser-check: ok (${results.length} widths, ${WIDTHS.join(', ')} px)`);
  return 0;
}

process.exit(await main());
