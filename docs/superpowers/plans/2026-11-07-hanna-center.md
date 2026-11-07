# Hanna Center Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (the user asked for inline execution in this session) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Turn `/work/hanna` into a three-project page (Grants Agent, IR Updater Bot, Case Note Coach), each with a tested logic module, an app-style interactive demo window over fictional data, a generic SVG architecture diagram, and sourced Impact facts.

**Architecture:** Same pattern as the Blue Dome page. Logic lives in pure, unit-tested TS modules under `src/components/hanna/<project>/`; React islands (`client:visible`) render app-style windows reusing `src/components/qa/qa.css` shell classes; `src/pages/work/[slug].astro` splits the rendered markdown at `##` headings and mounts each demo after its project's intro paragraph. Content lives in `src/content/work/hanna.md`.

**Tech Stack:** Astro 7, React 19 islands, Vitest 4, plain CSS tokens. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-07-hanna-center-design.md`

## Global Constraints

- No new dependencies. Do not change the `build` script, `vercel.json` or the content gate semantics.
- All demo data fictional: no real names, orgs, clients, students, payers or accounts. No AWS identifiers, function names, emails, staff names or security weak spots on the page.
- No estimated numbers. Only facts from the author's docs: Grants Agent 39 sources, 7 flags, 6 search profiles, sheet shows 5.0+, email shows 6.0+, about $16 to $19 a month to run; IR Updater 5 form steps, submit in 1 to 3 seconds, about $1 to $2 a month, 54-check smoke test (53 passing), 22 documented failure scenarios; Case Note Coach 3 tiers, 8 hard-fail rules, 15 knowledge-base files, 259 ICD-10 codes, 114 intervention terms, 15 to 20 minute rebuild; shared $30k+ avoided (resume).
- Never write the literal to-confirm marker into tests; build it from parts if needed. Page text may contain it only for genuinely unconfirmed claims.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`, authored with `git -c user.name="Andrian Than" -c user.email="andrian.than.api@gmail.com" commit`.
- Work on branch `feat/bluedome-demo`. No push, merge or deploy without explicit approval in chat.
- Page must keep `cleared: false` until the author confirms; run `npm test` and `npm run build` (must end `check-build: ok`) before each commit.

## File Structure

- `src/components/hanna/grants/catalog.ts`: fictional grants and the seven stand-in flag definitions.
- `src/components/hanna/grants/score.ts`: `scoreGrant`, `visibleAt`, `DEFAULT_CRITERIA`.
- `src/components/hanna/grants/criteria.ts`: command parser, preview/apply/undo with expiring tokens.
- `src/components/hanna/grants/GrantsDemo.tsx` + `grants.css`: window with four tabs.
- `src/components/hanna/ir/picklists.ts`, `form.ts`, `record.ts`: fictional picklists, form state machine, payload, record status.
- `src/components/hanna/ir/IrDemo.tsx` + `ir.css`: Teams-style chat window.
- `src/components/hanna/notes/tiers.ts`: eight hard-fail rules plus Tier 2 suggestions.
- `src/components/hanna/notes/kb.ts`, `builder.ts`: fictional standards passages, D/I/P note builder.
- `src/components/hanna/notes/NoteCoachDemo.tsx` + `notes.css`: chat window.
- Modify `src/components/guide/retrieve.ts`: let `answer()` take an optional corpus label.
- Modify `src/pages/work/[slug].astro`: add `hanna` to `MULTI`, mount the three demos.
- Modify `src/content/work/hanna.md`: three project sections with diagrams.

---

### Task 1: Grants scoring

**Files:** Create `catalog.ts`, `score.ts`; Test `src/components/hanna/grants/grants.test.ts`

**Interfaces:**
- Produces: `FLAGS: { id: FlagId; label: string }[]` (7 entries), `GRANTS: Grant[]` (12 fictional), `DEFAULT_CRITERIA: Criteria`, `scoreGrant(g: Grant, c: Criteria): Scored`, `visibleAt(scored: Scored[], threshold: number): Scored[]`.
- Types: `FlagId = 'mission'|'geography'|'effort'|'reporting'|'deadline'|'eligibility'|'relationship'`; `Criteria = { weights: Record<FlagId, number>; sheetThreshold: number; emailThreshold: number }`; `Scored = { grant: Grant; score: number; flags: { id: FlagId; label: string; value: number; reason: string }[] }`.

