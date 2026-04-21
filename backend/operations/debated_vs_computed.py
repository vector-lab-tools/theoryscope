"""
Debated vs Computed.

The critic names the oppositions a field is said to be structured by
(e.g. "analytic vs continental", "materialism vs idealism",
"instrumental vs substantive"). The tool embeds each pole as a short
text, constructs a direction vector, and finds the computed principal
component most aligned with it.

The payload reports, per debate, the best-matching PC, the alignment
magnitude, the variance that PC explains, and the gap between the
debated axis and the most-variance axis. A low alignment on every PC
means the field's variance does not track this debate at all; a high
alignment on a low-rank PC means the debate is present but marginal;
a high alignment on PC1 means the debate dominates.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List

import numpy as np
from sklearn.decomposition import PCA

from corpus.embed import embed_texts
from corpus.pipeline import CorpusSpec, build_provenance, ingest_and_embed


@dataclass
class DebatePayload:
    label: str
    pole_a_text: str
    pole_b_text: str
    pole_a_label: str = ""
    pole_b_label: str = ""


def _unit(vec: np.ndarray) -> np.ndarray:
    n = float(np.linalg.norm(vec))
    if n < 1e-12:
        return vec.astype(np.float32)
    return (vec / n).astype(np.float32)


def compute_debated_vs_computed(
    spec: CorpusSpec,
    debates: List[DebatePayload],
    n_components: int = 6,
) -> Dict[str, Any]:
    if not debates:
        raise ValueError("At least one debate pair is required.")

    bundle = ingest_and_embed(spec)
    embeddings = bundle.embeddings
    n_docs = embeddings.shape[0]
    if n_docs < 3:
        raise ValueError(
            f"Corpus has only {n_docs} document(s); Debated-vs-Computed needs at least 3."
        )
    n_components = max(2, min(int(n_components), min(n_docs, 20)))

    # Pool every pole text into one batch call so sentence-transformers only
    # loads the model once.
    flat_texts: List[str] = []
    for d in debates:
        flat_texts.append(d.pole_a_text)
        flat_texts.append(d.pole_b_text)
    pole_vecs = embed_texts(flat_texts, model_id=bundle.embedding_spec.model_id)

    # Corpus PCA.
    pca = PCA(n_components=n_components)
    pca.fit(embeddings)
    components = pca.components_                    # (n_components, dim)
    comp_norms = np.linalg.norm(components, axis=1) + 1e-12

    results: List[Dict[str, Any]] = []
    for i, debate in enumerate(debates):
        pole_a = pole_vecs[2 * i]
        pole_b = pole_vecs[2 * i + 1]
        direction = _unit(pole_b - pole_a)        # debate axis
        # Project onto the corpus eigenbasis (not centred: a direction is
        # translation-invariant).
        signed_cos = (components @ direction) / (comp_norms * (np.linalg.norm(direction) + 1e-12))
        abs_cos = np.abs(signed_cos)
        best_pc = int(np.argmax(abs_cos))
        per_component = [
            {
                "pc": pc,
                "signed_cosine": float(signed_cos[pc]),
                "abs_cosine": float(abs_cos[pc]),
                "variance_explained": float(pca.explained_variance_ratio_[pc]),
            }
            for pc in range(n_components)
        ]
        # "Dominance score": how much of the corpus's variance this debate's
        # best-matching PC carries. High best_alignment × high variance ⇒
        # the debate really is structural. High alignment but tiny variance
        # ⇒ the debate is legible but marginal.
        dominance = float(
            abs_cos[best_pc] * pca.explained_variance_ratio_[best_pc]
        )
        results.append(
            {
                "index": i,
                "label": debate.label,
                "pole_a_label": debate.pole_a_label or "pole A",
                "pole_b_label": debate.pole_b_label or "pole B",
                "pole_a_text": debate.pole_a_text,
                "pole_b_text": debate.pole_b_text,
                "best_pc": best_pc,
                "best_abs_cosine": float(abs_cos[best_pc]),
                "best_signed_cosine": float(signed_cos[best_pc]),
                "best_variance_explained": float(
                    pca.explained_variance_ratio_[best_pc]
                ),
                "dominance_score": dominance,
                "per_component": per_component,
            }
        )

    # Sort debates by dominance so the most-legibly-structural ones lead.
    ranked = sorted(range(len(results)), key=lambda i: -results[i]["dominance_score"])

    provenance = build_provenance(
        bundle=bundle,
        operation="debated_vs_computed",
        operator_name="pca_alignment",
        operator_params={
            "n_components": n_components,
            "n_debates": len(debates),
        },
    )

    return {
        "pca_variance_explained": [
            float(v) for v in pca.explained_variance_ratio_
        ],
        "debates": results,
        "ranked_indices": ranked,
        "provenance": provenance.to_dict(),
    }
