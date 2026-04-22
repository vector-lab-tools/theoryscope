"""
Corpus-vs-Model Probe.

The reflexive operation. Compare a corpus's eigendirections (computed
by the baseline sentence-transformers embedding) against the
eigendirections of an open-weight generative model's own reading of
the same corpus. The model reads each document via a forward pass
and we take the mean-pooled last hidden state as its "view" of that
document.

This is the Castelle-level methodological question made operational:
does the field's geometry, as measured by a dedicated embedding
model, agree with how a generative model organises the same texts?
Where the two agree, the axis is plausibly structural; where they
disagree, the generative model's compression has reshaped the field.

The output distinguishes:
  - Agreement mode: baseline PCs with high alignment to a model PC.
  - Disagreement mode: baseline PCs whose matched model PC is weak
    (the model's compression did not preserve this axis).
  - Delta directions: model PCs ranked by alignment — low-alignment
    PCs are axes the model produced that do not correspond to the
    baseline.

No external APIs. The generative model runs locally via HuggingFace
transformers (PyTorch). First run per model downloads ~300 MB – 1.5 GB
from HuggingFace. Results are cached on disk per (corpus_hash, model_id).
"""

from __future__ import annotations

import hashlib
import logging
from dataclasses import asdict
from typing import Any, Dict, List

import numpy as np
from sklearn.decomposition import PCA

from corpus.model_embeddings import load as load_model_embs, save as save_model_embs
from corpus.pipeline import CorpusSpec, build_provenance, ingest_and_embed
from geometry.eigen_align import align_via_doc_projection

logger = logging.getLogger(__name__)


# Open-weight ungated generative models, ordered roughly by size.
AVAILABLE_MODELS: List[Dict[str, Any]] = [
    {
        "model_id": "HuggingFaceTB/SmolLM2-135M",
        "label": "SmolLM2 135M (fast)",
        "size_mb": 300,
    },
    {
        "model_id": "openai-community/gpt2",
        "label": "GPT-2 124M (classic)",
        "size_mb": 550,
    },
    {
        "model_id": "HuggingFaceTB/SmolLM2-360M",
        "label": "SmolLM2 360M",
        "size_mb": 750,
    },
    {
        "model_id": "Qwen/Qwen3-0.6B",
        "label": "Qwen3 0.6B",
        "size_mb": 1200,
    },
]


def list_available_models() -> List[Dict[str, Any]]:
    return list(AVAILABLE_MODELS)


def _resolve_model(model_id: str) -> Dict[str, Any]:
    for entry in AVAILABLE_MODELS:
        if entry["model_id"] == model_id:
            return entry
    raise ValueError(
        f"Unknown model '{model_id}'. Supported: "
        + ", ".join(m["model_id"] for m in AVAILABLE_MODELS)
    )


def _model_embed_documents(
    texts: List[str],
    model_id: str,
    max_length: int = 512,
) -> np.ndarray:
    """Forward-pass each document through the model and mean-pool the
    last hidden state with the attention mask. Returns
    (n_docs, hidden_dim).

    Lazy-imports transformers + torch so the backend can be inspected
    without the heavy import path firing.
    """
    try:
        import torch
        from transformers import AutoModel, AutoTokenizer
    except ImportError as e:  # pragma: no cover
        raise RuntimeError(
            "The `transformers` and `torch` packages are required. "
            "Run backend/setup.sh to install the backend requirements."
        ) from e

    tokenizer = AutoTokenizer.from_pretrained(model_id)
    if tokenizer.pad_token is None and tokenizer.eos_token is not None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModel.from_pretrained(model_id)
    model.eval()

    device = torch.device(
        "cuda" if torch.cuda.is_available()
        else "mps" if torch.backends.mps.is_available()
        else "cpu"
    )
    model = model.to(device)

    embeddings = []
    with torch.no_grad():
        for text in texts:
            enc = tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=max_length,
                padding=False,
            )
            enc = {k: v.to(device) for k, v in enc.items()}
            out = model(**enc, output_hidden_states=False, return_dict=True)
            # Mean-pool the last hidden state with the attention mask.
            last_hidden = out.last_hidden_state  # (1, seq, dim)
            mask = enc["attention_mask"].unsqueeze(-1).float()  # (1, seq, 1)
            denom = mask.sum(dim=1).clamp(min=1)
            pooled = (last_hidden * mask).sum(dim=1) / denom
            embeddings.append(pooled.squeeze(0).cpu().numpy())

    return np.stack(embeddings).astype(np.float32)


def _corpus_hash(bundle) -> str:
    ids = sorted(d.id for d in bundle.documents)
    blob = "|".join(ids).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()[:24]


def _format_loadings(
    documents, coords: np.ndarray, n_loadings: int
) -> List[List[Dict[str, Any]]]:
    """Return per-component ranked [+pos, -neg] loadings."""
    n_components = coords.shape[1]
    n_loadings = max(1, min(int(n_loadings), coords.shape[0]))
    out: List[List[Dict[str, Any]]] = []
    for pc in range(n_components):
        scores = coords[:, pc]
        pos = np.argsort(-scores)[:n_loadings]
        neg = np.argsort(scores)[:n_loadings]
        out.append(
            [
                {
                    "id": documents[i].id,
                    "author": documents[i].author,
                    "year": documents[i].year,
                    "title": documents[i].title,
                    "score": float(scores[i]),
                    "pole": "positive",
                }
                for i in pos
            ]
            + [
                {
                    "id": documents[i].id,
                    "author": documents[i].author,
                    "year": documents[i].year,
                    "title": documents[i].title,
                    "score": float(scores[i]),
                    "pole": "negative",
                }
                for i in neg
            ]
        )
    return out