- [ ] **Step 1: Write the failing test** `grants.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { GRANTS, FLAGS, DEFAULT_CRITERIA } from './catalog';
import { scoreGrant, visibleAt } from './score';

describe('grant scoring', () => {
  it('has seven flags and a fixed fictional catalog', () => {
    expect(FLAGS).toHaveLength(7);
    expect(GRANTS.length).toBe(12);
    expect(new Set(GRANTS.map((g) => g.id)).size).toBe(12);
  });
  it('defaults match the documented cutoffs', () => {
    expect(DEFAULT_CRITERIA.sheetThreshold).toBe(5.0);
    expect(DEFAULT_CRITERIA.emailThreshold).toBe(6.0);
  });
  it('every flag returns a value in 0..1 with a reason', () => {
    const s = scoreGrant(GRANTS[0], DEFAULT_CRITERIA);
    expect(s.flags).toHaveLength(7);
    for (const f of s.flags) { expect(f.value).toBeGreaterThanOrEqual(0); expect(f.value).toBeLessThanOrEqual(1); expect(f.reason.length).toBeGreaterThan(5); }
  });
  it('score is 0..10 with one decimal', () => {
    for (const g of GRANTS) { const s = scoreGrant(g, DEFAULT_CRITERIA); expect(s.score).toBeGreaterThanOrEqual(0); expect(s.score).toBeLessThanOrEqual(10); expect(Math.round(s.score * 10) / 10).toBe(s.score); }
  });
  it('an ineligible grant scores below an equivalent eligible one', () => {
    const a = GRANTS.find((g) => g.eligible)!;
    const b = { ...a, id: 'x', eligible: false };
    expect(scoreGrant(b, DEFAULT_CRITERIA).score).toBeLessThan(scoreGrant(a, DEFAULT_CRITERIA).score);
  });
  it('heavier reporting burden lowers the score', () => {
    const a = { ...GRANTS[0], reporting: 'light' as const }; const b = { ...a, reporting: 'heavy' as const };
    expect(scoreGrant(b, DEFAULT_CRITERIA).score).toBeLessThan(scoreGrant(a, DEFAULT_CRITERIA).score);
  });
  it('raising a flag weight changes the score of a grant that is strong on it', () => {
    const g = GRANTS.find((x) => x.mission.length >= 2)!;
    const base = scoreGrant(g, DEFAULT_CRITERIA).score;
    const w = { ...DEFAULT_CRITERIA, weights: { ...DEFAULT_CRITERIA.weights, mission: DEFAULT_CRITERIA.weights.mission * 4 } };
    expect(scoreGrant(g, w).score).not.toBe(base);
  });
  it('visibleAt keeps only scores at or above the threshold, sorted high to low', () => {
    const all = GRANTS.map((g) => scoreGrant(g, DEFAULT_CRITERIA));
    const v = visibleAt(all, 6.0);
    expect(v.every((s) => s.score >= 6.0)).toBe(true);
    for (let i = 1; i < v.length; i++) expect(v[i - 1].score).toBeGreaterThanOrEqual(v[i].score);
  });
  it('the catalog straddles both thresholds so the slider has something to show', () => {
    const all = GRANTS.map((g) => scoreGrant(g, DEFAULT_CRITERIA).score);
    expect(all.some((s) => s < DEFAULT_CRITERIA.sheetThreshold)).toBe(true);
    expect(all.some((s) => s >= DEFAULT_CRITERIA.sheetThreshold && s < DEFAULT_CRITERIA.emailThreshold)).toBe(true);
    expect(all.some((s) => s >= DEFAULT_CRITERIA.emailThreshold)).toBe(true);
  });
  it('is deterministic', () => {
    expect(scoreGrant(GRANTS[3], DEFAULT_CRITERIA)).toEqual(scoreGrant(GRANTS[3], DEFAULT_CRITERIA));
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/components/hanna/grants` and confirm it fails (modules missing).
- [ ] **Step 3: Implement.** `Grant = { id; title; funder; amount: number; deadlineDays: number; geography: 'local'|'state'|'federal'; mission: string[]; reporting: 'light'|'medium'|'heavy'; staffHours: number; relationship: 'known'|'new'; eligible: boolean }`. Each flag maps the grant to 0..1 with a one-sentence reason (mission: tags matching a fixed list of on-mission tags; geography: local 1, state .7, federal .4; effort: award per staff hour; reporting: light 1, medium .6, heavy .2; deadline: too-soon or long gives lower, workable window highest; eligibility: 1 or 0; relationship: known 1, new .4). Score = `10 * Σ(weight_i * value_i) / Σ weight_i`, rounded to one decimal. `DEFAULT_CRITERIA` weights are integers 1 to 3. Author 12 fictional grants (funder names like "Sample Community Fund", no real funders) so the test of straddling both thresholds passes; adjust catalog values, not the thresholds, if it fails.
- [ ] **Step 4: Run** the test file; expect all pass.
- [ ] **Step 5: Commit** `feat: grants scoring logic (7 stand-in flags, thresholds)`.

