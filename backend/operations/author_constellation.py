"""
Author Constellation.

Aggregate each author's documents into a constellation: centroid plus
intra-author spread. Overlay all authors on the same PCA-2D basis so
the critic can compare constellations visually.

Single-author corpora produce trivial constellations. The operation
earns its keep once the corpus contains multiple documents per
author — for the Phase 0 hard-coded corpus, each author has one
document and the operation degenerates to the Corpus Map.
"""

from __future__ import annotations

from typing import Any, Dict, List

import numpy as np
from sklearn.decomposition import PCA

from corpus.pipeline import CorpusSpec, build_provenance, ingest_and_embed


def compute_author_constellation(
    spec: CorpusSpec,
    min_documents: int = 1,
) -> Dict[str, Any]:
    """
    Parameters
    ----------
    spec : CorpusSpec
    min_documents : int
        Exclude authors with fewer than this many documents from the
        returned constellations. The full document set still drives the
        PCA so the basis stays consistent with the Corpus Map.
    """
    bundle = ingest_and_embed(spec)
    embeddings = bundle.embeddings
    n_docs = embeddings.shape[0]
    if n_docs < 2:
        raise ValueError(
            f"Corpus has only {n_docs} document(s); Author Constellation needs at least 2."
        )

    # Group document indices by author.
    buckets: Dict[str, List[int]] = {}
    for i, doc in enumerate(bundle.documents):
        buckets.setdefault(doc.author, []).append(i)

    # PCA-2D over the full corpus so centroids and members share a basis.
    n_components = min(2, embeddings.shape[1])
    pca = PCA(n_components=n_components)
    corpus_2d = pca.fit_transform(embeddings).astype(np.float32)
    if corpus_2d.shape[1] < 2:
        pad = np.zeros(
            (corpus_2d.shape[0], 2 - corpus_2d.shape[1]),
            dtype=np.float32,
        )
        corpus_2d = np.hstack([corpus_2d, pad])

    # Per-author statistics.
    authors: List[Dict[str, Any]] = []
    for author, idxs in buckets.items():
        if len(idxs) < max(1, int(min_documents)):
            continue
        member_vecs = embeddings[idxs]
        member_2d = corpus_2d[idxs]
        centroid = member_vecs.mean(axis=0)
        centroid_2d = member_2d.mean(axis=0)

        # Intra-author cosine similarity (mean pairwise cosine between
        # documents of this author). Norms are 1 because embeddings are
        # L2-normalised in our pipeline.
        if len(idxs) >= 2:
            sims = member_vecs @ member_vecs.T
            mask = ~np.eye(sims.shape[0], dtype=bool)
            mean_cos = float(sims[mask].mean())
        else:
            mean_cos = 1.0

        # Spread in the shared 2D basis: mean and max distance from the
        # author's 2D centroid.
        if len(idxs) >= 2:
            deltas = member_2d - centroid_2d
            dists = np.linalg.norm(deltas, axis=1)
            mean_spread = float(dists.mean())
            max_spread = float(dists.max())
        else:
            mean_spread = 0.0
            max_spread = 0.0

        members = [
            {
                "id": bundle.documents[int(i)].id,
                "year": bundle.documents[int(i)].year,
                "title": bundle.documents[int(i)].title,
                "coords_2d": [float(corpus_2d[int(i), 0]), float(corpus_2d[int(i), 1])],
            }
            for i in idxs
        ]

        authors.append(
            {
                "author": author,
                "n_documents": len(idxs),
                "centroid_2d": [float(centroid_2d[0]), float(centroid_2d[1])],
                "intra_author_mean_cosine": mean_cos,
                "mean_spread_2d": mean_spread,
                "max_spread_2d": max_spread,
                "members": members,
            }
        )
        # Retain centroid embedding separately for later reuse without exposing raw floats in sort.
        authors[-1]["_centroid_embedding"] = centroid  # noqa: hidden key stripped below

    # Sort authors by document count (primary) then by author name (tie-break).
    authors.sort(key=lambda a: (-a["n_documents"], a["author"]))
    # Compute author-pair centroid cosine matrix (for the deep-dive panel).
    author_names = [a["author"] for a in authors]
    centroids = np.stack(
        [a["_centroid_embedding"] for a in authors], axis=0
    ) if authors else np.zeros((0, embeddings.shape[1]))
    if centroids.shape[0] >= 2:
        norms = np.linalg.norm(centroids, axis=1, keepdims=True) + 1e-12
        unit = centroids / norms
        author_cos = unit @ unit.T
    else:
        author_cos = np.zeros((centroids.shape[0], centroids.shape[0]))

    # Strip hidden centroid key before serialising.
    for a in authors:
        del a["_centroid_embedding"]

    variance_explained = [float(v) for v in pca.explained_variance_ratio_]
    while len(variance_explained) < 2:
        variance_explained.append(0.0)

    provenance = build_provenance(
        bundle=bundle,
        operation="author_constellation",
        operator_name="pca_2d_by_author",
        operator_params={"min_documents": int(min_documents)},
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
        "pca2d_variance": variance_explained[:2],
        "all_documents_2d": corpus_2d.tolist(),
        "authors": authors,
        "author_pair_cosine": {
            "names": author_names,
            "matrix": author_cos.tolist(),
        },
        "provenance": provenance.to_dict(),
    }
