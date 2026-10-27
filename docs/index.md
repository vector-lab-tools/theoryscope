---
title: Theoryscope
layout: default
---

# Theoryscope

A renormalisation-group workbench for corpora of theoretical texts.

Theoryscope ingests a Zotero library, embeds each item with an open-weight model, and provides operations for inspecting the cloud's structure: principal eigendirections, coarse-graining flows, fixed points, perturbation probes, translation probes, and corpus-vs-model probes. Everything runs locally; no commercial embedding or generative APIs are called.

> Part of the [Vector Lab](https://github.com/vector-lab-tools). Sibling instruments: [Vectorscope](https://github.com/vector-lab-tools/vectorscope), [Manifoldscope](https://github.com/vector-lab-tools/manifoldscope), [Manifold Atlas](https://github.com/vector-lab-tools/manifold-atlas), [LLMbench](https://github.com/vector-lab-tools/LLMbench).

## Contents

- [Getting started](getting-started.md) — install the backend and frontend, run the Phase 0 demo corpus.
- [Zotero API key — step by step](zotero-api-key.md) — the one piece that trips every user up, with screenshots.
- [Operations guide](operations.md) — what each probe does and when to use it, with worked examples.
- [Troubleshooting](troubleshooting.md) — common errors and what they mean.

## Repository

Source: [github.com/vector-lab-tools/theoryscope](https://github.com/vector-lab-tools/theoryscope). Licence: GPL-3.0-or-later. Author: David M. Berry (University of Sussex).

## At a glance

| | |
|---|---|
| **Object** | A corpus of theoretical texts (a Zotero library, or a curated reading list) |
| **Method** | Open-weight sentence embeddings, PCA eigendecomposition, coarse-graining |
| **Why** | To make visible the gap between what a field *says* it is about and what its *geometry* says it is about |
| **What you need** | A Zotero account, a Zotero API key, Node.js 18+, Python 3.11+ |
| **What you do not need** | OpenAI, Anthropic, or any commercial API key. All embedding models run locally. |

## Quick start (three commands)

```bash
git clone https://github.com/vector-lab-tools/theoryscope.git
cd theoryscope && npm install
cd backend && ./setup.sh
```

Then, in two terminals:

```bash
# terminal 1
cd backend && source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

```bash
# terminal 2
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Load Phase 0 Corpus** to run the built-in philosophy-of-technology demo.

For your own corpus you need a Zotero API key. [Full walkthrough with screenshots →](zotero-api-key.md)
