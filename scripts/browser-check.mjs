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
 *
 * What this check does not prove:
 *
 *   - The demos are driven with `element.click()`, which exercises React's
 *     synthetic handler but not real pointer hit-testing. An overlay
 *     covering a control would not be caught: the click would land on the
 *     element even though a person could not have pressed it.
 *   - The theme is applied after the page has loaded, so first paint is
 *     measured in the default theme only. A first-paint flash of the wrong
 *     theme would not be caught.
 *
 * The per-project demo rule below is a general one over every multi-project
 * work page, and it is general on purpose. A swap of the two Alpha Kappa
 * Psi demos once passed this entire check: every demo was found by its
 * selector anywhere on the page, and nothing said which project each demo
 * belonged to, so the published page showed the listings demo under
 * "Membership intake automation" and the intake demo under "Opportunity
 * bot" with the whole gate green. The rule is therefore stated over the
 * page's project sections and the declared prefix-to-demo mapping, so it
 * covers every multi-project page and survives a change to the template's
 * own demo lookup.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findDemoProblems } from './lib/demos.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9334;

// The widths the layout has to hold at: the narrowest phone the site supports
// through the widest desktop.
const WIDTHS = [320, 375, 414, 640, 768, 900, 1024, 1280, 1440];
const HEIGHTS = { 320: 720, 375: 812, 414: 896, 640: 900, 768: 1024, 900: 900, 1024: 900, 1280: 900, 1440: 900 };

// The two themes the site ships. Both have to hold at every width.
const THEMES = ['vapor', 'light'];

// The Alpha Kappa Psi work page, and the home page it is linked from.
const AKPSI_PATH = '/work/akpsi/';

/**
 * The multi-project work pages, and the order their projects are expected to
 * be in.
 *
 * The order is stated per page only where the plan states it (the Alpha
 * Kappa Psi page). Every other page's order is derived twice: from its own
 * table of contents, which lists the projects in the order they are meant to
 * be in, and from its content entry, whose `##` headings are in the order
 * the projects were written. The two derivations are independent of each
 * other, so a template that renders the sections in a different order from
 * the one the entry was written in is caught on every page.
 */
const MULTI_PAGES = [
  { path: '/work/tesla/', slug: 'tesla', expectedOrder: null },
  { path: '/work/hanna/', slug: 'hanna', expectedOrder: null },
  { path: '/work/bluedome/', slug: 'bluedome', expectedOrder: null },
  { path: '/work/micron/', slug: 'micron', expectedOrder: null },
  { path: '/work/akpsi/', slug: 'akpsi', expectedOrder: ['membership-intake-automation', 'opportunity-bot'] },
];

/**
 * The project headings of a work entry, in the order the entry writes them.
 *
 * The heading text is read straight out of the markdown, so the order does
 * not depend on how the ids are slugged.
 */
