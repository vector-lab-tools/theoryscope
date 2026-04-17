"""
Corpus Map operation — 3D projection of the corpus cloud.

Phase 0: PCA to 3D. UMAP will be added in Phase 1 when corpora grow beyond
a few hundred points.
"""

from __future__ import annotations

from typing import Any, Dict

import numpy as np
from sklearn.decomposition import PCA

from corpus.pipeline import CorpusSpec, build_provenance, ingest_and_embed


def compute_corpus_map(spec: CorpusSpec) -> Dict[str, Any]:
    """
    Ingest the corpus, embed it, and return PCA-projected 3D coordinates
    plus a ProvenanceRecord.
    """
    bundle = ingest_and_embed(spec)

    n_docs = bundle.embeddings.shape[0]
    n_components = min(3, n_docs)  # PCA can't request more components than rows
    pca = PCA(n_components=n_components)
    coords = pca.fit_transform(bundle.embeddings).astype(np.float32)

    # Pad to 3 columns if we had fewer than 3 documents
    if coords.shape[1] < 3:
        padding = np.zeros((coords.shape[0], 3 - coords.shape[1]), dtype=np.float32)
        coords = np.hstack([coords, padding])

    variance = list(pca.explained_variance_ratio_)
    while len(variance) < 3:
        variance.append(0.0)

    provenance = build_provenance(
        bundle=bundle,
        operation="corpus_map",
        operator_name="pca_3d",
        operator_params={"n_components": 3},
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
            for d in bundle.documents
        ],
        "coords_3d": coords.tolist(),
        "variance_explained": [float(v) for v in variance[:3]],
        "cache_hit": bundle.cache_hit,
        "provenance": provenance.to_dict(),
    }
