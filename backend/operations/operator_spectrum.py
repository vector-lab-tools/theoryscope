"""
Relevant / Irrelevant Operator Spectrum.

For each user-supplied concept, measure how much of the concept's
discriminating power across documents is preserved as the corpus is
progressively coarse-grained. Concepts whose variance is preserved
across the flow are "relevant operators" — their axis of variation
aligns with the structure the coarse-graining preserves. Concepts
whose variance collapses are "irrelevant operators" — the flow
averages them out.

Relevance score per concept: the mean variance-ratio across every step
in the schedule (relative to the fine-grained baseline variance).
A score near 1.0 means the concept is preserved at every scale; a
score near 0.0 means it washes out almost immediately.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List

import numpy as np
from sklearn.cluster import KMeans

from corpus.embed import embed_texts
from corpus.pipeline import CorpusSpec, build_provenance, ingest_and_embed


@dataclass
class ConceptProbe:
    label: str
    text: str


def _assign_kmeans(embeddings: np.ndarray, k: int, seed: int = 0) -> np.ndarray:
    k = max(1, min(k, embeddings.shape[0]))
    if k == embeddings.shape[0]:
        labels = np.arange(embeddings.shape[0])
        return labels.astype(np.int32)
    km = KMeans(n_clusters=k, n_init=10, random_state=seed)
    return km.fit_predict(embeddings).astype(np.int32)


def _default_schedule(n_docs: int, n_steps: int = 6) -> List[int]:
    n_steps = max(2, int(n_steps))
    schedule = [n_docs]
    lo = 2
    hi = max(lo + 1, n_docs)
    if hi <= lo:
        return schedule
    log_targets = np.linspace(np.log(hi), np.log(lo), n_steps)
    for t in log_targets[1:]:
        k = int(round(float(np.exp(t))))
        k = max(lo, min(k, n_docs - 1))
        if k != schedule[-1]:
            schedule.append(k)
    if schedule[-1] != lo:
        schedule.append(lo)
    return schedule


def _mean_centroid_positions(
    embeddings: np.ndarray, labels: np.ndarray
) -> np.ndarray:
    """Return an (n_docs, dim) matrix where each row is its cluster centroid."""
    n_docs, dim = embeddings.shape
    centroids = np.zeros((n_docs, dim), dtype=np.float32)
    for lbl in np.unique(labels):
        mask = labels == lbl
        centroids[mask] = embeddings[mask].mean(axis=0)
    return centroids


def compute_operator_spectrum(
    spec: CorpusSpec,
    concepts: List[ConceptProbe],
    n_steps: int = 6,
    seed: int = 0,
) -> Dict[str, Any]:
    if not concepts:
        raise ValueError("At least one concept probe is required.")

    bundle = ingest_and_embed(spec)
    embeddings = bundle.embeddings
    n_docs = embeddings.shape[0]
    if n_docs < 4:
        raise ValueError(
            f"Corpus has only {n_docs} document(s); Operator Spectrum needs at least 4."
        )

    # Embed all concept probes in a single batch.
    concept_vecs = embed_texts(
        [c.text for c in concepts], model_id=bundle.embedding_spec.model_id
    )

    schedule = _default_schedule(n_docs, n_steps=n_steps)

    # Baseline similarities and variance per concept.
    baseline_sims = embeddings @ concept_vecs.T  # (n_docs, n_concepts)
    baseline_var = np.var(baseline_sims, axis=0)
    baseline_var_safe = np.where(baseline_var < 1e-12, 1e-12, baseline_var)

    # For each step, compute variance ratio per concept.
    ratios = np.zeros((len(schedule), len(concepts)), dtype=np.float32)
    for step_idx, k in enumerate(schedule):
        labels = _assign_kmeans(embeddings, k, seed=seed)
        positions = _mean_centroid_positions(embeddings, labels)
        sims = positions @ concept_vecs.T  # (n_docs, n_concepts)
        var_at_step = np.var(sims, axis=0)
        ratios[step_idx] = var_at_step / baseline_var_safe

    # Per-concept relevance score = mean ratio across all steps,
    # clipped to [0, 1]. Higher = more relevant.
    relevance = np.clip(ratios.mean(axis=0), 0.0, 1.0)

    per_concept: List[Dict[str, Any]] = []
    for i, c in enumerate(concepts):
        per_concept.append(
            {
                "index": i,
                "label": c.label,
                "text": c.text,
                "baseline_variance": float(baseline_var[i]),
                "relevance_score": float(relevance[i]),
                "ratios_per_step": [float(v) for v in ratios[:, i]],
            }
        )

    ranked = sorted(
        range(len(concepts)),
        key=lambda i: -per_concept[i]["relevance_score"],
    )

    provenance = build_provenance(
        bundle=bundle,
        operation="operator_spectrum",
        operator_name="aggregative_kmeans_variance_ratio",
        operator_params={
            "n_steps": n_steps,
            "seed": seed,
            "schedule": schedule,
            "n_concepts": len(concepts),
        },
    )

    return {
        "schedule": schedule,
        "concepts": per_concept,
        "ranked_indices": ranked,
        "provenance": provenance.to_dict(),
    }
