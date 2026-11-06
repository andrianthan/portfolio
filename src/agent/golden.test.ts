import { describe, it, expect } from 'vitest';
import cases from './golden.json';
import fixture from './fixtures/snapshot.json';
import { runAgent } from './run';
import { verify } from './verify';
import type { AgentResult, Snapshot } from './types';

interface GoldenCase {
  query: string;
  expectIntent?: string;
  expectTop?: string;
  expectRefuse?: boolean;
}

const snapshot = fixture as unknown as Snapshot;
const golden = cases as GoldenCase[];

function topChunkId(result: AgentResult): string | undefined {
  const source = result.answer?.sources[0];
  if (!source) return undefined;
  return snapshot.chunks.find((chunk) => chunk.title === source.title && chunk.url === source.url)?.id;
}

describe('golden set', () => {
  it('has at least twenty five cases and covers every intent', () => {
    expect(golden.length).toBeGreaterThanOrEqual(25);
    const intents = new Set(golden.map((c) => c.expectIntent).filter(Boolean));
    for (const intent of ['help', 'experience', 'projects', 'resume', 'about', 'skills', 'contact', 'search', 'clear', 'sound', 'easter']) {
      expect(intents.has(intent)).toBe(true);
    }
  });

  it('routes every non refusal case to the expected intent', () => {
    const failures = golden
      .filter((c) => !c.expectRefuse && c.expectIntent)
      .filter((c) => runAgent(snapshot, c.query).route.intent !== c.expectIntent)
      .map((c) => c.query);
    expect(failures).toEqual([]);
  });

  it('returns the expected top chunk', () => {
    const failures = golden
      .filter((c) => c.expectTop)
      .filter((c) => topChunkId(runAgent(snapshot, c.query)) !== c.expectTop)
      .map((c) => c.query);
    expect(failures).toEqual([]);
  });

  it('refuses exactly the cases that must refuse', () => {
    const shouldRefuse = golden.filter((c) => c.expectRefuse);
    const shouldNot = golden.filter((c) => !c.expectRefuse);
    expect(shouldRefuse.filter((c) => !runAgent(snapshot, c.query).refused).map((c) => c.query)).toEqual([]);
    expect(shouldNot.filter((c) => runAgent(snapshot, c.query).refused).map((c) => c.query)).toEqual([]);
  });

  it('fails verification when the answer is tampered with', () => {
    const result = runAgent(snapshot, '/experience');
    const tampered = { ...result.answer!, text: `${result.answer!.text} 99% better` };
    const chunks = snapshot.chunks.filter((chunk) => chunk.kind === 'role');
    expect(verify(tampered, chunks).ok).toBe(false);
  });

  it('is deterministic', () => {
    for (const c of golden) {
      expect(JSON.stringify(runAgent(snapshot, c.query))).toBe(JSON.stringify(runAgent(snapshot, c.query)));
    }
  });

  it('prints the coverage report', () => {
    const answering = golden.filter((c) => !c.expectRefuse);
    const routed = answering.filter((c) => runAgent(snapshot, c.query).route.intent === c.expectIntent).length;
    const refused = golden.filter((c) => runAgent(snapshot, c.query).refused).length;
    const percent = Math.round((routed / answering.length) * 100);
    console.log(`golden: ${golden.length} cases | routing coverage ${routed}/${answering.length} (${percent}%) | refusal rate ${refused}/${golden.length}`);
    expect(percent).toBe(100);
  });
});
