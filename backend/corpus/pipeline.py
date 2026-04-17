"""
Shared corpus-ingest pipeline.

Factored out of corpus_map.py so that every operation can reuse the same
ingest + embed + provenance path. Operations that need embeddings call
``ingest_and_embed`` and then work on the returned (docs, embeddings, spec).

Phase 0 supports only the hard-coded philosophy-of-technology corpus. The
signature is shaped to accept future sources (Zotero, file ingest) without
breaking callers.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Tuple

import numpy as np

from .embed import DEFAULT_MODEL_ID, default_chunking, embed_documents
from .loader import Document, get_phase_zero_corpus
from .provenance import (
    ChunkingSpec,
    CorpusSource,
    EmbeddingSpec,
    ProvenanceRecord,
    now_utc_iso,
)

PHASE_ZERO_CORPUS_NAME = "philosophy-of-technology-v1"


@dataclass
class IngestedCorpus:
    """A corpus ingested and embedded, ready for any downstream operation."""

    documents: List[Document]
    embeddings: np.ndarray            # shape (n_docs, embedding_dim)
    corpus_source: CorpusSource
    embedding_spec: EmbeddingSpec
    chunking: ChunkingSpec


def ingest_and_embed(
    corpus_name: str = PHASE_ZERO_CORPUS_NAME,
    model_id: str = DEFAULT_MODEL_ID,
) -> IngestedCorpus:
    """Resolve a named corpus, embed it, return the bundle.

    Raises ValueError for unknown corpora; the caller converts to HTTP 404.
    """
    if corpus_name != PHASE_ZERO_CORPUS_NAME:
        raise ValueError(f"Corpus '{corpus_name}' not available in Phase 0.")

    docs = get_phase_zero_corpus()
    embeddings, embedding_spec = embed_documents(docs, model_id=model_id)

    return IngestedCorpus(
        documents=docs,
        embeddings=embeddings,
        corpus_source=CorpusSource(kind="hardcoded", identifier=corpus_name),
        embedding_spec=embedding_spec,
        chunking=default_chunking(),
    )


def build_provenance(
    bundle: IngestedCorpus,
    operation: str,
    operator_name: str,
    operator_params: dict | None = None,
) -> ProvenanceRecord:
    """Compose a ProvenanceRecord from an ingested corpus plus operation info."""
    from .provenance import OperatorSpec  # local import to avoid cycle

    return ProvenanceRecord(
        corpus_source=bundle.corpus_source,
        document_ids=[doc.id for doc in bundle.documents],
        ingestion_timestamp=now_utc_iso(),
        embedding=bundle.embedding_spec,
        chunking=bundle.chunking,
        operation=operation,
        operator=OperatorSpec(name=operator_name, params=operator_params or {}),
    )


def empty_coords(n: int) -> np.ndarray:
    """Sentinel used only in tests; not expected to fire in production."""
    return np.zeros((n, 0), dtype=np.float32)


def _assert_shapes(bundle: IngestedCorpus) -> None:
    """Defensive check used by operations that mutate `bundle.embeddings`."""
    assert bundle.embeddings.shape[0] == len(bundle.documents), (
        "documents and embeddings disagree on row count; "
        f"{len(bundle.documents)} docs vs {bundle.embeddings.shape[0]} rows"
    )


# Re-exported for convenience
__all__ = [
    "IngestedCorpus",
    "ingest_and_embed",
    "build_provenance",
    "PHASE_ZERO_CORPUS_NAME",
]
