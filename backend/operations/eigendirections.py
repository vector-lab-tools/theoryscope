"""
Eigendirections operation — principal axes of a corpus cloud.

Returns the top N principal components of the corpus embedding, each
annotated with the documents that load most positively and most
negatively on it. The annotated axes are the critical surface: what
the geometry says the field varies along, legible as poles of real
texts rather than as abstract vectors.

The operation does not interpret the axes. Naming each axis is the
critic's work; the tool supplies the pair of poles and the magnitudes.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List

import numpy as np
from sklearn.decomposition import PCA

from corpus.pipeline import CorpusSpec, build_provenance, ingest_and_embed


@dataclass
class Loading:
    document_id: str
    author: str
    year: int
    title: str
    score: float


def _format_doc(doc, score: float) -> Dict[str, Any]:
    return {
        "id": doc.id,
        "author": doc.author,
        "year": doc.year,
        "title": doc.title,
        "score": float(score),
    }


def compute_eigendirections(
    spec: CorpusSpec,
    n_components: int = 6,
    n_loadings: int = 5,
) -> Dict[str, Any]:
    """
    Parameters
    ----------
    spec : CorpusSpec
        Corpus to ingest and embed (hardcoded or zotero).
    n_components : int
        Number of principal components to return (clamped to 2..min(n_docs, 20)).
    n_loadings : int
        Number of documents to return at each pole per component
        (clamped to 1..n_docs).
    """
    bundle = ingest_and_embed(spec)
    n_docs = bundle.embeddings.shape[0]

    n_components = max(2, min(int(n_components), min(n_docs, 20)))
    n_loadings = max(1, min(int(n_loadings), n_docs))

    pca = PCA(n_components=n_components)
    projected = pca.fit_transform(bundle.embeddings).astype(np.float32)
    # projected shape: (n_docs, n_components)

    components: List[Dict[str, Any]] = []
    for idx in range(n_components):
        scores = projected[:, idx]

        # Positive pole: highest scores first
        pos_order = np.argsort(-scores)[:n_loadings]
        # Negative pole: lowest scores first
        neg_order = np.argsort(scores)[:n_loadings]

        positive = [_format_doc(bundle.documents[i], scores[i]) for i in pos_order]
        negative = [_format_doc(bundle.documents[i], scores[i]) for i in neg_order]

        components.append(
            {
                "index": idx,
                "variance_explained": float(pca.explained_variance_ratio_[idx]),
                "eigenvalue": float(pca.explained_variance_[idx]),
                "positive_loadings": positive,
                "negative_loadings": negative,
                "coords": [float(s) for s in scores],
            }
        )

    provenance = build_provenance(
        bundle=bundle,
        operation="eigendirections",
        operator_name="pca",
        operator_params={"n_components": n_components, "n_loadings": n_loadings},
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
        "components": components,
        "total_variance_explained": float(np.sum(pca.explained_variance_ratio_)),
        "cache_hit": bundle.cache_hit,
        "provenance": provenance.to_dict(),
    }
