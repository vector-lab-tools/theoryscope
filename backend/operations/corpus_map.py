"""
Corpus Map operation — 3D projection of the corpus cloud.

Phase 0: PCA to 3D. UMAP will be added in Phase 1 when corpora grow beyond
a few hundred points.
"""

from __future__ import annotations

from typing import Any, Dict

import numpy as np
from sklearn.decomposition import PCA

from corpus.pipeline import PHASE_ZERO_CORPUS_NAME, build_provenance, ingest_and_embed


def compute_corpus_map(corpus_name: str = PHASE_ZERO_CORPUS_NAME) -> Dict[str, Any]:
    """
    Ingest the corpus, embed it, and return PCA-projected 3D coordinates
    plus a ProvenanceRecord.

    Returns a dict with:
        documents: [{id, author, year, title, tags}]
        coords_3d: [[x, y, z], ...]
        variance_explained: [pc1, pc2, pc3]
        provenance: dict
    """
    bundle = ingest_and_embed(corpus_name=corpus_name)

    pca = PCA(n_components=3)
    coords = pca.fit_transform(bundle.embeddings).astype(np.float32)

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
        "variance_explained": [float(v) for v in pca.explained_variance_ratio_[:3]],
        "provenance": provenance.to_dict(),
    }
