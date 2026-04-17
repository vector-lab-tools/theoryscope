"""
Shared corpus-ingest pipeline.

Every operation reuses this path: resolve a corpus spec → embed (with
on-disk cache) → return a bundle that downstream operations consume.

The pipeline supports two corpus kinds in Phase 1.5:
  - hardcoded: the Phase 0 philosophy-of-technology corpus
  - zotero: a Zotero collection pulled via pyzotero; requires credentials
            supplied per-request (never persisted server-side)

An embedded corpus is cached on disk keyed by document IDs + chunking +
embedding model, so repeated requests against the same corpus skip the
embedding step.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import numpy as np

from .cache import corpus_cache_key, load as cache_load, save as cache_save
from .embed import DEFAULT_MODEL_ID, default_chunking, embed_documents
from .loader import Document, get_phase_zero_corpus
from .provenance import (
    ChunkingSpec,
    CorpusSource,
    EmbeddingSpec,
    OperatorSpec,
    ProvenanceRecord,
    now_utc_iso,
)

PHASE_ZERO_CORPUS_NAME = "philosophy-of-technology-v1"


@dataclass
class ZoteroSourceSpec:
    library_id: str
    library_type: str          # "user" | "group"
    api_key: str               # supplied per-request, never persisted
    collection_key: str
    collection_name: str = ""  # optional, for provenance identifier


@dataclass
class CorpusSpec:
    """A corpus request in a form the pipeline can resolve.

    Exactly one of `hardcoded_name` or `zotero` is expected to be set.
    """

    hardcoded_name: Optional[str] = None
    zotero: Optional[ZoteroSourceSpec] = None
    model_id: str = DEFAULT_MODEL_ID

    def identifier(self) -> str:
        if self.zotero is not None:
            name = self.zotero.collection_name or self.zotero.collection_key
            return f"zotero:{self.zotero.library_type}:{self.zotero.library_id}:{name}"
        if self.hardcoded_name:
            return self.hardcoded_name
        raise ValueError("CorpusSpec is empty: neither hardcoded nor zotero set")


@dataclass
class IngestedCorpus:
    """A corpus ingested and embedded, ready for any downstream operation."""

    documents: List[Document]
    embeddings: np.ndarray            # shape (n_docs, embedding_dim)
    corpus_source: CorpusSource
    embedding_spec: EmbeddingSpec
    chunking: ChunkingSpec
    cache_key: str = ""
    cache_hit: bool = False


def _resolve_documents(spec: CorpusSpec) -> tuple[List[Document], CorpusSource]:
    """Fetch documents for the given spec; no embedding done here."""
    if spec.zotero is not None:
        # Local import: zotero module is thin, but pyzotero import is heavy.
        from .zotero import fetch_collection

        zs = spec.zotero
        docs = fetch_collection(
            library_id=zs.library_id,
            library_type=zs.library_type,
            api_key=zs.api_key,
            collection_key=zs.collection_key,
        )
        if not docs:
            raise ValueError(
                f"Zotero collection '{zs.collection_key}' returned no "
                "ingestible items (no titles with abstracts or metadata)."
            )
        source = CorpusSource(
            kind="zotero",
            identifier=(zs.collection_name or zs.collection_key),
            filters={
                "library_id": zs.library_id,
                "library_type": zs.library_type,
                "collection_key": zs.collection_key,
            },
        )
        return docs, source

    name = spec.hardcoded_name or PHASE_ZERO_CORPUS_NAME
    if name != PHASE_ZERO_CORPUS_NAME:
        raise ValueError(f"Unknown hardcoded corpus '{name}'.")
    docs = get_phase_zero_corpus()
    source = CorpusSource(kind="hardcoded", identifier=name)
    return docs, source


def ingest_and_embed(spec: CorpusSpec | str = PHASE_ZERO_CORPUS_NAME) -> IngestedCorpus:
    """Resolve a corpus spec, embed it (or hit the cache), return the bundle.

    Accepts either a CorpusSpec or a bare string corpus name for
    backward compatibility with Phase 0 callers.

    Raises ValueError for unknown corpora; the caller converts to HTTP 404.
    """
    if isinstance(spec, str):
        spec = CorpusSpec(hardcoded_name=spec)

    docs, source = _resolve_documents(spec)
    chunking = default_chunking()

    cache_key = corpus_cache_key(
        document_ids=[d.id for d in docs],
        chunking=chunking,
        embedding_model_id=spec.model_id,
    )

    cached = cache_load(cache_key)
    if cached is not None:
        cached_docs, cached_embeddings, cached_source, cached_embedding, cached_chunking = cached
        # Preserve the *request's* corpus_source.identifier (it may be the human
        # label) but accept cached Documents and embeddings as authoritative.
        return IngestedCorpus(
            documents=cached_docs,
            embeddings=cached_embeddings,
            corpus_source=cached_source if cached_source.kind != "hardcoded" else source,
            embedding_spec=cached_embedding,
            chunking=cached_chunking,
            cache_key=cache_key,
            cache_hit=True,
        )

    embeddings, embedding_spec = embed_documents(docs, model_id=spec.model_id)

    cache_save(
        cache_key,
        documents=docs,
        embeddings=embeddings,
        corpus_source=source,
        embedding_spec=embedding_spec,
        chunking=chunking,
    )

    return IngestedCorpus(
        documents=docs,
        embeddings=embeddings,
        corpus_source=source,
        embedding_spec=embedding_spec,
        chunking=chunking,
        cache_key=cache_key,
        cache_hit=False,
    )


def build_provenance(
    bundle: IngestedCorpus,
    operation: str,
    operator_name: str,
    operator_params: Dict[str, Any] | None = None,
) -> ProvenanceRecord:
    """Compose a ProvenanceRecord from an ingested corpus plus operation info."""
    return ProvenanceRecord(
        corpus_source=bundle.corpus_source,
        document_ids=[doc.id for doc in bundle.documents],
        ingestion_timestamp=now_utc_iso(),
        embedding=bundle.embedding_spec,
        chunking=bundle.chunking,
        operation=operation,
        operator=OperatorSpec(name=operator_name, params=operator_params or {}),
    )


__all__ = [
    "CorpusSpec",
    "ZoteroSourceSpec",
    "IngestedCorpus",
    "ingest_and_embed",
    "build_provenance",
    "PHASE_ZERO_CORPUS_NAME",
]
