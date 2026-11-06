import type { Chunk, Snapshot } from '../../agent/types';

export interface FallbackItem {
  label: string;
  text: string;
  url: string;
}

export interface FallbackSection {
  heading: string;
  items: FallbackItem[];
}

const summaries = (snapshot: Snapshot, kind: Chunk['kind']) =>
  snapshot.chunks.filter((chunk) => chunk.kind === kind && !chunk.id.includes('#'));

export function fallbackSections(snapshot: Snapshot): FallbackSection[] {
  const sections: FallbackSection[] = [];
  const push = (heading: string, chunks: Chunk[]) => {
    if (!chunks.length) return;
    sections.push({ heading, items: chunks.map((chunk) => ({ label: chunk.title, text: chunk.text, url: chunk.url })) });
  };
  push('Experience', summaries(snapshot, 'role'));
  push('Projects', summaries(snapshot, 'project'));
  push('Skills', summaries(snapshot, 'skill'));
  push('Contact', summaries(snapshot, 'contact'));
  push('About', summaries(snapshot, 'about'));
  return sections;
}
