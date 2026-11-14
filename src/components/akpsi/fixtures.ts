/**
 * Invented sample rows for the Alpha Kappa Psi demos. Nothing here is real:
 * applicants are "Applicant A" to "Applicant E", files are named after those
 * placeholders, the knowledge-base answers are made up for the demo, and
 * every company in the listings feed is fictional.
 */
export interface Attachment {
  name: string;
  kind: 'resume' | 'transcript' | 'other';
  valid: boolean;
}

export interface IntakeEmail {
  id: string;
  subject: string;
  question: string;
  availability: string;
  attachments: Attachment[];
}

export const EMAILS: IntakeEmail[] = [
  {
    id: 'Applicant A',
    subject: 'Membership requirements',
    question: 'What are the interview requirements?',
    availability: 'Tuesday or Thursday afternoons',
    attachments: [{ name: 'resume-a.pdf', kind: 'resume', valid: true }],
  },
  {
    id: 'Applicant B',
    subject: 'Membership fee',
    question: 'Does the organization cover the membership fee?',
    availability: 'Monday, Wednesday or Friday mornings',
    attachments: [
      { name: 'resume-b.pdf', kind: 'resume', valid: true },
      { name: 'transcript-b.pdf', kind: 'transcript', valid: true },
    ],
  },
  {
    id: 'Applicant C',
    subject: 'Scheduling',
    question: 'Can I defer my interview to next month?',
    availability: 'Flexible',
    attachments: [{ name: 'resume-c.pdf', kind: 'resume', valid: true }],
  },
  {
    id: 'Applicant D',
    subject: 'Application with transcript',
    question: 'What are the interview requirements?',
    availability: 'Friday mornings',
    attachments: [
      { name: 'resume-d.pdf', kind: 'resume', valid: true },
      { name: 'transcript-d.txt', kind: 'transcript', valid: false },
    ],
  },
  {
    id: 'Applicant E',
    subject: 'Interview length',
    question: 'How long is the interview?',
    availability: 'Weekends work best',
    attachments: [{ name: 'resume-e.pdf', kind: 'resume', valid: true }],
  },
];

/** Where a listing was picked up from. */
export type ListingSource = 'career site' | 'GitHub list' | 'referral';

/** The kind of role a listing is for. */
export type RoleType = 'internship' | 'new grad' | 'co-op';

export interface Listing {
  id: string;
  title: string;
  company: string;
  source: ListingSource;
  roleType: RoleType;
  posted: string;
  place: string;
}

export const SOURCES: ListingSource[] = ['career site', 'GitHub list', 'referral'];

export const ROLE_TYPES: RoleType[] = ['internship', 'new grad', 'co-op'];

/** Ten invented listings, from ten invented companies. */
export const LISTINGS: Listing[] = [
  {
    id: 'L-01',
    title: 'Software Engineering Intern',
    company: 'Northwind Labs',
    source: 'career site',
    roleType: 'internship',
    posted: '2026-01-12',
    place: 'Remote',
  },
  {
    id: 'L-02',
    title: 'Robotics Intern',
    company: 'Harborlight Robotics',
    source: 'career site',
    roleType: 'internship',
    posted: '2026-01-14',
    place: 'Seattle, WA',
  },
  {
    id: 'L-03',
    title: 'Backend Engineer Intern',
    company: 'Cedarworks Systems',
    source: 'GitHub list',
    roleType: 'internship',
    posted: '2026-01-15',
    place: 'Remote',
  },
  {
    id: 'L-04',
    title: 'Software Engineer, New Grad',
    company: 'Lumenworks',
    source: 'career site',
    roleType: 'new grad',
    posted: '2026-01-16',
    place: 'Boston, MA',
  },
  {
    id: 'L-05',
    title: 'Health Data Intern',
    company: 'Asterline Health',
    source: 'referral',
    roleType: 'internship',
    posted: '2026-01-17',
    place: 'Austin, TX',
  },
  {
    id: 'L-06',
    title: 'Platform Engineering Intern',
    company: 'Quarryline Software',
    source: 'GitHub list',
    roleType: 'internship',
    posted: '2026-01-19',
    place: 'Remote',
  },
  {
    id: 'L-07',
    title: 'Data Science Intern',
    company: 'Tidecrest Data',
    source: 'GitHub list',
    roleType: 'internship',
    posted: '2026-01-20',
    place: 'Chicago, IL',
  },
  {
    id: 'L-08',
    title: 'Co-op, Test Engineering',
    company: 'Brightfold Labs',
    source: 'career site',
    roleType: 'co-op',
    posted: '2026-01-21',
    place: 'Denver, CO',
  },
  {
    id: 'L-09',
    title: 'New Grad Software Engineer',
    company: 'Stonebridge Analytics',
    source: 'referral',
    roleType: 'new grad',
    posted: '2026-01-22',
    place: 'Atlanta, GA',
  },
  {
    id: 'L-10',
    title: 'Co-op, Embedded Systems',
    company: 'Vantagepoint Robotics',
    source: 'career site',
    roleType: 'co-op',
    posted: '2026-01-23',
    place: 'San Diego, CA',
  },
];
