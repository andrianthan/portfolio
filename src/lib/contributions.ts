export type Level = 0 | 1 | 2 | 3 | 4;

export interface ContributionDay { date: string; count: number; level: Level }
export interface ContributionGrid { total: number; weeks: (ContributionDay | null)[][] }

const isLevel = (n: unknown): n is Level => n === 0 || n === 1 || n === 2 || n === 3 || n === 4;

export function parseApi(json: unknown): ContributionDay[] | null {
  const list = (json as { contributions?: unknown } | null)?.contributions;
  if (!Array.isArray(list) || list.length === 0) return null;
  const out: ContributionDay[] = [];
  for (const item of list) {
    const d = item as { date?: unknown; count?: unknown; level?: unknown };
    if (typeof d.date !== 'string' || typeof d.count !== 'number' || !isLevel(d.level)) return null;
    out.push({ date: d.date, count: d.count, level: d.level });
  }
  return out;
}

export function buildGrid(days: ContributionDay[]): ContributionGrid {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const total = sorted.reduce((sum, d) => sum + d.count, 0);
  const lead = sorted.length ? new Date(`${sorted[0].date}T00:00:00Z`).getUTCDay() : 0;
  const slots: (ContributionDay | null)[] = [...Array<null>(lead).fill(null), ...sorted];
  while (slots.length % 7 !== 0) slots.push(null);
  const weeks: (ContributionDay | null)[][] = [];
  for (let i = 0; i < slots.length; i += 7) weeks.push(slots.slice(i, i + 7));
  return { total, weeks };
}

/** Last year of contributions for a public GitHub user, or null on any failure. Never invents data. */
export async function fetchContributions(user: string, fetchImpl: typeof fetch = fetch): Promise<ContributionGrid | null> {
  try {
    const res = await fetchImpl(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(user)}?y=last`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const days = parseApi(await res.json());
    return days ? buildGrid(days) : null;
  } catch {
    return null;
  }
}
