"""
Concept Locator.

Embed a user-supplied concept or short text into the same space as
the loaded corpus. Report the nearest documents, the nearest authors,
and the principal component most aligned with the query. The operation
answers: where does this concept sit in the field, and along which
computed axis does it vary?
"""

from __future__ import annotations

from typing import Any, Dict, List

import numpy as np
from sklearn.decomposition import PCA

from corpus.embed import embed_texts
from corpus.pipeline import CorpusSpec, build_provenance, ingest_and_embed


def _aggregate_by_author(
    documents: List[Dict[str, Any]],
    embeddings: np.ndarray,
) -> Dict[str, Dict[str, Any]]:
    """Group documents by author and return centroid + member indices."""
    buckets: Dict[str, List[int]] = {}
    for i, doc in enumerate(documents):
        buckets.setdefault(doc["author"], []).append(i)
    out: Dict[str, Dict[str, Any]] = {}
    for author, idxs in buckets.items():
        if not idxs:
            continue
        centroid = embeddings[idxs].mean(axis=0)
        norm = float(np.linalg.norm(centroid))
        if norm > 1e-12:
            centroid = centroid / norm
        out[author] = {
            "centroid": centroid.astype(np.float32),
            "indices": idxs,
        }
    return out


def compute_concept_locator(
    spec: CorpusSpec,
    query_text: str,
    query_label: str = "",
    n_nearest_docs: int = 8,
    n_nearest_authors: int = 5,
    n_components: int = 6,
) -> Dict[str, Any]:
    """
    Parameters
    ----------
    spec : CorpusSpec
    query_text : str
        Free-text concept or short passage to locate.
    query_label : str
        Short display label for provenance (defaults to the text's first
        40 characters).
    n_nearest_docs, n_nearest_authors : int
    n_components : int
        Size of the eigenbasis used to report per-axis alignment.
    """
    if not query_text.strip():
        raise ValueError("query_text is empty.")

    bundle = ingest_and_embed(spec)
    n_docs = bundle.embeddings.shape[0]
    if n_docs < 2:
        raise ValueError(
            f"Corpus has only {n_docs} document(s); Concept Locator needs at least 2."
        )
    n_nearest_docs = max(1, min(int(n_nearest_docs), n_docs))
    n_components = max(2, min(int(n_components), min(n_docs, 20)))

    # Embed the query in the same space. Since both embedding_documents and
    # embed_texts return L2-normalised rows, cosine similarity = dot product.
    query_vec = embed_texts([query_text], model_id=bundle.embedding_spec.model_id)[0]

    doc_sims = bundle.embeddings @ query_vec  # (n_docs,)

    # Top-N nearest documents.
    nearest_idx = np.argsort(-doc_sims)[:n_nearest_docs]
    nearest_documents = [
        {
            **{
                "id": bundle.documents[int(i)].id,
                "author": bundle.documents[int(i)].author,
                "year": bundle.documents[int(i)].year,
                "title": bundle.documents[int(i)].title,
            },
            "similarity": float(doc_sims[int(i)]),
        }
        for i in nearest_idx
    ]

    # Nearest authors by centroid cosine.
    docs_as_dicts = [
        {
            "id": d.id,
            "author": d.author,
            "year": d.year,
            "title": d.title,
            "tags": list(d.tags),
        }
        for d in bundle.documents
    ]
    author_buckets = _aggregate_by_author(docs_as_dicts, bundle.embeddings)
    author_sims = sorted(
        (
            (author, float(np.dot(info["centroid"], query_vec)), len(info["indices"]))
            for author, info in author_buckets.items()
        ),
        key=lambda x: -x[1],
    )[:n_nearest_authors]
    nearest_authors = [
        {"author": name, "similarity": sim, "n_documents": count}
        for name, sim, count in author_sims
    ]

    # Project query onto corpus eigenbasis; report most-aligned PC.
    pca = PCA(n_components=n_components)
    pca.fit(bundle.embeddings)
    # Centre the query the same way PCA centred the corpus.
    centred_query = query_vec - pca.mean_
    projection = centred_query @ pca.components_.T  # (n_components,)
    norm_query = float(np.linalg.norm(centred_query))
    norm_components = np.linalg.norm(pca.components_, axis=1)  # should be ~1 each
    with np.errstate(divide="ignore", invalid="ignore"):
        cosines = projection / (norm_query * norm_components + 1e-12)
    abs_cos = np.abs(cosines)
    best_pc = int(np.argmax(abs_cos))
    per_component = [
        {
            "index": pc,
            "variance_explained": float(pca.explained_variance_ratio_[pc]),
            "projection": float(projection[pc]),
            "abs_cosine": float(abs_cos[pc]),
            "signed_cosine": float(cosines[pc]),
        }
        for pc in range(n_components)
    ]

    label = (query_label or query_text.strip()[:40]).strip()
    provenance = build_provenance(
        bundle=bundle,
        operation="concept_locator",
        operator_name="cosine_and_pca",
        operator_params={
            "query_label": label,
            "query_char_length": len(query_text),
            "n_components": n_components,
            "n_nearest_docs": n_nearest_docs,
            "n_nearest_authors": n_nearest_authors,
        },
    )

    return {
        "query": {
            "label": label,
            "char_length": len(query_text),
        },
        "nearest_documents": nearest_documents,
        "nearest_authors": nearest_authors,
        "eigenbasis": {
            "best_pc": best_pc,
            "per_component": per_component,
        },
        "provenance": provenance.to_dict(),
    }
