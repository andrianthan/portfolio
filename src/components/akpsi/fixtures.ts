/**
 * Invented sample rows for the Alpha Kappa Psi demos. Nothing here is real:
 * applicants are "Applicant A" to "Applicant E", files are named after those
 * placeholders, and the knowledge-base answers are made up for the demo.
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
