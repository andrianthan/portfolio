// Each of these must be answered from the page's own content: suggestions.test.ts runs them
// through the agent against the fixture snapshot and fails on a refusal.
export const SUGGESTIONS = [
  'What did you do at Tesla?',
  'What did you build at Blue Dome?',
  'What are your skills?',
  'Where did you work?',
  'Can I see your resume?',
  'Tell me about Hanna Center',
];

export function pickSuggestions(page: number, size = 3): string[] {
  const n = SUGGESTIONS.length;
  const start = ((page * size) % n + n) % n;
  return Array.from({ length: size }, (_, i) => SUGGESTIONS[(start + i) % n]);
}
