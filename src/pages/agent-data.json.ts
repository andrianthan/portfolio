import { getCollection } from 'astro:content';
import { profile } from '../data/profile';
import { buildSnapshot, type SnapshotInput } from '../agent/snapshot';

export const prerender = true;

export async function GET() {
  const [roles, projects] = await Promise.all([getCollection('work'), getCollection('projects')]);
  const input: SnapshotInput = {
    roles: roles.map((entry) => ({
      collection: 'work',
      id: entry.id,
      title: entry.data.company,
      summary: entry.data.summary,
      listed: entry.data.listed,
      cleared: entry.data.cleared,
      body: entry.body,
    })),
    projects: projects.map((entry) => ({
      collection: 'projects',
      id: entry.id,
      title: entry.data.name,
      summary: entry.data.summary,
      listed: entry.data.listed,
      cleared: entry.data.cleared,
      body: entry.body,
    })),
    profile,
  };
  return new Response(JSON.stringify(buildSnapshot(input)), {
    headers: { 'Content-Type': 'application/json' },
  });
}
