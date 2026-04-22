"""
Temporal RG Flow.

Coarse-grain the corpus by progressively coarser time windows rather
than by semantic k-means clustering. Each step groups documents into
year bins of a given width (decade, two decades, etc.), places every
document at the centroid of its bin, and projects the result onto the
shared PCA-2D basis of the fine-grained corpus.

Reading the flow: eigendirections that remain visible across time
windows track a long-running axis of variation in the field;
eigendirections that only appear at fine temporal resolution are
period-specific. Decade-level coarse-graining is a different critical
question from semantic abstraction — it asks whether a field's
variation is historical or conceptual.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List

import numpy as np
from sklearn.decomposition import PCA

from corpus.pipeline import CorpusSpec, build_provenance, ingest_and_embed


def _default_bin_widths(
    year_span: int, n_steps: int = 6
) -> List[int]:
    """Log-spaced bin widths from 1 year up to the full corpus span."""
    n_steps = max(2, int(n_steps))
    lo = 1
    hi = max(lo + 1, year_span)
    widths = [1]
    log_targets = np.linspace(np.log(10), np.log(hi), n_steps - 1)
    for t in log_targets:
        w = int(round(float(np.exp(t))))
        w = max(10, min(w, year_span))
        if w != widths[-1]:
            widths.append(w)
    if widths[-1] != year_span:
        widths.append(year_span)
    return widths


def _bin_year(year: int, width: int, anchor: int) -> int:
    """Bin a year into a window of `width` starting from `anchor`."""
    if width <= 1:
        return year
    return anchor + ((year - anchor) // width) * width


def compute_temporal_flow(
    spec: CorpusSpec,
    n_steps: int = 6,
) -> Dict[str, Any]:
    bundle = ingest_and_embed(spec)
    embeddings = bundle.embeddings
    documents = bundle.documents
    n_docs = embeddings.shape[0]

    if n_docs < 4:
        raise ValueError(
            f"Corpus has only {n_docs} document(s); Temporal RG Flow needs at least 4."
        )

    years = np.array([d.year for d in documents], dtype=np.int64)
    valid_mask = years > 0
    if valid_mask.sum() < 3:
        raise ValueError(
            "Temporal RG Flow needs at least 3 documents with year > 0. "
            "Either the corpus has no publication years, or they are "
            "missing from the metadata."
        )

    year_min = int(years[valid_mask].min())
    year_max = int(years[valid_mask].max())
    year_span = max(1, year_max - year_min + 1)

    # Documents with year == 0 are treated as their own perpetual bin
    # (labelled year = -1 by convention below).
    bin_widths = _default_bin_widths(year_span, n_steps=n_steps)

    # Shared PCA-2D basis so all steps share a coordinate system.
    n_comp = min(2, embeddings.shape[1])
    pca = PCA(n_components=n_comp)
    pca.fit(embeddings)

    def project_2d(matrix: np.ndarray) -> np.ndarray:
        proj = pca.transform(matrix).astype(np.float32)
        if proj.shape[1] < 2:
            pad = np.zeros((proj.shape[0], 2 - proj.shape[1]), dtype=np.float32)
            proj = np.hstack([proj, pad])
        return proj

    # Baseline step: every document is its own "bin".
    steps: List[Dict[str, Any]] = []
    for step_idx, width in enumerate(bin_widths):
        if width <= 1:
            labels = np.array(
                [y if y > 0 else -1 for y in years.tolist()], dtype=np.int64
            )
        else:
            labels = np.array(
                [
                    _bin_year(int(y), width, year_min) if y > 0 else -1
                    for y in years.tolist()
                ],
                dtype=np.int64,
            )

        # Per-bin centroids in embedding space.
        unique_labels = sorted(set(labels.tolist()))
        label_to_index = {lbl: i for i, lbl in enumerate(unique_labels)}
        doc_positions = np.zeros_like(embeddings, dtype=np.float32)
        bin_entries: List[Dict[str, Any]] = []
        for lbl in unique_labels:
            mask = labels == lbl
            centroid = embeddings[mask].mean(axis=0)
            doc_positions[mask] = centroid
            bin_entries.append(
                {
                    "label": int(lbl),
                    "n_documents": int(mask.sum()),
                    "year_range": (
                        (int(lbl), int(lbl + width - 1))
                        if lbl > 0
                        else (-1, -1)
                    ),
                }
            )

        coords_2d = project_2d(doc_positions)
        steps.append(
            {
                "step": step_idx,
                "width": int(width),
                "n_bins": len(unique_labels),
                "doc_coords_2d": coords_2d.tolist(),
                "doc_bin_labels": [
                    int(label_to_index[int(lbl)]) for lbl in labels.tolist()
                ],
                "bins": bin_entries,
            }
        )

    # Documents payload with year for colouring.
    documents_payload = [
        {
            "id": d.id,
            "author": d.author,
            "year": d.year,
            "title": d.title,
            "tags": list(d.tags),
        }
        for d in documents
    ]

    provenance = build_provenance(
        bundle=bundle,
        operation="temporal_flow",
        operator_name="temporal_bin_aggregation",
        operator_params={
            "n_steps": n_steps,
            "bin_widths_years": bin_widths,
            "year_min": year_min,
            "year_max": year_max,
        },
    )

    return {
        "documents": documents_payload,
        "year_range": {"min": year_min, "max": year_max, "span": year_span},
        "schedule": bin_widths,
        "pca2d_variance": [
            float(v) for v in pca.explained_variance_ratio_[:2]
        ]
        + [0.0] * max(0, 2 - len(pca.explained_variance_ratio_)),
        "steps": steps,
        "provenance": provenance.to_dict(),
    }
