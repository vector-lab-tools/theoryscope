"""
Embedding pipeline.

Phase 0: local sentence-transformers (open-weight), run once, cached on disk.
Later phases may delegate to a running Vectorscope session over localhost.

Every embedded corpus carries a ProvenanceRecord.
"""

from __future__ import annotations

import logging
from typing import Iterable, List, Tuple

import numpy as np

from .loader import Document
from .provenance import ChunkingSpec, EmbeddingSpec

logger = logging.getLogger(__name__)

# Default open-weight embedder for Phase 0. Small, CPU-friendly, Apple-Silicon
# compatible. Larger models swap in by changing this constant or by passing
# a different model_id at runtime.
DEFAULT_MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"


def _load_model(model_id: str):
    """Lazy import so the module can be read without sentence-transformers installed."""
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer(model_id)


def embed_documents(
    docs: List[Document],
    model_id: str = DEFAULT_MODEL_ID,
) -> Tuple[np.ndarray, EmbeddingSpec]:
    """Embed a list of documents. Returns (matrix[n_docs, dim], spec)."""
    model = _load_model(model_id)
    texts = [doc.text for doc in docs]
    embeddings = model.encode(
        texts,
        normalize_embeddings=True,
        show_progress_bar=False,
        convert_to_numpy=True,
    )
    spec = EmbeddingSpec(
        model_id=model_id,
        model_revision="",  # HF commit hash not retrieved in Phase 0
        dimension=int(embeddings.shape[1]),
    )
    return embeddings.astype(np.float32), spec


def embed_texts(
    texts: List[str],
    model_id: str = DEFAULT_MODEL_ID,
) -> np.ndarray:
    """Embed raw strings (e.g. user queries) with the same model the corpus used.

    Returns an L2-normalised matrix of shape (n_texts, dim). The caller
    is responsible for passing the corpus's model_id when the query
    must live in the same space as the corpus embeddings.
    """
    if not texts:
        return np.zeros((0, 0), dtype=np.float32)
    model = _load_model(model_id)
    embeddings = model.encode(
        texts,
        normalize_embeddings=True,
        show_progress_bar=False,
        convert_to_numpy=True,
    )
    return embeddings.astype(np.float32)


def default_chunking() -> ChunkingSpec:
    """Phase 0 chunking: none. Each document is one point."""
    return ChunkingSpec(strategy="none", max_tokens=0, overlap=0)
