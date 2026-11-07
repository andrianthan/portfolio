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

A retrieval-augmented generation (RAG) pipeline in two parts. [to confirm]

<figure class="arch">
<svg viewBox="0 0 640 290" role="img" aria-label="Guideline chatbot architecture. Indexing, done ahead of time: guideline documents are split into chunks, embedded by an embedding model, and stored in a vector store. Answering, per question: the analyst's question is embedded, the closest guideline chunks are retrieved from the vector store, an LLM writes an answer from those chunks, and the answer cites its source clause. If nothing relevant is found, the chatbot says so and the gap can be flagged for a guideline update.">
<defs><marker id="ah2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
<g font-family="var(--font-mono)" font-size="10" letter-spacing="1.2" style="fill:var(--color-muted)"><text x="10" y="22">INDEXING (AHEAD OF TIME)</text><text x="10" y="152">ANSWERING (PER QUESTION)</text></g>
<g fill="none" stroke="currentColor" stroke-width="1.4" style="color:var(--color-muted)">
<rect x="10" y="34" width="130" height="64" rx="10"/><rect x="175" y="34" width="130" height="64" rx="10"/><rect x="340" y="34" width="130" height="64" rx="10"/><rect x="505" y="34" width="125" height="64" rx="10"/>
<path d="M140 66H175" marker-end="url(#ah2)"/><path d="M305 66H340" marker-end="url(#ah2)"/><path d="M470 66H505" marker-end="url(#ah2)"/>
<rect x="10" y="164" width="130" height="64" rx="10"/><rect x="175" y="164" width="130" height="64" rx="10"/><rect x="340" y="164" width="130" height="64" rx="10"/><rect x="505" y="164" width="125" height="64" rx="10"/>
<path d="M140 196H175" marker-end="url(#ah2)"/><path d="M305 196H340" marker-end="url(#ah2)"/><path d="M470 196H505" marker-end="url(#ah2)"/>
<path d="M567 98V131H240V164" stroke-dasharray="5 4" marker-end="url(#ah2)"/>
</g>
<g fill="currentColor" font-family="var(--font-sans)" font-size="13" text-anchor="middle" style="color:var(--color-fg)">
<text x="75" y="63" font-weight="600">Guidelines</text><text x="75" y="81" font-size="11" style="fill:var(--color-muted)">documents (S3)</text>
<text x="240" y="63" font-weight="600">Chunker</text><text x="240" y="81" font-size="11" style="fill:var(--color-muted)">clauses, sections</text>
<text x="405" y="63" font-weight="600">Embedding model</text><text x="405" y="81" font-size="11" style="fill:var(--color-muted)">text to vectors</text>
<text x="567" y="63" font-weight="600">Vector store</text><text x="567" y="81" font-size="11" style="fill:var(--color-muted)">chunks + metadata</text>
<text x="75" y="193" font-weight="600">Analyst question</text><text x="75" y="211" font-size="11" style="fill:var(--color-muted)">in the review tool</text>
<text x="240" y="193" font-weight="600">Embed + retrieve</text><text x="240" y="211" font-size="11" style="fill:var(--color-muted)">top matching chunks</text>
<text x="405" y="193" font-weight="600">LLM</text><text x="405" y="211" font-size="11" style="fill:var(--color-muted)">answers from chunks</text>
<text x="567" y="193" font-weight="600">Answer</text><text x="567" y="211" font-size="11" style="fill:var(--color-muted)">cites the clause</text>
<text x="320" y="262" font-size="11" style="fill:var(--color-muted)">no relevant chunk found: say so, flag the gap for a guideline update</text>
</g>
</svg>
<figcaption>Guideline chatbot architecture</figcaption>
</figure>

- **Indexing, ahead of time:** guideline documents are split into chunks, embedded as vectors and stored with their clause ids. [to confirm]
- **Answering, per question:** the question is embedded, the closest chunks are retrieved, and the model writes an answer from only those chunks and cites the clause. [to confirm]
- **No match:** when nothing relevant is retrieved, the chatbot says so instead of guessing, and the gap can be flagged for a guideline update. [to confirm]

(Still to fill in: the embedding model, the vector store, which LLM, how guidelines were loaded and re-indexed when they change, and how the chatbot connects to the QA tool.)

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

Every image is turned into a vector once, and all three features read from the same index. [to confirm]

