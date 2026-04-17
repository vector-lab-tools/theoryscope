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

app = FastAPI(title="Theoryscope Backend", version="0.0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class CorpusMapRequest(BaseModel):
    corpus_name: str = "philosophy-of-technology-v1"


@app.get("/status")
async def status():
    return {
        "status": "ok",
        "tool": "theoryscope",
        "version": "0.0.1",
        "phase": 0,
        "corpora_available": ["philosophy-of-technology-v1"],
    }


@app.post("/corpus-map")
async def corpus_map(req: CorpusMapRequest):
    if req.corpus_name != "philosophy-of-technology-v1":
        raise HTTPException(
            status_code=404,
            detail=f"Corpus '{req.corpus_name}' not available in Phase 0.",
        )
    try:
        result = await asyncio.to_thread(compute_corpus_map, req.corpus_name)
        return result
    except Exception as e:  # noqa: BLE001 — surface real error to the UI
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
