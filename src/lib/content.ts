export type Gated = { data: { listed: boolean; cleared: boolean; order: number } };

const byOrder = <T extends Gated>(a: T, b: T) => a.data.order - b.data.order;

export const listed = <T extends Gated>(xs: T[]): T[] => xs.filter((x) => x.data.listed).sort(byOrder);
export const cleared = <T extends Gated>(xs: T[]): T[] => xs.filter((x) => x.data.cleared).sort(byOrder);

export function neighbors<T extends { id: string }>(xs: T[], id: string): { prev: T | null; next: T | null } {
  const i = xs.findIndex((x) => x.id === id);
  if (i === -1) return { prev: null, next: null };
  return { prev: xs[i - 1] ?? null, next: xs[i + 1] ?? null };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const renderBold = (text: string): string => esc(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

export interface ExperienceRow {
  id: string; company: string; title: string; dates: string;
  summaryHtml: string; href: string | null; current: boolean;
}

type RoleLike = Gated & {
  id: string;
  data: Gated['data'] & { company: string; title: string; dates: string; summary: string; current: boolean };
};

export function experienceRows(roles: RoleLike[]): ExperienceRow[] {
  return listed(roles).map((r) => ({
    id: r.id,
    company: r.data.company,
    title: r.data.title,
    dates: r.data.dates,
    summaryHtml: renderBold(r.data.summary),
    href: r.data.cleared ? `/work/${r.id}` : null,
    current: r.data.current,
  }));
}
