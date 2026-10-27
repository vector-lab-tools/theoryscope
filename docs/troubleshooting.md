---
title: Troubleshooting
layout: default
---

# Troubleshooting

## Setup

### `./setup.sh` fails on `sentence-transformers`

Make sure Python is 3.11 or newer: `python3 --version`. On macOS, `brew install python@3.11` and re-run with `python3.11 ./setup.sh`.

### `npm install` fails on `three` or `plotly.js`

Node must be 18+. `node --version`. If it is older, upgrade or use `nvm install 20`.

### Backend starts but `localhost:3000` cannot reach it

The frontend proxies all `/api/backend/*` calls to `http://localhost:8000`. If you ran uvicorn on a different port, set `THEORYSCOPE_BACKEND_URL=http://localhost:<port>` in `.env.local` at the repository root and restart `npm run dev`.

## Zotero

### "Forbidden" / empty corpus

Your API key does not have library access. Go to [zotero.org/settings/keys](https://www.zotero.org/settings/keys), click **Edit** on the key, and tick **Allow library access**. For a group library, the group itself needs read permission for the key. Full walkthrough: [Zotero API key](zotero-api-key.md).

### "Invalid library" / 404

Library ID or library type is wrong. The library ID is a plain integer, not your username. For a group library, the ID is the group number (in the URL at `zotero.org/groups/<number>/<name>`) and the library type must be `group`.

### I pasted the key but Theoryscope keeps asking for it

Credentials are stored in `localStorage` on `localhost:3000`. If you cleared browser site data for `localhost`, the key is gone and must be re-entered. The key is never written to the backend cache or logs.

## Embedding and models

### First run is slow

The default embedding model (`all-MiniLM-L6-v2`, ~90 MB) is downloaded on first use. Subsequent runs are offline. The Embedding Dependence Probe will download `all-mpnet-base-v2` (~420 MB) and `BAAI/bge-small-en-v1.5` (~130 MB) when you first select them. The Corpus-vs-Model Probe downloads a small generative model (SmolLM2-135M at ~270 MB, SmolLM2-360M at ~720 MB, or GPT-2 at ~500 MB).

### HuggingFace rate-limit on first download

Unauthenticated downloads are rate-limited. If you hit the limit, create a free token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) and `export HF_TOKEN=<your token>` before starting the backend. Theoryscope itself does not require any HuggingFace token; this is only to raise the download rate limit.

### Out of memory on large corpora

Embedding happens in batches but the final matrix is held in memory. A corpus of ~5,000 abstracts under MiniLM (384-dim) is ~15 MB. The Corpus-vs-Model Probe is the heaviest operation; smaller models (SmolLM2-135M) fit on 8 GB RAM machines, larger ones comfortably on 16 GB.

## Operations

### Corpus Map renders but points are stacked at the origin

The embedding call failed and returned zero vectors. Check the backend terminal — most often this is a Zotero fetch failure (empty item titles / abstracts), or the embedding model failing to download. The provenance panel will show the corpus hash as `all-zeros` which is the giveaway.

### Eigendirections look like garbage on a small corpus

PCA on fewer than ~20 documents is unstable. Run the Forgetting Curve: if the standard deviation on PC1 is above 0.3, your eigenbasis is noise. Add documents, or use a bigger embedding model.

### Export button downloads an empty file

The operation has not completed. Wait for the status indicator in the deep-dive panel to clear before exporting.

## Still stuck

Open an issue at [github.com/vector-lab-tools/theoryscope/issues](https://github.com/vector-lab-tools/theoryscope/issues) with:

- The backend terminal output around the error.
- The browser console (Cmd/Ctrl + Alt + I → Console tab).
- The provenance JSON for the operation that failed (Export button).

Please do *not* include your Zotero API key in an issue.