---

### Task 2: Grants criteria editor (preview, apply, undo)

**Files:** Create `criteria.ts`; Test `criteria.test.ts` in the same folder.

**Interfaces:**
- Consumes: `Criteria`, `FlagId`, `FLAGS` from Task 1.
- Produces: `parseCommand(text): Command | null`; `type Command = { kind: 'threshold'; which: 'sheet'|'email'; value: number } | { kind: 'weight'; flag: FlagId; value: number } | { kind: 'undo' }`; `type EditorState = { criteria: Criteria; pending: Record<string, Pending>; history: Criteria[]; counter: number }`; `initEditor(c: Criteria): EditorState`; `preview(s: EditorState, cmd: Command, nowMs: number): { state: EditorState; result: { ok: true; token: string; diff: string; expiresAtMs: number } | { ok: false; error: string } }`; `apply(s: EditorState, token: string, nowMs: number): { state: EditorState; ok: boolean; message: string }`; `undo(s: EditorState): { state: EditorState; ok: boolean; message: string }`; `TOKEN_TTL_MS = 15 * 60 * 1000`.

- [ ] **Step 1: Write the failing test** `criteria.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_CRITERIA } from './catalog';
import { parseCommand, initEditor, preview, apply, undo, TOKEN_TTL_MS } from './criteria';

describe('parseCommand', () => {
  it('parses threshold changes', () => {
    expect(parseCommand('raise the score threshold to 7')).toEqual({ kind: 'threshold', which: 'email', value: 7 });
    expect(parseCommand('set the sheet threshold to 4.5')).toEqual({ kind: 'threshold', which: 'sheet', value: 4.5 });
  });
  it('parses weight changes by flag label', () => {
    expect(parseCommand('set reporting burden weight to 3')).toEqual({ kind: 'weight', flag: 'reporting', value: 3 });
  });
  it('parses undo and rejects nonsense', () => {
    expect(parseCommand('undo')).toEqual({ kind: 'undo' });
    expect(parseCommand('make it sparkle')).toBeNull();
  });
});

describe('two-phase editor', () => {
  const t0 = 1_000_000;
  it('preview changes nothing until apply', () => {
    const s0 = initEditor(DEFAULT_CRITERIA);
    const { state, result } = preview(s0, { kind: 'threshold', which: 'email', value: 7 }, t0);
    expect(result.ok).toBe(true);
    expect(state.criteria.emailThreshold).toBe(6);
  });
  it('apply with the token changes the value and records history', () => {
    const p = preview(initEditor(DEFAULT_CRITERIA), { kind: 'threshold', which: 'email', value: 7 }, t0);
    if (!p.result.ok) throw new Error('x');
    const a = apply(p.state, p.result.token, t0 + 1000);
    expect(a.ok).toBe(true);
    expect(a.state.criteria.emailThreshold).toBe(7);
    expect(a.state.history).toHaveLength(1);
  });
  it('a token is single-use', () => {
    const p = preview(initEditor(DEFAULT_CRITERIA), { kind: 'threshold', which: 'email', value: 7 }, t0);
    if (!p.result.ok) throw new Error('x');
    const a = apply(p.state, p.result.token, t0);
    expect(apply(a.state, p.result.token, t0).ok).toBe(false);
  });
  it('an expired token is rejected', () => {
    const p = preview(initEditor(DEFAULT_CRITERIA), { kind: 'threshold', which: 'email', value: 7 }, t0);
    if (!p.result.ok) throw new Error('x');
    expect(apply(p.state, p.result.token, t0 + TOKEN_TTL_MS + 1).ok).toBe(false);
  });
  it('an unknown token is rejected', () => {
    expect(apply(initEditor(DEFAULT_CRITERIA), 'nope', t0).ok).toBe(false);
  });
  it('undo restores the previous criteria', () => {
    const p = preview(initEditor(DEFAULT_CRITERIA), { kind: 'threshold', which: 'email', value: 7 }, t0);
    if (!p.result.ok) throw new Error('x');
    const a = apply(p.state, p.result.token, t0);
    const u = undo(a.state);
    expect(u.ok).toBe(true);
    expect(u.state.criteria.emailThreshold).toBe(6);
  });
  it('undo with no history is a no-op', () => {
    expect(undo(initEditor(DEFAULT_CRITERIA)).ok).toBe(false);
  });
  it('rejects out-of-range values', () => {
    expect(preview(initEditor(DEFAULT_CRITERIA), { kind: 'threshold', which: 'email', value: 12 }, t0).result.ok).toBe(false);
    expect(preview(initEditor(DEFAULT_CRITERIA), { kind: 'weight', flag: 'mission', value: 99 }, t0).result.ok).toBe(false);
  });
  it('diff text names what changes', () => {
    const p = preview(initEditor(DEFAULT_CRITERIA), { kind: 'threshold', which: 'email', value: 7 }, t0);
    if (!p.result.ok) throw new Error('x');
    expect(p.result.diff).toContain('6');
    expect(p.result.diff).toContain('7');
  });
});
```

