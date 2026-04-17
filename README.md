# Theoryscope

*An instrument in the Vector Lab.*

Theoryscope is a research tool for exploring *theory space* as a navigable object. Where Vectorscope inspects the internal geometry of a single open-weight model and Manifold Atlas compares output geometries between models, Theoryscope maps the geometry of a corpus of theoretical texts and asks renormalisation-group and eigenvector questions about it: which axes structure the field, which concepts persist under abstraction, which positions are fixed points, which traditions are universality classes of one another.

The design document, operations list, and development roadmap live at:

```
~/Library/CloudStorage/Dropbox/WritingLab 3.8/knowledge/wip/code/theoryscope/WORKING.md
```

The methodological essay that motivates the tool is *Renormalising Theory* (Stunlaw, drafting).

## Status

Phase 0 scaffold. End-to-end proof of connectivity: load a hard-coded corpus of 20 philosophy-of-technology texts, embed them with an open-weight sentence-transformer, project to 3D via PCA, render in the browser.

## Run locally

### Backend (FastAPI, Python 3.11+)

```bash
cd backend
./setup.sh
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

### Frontend (Next.js)

```bash
npm install
npm run dev
```

Open http://localhost:3000. Click "Load Phase 0 Corpus" to embed the corpus and render the Corpus Map. The deep-dive panel shows the full provenance record.

## Architecture

- **Frontend.** Next.js 16 + React 19 + TypeScript 5 + Tailwind (editorial design system shared with Vectorscope). Plotly for 3D scatter. Three.js reserved for later visualisations.
- **Backend.** FastAPI + sentence-transformers + scikit-learn + umap-learn. Local venv, no container required.
- **Provenance.** Every result carries a `ProvenanceRecord` (corpus source, document IDs, embedding model, chunking spec, coarse-graining operator, optional stability score). See `backend/corpus/provenance.py`.
- **Proxy.** Next.js route at `/api/backend/*` forwards to FastAPI on `localhost:8000`. No CORS.

## Methodological commitments

- Open-weight embeddings only (following the Castelle critique of commercial embedding APIs).
- Every coarse-graining operator is implemented in-process and visible on-screen, not hidden behind opaque kernels.
- Stability across embeddings is a required output, not a bonus.
- Corpus provenance travels with every result and every export.
- The tool produces geometry; the critic produces the reading.

## Relationship to the rest of the Vector Lab

- **Manifold Atlas** — between-model comparison of output embeddings.
- **Vectorscope** — within-model inspection of open-weight internals.
- **Theoryscope** — between-theory mapping of a corpus.
- **LLMbench** — close reading of model outputs.

## Licence

Research code, not yet licensed. See [WORKING.md](WORKING.md-link-in-WritingLab) for decisions.
