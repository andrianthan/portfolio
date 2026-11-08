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
  const outsideText = [
    `Travel: Andrian has travelled to ${countries.length} countries — ${countries.map((c) => (c.years.length ? `${c.name} (${yearsLabel(c.years)})` : c.name)).join(', ')} — and to ${states.length} US states: ${states.join(', ')}.`,
    `He hikes: his hike trails are ${trails.map((t) => `${t.name} (${t.place}${t.year ? `, ${t.year}` : ''})`).join(', ')}.`,
    `Lifting: ${lifts.map((l) => `${l.name} ${l.pounds}`).join(', ')}, ${liftTotal} total, ${percentileLine}, ${hoursLabel} in the gym.`,
    `Swimming: ${swimEvents.map((e) => `${e.name} ${e.time}`).join(', ')}, ${swimPercentileLine}, ${swimContextLine}.`,
  ].join('\n');
  add({ id: 'about:outside', kind: 'about', title: 'Outside of work', text: outsideText, url: '/#outside', facts: extractNumbers(outsideText) });

  for (const group of input.profile.skillGroups) {
    const text = `${group.label}: ${group.items.join(', ')}`;
    add({ id: `skill:${group.slug}`, kind: 'skill', title: group.label, text, url: '/#about', facts: extractNumbers(text) });
  }

  const contact = input.profile.contact;
  const contactText = `Email: ${contact.email} · LinkedIn: ${contact.linkedin} · GitHub: ${contact.github} · Resume: ${contact.resume}`;
  add({ id: 'contact:links', kind: 'contact', title: 'Contact', text: contactText, url: '/#contact', facts: extractNumbers(contactText) });

  chunks.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { version: 1, chunks };
}