- [ ] **Step 2: Run** and confirm failure.
- [ ] **Step 3: Implement.** Parser: lowercase, regexes for "threshold to N" (default `which` is `email` unless the text contains "sheet"), "<flag label or id> weight to N" matched against `FLAGS` labels, and exact "undo". Whitelist: thresholds 0..10, weights 0..5 integers. `preview` stores a pending entry `{cmd, before, after, expiresAtMs}` under token `t${counter}`; `apply` checks existence and expiry, pushes `before` onto history, sets `criteria = after`, deletes the token. `undo` pops history.
- [ ] **Step 4: Run** the test; all pass.
- [ ] **Step 5: Commit** `feat: grants criteria editor (preview, apply, undo, expiring tokens)`.

---

### Task 3: Grants demo window and diagram

**Files:** Create `GrantsDemo.tsx`, `grants.css`; Modify `src/pages/work/[slug].astro` (add `hanna` to `MULTI`, import and mount), `src/content/work/hanna.md`.

**Interfaces:** Consumes Tasks 1 and 2. Produces default export `GrantsDemo` (no props).

- [ ] **Step 1: Build the window** reusing `src/components/qa/qa.css` shell (`.qa`, `.qa-top`, `.qa-tabs`, `.qa-body`, `.qa-foot`). Tabs: **Grants** (list sorted by score, each row shows title, funder, amount, score, and an expandable list of the seven flags with their reasons, only those at or above the sheet threshold), **Digest** (rows at or above the email threshold, formatted as an email preview), **Tracker** (rows at or above the sheet threshold with Approve and Skip buttons holding local state), **Edit criteria** (an input plus Preview, Apply, Undo; shows the diff and token expiry from Task 2, and the other tabs re-score live). A threshold slider in the footer edits the live sheet threshold for exploration only; the editor changes the real criteria.
- [ ] **Step 2: Add the diagram** to `hanna.md` as inline SVG using the same pattern as `bluedome.md`: scheduler, workflow, scraper per source, processing (filter, extract, embed, dedupe), database with vectors, evaluator (retrieve candidates, cheap pre-filter, stronger scorer), sheet and email; criteria document and editor (two-phase commit) below.
- [ ] **Step 3: Write the section**: Problem, What it does, Architecture, Key decisions, Impact (facts from Global Constraints plus the $30k+ note), About the demo (stand-in flags, fictional grants, deterministic scorer).
- [ ] **Step 4: Verify** with `npm test`, `npm run build`, then the dev server with `cleared: true` temporarily: scroll to the window, switch tabs, apply an edit and undo it. Restore `cleared: false`.
- [ ] **Step 5: Commit** `feat: Grants Agent window, diagram and section`.

---

### Task 4: IR form, picklists and record logic

**Files:** Create `picklists.ts`, `form.ts`, `record.ts`; Test `ir.test.ts` in `src/components/hanna/ir/`.

