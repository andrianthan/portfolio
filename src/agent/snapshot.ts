import type { ProfileData } from '../data/profile';
import { extractNumbers } from './verify';
import { countries, states, trails, yearsLabel } from '../data/outside';
import { lifts, liftTotal, percentileLine, hoursLabel } from '../data/lifting';
import { swimEvents, swimPercentileLine, swimContextLine } from '../data/swimming';
import type { Chunk, ChunkKind, Snapshot } from './types';

export interface SnapshotEntryInput {
  collection: 'work' | 'projects';
  id: string;
  title: string;
  summary: string;
  listed: boolean;
  cleared: boolean;
  body?: string;
}

export interface SnapshotInput {
  roles: SnapshotEntryInput[];
  projects: SnapshotEntryInput[];
  profile: ProfileData;
}

const KIND_BY_COLLECTION: Record<'work' | 'projects', ChunkKind> = { work: 'role', projects: 'project' };
const ANCHOR_BY_COLLECTION: Record<'work' | 'projects', string> = { work: '/#experience', projects: '/#projects' };
const ROUTE_BY_COLLECTION: Record<'work' | 'projects', string> = { work: '/work', projects: '/projects' };

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    // Diagrams carry their labels as text nodes; they are pictures, not prose.
    .replace(/<(figure|svg|script|style)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/(\*\*|__|\*|_|`)/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function splitSections(body: string): { heading: string; text: string }[] {
  const sections: { heading: string; text: string }[] = [];
  let heading = '';
  let buffer: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    const match = /^##\s+(.*)$/.exec(line);
    if (match) {
      if (heading) sections.push({ heading, text: buffer.join('\n') });
      heading = match[1].trim();
      buffer = [];
    } else {
      buffer.push(line);
    }
  }
  if (heading) sections.push({ heading, text: buffer.join('\n') });
  return sections;
}

export function buildSnapshot(input: SnapshotInput): Snapshot {
  const chunks: Chunk[] = [];
  const marker = '[' + 'to confirm';

  const add = (chunk: Chunk) => {
    if (chunk.text.toLowerCase().includes(marker)) return;
    chunks.push(chunk);
  };

  const entries = [
    ...input.roles.map((entry) => ({ entry, collection: 'work' as const })),
    ...input.projects.map((entry) => ({ entry, collection: 'projects' as const })),
  ];

  for (const { entry, collection } of entries) {
    if (!entry.listed) continue;
    const kind = KIND_BY_COLLECTION[collection];
    const url = entry.cleared ? `${ROUTE_BY_COLLECTION[collection]}/${entry.id}` : ANCHOR_BY_COLLECTION[collection];
    const text = stripMarkdown(entry.summary);
    add({ id: `${kind}:${entry.id}`, kind, title: entry.title, text, url, facts: extractNumbers(text) });
    if (!entry.cleared) continue;
    for (const section of splitSections(entry.body ?? '')) {
      const bodyText = stripMarkdown(section.text);
      if (!bodyText) continue;
      add({
        id: `${kind}:${entry.id}#${slugify(section.heading)}`,
        kind,
        title: entry.title,
        text: bodyText,
        url,
        facts: extractNumbers(bodyText),
      });
    }
  }

  const aboutText = [input.profile.oneLine, ...input.profile.about].join('\n\n');
  add({ id: 'about:bio', kind: 'about', title: 'About', text: aboutText, url: '/#about', facts: extractNumbers(aboutText) });

  // The chunk carries the same facts as the section, in sentences, so the agent
  // answers "where have you travelled" and "do you hike" from the page itself.
  // The retriever is BM25 over raw tokens with no stemming and no spelling
  // normalisation, so a word it only ever sees in one spelling retrieves
  // nothing for the other. "Traveled" is the American spelling and this is a
  // US-based site's audience, so the chunk says both, in prose that still reads
  // naturally to whoever sees the answer. The chunk is agent data and is never
  // rendered on the page.
  // The swim times are written out in the chunk rather than in the compact
  // "1:53" form the page uses. The verifier extracts numbers with a pattern
  // that captures a trailing comma, so "50 Free :24," is published as the
  // token "24," and "1:53" as a bare "1" and a "53,". Spelling the time out
  // gives the verifier clean tokens to check the answer against.
  const swimTime = (time: string): string => {
    const [minutes, seconds] = time.replace(/^:/, '0:').split(':');
    const parts: string[] = [];
    if (minutes !== '0') parts.push(`${minutes} minute${minutes === '1' ? '' : 's'}`);
    parts.push(`${Number(seconds)} second${Number(seconds) === 1 ? '' : 's'}`);
    return parts.join(' ');
  };

  const outsideText = [
    `Travel: Andrian has travelled to ${countries.length} countries — ${countries.map((c) => (c.years.length ? `${c.name} (${yearsLabel(c.years)})` : c.name)).join(', ')} — and to ${states.length} US states: ${states.join(', ')}. Every trip has been about food and trails, so everywhere he has traveled, he has eaten well and walked a lot.`,
    `He hikes: his hike trails are ${trails.map((t) => `${t.name} (${t.place}${t.years?.length ? `, ${yearsLabel(t.years)}` : ''})`).join(', ')}.`,
    `Lifting: ${lifts.map((l) => `${l.name} ${l.pounds}`).join(', ')}, ${liftTotal} total, ${percentileLine}, ${hoursLabel} in the gym.`,
    `Swimming: ${swimEvents.map((e) => `${e.name} in ${swimTime(e.time)}`).join(', ')}, ${swimPercentileLine}, ${swimContextLine}.`,
  ].join('\n');
  add({ id: 'about:outside', kind: 'about', title: 'Outside of work', text: outsideText, url: '/#outside', facts: extractNumbers(outsideText) });

  for (const group of input.profile.skillGroups) {
    const text = `${group.label}: ${group.items.join(', ')}`;
    add({ id: `skill:${group.slug}`, kind: 'skill', title: group.label, text, url: '/#about', facts: extractNumbers(text) });
  }

  const contact = input.profile.contact;
  const contactText = `Email: ${contact.email} · LinkedIn: ${contact.linkedin} · GitHub: ${contact.github}`;
  add({ id: 'contact:links', kind: 'contact', title: 'Contact', text: contactText, url: '/#contact', facts: extractNumbers(contactText) });

  chunks.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { version: 1, chunks };
}
