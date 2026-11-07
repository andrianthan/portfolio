// Fictional sample picklists and people. Nothing here is a real student, staff member or record.
export const TYPES: Record<string, string[]> = {
  Behavioral: ['Verbal outburst', 'Property damage', 'Elopement'],
  Medical: ['Injury', 'Medication error', 'Illness'],
  Safety: ['Facility issue', 'Visitor concern'],
};
export const SEVERITIES = ['Low', 'Medium', 'High'];
export const YOUTH = ['Youth A', 'Youth B', 'Youth C', 'Youth D'];
export const STAFF = ['Staff 1', 'Staff 2', 'Staff 3'];
export const FLAG_OPTIONS = ['Family notified', 'Medical attention needed', 'Outside agency contacted'];

// A sub-type that does not belong to the chosen type is dropped, never sent.
export function nullifyInvalid(type: string, sub: string): string {
  return (TYPES[type] ?? []).includes(sub) ? sub : '';
}
