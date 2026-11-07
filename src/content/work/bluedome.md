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

## Guideline Chatbot

A chatbot I built that answers analysts' labeling questions from the written guidelines, using retrieval-augmented generation (RAG) with vector embeddings. [to confirm]

### What it does

An analyst asks an edge-case question ("does a partially hidden sign still count?") and gets an answer grounded in the guideline text, with the source clause. [to confirm]

### Architecture

Guidelines are split into chunks, embedded as vectors and retrieved by similarity to the question, then passed to the model that writes the answer. [to confirm] (still to fill in: embedding model, LLM, vector store, how guidelines were loaded, and how it connects to the QA tool.)

### About the demo

The window above is a stand-in that runs in your browser: a made-up guide, keyword plus local LSA vector retrieval, and templated answers that quote and cite the matching clause. It shows the shape of the feature, not the production system.
