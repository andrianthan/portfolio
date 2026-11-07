---
company: Blue Dome Technologies
title: Software Engineer Intern
project: AI/ML Quality Assurance Tool
dates: Aug 2025 – Dec 2025
start: "2025-08"
end: "2025-12"
summary: "Shipped a production full-stack QA tool for reviewing AI-labeled roadway images, with TPM 2.0 backed authentication."
stack: [Flask, SQLite, TPM 2.0]
logo: /logos/bluedome.png
logoFill: true
listed: true
cleared: false
order: 3
---
## QA Analyst Web App

A human-in-the-loop tool for QA analysts who verify AI-labeled roadway-infrastructure images. I wrote the design spec and built the prototype and the production-ready version. [to confirm]

### Problem

The QA analysts who checked AI-labeled roadway images were already using an early prototype of the tool. They found it slow and hard to use. [to confirm] (assumed: too many clicks per image, no keyboard shortcuts, no clear progress or undo.)

### Design spec

I wrote the design spec for the production version, then built it. [to confirm]

### Architecture

A Python Flask backend, a JavaScript frontend and a SQLite database. Analysts review each AI-labeled image and validate it. [to confirm]

### Key decisions

- Device trust: authentication is backed by TPM 2.0, so a login is tied to a trusted device. [to confirm]
- Built across a 3-sprint roadmap with a product manager and a UI/UX designer, tracked in Trello, with updates to the founders.

### Backend and data

[to confirm]

### Results and lessons

Shipped as a production-ready tool. [to confirm]

## Guideline Assistant · concept

Concept, not shipped work: a retrieval-augmented assistant that answers analysts' labeling questions from the written guide and cites the clause it used. The guide in the demo is fictional.

### Design

The full design chunks the guide into clauses, embeds each one as a vector, and retrieves by hybrid vector and keyword search. Answers quote the retrieved clause and cite its id. When nothing is close enough, the assistant refuses and offers to flag the gap for a guideline update.

### What this demo runs

Retrieval runs locally in your browser: BM25 keyword search, LSA vectors (TF-IDF with SVD, not a neural model), and reciprocal rank fusion. Answers are templated quotes of the retrieved clause, not LLM output. Swapping in neural embeddings and a language model behind a server is the next step, not something this demo does.

### Limits

It understands the wording of its twelve clauses, plus close synonyms. It does not reason over new situations, and the clauses are made up.
