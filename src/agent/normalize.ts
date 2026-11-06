export const MAX_QUERY_LENGTH = 200;

export interface NormalizedQuery {
  raw: string;
  text: string;
  tooLong: boolean;
}

export function normalize(query: string): NormalizedQuery {
  const raw = query.trim().replace(/\s+/g, ' ');
  const tooLong = raw.length > MAX_QUERY_LENGTH;
  const text = raw
    .toLowerCase()
    .replace(/[^a-z0-9$%+. -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { raw, text, tooLong };
}