<figure class="arch">
<svg viewBox="0 0 640 300" role="img" aria-label="Image search architecture. Images stored in S3 are turned into vectors by an image encoder and stored in a vector index. Three paths read the index. Search by text: a text query is encoded into the same space and the closest images are ranked. Similar images: a picked image's stored vector finds its nearest neighbors. Duplicates: a scheduled job compares all vectors and flags groups of near-identical images for review.">
<defs><marker id="ah3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
<g fill="none" stroke="currentColor" stroke-width="1.4" style="color:var(--color-muted)">
<rect x="10" y="20" width="130" height="56" rx="10"/>
<rect x="175" y="20" width="130" height="56" rx="10"/>
<rect x="340" y="20" width="130" height="270" rx="10"/>
<rect x="10" y="112" width="130" height="50" rx="10"/>
<rect x="175" y="112" width="130" height="50" rx="10"/>
<rect x="505" y="112" width="125" height="50" rx="10"/>
<rect x="10" y="176" width="130" height="50" rx="10"/>
<rect x="175" y="176" width="130" height="50" rx="10"/>
<rect x="505" y="176" width="125" height="50" rx="10"/>
<rect x="10" y="240" width="130" height="50" rx="10"/>
<rect x="175" y="240" width="130" height="50" rx="10"/>
<rect x="505" y="240" width="125" height="50" rx="10"/>
<path d="M140 48H175" marker-end="url(#ah3)"/>
<path d="M305 48H340" marker-end="url(#ah3)"/>
<path d="M140 137H175" marker-end="url(#ah3)"/>
<path d="M305 137H340" marker-end="url(#ah3)"/>
<path d="M470 137H505" marker-end="url(#ah3)"/>
<path d="M140 201H175" marker-end="url(#ah3)"/>
<path d="M305 201H340" marker-end="url(#ah3)"/>
<path d="M470 201H505" marker-end="url(#ah3)"/>
<path d="M140 265H175" marker-end="url(#ah3)"/>
<path d="M305 265H340" marker-end="url(#ah3)"/>
<path d="M470 265H505" marker-end="url(#ah3)"/>
</g>
<g fill="currentColor" font-family="var(--font-sans)" font-size="13" text-anchor="middle" style="color:var(--color-fg)">
<text x="75" y="45" font-weight="600">Images</text><text x="75" y="62" font-size="11" style="fill:var(--color-muted)">files in S3</text>
<text x="240" y="45" font-weight="600">Image encoder</text><text x="240" y="62" font-size="11" style="fill:var(--color-muted)">image to vector</text>
<text x="405" y="150" font-weight="600">Vector index</text><text x="405" y="168" font-size="11" style="fill:var(--color-muted)">vectors + metadata</text>
<text x="75" y="134" font-weight="600">Text query</text><text x="75" y="151" font-size="11" style="fill:var(--color-muted)">a scene in words</text>
<text x="240" y="134" font-weight="600">Text encoder</text><text x="240" y="151" font-size="11" style="fill:var(--color-muted)">same space as images</text>
<text x="567" y="134" font-weight="600">Ranked images</text><text x="567" y="151" font-size="11" style="fill:var(--color-muted)">closest by meaning</text>
<text x="75" y="198" font-weight="600">Picked image</text><text x="75" y="215" font-size="11" style="fill:var(--color-muted)">an analyst clicks one</text>
<text x="240" y="198" font-weight="600">Look up its vector</text><text x="240" y="215" font-size="11" style="fill:var(--color-muted)">already indexed</text>
<text x="567" y="198" font-weight="600">Nearest neighbors</text><text x="567" y="215" font-size="11" style="fill:var(--color-muted)">more of the edge case</text>
<text x="75" y="262" font-weight="600">Scheduled job</text><text x="75" y="279" font-size="11" style="fill:var(--color-muted)">checks the whole set</text>
<text x="240" y="262" font-weight="600">Read all vectors</text><text x="240" y="279" font-size="11" style="fill:var(--color-muted)">compare close pairs</text>
<text x="567" y="262" font-weight="600">Duplicate groups</text><text x="567" y="279" font-size="11" style="fill:var(--color-muted)">flagged for review</text>
</g>
</svg>
<figcaption>Image search architecture</figcaption>
</figure>

- **Indexing:** an image encoder turns each image in S3 into a vector, stored in a vector index with the image's metadata. [to confirm]
- **Search by text:** a text encoder maps the query into the same space as the images, and the closest images are ranked. [to confirm]
- **Similar images:** a picked image's stored vector finds its nearest neighbors. [to confirm]
- **Duplicates:** a scheduled job compares vectors and groups images above a similarity threshold, so analysts review one image per group. [to confirm]

(Still to fill in: the embedding model, the vector index, how duplicates were thresholded, how often indexing ran, and how it connects to the QA tool.)

### About the demo

The window above is a stand-in that runs in your browser: a made-up set of 27 scenes and a small hand-built attribute space instead of CLIP. Search, nearest neighbors and the duplicate threshold are real logic over that space. It shows the shape of the feature, not the production system.