def compute_corpus_vs_model(
    spec: CorpusSpec,
    model_id: str,
    n_components: int = 5,
    n_loadings: int = 3,
    max_corpus_size: int = 2000,
) -> Dict[str, Any]:
    model_info = _resolve_model(model_id)
    bundle = ingest_and_embed(spec)
    n_docs = bundle.embeddings.shape[0]
    if n_docs < 4:
        raise ValueError(
            f"Corpus has only {n_docs} document(s); Corpus-vs-Model Probe needs at least 4."
        )
    if n_docs > max_corpus_size:
        raise ValueError(
            f"Corpus has {n_docs} documents; the Corpus-vs-Model Probe caps at "
            f"{max_corpus_size} to keep local model inference tractable."
        )
    n_components = max(2, min(int(n_components), min(n_docs, 20)))

    corpus_hash = _corpus_hash(bundle)
    cached = load_model_embs(corpus_hash, model_info["model_id"])
    if cached is None:
        logger.info(
            "Running model %s over %d documents (first run downloads the model)",
            model_info["model_id"],
            n_docs,
        )
        texts = [d.text for d in bundle.documents]
        model_emb = _model_embed_documents(texts, model_info["model_id"])
        save_model_embs(
            corpus_hash,
            model_info["model_id"],
            model_emb,
            meta={
                "model_id": model_info["model_id"],
                "corpus_hash": corpus_hash,
                "hidden_dim": int(model_emb.shape[1]),
                "n_docs": int(model_emb.shape[0]),
            },
        )
        cache_hit = False
    else:
        model_emb, _ = cached
        cache_hit = True

    # PCA on both bases.
    pca_baseline = PCA(n_components=n_components)
    coords_baseline = pca_baseline.fit_transform(bundle.embeddings).astype(
        np.float32
    )
    pca_model = PCA(n_components=n_components)
    coords_model = pca_model.fit_transform(model_emb).astype(np.float32)

    # Align by per-document projections so dim differences don't matter.
    alignment = align_via_doc_projection(coords_baseline, coords_model)

    # Agreement mode / disagreement mode buckets.
    matches_payload = [asdict(m) for m in alignment.matches]
    for m in matches_payload:
        m["mode"] = (
            "agreement"
            if m["abs_cosine"] >= 0.6
            else "partial"
            if m["abs_cosine"] >= 0.3
            else "disagreement"
        )

    # Delta directions: model PCs NOT matched to any baseline PC (or matched
    # with low |cos|). The greedy matcher reserves one model PC per baseline
    # PC, so unmatched model PCs are easy to find.
    matched_model_pcs = {m["b_index"] for m in matches_payload}
    delta_directions: List[Dict[str, Any]] = []
    for model_pc in range(n_components):
        if model_pc in matched_model_pcs:
            continue
        delta_directions.append(
            {
                "model_pc": model_pc,
                "variance_explained": float(
                    pca_model.explained_variance_ratio_[model_pc]
                ),
            }
        )
    # Also mark any matched pair with very low alignment as effectively a
    # delta — we preserve the match but annotate it.
    for m in matches_payload:
        if m["abs_cosine"] < 0.3:
            delta_directions.append(
                {
                    "model_pc": m["b_index"],
                    "variance_explained": float(
                        pca_model.explained_variance_ratio_[m["b_index"]]
                    ),
                    "weakly_matched_to_baseline_pc": m["a_index"],
                    "matched_abs_cosine": m["abs_cosine"],
                }
            )

    baseline_loadings = _format_loadings(
        bundle.documents, coords_baseline, n_loadings
    )
    model_loadings = _format_loadings(
        bundle.documents, coords_model, n_loadings
    )

    provenance = build_provenance(
        bundle=bundle,
        operation="corpus_vs_model",
        operator_name="pca_procrustes_projection",
        operator_params={
            "model_id": model_info["model_id"],
            "model_label": model_info["label"],
            "n_components": n_components,
            "n_loadings": n_loadings,
        },
    )

    return {
        "model": {
            "model_id": model_info["model_id"],
            "label": model_info["label"],
            "hidden_dim": int(model_emb.shape[1]),
        },
        "cache_hit": cache_hit,
        "n_components": n_components,
        "baseline": {
            "model_id": bundle.embedding_spec.model_id,
            "dimension": bundle.embedding_spec.dimension,
            "variance_explained": [
                float(v) for v in pca_baseline.explained_variance_ratio_
            ],
            "loadings": baseline_loadings,
        },
        "probe": {
            "model_id": model_info["model_id"],
            "dimension": int(model_emb.shape[1]),
            "variance_explained": [
                float(v) for v in pca_model.explained_variance_ratio_
            ],
            "loadings": model_loadings,
        },
        "alignment": {
            "matches": matches_payload,
            "per_component": alignment.per_component,
            "stability": alignment.stability,
        },
        "delta_directions": delta_directions,
        "provenance": provenance.to_dict(),
    }
