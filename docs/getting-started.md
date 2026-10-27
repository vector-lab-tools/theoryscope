---
title: Getting started
layout: default
---

# Getting started

Theoryscope is a two-process application: a FastAPI backend (Python) that owns the embedding model and the corpus cache, and a Next.js frontend (TypeScript) that owns the visualisation. You run both locally.

## Prerequisites

- **Node.js 18+** — [download](https://nodejs.org/) or use `nvm`.
- **Python 3.11+** — the backend uses features introduced in 3.11.
- **npm** — ships with Node.
- **~2 GB free disk** — for the Python virtual environment and the first embedding model download.
- **A Zotero account and API key** — only if you want to analyse your own corpus. The built-in Phase 0 demo corpus does not need one. [Full walkthrough →](zotero-api-key.md)

## 1. Clone the repository

```bash
git clone https://github.com/vector-lab-tools/theoryscope.git
cd theoryscope
```

## 2. Install the frontend

```bash
npm install
```

This installs Next.js, React, Three.js, Plotly, and the rest. Takes a minute or two.

## 3. Set up the Python backend

```bash
cd backend
./setup.sh
```

`setup.sh` creates a local `.venv` and installs FastAPI, uvicorn, sentence-transformers, scikit-learn, umap-learn, and pyzotero. First run downloads the default embedding model (`all-MiniLM-L6-v2`, ~90 MB) on first use rather than at install time.

![Terminal output of a successful backend setup](images/backend-setup.png)

## 4. Run

Open two terminals.

**Terminal 1 — backend:**

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 — frontend:**

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

![The Theoryscope landing page in a browser](images/theoryscope-landing.png)

## 5. First run — the Phase 0 demo

Click **Load Phase 0 Corpus**. Theoryscope will embed the 20-document philosophy-of-technology corpus (built into the backend; no Zotero needed) and render the Corpus Map. The first run takes ~30 seconds while the embedding model downloads; subsequent runs are a couple of seconds.

![The Corpus Map after loading Phase 0](images/phase0-corpus-map.png)

The deep-dive panel at the bottom of the Corpus Map shows the full **provenance record** — corpus hash, document IDs, embedding model, chunking spec, operator, timestamp. Every result you export from Theoryscope carries this record. If a result cannot be cited and re-run, it is not a finding.

## 6. Analysing your own corpus

Open the **Corpus Source** panel on the left and choose **Zotero**.

![The Corpus Source panel](images/corpus-source-panel.png)

If this is your first time, follow the [Zotero API key walkthrough](zotero-api-key.md) first.

Once connected, Theoryscope will show your Zotero collection tree. Pick a collection or a saved search; Theoryscope fetches the item metadata, embeds the abstracts (or titles, if there is no abstract), and runs whichever operation you have selected.

## Next

- [Operations guide](operations.md) — what each probe does and when to use it.
- [Troubleshooting](troubleshooting.md) — common errors.
