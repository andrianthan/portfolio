import { liveSnapshot } from '../lib/snapshotSource';

export const prerender = true;

export async function GET() {
  const snapshot = await liveSnapshot();
  return new Response(JSON.stringify(snapshot), {
    headers: { 'Content-Type': 'application/json' },
  });
}
