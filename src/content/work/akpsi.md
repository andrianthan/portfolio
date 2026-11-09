---
company: Alpha Kappa Psi – Omega Phi
title: Software Engineer
project: AI tools for internal operations
dates: Dec 2025 – Present
start: "2025-12"
end: "present"
summary: "Built internal tooling: a membership intake pipeline that takes an application from the first email to a booked interview, saving 21+ hours of manual work, and an opportunity bot that posts job listings to Discord, used by 50+ members to apply."
stack: [Gmail, Google Drive, Discord]
logo: /logos/akpsi.svg
current: true
listed: true
cleared: true
order: 5
---
## Membership intake automation

The pipeline takes a membership application from the first email to a booked interview, with no manual step in between.

### Problem

The VP Membership ran membership intake by hand: read the email, answer the applicant's questions, check the attachments, file everything, and go back and forth to find a time that worked. It was the same sequence for every applicant, done by one person.

### Architecture

- **A mailbox watcher.** The pipeline watches the intake mailbox and runs the intake sequence on each incoming email, which it classifies first.
- **Answers from a knowledge base.** It answers the applicant's question from a knowledge base.
  - When a question is not in the knowledge base, it flags the email for a person instead of guessing.
- **Attachment checks and filing.** It validates the attachments and files everything in Drive.
- **Interview scheduling.** It reads the applicant's availability to propose interview slots.

### Impact

It was built for the VP Membership, who had been doing intake by hand. It saves 21+ hours of manual work, with an 80% improvement in operational efficiency.

## Opportunity bot

The bot posts job and internship listings to a Discord channel the members already use.

### Problem

Members were each finding listings on their own, so the ones who did not ask around missed the ones posted elsewhere.

### Architecture

- **A scraper across many sources.** It collects listings from many sources, including individual company career sites and GitHub.
- **Daily posting with a role filter.** It runs daily, filters listings by role, and posts them to the channel members already use.

### Impact

50+ members use it to apply.
