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

**As shipped.** A Python Flask backend, a JavaScript frontend and a SQLite database for metadata, with images stored in S3. Analysts review each AI-labeled image and validate it, and TPM 2.0-backed authentication ties a login to a trusted device. [to confirm]

**Target architecture.** The same Flask API and frontend, with a managed Postgres in place of SQLite.

<figure class="arch">
<svg viewBox="0 0 640 250" role="img" aria-label="Target architecture. The browser talks to a Flask API that does device-trust authentication and reads and writes a Postgres metadata database. Images are uploaded from the browser straight to an S3 bucket using presigned URLs, and the API stores each image's S3 key.">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
<g fill="none" stroke="currentColor" stroke-width="1.4" style="color:var(--color-muted)">
<rect x="16" y="90" width="130" height="64" rx="10"/>
<rect x="250" y="90" width="150" height="64" rx="10"/>
<rect x="494" y="20" width="130" height="64" rx="10"/>
<rect x="494" y="160" width="130" height="64" rx="10"/>
<path d="M146 122H250" marker-end="url(#ah)"/>
<path d="M400 108L494 58" marker-end="url(#ah)"/>
<path d="M400 136L494 190" marker-end="url(#ah)"/>
<path d="M81 154V232H494" stroke-dasharray="5 4" marker-end="url(#ah)"/>
</g>
<g fill="currentColor" font-family="var(--font-sans)" font-size="13" text-anchor="middle" style="color:var(--color-fg)">
<text x="81" y="118" font-weight="600">Browser</text><text x="81" y="136" font-size="11" style="fill:var(--color-muted)">JS review UI</text>
<text x="325" y="118" font-weight="600">Flask API</text><text x="325" y="136" font-size="11" style="fill:var(--color-muted)">TPM 2.0 device auth</text>
<text x="559" y="48" font-weight="600">Postgres</text><text x="559" y="66" font-size="11" style="fill:var(--color-muted)">labels, verdicts, users</text>
<text x="559" y="188" font-weight="600">S3 bucket</text><text x="559" y="206" font-size="11" style="fill:var(--color-muted)">image files</text>
<text x="290" y="226" font-size="11" style="fill:var(--color-muted)">presigned upload (direct)</text>
</g>
</svg>
<figcaption>Target architecture</figcaption>
</figure>

- The browser uploads images straight to S3 through presigned URLs, so large files never pass through Flask.
- Flask records each image's S3 key, plus AI labels and analyst verdicts, in Postgres.
- Device-trust authentication stays at the API.

### Key decisions

- Device trust: authentication is backed by TPM 2.0, so a login is tied to a trusted device. [to confirm]
- Built across a 3-sprint roadmap with a product manager and a UI/UX designer, tracked in Trello, with updates to the founders.

### Backend and data

- **Images** live as files in an S3 bucket. The database stores only each image's key, and the viewer loads images by signed URL. [to confirm]
- **Metadata** (images, AI labels, verdicts, users) lives in the database. [to confirm]
- **Why Postgres in the target:** SQLite allows one writer at a time, and many analysts saving verdicts at once is its weakest case. Postgres adds concurrent writes, managed backups and filtered queries across labels, reviewers and status.

### Results and lessons

Shipped as a production-ready tool. [to confirm]

## Guideline Chatbot

A chatbot I built that answers analysts' labeling questions from the written guidelines, using retrieval-augmented generation (RAG) with vector embeddings. [to confirm]

### What it does

An analyst asks an edge-case question ("does a partially hidden sign still count?") and gets an answer grounded in the guideline text, with the source clause. [to confirm]

### Architecture

Guidelines are split into chunks, embedded as vectors and retrieved by similarity to the question, then passed to the model that writes the answer. [to confirm] (still to fill in: embedding model, LLM, vector store, how guidelines were loaded, and how it connects to the QA tool.)

### About the demo

The window above is a stand-in that runs in your browser: a made-up guide, keyword plus local LSA vector retrieval, and templated answers that quote and cite the matching clause. It shows the shape of the feature, not the production system.

## Image Search

A search tool over the labeled road-scene images that finds images by description, finds images similar to one you pick, and flags near-duplicates, using CLIP-style image and text embeddings. [to confirm]

### What it does

- **Search by text:** type a description like "faded lane marking at night" and get matching road scenes.
- **Similar images:** pick an image and see its nearest neighbors, to find more examples of an edge case.
- **Near-duplicates:** flag images that are almost identical, so analysts don't review the same scene twice and training data isn't skewed.

[to confirm]

### Architecture

Images and text queries are embedded into one shared vector space and compared by similarity, so a text query can be matched against images directly. [to confirm] (still to fill in: the embedding model, how vectors were stored and searched, how duplicates were thresholded, and how it connects to the QA tool.)

### About the demo

The window above is a stand-in that runs in your browser: a made-up set of 27 scenes and a small hand-built attribute space instead of CLIP. Search, nearest neighbors and the duplicate threshold are real logic over that space. It shows the shape of the feature, not the production system.