**Interfaces:**
- Produces: `TYPES: Record<string, string[]>` (type to sub-types), `SEVERITIES: string[]`, `YOUTH: string[]` and `STAFF: string[]` (fictional); `nullifyInvalid(type: string, sub: string): string`; `type FormData = { occurredAt: string; type: string; subType: string; severity: string; staff: string; narrative: string; resolution: string; flags: string[]; youth: string[] }`; `type Form = { step: 1|2|3|4|5|6; data: FormData }`; `initForm(): Form`; `setField(f: Form, patch: Partial<FormData>): Form`; `validateStep(step: 1|2|3|4|5, d: FormData): string[]`; `next(f: Form): Form` (blocks on validation errors); `back(f: Form): Form` (keeps entered data); `edit(f: Form, step: 1|2|3|4|5): Form`; `buildPayload(d: FormData): Payload`; `type Payload = { incident: { status: 'Draft'; type: string; subType: string; severity: string; occurredAt: string; staff: string; narrative: string; resolution: string; flags: string[] }; youthRecords: { youth: string }[] }`; `type RecordState = { id: string; payload: Payload; status: 'Draft'|'Approved' }`; `createRecord(p: Payload, n: number): RecordState`; `approve(r: RecordState): RecordState`.

- [ ] **Step 1: Write the failing test** `ir.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { TYPES, nullifyInvalid, initForm, setField, validateStep, next, back, edit, buildPayload, createRecord, approve } from './index';

const filled = () => {
  let f = initForm();
  f = setField(f, { occurredAt: '2026-03-02T14:30', type: 'Behavioral', subType: 'Verbal outburst', severity: 'Medium', staff: 'Staff 1', narrative: 'Youth A raised their voice during group time.', resolution: 'Staff 1 de-escalated and the group resumed.', flags: [], youth: ['Youth A'] });
  return f;
};

describe('dependent picklists', () => {
  it('keeps a valid sub-type', () => { expect(nullifyInvalid('Behavioral', 'Verbal outburst')).toBe('Verbal outburst'); });
  it('drops a sub-type that does not belong to the type', () => { expect(nullifyInvalid('Medical', 'Verbal outburst')).toBe(''); });
  it('every type has at least two sub-types', () => { for (const subs of Object.values(TYPES)) expect(subs.length).toBeGreaterThanOrEqual(2); });
  it('changing the type clears an invalid sub-type', () => {
    const f = setField(filled(), { type: 'Medical' });
    expect(f.data.subType).toBe('');
  });
});

describe('form steps', () => {
  it('starts on step 1 with nothing filled', () => { const f = initForm(); expect(f.step).toBe(1); expect(validateStep(1, f.data).length).toBeGreaterThan(0); });
  it('next is blocked until the step validates', () => { const f = next(initForm()); expect(f.step).toBe(1); });
  it('walks the five steps then reaches review', () => {
    let f = filled();
    for (let i = 0; i < 5; i++) f = next(f);
    expect(f.step).toBe(6);
  });
  it('back keeps entered data', () => {
    let f = next(filled()); f = back(f);
    expect(f.step).toBe(1);
    expect(f.data.narrative).toContain('Youth A');
  });
  it('edit jumps to a step from review', () => {
    let f = filled(); for (let i = 0; i < 5; i++) f = next(f);
    expect(edit(f, 3).step).toBe(3);
  });
  it('requires at least one youth and a narrative', () => {
    const f = setField(filled(), { youth: [], narrative: '' });
    expect(validateStep(3, f.data).join(' ')).toMatch(/narrative/i);
    expect(validateStep(1, f.data).join(' ')).toMatch(/youth/i);
  });
});

describe('payload and record', () => {
  it('always builds a Draft incident plus one linked record per youth', () => {
    const d = setField(filled(), { youth: ['Youth A', 'Youth B'] }).data;
    const p = buildPayload(d);
    expect(p.incident.status).toBe('Draft');
    expect(p.youthRecords).toHaveLength(2);
  });
  it('payload drops an invalid sub-type', () => {
    const d = { ...filled().data, type: 'Safety', subType: 'Verbal outburst' };
    expect(buildPayload(d).incident.subType).toBe('');
  });
  it('a supervisor can approve a Draft once', () => {
    const r = createRecord(buildPayload(filled().data), 1);
    expect(r.status).toBe('Draft');
    const a = approve(r);
    expect(a.status).toBe('Approved');
    expect(approve(a)).toEqual(a);
  });
});
```

(Tests import from `./index`; create `index.ts` re-exporting the three modules.)

- [ ] **Step 2: Run** and confirm failure.
- [ ] **Step 3: Implement.** Steps: 1 who and when (occurredAt, youth, at least one), 2 type and severity (type, subType valid for type, severity), 3 staff and narrative (staff, narrative non-empty), 4 resolution (resolution non-empty), 5 flags (any, optional). Step 6 is review. `setField` runs `nullifyInvalid` whenever `type` changes. `createRecord` id is `INC-${String(n).padStart(4,'0')}`.
- [ ] **Step 4: Run** test; all pass.
- [ ] **Step 5: Commit** `feat: IR form state machine, dependent picklists and Draft record logic`.

