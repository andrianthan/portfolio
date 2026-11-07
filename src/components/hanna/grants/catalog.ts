// Fictional sample data. Funders, grants and amounts are invented. The seven flags are
// stand-ins modeled on the shape of a real scoring framework, not its actual contents.
export type FlagId = 'mission' | 'geography' | 'effort' | 'reporting' | 'deadline' | 'eligibility' | 'relationship';

export interface Grant {
  id: string; title: string; funder: string; amount: number; deadlineDays: number;
  geography: 'local' | 'state' | 'federal'; mission: string[];
  reporting: 'light' | 'medium' | 'heavy'; staffHours: number;
  relationship: 'known' | 'new'; eligible: boolean;
}

export interface Criteria {
  weights: Record<FlagId, number>;
  sheetThreshold: number;
  emailThreshold: number;
}

export const FLAGS: { id: FlagId; label: string }[] = [
  { id: 'mission', label: 'Mission fit' },
  { id: 'geography', label: 'Geography' },
  { id: 'effort', label: 'Award vs. effort' },
  { id: 'reporting', label: 'Reporting burden' },
  { id: 'deadline', label: 'Deadline window' },
  { id: 'eligibility', label: 'Eligibility' },
  { id: 'relationship', label: 'Funder relationship' },
];

export const ON_MISSION = ['youth', 'mental-health', 'family', 'education', 'housing'];

export const DEFAULT_CRITERIA: Criteria = {
  weights: { mission: 3, geography: 2, effort: 2, reporting: 1, deadline: 1, eligibility: 3, relationship: 1 },
  sheetThreshold: 5.0,
  emailThreshold: 6.0,
};

export const GRANTS: Grant[] = [
  { id: 'g01', title: 'Youth Counseling Access Grant', funder: 'Sample Community Fund', amount: 50000, deadlineDays: 45, geography: 'local', mission: ['youth', 'mental-health'], reporting: 'light', staffHours: 60, relationship: 'new', eligible: true },
  { id: 'g02', title: 'Family Stability Program', funder: 'Sample State Foundation', amount: 80000, deadlineDays: 60, geography: 'state', mission: ['family', 'housing'], reporting: 'medium', staffHours: 100, relationship: 'new', eligible: true },
  { id: 'g03', title: 'After-School Learning Support', funder: 'Sample Education Trust', amount: 30000, deadlineDays: 30, geography: 'local', mission: ['education', 'youth'], reporting: 'heavy', staffHours: 260, relationship: 'new', eligible: true },
  { id: 'g04', title: 'Community Health Workforce', funder: 'Sample Federal Agency', amount: 250000, deadlineDays: 15, geography: 'federal', mission: ['mental-health'], reporting: 'heavy', staffHours: 600, relationship: 'new', eligible: true },
  { id: 'g05', title: 'Rural Broadband Pilot', funder: 'Sample Federal Agency', amount: 120000, deadlineDays: 40, geography: 'federal', mission: [], reporting: 'heavy', staffHours: 300, relationship: 'new', eligible: false },
  { id: 'g06', title: 'Housing First Capacity Fund', funder: 'Sample Housing Alliance', amount: 90000, deadlineDays: 4, geography: 'state', mission: ['housing', 'family'], reporting: 'medium', staffHours: 420, relationship: 'new', eligible: true },
  { id: 'g07', title: 'Arts in Schools Mini-Grant', funder: 'Sample Arts Council', amount: 5000, deadlineDays: 10, geography: 'local', mission: ['education'], reporting: 'light', staffHours: 40, relationship: 'new', eligible: true },
  { id: 'g08', title: 'Trauma-Informed Care Training', funder: 'Sample Wellness Foundation', amount: 60000, deadlineDays: 70, geography: 'federal', mission: ['mental-health'], reporting: 'heavy', staffHours: 380, relationship: 'known', eligible: true },
  { id: 'g09', title: 'Capital Campaign Matching Gift', funder: 'Sample Family Foundation', amount: 200000, deadlineDays: 120, geography: 'local', mission: [], reporting: 'light', staffHours: 400, relationship: 'new', eligible: false },
  { id: 'g10', title: 'Youth Leadership Fellowship', funder: 'Sample National Trust', amount: 40000, deadlineDays: 5, geography: 'federal', mission: ['youth'], reporting: 'heavy', staffHours: 250, relationship: 'new', eligible: true },
  { id: 'g11', title: 'Crisis Line Expansion', funder: 'Sample County Fund', amount: 70000, deadlineDays: 50, geography: 'local', mission: ['mental-health', 'family'], reporting: 'medium', staffHours: 140, relationship: 'known', eligible: true },
  { id: 'g12', title: 'Environmental Cleanup Initiative', funder: 'Sample Green Fund', amount: 25000, deadlineDays: 35, geography: 'state', mission: [], reporting: 'medium', staffHours: 200, relationship: 'new', eligible: true },
];
