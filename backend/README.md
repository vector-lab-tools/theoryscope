# Theoryscope Backend

Python 3.11+ FastAPI server.

## Setup

```bash
cd backend
./setup.sh
```

This creates a local `.venv`, installs dependencies (fastapi, sentence-transformers, scikit-learn, umap-learn, pyzotero, networkx, torch).

## Run

```bash
source backend/.venv/bin/activate
cd backend
uvicorn main:app --reload --port 8000
```

The frontend (Next.js) proxies all `/api/backend/*` calls to `http://localhost:8000`.

## Phase 0 endpoint

- `GET /status` — liveness
- `POST /corpus-map` — ingest the hard-coded Philosophy of Technology corpus (20 documents), embed with `sentence-transformers/all-MiniLM-L6-v2`, project to 3D via PCA, return coordinates plus a full provenance record.

Later phases add eigendirections, coarse-graining, fixed point finding, universality classes, and the reflexive corpus-vs-model probe. See `../WORKING.md` for the full operations list.