---

### Task 5: IR demo window and diagram

**Files:** Create `IrDemo.tsx`, `ir.css`; Modify `[slug].astro`, `hanna.md`.

- [ ] **Step 1: Build the window** as a Teams-style chat (`.qa` shell): a message list with a bot greeting, an input that recognizes `/ir`, Adaptive-Card-style step cards rendered in the conversation (dropdowns for type, sub-type filtered by type, severity, staff and youth from the fictional lists; text areas for narrative and resolution; checkboxes for flags), Next and Back buttons wired to Task 4, validation errors shown inline, a review card with an Edit button per step, and Submit producing a record view card (status chip Draft, linked youth records) with a "Supervisor: approve" button.
- [ ] **Step 2: Diagram** in `hanna.md`: Teams, bot service, one serverless function, CRM API, with a note that form state travels inside the card.
- [ ] **Step 3: Section text**: Problem (staff had to log into the CRM directly), What it does, Architecture, Key decisions (single function, state in the card, Draft-only creation, hardcoded picklists with invalid-combination dropping, one-file field additions), Impact (5 steps, 1 to 3 seconds, about $1 to $2 a month, 54-check smoke test with 53 passing, 22 documented failures, plus the $30k+ shared line), About the demo.
- [ ] **Step 4: Verify** like Task 3: tests, build, browser run through `/ir` to an approved record.
- [ ] **Step 5: Commit** `feat: IR Updater Bot window, diagram and section`.

---

### Task 6: Case Note tier rules

**Files:** Create `tiers.ts`; Test `tiers.test.ts` in `src/components/hanna/notes/`.

**Interfaces:**
- Produces: `type NoteInput = { service: 'individual'|'assessment'|'collateral'|'case-management'|'family'; d: string; i: string; p: string; risk?: boolean; previousD?: string }`; `type Verdict = { tier: 1|2|3; hardFails: { id: number; label: string; fix: string }[]; suggestions: string[] }`; `evaluate(n: NoteInput): Verdict`; `HARD_FAILS: { id: number; label: string }[]` (8 entries).

