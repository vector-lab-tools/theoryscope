"""
Theoryscope backend — FastAPI server for corpus-level theory-space inspection.

Phase 0 exposes:
    GET  /status           liveness check
    POST /corpus-map       ingest + embed + PCA for the hard-coded corpus

Further operations (eigendirections, coarse-graining trajectory, fixed point
finder, universality classes, ...) land in subsequent phases. Stubs are
listed in __init__ for visibility.
"""

from __future__ import annotations

import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from operations.corpus_map import compute_corpus_map
from operations.eigendirections import compute_eigendirections

app = FastAPI(title="Theoryscope Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class CorpusMapRequest(BaseModel):
    corpus_name: str = "philosophy-of-technology-v1"


class EigendirectionsRequest(BaseModel):
    corpus_name: str = "philosophy-of-technology-v1"
    n_components: int = 6
    n_loadings: int = 5


@app.get("/status")
async def status():
    return {
        "status": "ok",
        "tool": "theoryscope",
        "version": "0.1.0",
        "phase": 1,
        "corpora_available": ["philosophy-of-technology-v1"],
        "operations_available": ["corpus_map", "eigendirections"],
    }


@app.post("/corpus-map")
async def corpus_map(req: CorpusMapRequest):
    try:
        result = await asyncio.to_thread(compute_corpus_map, req.corpus_name)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:  # noqa: BLE001 — surface real error to the UI
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/eigendirections")
async def eigendirections(req: EigendirectionsRequest):
    try:
        result = await asyncio.to_thread(
            compute_eigendirections,
            req.corpus_name,
            req.n_components,
            req.n_loadings,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