function contentHeadings(slug) {
  const file = path.join(root, 'src', 'content', 'work', `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const body = fs.readFileSync(file, 'utf8');
  return body
    .split('\n')
    .filter((line) => /^## /.test(line))
    .map((line) => line.slice(3).trim());
}

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

// The Alpha Kappa Psi page's intro. The multi-project template splits the
// rendered body on the first `##`, so every paragraph before it used to be
// dropped. The three intro paragraphs have to be on the page, and they have
// to come before the first project: the mentoring sentence is the whole point
// of the template change, so "present but after the projects" is a failure.
const AKPSI_INTRO_MEASUREMENT = `(() => {
  const prose = document.querySelector('.prose');
  const first = document.querySelector('#membership-intake-automation');
  if (!prose || !first) return { present: false };
  // The paragraphs ahead of the first project, in document order.
  const introParas = [];
  for (const node of prose.children) {
    if (node === first || first.contains(node)) break;
    if (node.tagName === 'P') introParas.push(node.textContent.trim());
  }
  const wants = ['internal operations ran by hand', 'Two tools came out of it', 'mentored 5+ individuals into internships'];
  // A paragraph counts as present only if it comes ahead of the first project.
  const found = wants.map((needle) => {
    const para = introParas.find((text) => text.includes(needle));
    return { needle, found: para !== undefined, text: para ?? null };
  });
  return {
    present: true,
    introParas,
    found,
    beforeFirstProject: found.every((f) => f.found),
  };
})()`;

// Every multi-project work page: which demo each project section holds, and
// the order the sections are in.
//
// The demo of a section is read from the island's own `opts` attribute, which
// names the component. That is exact: two demos can share a root class (the
// label review tool and the grants agent are both `qa`), so a class would not
// tell them apart, while the component name always does.
//
// The order comes from the page's own table of contents: the "Projects 01 …
// 02 …" list states the order the projects are in, and the sections have to
// be rendered in that same order.
const PROJECT_DEMO_MEASUREMENT = `(() => {
  const nameOf = (island) => {
    const opts = island.getAttribute('opts');
    if (!opts) return null;
    const m = opts.match(/"name"\\s*:\\s*"([^"]+)"/);
    return m ? m[1] : null;
  };
  const projects = [...document.querySelectorAll('.project')].map((section) => {
    // The heading carries the number span and the title, so the title is
    // what is left once the number is dropped.
    const heading = section.querySelector('h2');
    const number = heading?.querySelector('.n');
    const title = heading ? heading.textContent.trim().replace(number?.textContent.trim() ?? '', '').trim() : '';
    return {
      id: section.id,
      title,
      demos: [...section.querySelectorAll('astro-island')].map(nameOf).filter(Boolean),
    };
  });
  // The table of contents lists the projects in the order they are meant to
  // be in, so its links are the expected order.
  const tocOrder = [...document.querySelectorAll('.toc a[href^="#"]')].map((a) => {
    const href = a.getAttribute('href') ?? '';
    return href.startsWith('#') ? href.slice(1) : href;
  });
  const tocNumbers = [...document.querySelectorAll('.toc a[href^="#"] .n')].map((n) => n.textContent.trim());
  return { projects, tocOrder, tocNumbers };
})()`;

// The two demos on the Alpha Kappa Psi page: each is a `qa` window with a
// "sample data" badge, a role of "group" and its own aria-label.
const AKPSI_DEMO_MEASUREMENT = `(() => {
  const wanted = [
    { label: 'Sample membership intake pipeline', sel: '.intake' },
    { label: 'Sample opportunity listings feed', sel: '.listings' },
  ];
  const demos = wanted.map((w) => {
    const el = document.querySelector(w.sel);
    if (!el) return { label: w.label, present: false };
    const badge = el.querySelector('.qa-sample');
    return {
      label: w.label,
      present: true,
      role: el.getAttribute('role'),
      ariaLabel: el.getAttribute('aria-label'),
      badge: badge ? badge.textContent.trim() : null,
      badgeOn: badge ? getComputedStyle(badge).display !== 'none' : false,
      width: Math.round(el.getBoundingClientRect().width),
    };
  });
  return { demos };
})()`;

// The contrast of the demos' text. The unit tests argue the contrast from
// the token values; this measures what the browser actually painted, which is
// the only thing that settles it: a token can be right and the page still
// come out unreadable.
//
// The pair is the text's own colour against the background it actually sits
// on, found by walking up until an opaque background turns up. The threshold
// is AA for body text: 4.5:1.
const AKPSI_CONTRAST_MEASUREMENT = `(() => {
  const rgb = (value) => {
    const m = value.match(/[\\d.]+/g);
    if (!m) return null;
    const [r, g, b, a] = m.map(Number);
    return a === undefined || a >= 1 ? [r, g, b] : null;
  };
  const luminance = ([r, g, b]) => {
    const f = (c) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const first = luminance(a);
    const second = luminance(b);
    const light = Math.max(first, second);
    const dark = Math.min(first, second);
    return (light + 0.05) / (dark + 0.05);
  };
  // The background an element really sits on: the first ancestor (itself
  // included) with an opaque background colour.
  const backdrop = (el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      const c = rgb(getComputedStyle(node).backgroundColor);
      if (c) return c;
      node = node.parentElement;
    }
    return rgb(getComputedStyle(document.body).backgroundColor);
  };
  const samples = [
    { sel: '.intake .qa-title', name: 'the intake title' },
    { sel: '.intake .qa-sample', name: 'the intake sample badge' },
    { sel: '.intake .intake-mail p', name: 'the intake email text' },
    { sel: '.intake .intake-steps li', name: 'the intake stage labels' },
    { sel: '.intake .intake-k', name: 'the intake result labels' },
    { sel: '.intake .intake-v', name: 'the intake result values' },
    { sel: '.intake .intake-cap', name: 'the intake caption' },
    { sel: '.listings .qa-title', name: 'the listings title' },
    { sel: '.listings .qa-sample', name: 'the listings sample badge' },
    { sel: '.listings .listings-chip', name: 'the listings filter chips' },
    { sel: '.listings .listings-title', name: 'the listings titles' },
    { sel: '.listings .listings-id', name: 'the listings ids' },
    { sel: '.listings .listings-msg-t', name: 'the channel message titles' },
    { sel: '.listings .listings-msg-m', name: 'the channel message details' },
    { sel: '.listings .listings-cap', name: 'the listings caption' },
  ];
  const out = [];
  for (const sample of samples) {
    const el = document.querySelector(sample.sel);
    if (!el) { out.push({ name: sample.name, sel: sample.sel, present: false }); continue; }
    const fg = rgb(getComputedStyle(el).color);
    const bg = backdrop(el);
    if (!fg || !bg) { out.push({ name: sample.name, sel: sample.sel, present: true, measurable: false }); continue; }
    out.push({
      name: sample.name,
      sel: sample.sel,
      present: true,
      measurable: true,
      fg: getComputedStyle(el).color,
      bg: 'rgb(' + bg.join(', ') + ')',
      ratio: Number(ratio(fg, bg).toFixed(2)),
    });
  }
  return { samples: out };
})()`;

// The demos must not move on their own. A running animation or a transition
// on the demo's own elements is what the page promises it does not have, so
// the check looks at the computed style of everything inside each demo.
const AKPSI_MOTION_MEASUREMENT = `(() => {
  const out = [];
  for (const sel of ['.intake', '.listings']) {
    const demo = document.querySelector(sel);
    if (!demo) { out.push({ sel, present: false }); continue; }
    const moving = [];
    for (const el of [demo, ...demo.querySelectorAll('*')]) {
      const style = getComputedStyle(el);
      const anim = style.animationName && style.animationName !== 'none' ? style.animationName : null;
      // A transition only counts when it has a duration: a zero duration is not motion.
      const trans = style.transitionDuration && style.transitionDuration.split(',').some((d) => parseFloat(d) > 0) ? style.transitionProperty : null;
      if (anim || trans) {
        moving.push({
          tag: el.tagName + (el.className ? '.' + String(el.className).split(' ')[0] : ''),
          animation: anim,
          transition: trans,
        });
      }
    }
    out.push({ sel, present: true, moving });
  }
  return { demos: out };
})()`;

// The intake demo, driven the way a person drives it: press the applicant
// chip, press Process, read what the demo shows.
//
// `element.click()` from the page's own script is the intended way in here.
// React's synthetic handler listens on the root container, and a click
// dispatched through `HTMLElement.click()` bubbles up to it, so the demo
// reacts exactly as it does to a real press without needing CDP input events.
//
// The three walks are the three interesting outcomes:
//   - Applicant C asks a question the knowledge base does not answer, so the
//     second press must flag the email for a person instead of answering it.
//   - Applicant D's transcript is not readable, so the pipeline must stop at
//     the attachment stage and name the file.
//   - Applicant E's availability names no day and no time, so the schedule
//     stage must propose no slots at all rather than invent one.
const INTAKE_MEASUREMENT = `(async () => {
  const demo = document.querySelector('.intake');
  if (!demo) return { present: false };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const press = async (el) => {
    el.click();
    // React commits the state update before the next paint, so one frame is
    // enough; two is cheap and removes the race.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  };
  const pick = (id) => [...demo.querySelectorAll('.intake-pick')].find((b) => b.textContent.trim() === id);
  const process = () => [...demo.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Process');
  const stageTitles = () => [...demo.querySelectorAll('.intake-steps li')].map((li) => ({
    title: li.querySelector('.intake-step-t')?.textContent.trim() ?? '',
    state: li.className.trim(),
    chip: li.querySelector('.intake-step-s')?.textContent.trim() ?? null,
  }));
  // The stage the pipeline is on. A waiting stage carries the "on" class; a
  // finished pipeline marks its last stage "done" instead, so a run with no
  // "on" row is a run that reached the end.
  const currentStage = () => {
    const rows = stageTitles();
    const on = rows.find((r) => r.state.split(/\s+/).includes('on'));
    if (on) return on.title;
    const done = rows.filter((r) => r.state.split(/\s+/).includes('done'));
    return done.length === rows.length && rows.length > 0 ? rows[rows.length - 1].title : null;
  };
  const results = () => [...demo.querySelectorAll('.intake-results li')].map((li) => ({
    key: li.querySelector('.intake-k')?.textContent.trim() ?? '',
    value: li.querySelector('.intake-v')?.textContent.trim() ?? '',
    flagged: !!li.querySelector('.intake-flag'),
  }));
  const out = {};
  const walks = [
    { id: 'Applicant C', presses: 2 },
    { id: 'Applicant D', presses: 3 },
    { id: 'Applicant E', presses: 5 },
  ];
  for (const walk of walks) {
    const chip = pick(walk.id);
    if (!chip) { out[walk.id] = { ok: false, reason: 'no chip' }; continue; }
    await press(chip);
    const button = process();
    if (!button) { out[walk.id] = { ok: false, reason: 'no Process button' }; continue; }
    // A disabled button swallows the click, so a walk that never advanced
    // would look like a pipeline that stalled. Say so instead.
    if (button.disabled) { out[walk.id] = { ok: false, reason: 'the Process button is disabled' }; continue; }
    for (let i = 0; i < walk.presses; i += 1) {
      await press(button);
      await sleep(20);
    }
    out[walk.id] = {
      ok: true,
      stage: currentStage(),
      steps: stageTitles(),
      results: results(),
      note: demo.querySelector('.intake-note')?.textContent.trim() ?? null,
      processDisabled: button.disabled,
    };
  }
  return { present: true, out };
})()`;

// The listings demo, driven the same way: press the referral filter chip and
// read the feed, press "Post to channel" and read the channel, press it again
// on the same listing and read the channel once more.
const LISTINGS_MEASUREMENT = `(async () => {
  const demo = document.querySelector('.listings');
  if (!demo) return { present: false };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const press = async (el) => {
    el.click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  };
  const chip = (text) => [...demo.querySelectorAll('.listings-chip')].find((b) => b.textContent.trim() === text);
  const feed = () => [...demo.querySelectorAll('.listings-feed .listings-row')].map((row) => ({
    id: row.querySelector('.listings-id')?.textContent.trim() ?? '',
    source: row.querySelector('.listings-tag')?.textContent.trim() ?? '',
    roleType: row.querySelector('.listings-role')?.textContent.trim() ?? '',
  }));
  const channel = () => [...demo.querySelectorAll('.listings-msgs .listings-msg')].map((m) => m.querySelector('.listings-id')?.textContent.trim() ?? '');
  const referral = chip('referral');
  if (!referral) return { present: true, ok: false, reason: 'no referral chip' };
  await press(referral);
  await sleep(20);
  const filtered = feed();
  const referralPressed = referral.getAttribute('aria-pressed');
  // Post the first referral listing, then post it again.
  const postButton = demo.querySelector('.listings-feed .listings-row .listings-post');
  let afterOne = null;
  let afterTwo = null;
  if (!postButton) {
    return { present: true, ok: false, reason: 'no Post to channel button', filtered };
  }
  await press(postButton);
  await sleep(20);
  afterOne = channel();
  await press(postButton);
  await sleep(20);
  afterTwo = channel();
  return {
    present: true,
    ok: true,
    referralPressed,
    filtered,
    filteredSources: [...new Set(filtered.map((f) => f.source))],
    channelAfterOne: afterOne,
    channelAfterTwo: afterTwo,
  };
})()`;

// The Alpha Kappa Psi entry on the home page's Experience list: the "now" tag
// and the logo image. The logo is the "AK" wordmark, so its naturalWidth is
// the width of the rendered SVG.
const HOME_AKPSI_MEASUREMENT = `(() => {
  const jobs = [...document.querySelectorAll('#experience .job')];
  const job = jobs.find((j) => j.textContent.includes('Alpha Kappa Psi')) ?? null;
  if (!job) return { present: false };
  const img = job.querySelector('.logo img');
  return {
    present: true,
    now: !!job.querySelector('.tag'),
    nowText: job.querySelector('.tag')?.textContent.trim() ?? null,
    classNow: job.classList.contains('now'),
    logo: img ? { src: img.getAttribute('src'), naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, complete: img.complete } : null,
  };
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

/** Put the page in one theme. The site reads `data-theme` off the root. */
async function setTheme(cdp, theme) {
  await evaluate(cdp, `document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)})`);
}

/**
 * A multi-project work page: which demo each project section holds, and the
 * order the sections are in.
 *
 * The demo rule is the same on every page, and it is the rule that was
 * missing when a swap of the two Alpha Kappa Psi demos passed the whole
 * check: a project section must hold the demo its own heading id maps to,
 * and it must not hold any other demo. The mapping comes from the check's
 * own table, so a demo moved onto the wrong project is caught whichever
 * page it happens on. A project that maps to no demo holds none, which the
 * rule allows rather than fails.
 *
 * The order is checked twice: against the page's own table of contents,
 * which states the order the projects are in, and against its content
 * entry, which writes the projects in that order. A page whose plan states
 * an order of its own passes that order instead.
 */
async function checkMultiPage(cdp, url, page) {
  // A fixed viewport, so the measurement does not depend on whatever width
  // the previous check left the browser at.
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp.send('Page.navigate', { url });
  await cdp.waitFor('Page.loadEventFired');
  await sleep(600);

  const measured = await evaluate(cdp, PROJECT_DEMO_MEASUREMENT);

  if (measured.projects.length === 0) {
    note(`${page.path} has no project sections, so its demos could not be measured`);
    return { path: page.path, projects: [], ok: false };
  }

  // The demo each section holds, against the demo its heading id maps to.
  // A project that maps to no demo holds none: the template renders no demo
  // slot for it, so a demo there would be a demo on a project that owns none.
  for (const problem of findDemoProblems(page.path, measured.projects)) {
    note(problem);
  }

  // The order of the projects. The page's own table of contents states it.
  const rendered = measured.projects.map((p) => p.id);
  const expectedOrder = page.expectedOrder ?? measured.tocOrder;
  if (expectedOrder.length === 0) {
    note(`${page.path} has a table of contents with no project links, so the project order could not be checked`);
  } else if (rendered.join('|') !== expectedOrder.join('|')) {
    note(`${page.path}: the projects are rendered in the order ${rendered.join(', ')}, expected ${expectedOrder.join(', ')}`);
  }

  // The order the content entry writes its projects in. This is a second,
  // independent statement of the order: the table of contents and the
  // sections are both built from the template's project list, so on their
  // own they cannot catch a template that renders the sections in a
  // different order from the one the entry was written in. Reordering the
  // entry itself moves both, so that is caught by the page's own stated
  // order instead.
  const headings = contentHeadings(page.slug);
  if (headings === null) {
    note(`${page.path}: its content entry could not be read, so the project order could not be checked against it`);
  } else if (headings.length !== measured.projects.length) {
    note(`${page.path}: the content entry names ${headings.length} project headings, but the page renders ${measured.projects.length} project sections`);
  } else {
    const titles = measured.projects.map((p) => p.title);
    if (titles.join('|') !== headings.join('|')) {
      note(`${page.path}: the projects are rendered in the order ${titles.join(', ')}, but the content entry writes them as ${headings.join(', ')}`);
    }
  }

  // The table of contents numbers its entries from one, in order.
  const numbers = measured.tocNumbers;
  if (numbers.length > 0) {
    const wanted = numbers.map((_, i) => String(i + 1).padStart(2, '0'));
    if (numbers.join('|') !== wanted.join('|')) {
      note(`${page.path}: the table of contents numbers its projects ${numbers.join(', ')}, expected ${wanted.join(', ')}`);
    }
  }

  return { path: page.path, projects: measured.projects, tocOrder: measured.tocOrder, ok: true };
}

// The Alpha Kappa Psi work page, at one width in one theme.
//
// The page has to carry its intro before the first project, both demos with
// their sample-data chrome, and no horizontal scroll. The two demos are
// hydrated with client:visible, so they have to be scrolled into view and
// waited on before they can be driven.
async function checkAkpsiWidth(cdp, width, url, theme) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height: HEIGHTS[width] ?? 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp.send('Page.navigate', { url });
  await cdp.waitFor('Page.loadEventFired');
  await sleep(1200);
  await setTheme(cdp, theme);
  await sleep(100);

  const label = `${width}px ${theme}`;

  // No horizontal scroll. The document clips its own overflow, so the check
  // measures the content: nothing of the page proper may be wider than the
  // viewport.
  const overflow = await evaluate(cdp, `(() => {
    const doc = document.documentElement;
    let widest = { width: 0, tag: '' };
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('.vb') || el.closest('.orbits')) continue;
      const r = el.getBoundingClientRect();
      if (r.width > widest.width) {
        widest = { width: Math.round(r.width), tag: el.tagName + (el.className ? '.' + String(el.className).split(' ')[0] : '') };
      }
    }
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      horizontalScroll: doc.scrollWidth > doc.clientWidth,
      widest,
      viewport: doc.clientWidth,
    };
  })()`);
  if (overflow.horizontalScroll) {
    note(`horizontal scroll on the Alpha Kappa Psi page at ${label}: scrollWidth ${overflow.scrollWidth} is wider than clientWidth ${overflow.clientWidth}`);
  }
  if (overflow.widest.width > overflow.viewport + 1) {
    note(`horizontal overflow on the Alpha Kappa Psi page at ${label}: the widest element (${overflow.widest.tag}) is ${overflow.widest.width}px wide in a ${overflow.viewport}px viewport`);
  }

  // The intro: the three paragraphs, ahead of the first project.
  const intro = await evaluate(cdp, AKPSI_INTRO_MEASUREMENT);
  if (!intro.present) {
    note(`the Alpha Kappa Psi page at ${label} has no intro or no first project, so the intro could not be measured`);
  } else {
    for (const f of intro.found) {
      if (!f.found) {
        note(`the Alpha Kappa Psi page at ${label} does not publish the intro paragraph "${f.needle}" ahead of the first project`);
      }
    }
    if (intro.introParas.length === 0) {
      note(`the Alpha Kappa Psi page at ${label} publishes no paragraph ahead of the first project, so the page intro was dropped`);
    }
  }

  // Both demos, with their sample-data chrome.
  const demos = await evaluate(cdp, AKPSI_DEMO_MEASUREMENT);
  for (const demo of demos.demos) {
    if (!demo.present) {
      note(`the "${demo.label}" demo is missing from the Alpha Kappa Psi page at ${label}`);
      continue;
    }
    if (demo.role !== 'group') {
      note(`the "${demo.label}" demo at ${label} has role "${demo.role}", expected "group"`);
    }
    if (demo.ariaLabel !== demo.label) {
      note(`the "${demo.label}" demo at ${label} has aria-label "${demo.ariaLabel}", expected "${demo.label}"`);
    }
    if (!demo.badge || !demo.badgeOn) {
      note(`the "${demo.label}" demo at ${label} has no visible "sample data" badge`);
    }
    if (demo.width > overflow.viewport + 1) {
      note(`the "${demo.label}" demo at ${label} is ${demo.width}px wide in a ${overflow.viewport}px viewport`);
    }
  }

  // The demos are hydrated with client:visible, so they only run once they
  // come into view. Scroll each into view and wait for the island to drop its
  // `ssr` attribute.
  const hydration = await evaluate(cdp, `(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const out = {};
    for (const sel of ['.intake', '.listings']) {
      const el = document.querySelector(sel);
      if (!el) { out[sel] = null; continue; }
      const prev = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      document.documentElement.style.scrollBehavior = prev;
      const island = el.closest('astro-island');
      // The island drops the ssr attribute once the hydration has run. A demo
      // that never hydrates would leave the attribute on forever.
      let hydrated = false;
      let waited = 0;
      for (let i = 0; i < 60 && !hydrated; i += 1) {
        await sleep(100);
        waited = (i + 1) * 100;
        hydrated = !island?.hasAttribute('ssr');
      }
      out[sel] = { hydrated, waitedMs: waited };
    }
    return out;
  })()`);
  for (const sel of ['.intake', '.listings']) {
    if (!hydration[sel]) {
      note(`the ${sel} demo is missing from the Alpha Kappa Psi page at ${label}`);
    } else if (!hydration[sel].hydrated) {
      note(`the ${sel} demo on the Alpha Kappa Psi page at ${label} never hydrated after being scrolled into view`);
    }
  }

  // The intake demo, driven the way a person drives it.
  const intake = await evaluate(cdp, INTAKE_MEASUREMENT);
  if (!intake.present) {
    note(`the intake demo is missing from the Alpha Kappa Psi page at ${label}, so its pipeline could not be measured`);
  } else {
    // Applicant C: the second press lands on the knowledge-base stage and
    // flags the email for a person instead of answering it.
    const c = intake.out['Applicant C'];
    if (!c?.ok) {
      note(`the intake demo at ${label} could not be driven for Applicant C: ${c?.reason ?? 'the walk did not run'}`);
    } else {
      if (c.stage !== 'Answer from the knowledge base') {
        note(`Applicant C in the intake demo at ${label} stopped on the "${c.stage ?? 'no stage'}" stage, expected the knowledge-base stage`);
      }
      const answer = c.results.find((r) => r.key === 'Answer');
      if (!answer) {
        note(`Applicant C in the intake demo at ${label} produced no Answer row, expected one flagging the email for a person`);
      } else if (!answer.flagged) {
        note(`Applicant C in the intake demo at ${label} answered "${answer.value}" instead of flagging the email for a person`);
      }
    }

    // Applicant D: the pipeline stops at the attachment stage and names the
    // unreadable file.
    const d = intake.out['Applicant D'];
    if (!d?.ok) {
      note(`the intake demo at ${label} could not be driven for Applicant D: ${d?.reason ?? 'the walk did not run'}`);
    } else {
      if (d.stage !== 'Validate attachments') {
        note(`Applicant D in the intake demo at ${label} stopped on the "${d.stage ?? 'no stage'}" stage, expected the attachment-validation stage`);
      }
      const attachments = d.results.find((r) => r.key === 'Attachments');
      if (!attachments) {
        note(`Applicant D in the intake demo at ${label} produced no Attachments row, expected one naming transcript-d.txt`);
      } else if (!attachments.value.includes('transcript-d.txt')) {
        note(`Applicant D in the intake demo at ${label} stopped with "${attachments.value}", expected it to name transcript-d.txt`);
      }
    }

    // Applicant E: the pipeline reaches the schedule stage and proposes no
    // slot, because the availability names no day and no time.
    const e = intake.out['Applicant E'];
    if (!e?.ok) {
      note(`the intake demo at ${label} could not be driven for Applicant E: ${e?.reason ?? 'the walk did not run'}`);
    } else {
      if (e.stage !== 'Propose interview slots') {
        note(`Applicant E in the intake demo at ${label} stopped on the "${e.stage ?? 'no stage'}" stage, expected the schedule stage`);
      }
      const slots = e.results.find((r) => r.key === 'Slots');
      if (!slots) {
        note(`Applicant E in the intake demo at ${label} produced no Slots row, expected one saying no slot was proposed`);
      } else {
        // The availability names no day and no time, so a slot line that names
        // one is an invented slot.
        const named = /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b|\d{1,2}:\d{2}/.test(slots.value);
        if (named) {
          note(`Applicant E in the intake demo at ${label} proposed the slot "${slots.value}", but the availability names no day or time, so no slot may be invented`);
        }
      }
    }
  }

  // The listings demo, driven the same way.
  const listings = await evaluate(cdp, LISTINGS_MEASUREMENT);
  if (!listings.present) {
    note(`the listings demo is missing from the Alpha Kappa Psi page at ${label}, so its feed could not be measured`);
  } else if (!listings.ok) {
    note(`the listings demo at ${label} could not be driven: ${listings.reason}`);
  } else {
    // The referral chip narrows the feed to the two referral listings.
    if (listings.referralPressed !== 'true') {
      note(`the referral chip at ${label} is not pressed after it was clicked`);
    }
    if (listings.filtered.length !== 2) {
      note(`the referral filter at ${label} left ${listings.filtered.length} listings in the feed, expected exactly the 2 referral listings`);
    }
    if (listings.filteredSources.some((s) => s !== 'referral')) {
      note(`the referral filter at ${label} left a non-referral listing in the feed: ${listings.filteredSources.join(', ')}`);
    }
    // Posting a listing puts exactly one entry in the channel; posting it
    // again leaves the channel with one entry.
    if (listings.channelAfterOne.length !== 1) {
      note(`posting a listing at ${label} left ${listings.channelAfterOne.length} entries in the channel, expected exactly 1`);
    }
    if (listings.channelAfterTwo.length !== 1) {
      note(`posting the same listing again at ${label} left ${listings.channelAfterTwo.length} entries in the channel, expected exactly 1 (no duplicate)`);
    }
  }

  // The demos' text has to be readable: AA for body text is 4.5:1. This runs
  // after the demos have been driven, so the result rows and the channel
  // messages are on the page to be measured.
  const contrast = await evaluate(cdp, AKPSI_CONTRAST_MEASUREMENT);
  for (const sample of contrast.samples) {
    if (!sample.present) {
      note(`${sample.name} is missing from the Alpha Kappa Psi page at ${label}`);
    } else if (!sample.measurable) {
      note(`${sample.name} on the Alpha Kappa Psi page at ${label} has no opaque background to measure its contrast against`);
    } else if (sample.ratio < 4.5) {
      note(`${sample.name} on the Alpha Kappa Psi page at ${label} has a contrast of ${sample.ratio}:1 (${sample.fg} on ${sample.bg}), below the AA minimum of 4.5:1`);
    }
  }

  // The demos do not move on their own.
  const motion = await evaluate(cdp, AKPSI_MOTION_MEASUREMENT);
  for (const demo of motion.demos) {
    if (!demo.present) continue;
    if (demo.moving.length > 0) {
      note(`the ${demo.sel} demo on the Alpha Kappa Psi page at ${label} moves on its own: ${demo.moving.map((m) => `${m.tag} (${m.animation ?? m.transition})`).join(', ')}`);
    }
  }

  return {
    width,
    theme,
    overflow,
    intro,
    demos,
    contrast,
    motion,
    hydration,
    intake,
    listings,
  };
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
  // The Alpha Kappa Psi page is checked by name, so a build without it is a
  // failure rather than a page that is quietly never looked at.
  const akpsiBuilt = path.join(distDir, 'work', 'akpsi', 'index.html');
  if (!fs.existsSync(akpsiBuilt)) {
    console.error(`FAIL: there is no built Alpha Kappa Psi page at ${akpsiBuilt}. Run "npm run build" first.`);
    return 1;
  }
  // The same for every multi-project page: the per-project demo rule is only
  // worth anything if it is run against a page that exists.
  for (const page of MULTI_PAGES) {
    const built = path.join(distDir, page.path, 'index.html');
    if (!fs.existsSync(built)) {
      console.error(`FAIL: there is no built page at ${built}. Run "npm run build" first.`);
      return 1;
    }
  }

  const { server, port } = await serve(distDir);
  const url = `http://127.0.0.1:${port}/`;
  const akpsiUrl = `http://127.0.0.1:${port}${AKPSI_PATH}`;
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
  const akpsiResults = [];
  const multiResults = [];
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
      // The home page's Experience list carries the Alpha Kappa Psi entry with
      // its "now" tag and its logo. The logo is the "AK" wordmark, so a
      // naturalWidth of zero means the image never loaded.
      const home = await evaluate(cdp, HOME_AKPSI_MEASUREMENT);
      if (!home.present) {
        note(`the home page has no Alpha Kappa Psi entry in the Experience list at ${width}px`);
      } else {
        if (!home.now || home.nowText !== 'now') {
          note(`the Alpha Kappa Psi entry in the Experience list at ${width}px carries no "now" tag`);
        }
        if (!home.logo) {
          note(`the Alpha Kappa Psi entry in the Experience list at ${width}px has no logo image`);
        } else if (!home.logo.complete || home.logo.naturalWidth === 0) {
          note(`the Alpha Kappa Psi logo (${home.logo.src}) did not load at ${width}px: its naturalWidth is ${home.logo.naturalWidth}`);
        }
      }
      console.log(
        `${String(width).padStart(4)}px  nav rows ${result.rows}  ` +
        `map ${result.map.present ? `${result.map.width}x${result.map.height}, ${result.map.dots} dots` : 'MISSING'}  ` +
        `lit on open ${result.lighting.changed ?? 0}  ` +
        `travel opacity ${result.blocks['.travel']?.opacity ?? 'n/a'}  food opacity ${result.blocks['.food']?.opacity ?? 'n/a'}  ` +
        `captions ${result.captions.figures} (${result.captions.clipped.length} clipped)  ` +
        `akpsi ${home.present ? (home.now ? 'now' : 'NO now') : 'MISSING'}  logo ${home.logo?.naturalWidth ?? 'n/a'}px`,
      );
    }

    // Every multi-project work page: each project section holds the demo its
    // own heading id maps to, and the sections are in the order the page's
    // table of contents states.
    for (const page of MULTI_PAGES) {
      const result = await checkMultiPage(cdp, `http://127.0.0.1:${port}${page.path}`, page);
      multiResults.push(result);
      console.log(
        `${page.path.padEnd(18)}  ` +
        `projects ${result.ok ? result.projects.length : 'MISSING'}  ` +
        `order ${result.ok ? result.tocOrder.join(' → ') : 'n/a'}  ` +
        `demos ${result.ok ? result.projects.map((p) => `${p.id}:${p.demos.join('+') || 'NONE'}`).join('  ') : 'n/a'}`,
      );
    }

    // The Alpha Kappa Psi work page, at every width in both themes.
    for (const theme of THEMES) {
      for (const width of WIDTHS) {
        const result = await checkAkpsiWidth(cdp, width, akpsiUrl, theme);
        akpsiResults.push(result);
        const demo = (label) => result.demos.demos.find((d) => d.label === label);
        const intake = demo('Sample membership intake pipeline');
        const listings = demo('Sample opportunity listings feed');
        console.log(
          `${String(width).padStart(4)}px ${theme.padEnd(5)}  ` +
          `intro ${result.intro.present ? (result.intro.beforeFirstProject ? 'published' : 'OUT OF ORDER') : 'MISSING'}  ` +
          `demos ${intake?.present ? 'intake' : 'MISSING'}/${listings?.present ? 'listings' : 'MISSING'}  ` +
          `hydrated ${result.hydration['.intake']?.hydrated ? 'yes' : 'NO'}/${result.hydration['.listings']?.hydrated ? 'yes' : 'NO'}  ` +
          `C ${result.intake.present ? (result.intake.out['Applicant C']?.results?.find((r) => r.key === 'Answer')?.flagged ? 'flagged' : 'NOT FLAGGED') : 'n/a'}  ` +
          `D ${result.intake.present ? (result.intake.out['Applicant D']?.results?.find((r) => r.key === 'Attachments')?.value?.includes('transcript-d.txt') ? 'transcript-d.txt' : 'NOT NAMED') : 'n/a'}  ` +
          `E ${result.intake.present ? (result.intake.out['Applicant E']?.results?.find((r) => r.key === 'Slots') ? 'slots row' : 'NO slots row') : 'n/a'}  ` +
          `referral ${result.listings.present && result.listings.ok ? result.listings.filtered.length : 'n/a'}  ` +
          `channel ${result.listings.present && result.listings.ok ? `${result.listings.channelAfterOne.length}->${result.listings.channelAfterTwo.length}` : 'n/a'}  ` +
          `contrast ${Math.min(...result.contrast.samples.filter((s) => s.measurable).map((s) => s.ratio)).toFixed(2)}:1  ` +
          `overflow ${result.overflow.widest.width}px`,
        );
      }
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
  console.log(
    `browser-check: ok (${results.length} widths, ${WIDTHS.join(', ')} px; ` +
    `${multiResults.length} project pages; ` +
    `akpsi ${akpsiResults.length} checks, ${THEMES.join(' and ')})`,
  );
  return 0;
}

process.exit(await main());