The eight hard fails (from the author's handoff): 1 no diagnosis and no presenting concern; 2 no functional impairment; 3 intervention section predominantly reporting; 4 service-type mismatch; 5 identical D section copy-pasted; 6 risk disclosed without assessment, result and follow-up; 7 plan uses only pre-treatment language; 8 D-I coherence broken. Rules 5 and 8 are heuristics in the demo and the window says so.

- [ ] **Step 1: Write the failing test** `tiers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { evaluate, HARD_FAILS } from './tiers';

const good = {
  service: 'individual' as const,
  d: 'Client with generalized anxiety presents with racing thoughts and poor sleep. Called out sick twice this week and avoids calls with manager.',
  i: 'Used CBT to challenge catastrophic thinking about job performance. Client practiced thought challenging in session and was receptive.',
  p: 'Continue CBT targeting avoidance. Assign thought record homework this week.',
};

describe('tier rules', () => {
  it('has eight named hard fails', () => { expect(HARD_FAILS).toHaveLength(8); });
  it('a complete note is Tier 1', () => { const v = evaluate(good); expect(v.tier).toBe(1); expect(v.hardFails).toEqual([]); });
  it('1: no diagnosis and no concern is Tier 3', () => {
    const v = evaluate({ ...good, d: 'Client came in. Called out sick twice this week.' });
    expect(v.tier).toBe(3); expect(v.hardFails.map((f) => f.id)).toContain(1);
  });
  it('2: no functional impairment is Tier 3', () => {
    const v = evaluate({ ...good, d: 'Client with generalized anxiety presents with racing thoughts.' });
    expect(v.hardFails.map((f) => f.id)).toContain(2);
  });
  it('3: a listening-only intervention is Tier 3, a named modality rescues it', () => {
    const bad = evaluate({ ...good, i: 'Listened, validated feelings and discussed the week.' });
    expect(bad.hardFails.map((f) => f.id)).toContain(3);
    const ok = evaluate({ ...good, i: 'Used Person-Centered techniques; listened, validated and reflected feelings.' });
    expect(ok.hardFails.map((f) => f.id)).not.toContain(3);
  });
  it('4: collateral contact documented as individual psychotherapy is Tier 3', () => {
    const v = evaluate({ ...good, i: 'Spoke by phone with client\'s teacher about school accommodations using CBT language.' });
    expect(v.hardFails.map((f) => f.id)).toContain(4);
  });
  it('5: a D section identical to the previous note is Tier 3', () => {
    expect(evaluate({ ...good, previousD: good.d }).hardFails.map((f) => f.id)).toContain(5);
  });
  it('6: risk disclosed without assessment, result and follow-up is Tier 3', () => {
    const v = evaluate({ ...good, d: good.d + ' Client reported passive suicidal thoughts.', risk: true });
    expect(v.hardFails.map((f) => f.id)).toContain(6);
    const ok = evaluate({ ...good, d: good.d + ' Client reported passive suicidal thoughts.', i: good.i + ' Assessed risk, no plan or intent, safety plan reviewed.', p: good.p + ' Follow up on safety plan next session.', risk: true });
    expect(ok.hardFails.map((f) => f.id)).not.toContain(6);
  });
  it('7: a plan with only pre-treatment language is Tier 3', () => {
    expect(evaluate({ ...good, p: 'Build rapport and gather information.' }).hardFails.map((f) => f.id)).toContain(7);
  });
  it('8: an intervention that targets nothing in the D section breaks coherence', () => {
    const v = evaluate({ ...good, i: 'Used EMDR to process childhood memories of a car accident.' });
    expect(v.hardFails.map((f) => f.id)).toContain(8);
  });
  it('a vague plan or missing ICD code is only a Tier 2 suggestion', () => {
    const v = evaluate({ ...good, p: 'Continue therapy.' });
    expect(v.tier).toBe(2); expect(v.suggestions.length).toBeGreaterThan(0); expect(v.hardFails).toEqual([]);
  });
  it('every hard fail carries a concrete fix', () => {
    const v = evaluate({ ...good, d: '', i: '', p: '' });
    for (const f of v.hardFails) expect(f.fix.length).toBeGreaterThan(10);
  });
  it('is deterministic', () => { expect(evaluate(good)).toEqual(evaluate(good)); });
});
```

- [ ] **Step 2: Run** and confirm failure.
- [ ] **Step 3: Implement** with fixed keyword lists: diagnosis and concern terms (anxiety, depression, MDD, GAD, PTSD, adjustment, ICD codes like `F\d\d`), impairment terms (called out, missing work, avoiding, withdrawn, grades, sleep, self-care, outbursts), named modalities (CBT, DBT, EMDR, MI, Person-Centered, psychoeducation, grounding, cognitive restructuring, behavioral activation, play therapy), reporting verbs (listened, validated, reflected, held space, checked in, encouraged, normalized, discussed), service-type mismatch (collateral cues such as "spoke with teacher/parent/school" under `individual`), pre-treatment phrases ("build rapport", "gather information", "safe place to talk"), risk words (suicid, SI, HI, self-harm) requiring an assessment word, a result word and a follow-up word. Rule 5: normalized equality with `previousD`. Rule 8: the intervention shares no content word (after stopwords) with the D section and names a modality aimed at a different issue; document the heuristic in a code comment. Tier 2 suggestions: vague plan (fewer than five content words), no code, soft response, implied impairment.
- [ ] **Step 4: Run** test; all pass.
- [ ] **Step 5: Commit** `feat: case-note tier rules (eight hard fails, Tier 2 suggestions)`.

---

### Task 7: Case Note knowledge base, retrieval reuse and note builder

**Files:** Create `kb.ts`, `builder.ts`; Modify `src/components/guide/retrieve.ts` (optional corpus label); Test `builder.test.ts` and `kb.test.ts`.

**Interfaces:**
- Consumes: `buildIndex`, `search`, `answer` from `src/components/guide/retrieve.ts`; `evaluate` from Task 6.
- Produces: `KB: Clause[]` (fictional documentation-standards passages, about 12), `KB_LABEL = 'the sample standards'`; `parseInput(text: string): BuildInput`; `missing(i: BuildInput): string[]`; `generate(i: BuildInput): { ok: true; note: { d: string; i: string; p: string }; provenance: { sentence: string; from: string[] }[]; verdict: Verdict } | { ok: false; reason: string; missing: string[] }`.
- Change to `retrieve.ts`: `answer(index, query, mode = 'hybrid', corpus = \`guide ${GUIDE_VERSION}\`)` uses `corpus` in the refusal text. Existing guide tests must still pass.

- [ ] **Step 1: Write the failing tests.** `kb.test.ts`: the KB has 10 to 14 passages with unique ids; `answer(buildIndex(KB), 'do I need an ICD-10 code', 'hybrid', KB_LABEL)` cites the code passage; 'what counts as functional impairment' cites the impairment passage; 'what is the weather in paris' refuses and the text contains `KB_LABEL`. `builder.test.ts`: `parseInput` maps `Dx:`, `Symptoms:`, `Impairment:` and free lines starting with a modality into fields; `missing` returns every missing required element at once; `generate` returns `ok: false` with the missing list when impairment is absent; on the guide's example input it returns D, I and P strings in which every provenance sentence lists at least one input field, no sentence contains a clinical term absent from the input (anti-fabrication check: every content word in the note is in the input, a small allowed set of glue words, or in the section's fixed template words), and the resulting verdict is Tier 1 or 2, never 3.
- [ ] **Step 2: Run** and confirm failure.
- [ ] **Step 3: Implement** `KB` as fictional passages in the style of the real layers (rule statements about D/I/P sections, impairment domains, risk documentation, telehealth reminder, ICD optional), with no payer name. Implement `parseInput` (labeled lines plus keyword detection), `missing`, and `generate` using fixed sentence templates per field with provenance. Add the optional `corpus` argument to `answer()` in `retrieve.ts`.
- [ ] **Step 4: Run** `npx vitest run src/components` (including the guide tests); all pass.
- [ ] **Step 5: Commit** `feat: case-note knowledge base, retrieval reuse and anti-fabrication note builder`.

