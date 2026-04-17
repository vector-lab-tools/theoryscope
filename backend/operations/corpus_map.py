"""
Corpus Map operation — 3D projection of the corpus cloud.

Phase 0: PCA to 3D. UMAP will be added in Phase 1 when corpora grow beyond
a few hundred points.
"""

from __future__ import annotations

from typing import Any, Dict, List

import numpy as np
from sklearn.decomposition import PCA

from corpus.embed import default_chunking, embed_documents
from corpus.loader import Document, document_to_dict, get_phase_zero_corpus
from corpus.provenance import (
    CorpusSource,
    OperatorSpec,
    ProvenanceRecord,
    now_utc_iso,
)


def compute_corpus_map(corpus_name: str = "philosophy-of-technology-v1") -> Dict[str, Any]:
    """
    Ingest the Phase 0 corpus, embed it, and return PCA-projected 3D coordinates
    plus a ProvenanceRecord.

    Returns a dict with:
        documents: [{id, author, year, title, tags}]
        coords_3d: [[x, y, z], ...]
        variance_explained: [pc1, pc2, pc3]
        provenance: dict
    """
    docs: List[Document] = get_phase_zero_corpus()
    embeddings, embed_spec = embed_documents(docs)

    pca = PCA(n_components=3)
    coords = pca.fit_transform(embeddings)
    coords = coords.astype(np.float32)

    provenance = ProvenanceRecord(
        corpus_source=CorpusSource(
            kind="hardcoded",
            identifier=corpus_name,
            filters={},
        ),
        document_ids=[doc.id for doc in docs],
        ingestion_timestamp=now_utc_iso(),
        embedding=embed_spec,
        chunking=default_chunking(),
        operation="corpus_map",
        operator=OperatorSpec(name="pca_3d", params={"n_components": 3}),
    )

    return {
        "documents": [
            {
                "id": d.id,
                "author": d.author,
                "year": d.year,
                "title": d.title,
                "tags": list(d.tags),
            }
            for d in docs
        ],
        "coords_3d": coords.tolist(),
        "variance_explained": [float(v) for v in pca.explained_variance_ratio_[:3]],
        "provenance": provenance.to_dict(),
    }
