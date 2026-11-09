---
company: Alpha Kappa Psi – Omega Phi
title: Software Engineer
project: AI tools for internal operations
dates: Dec 2025 – Present
start: "2025-12"
end: "present"
summary: "Built two internal tools nobody asked for, after seeing the manual work: a membership intake pipeline that runs an application from the first email to a booked interview, and an opportunity bot that posts job listings to a Discord channel. The intake work saves 21+ hours of manual work, and 50+ members use the listings bot to apply."
stack: [Gmail, Google Drive, Discord]
logo: /logos/akpsi.svg
current: true
listed: true
cleared: true
order: 5
---
Alpha Kappa Psi's internal operations ran by hand. Nobody asked for these tools; I saw the manual work and built them.

Two tools came out of it: a membership intake pipeline that runs an application from the first email to a booked interview, and an opportunity bot that posts job listings to the organization's Discord channel.

I have also mentored 5+ individuals into internships.

## Membership intake automation

The pipeline takes a membership application from the first email to a booked interview, with no manual step in between.

### Problem

The VP Membership ran membership intake by hand: read the email, answer the applicant's questions, check the attachments, file everything, and go back and forth to find a time that worked. It was the same sequence for every applicant, done by one person.

### What I built

A pipeline that watches the intake mailbox and runs that sequence. It classifies each incoming email, answers the applicant's question from a knowledge base, validates the attachments, files everything in Drive, and reads the applicant's availability to propose interview slots. When a question is not in the knowledge base, it flags the email for a person instead of guessing.

### How it is used

It was built for the VP Membership, who had been doing intake by hand. It saves 21+ hours of manual work, with an 80% improvement in operational efficiency.

## Opportunity bot

The bot posts job and internship listings to a Discord channel the members already use.

### Problem

Members were each finding listings on their own, so the ones who did not ask around missed the ones posted elsewhere.

### What I built

A scraper that collects listings from many sources, including individual company career sites and GitHub, and posts them to the channel. It runs daily and filters listings by role.

### How it is used

50+ members use it to apply.