---

### Task 8: Case Note window and diagram

**Files:** Create `NoteCoachDemo.tsx`, `notes.css`; Modify `[slug].astro`, `hanna.md`.

- [ ] **Step 1: Build the window** reusing the chat classes from `src/components/guide/guide.css` (`.gd-log`, `.gd-turn`, `.gd-form`, `.gd-chips`, `.gd-trace`). Two conversation-starter buttons: **Start a new note** (asks for session details, lists everything missing in one message, then returns the note, a tier indicator and an expansion breakdown showing the provenance per sentence) and **Check a note** (accepts a pasted note, returns the tier, each hard fail with its fix, and the Tier 2 suggestions). A plain question goes to retrieval over `KB` and shows the cited passage or the refusal. A small note under the window says rules 5 and 8 are approximated in the demo.
- [ ] **Step 2: Diagram** in `hanna.md`: system instructions, layered knowledge base ordered by authority, file search, the two entry points, and the flow from input to tier or note.
- [ ] **Step 3: Section text**: Problem (notes failing payer audit or supervisor review for missing medical-necessity elements), What it does, Architecture, Key decisions (anti-embellishment, authority hierarchy, three tiers, risk in three categories, telehealth as reminders only), Impact (3 tiers, 8 hard fails, 15 KB files, 259 ICD-10 codes, 114 intervention terms, 15 to 20 minute rebuild, plus the $30k+ shared line only if it applies; it does not, so omit it here), About the demo (the real tool is a ChatGPT Custom GPT; the demo is retrieval plus rules, not an LLM; fictional data).
- [ ] **Step 4: Verify** tests, build and a browser run: a good note, a failing note, a pasted risky note, a question and a refusal.
- [ ] **Step 5: Commit** `feat: Case Note Coach window, diagram and section`.

---

### Task 9: Page wiring, mobile and Lighthouse

**Files:** Modify `src/pages/work/[slug].astro`, `src/content/work/hanna.md` (intro text and project order), `src/styles/projects.css` if needed.

- [ ] **Step 1: Confirm** `MULTI` includes `hanna`, project order is Grants Agent, IR Updater Bot, Case Note Coach, and the contents list shows all three.
- [ ] **Step 2: Mobile check** at 320, 375 and 768 px for both `/work/bluedome` and `/work/hanna`: no horizontal overflow (compare `scrollWidth` to `clientWidth` in same-origin iframes), windows usable, diagrams legible.
- [ ] **Step 3: Lighthouse** mobile on `/`, `/terminal`, `/work/bluedome` and `/work/hanna` built in preview (temporarily `cleared: true`); target at least 95 on all four categories; fix regressions with lazy CSS loading if needed.
- [ ] **Step 4: Restore** `cleared: false` for `hanna.md`; run `npm test` and `npm run build` (ends `check-build: ok`); commit `chore: Hanna page wiring and verification`.
- [ ] **Step 5: Report** results and wait for the author before any merge, push or deploy.
