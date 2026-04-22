"""
On-disk cache for open-weight-model embeddings of the corpus.

The Corpus-vs-Model Probe runs a forward pass of a local generative
model (GPT-2, SmolLM, Qwen) over every document and mean-pools the
last hidden state. That computation is more expensive than a
sentence-transformers pass, so we cache the resulting matrix per
(corpus_hash, model_id) — same pattern as the translations cache.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Optional, Tuple

import numpy as np

from .cache import CACHE_ROOT, ensure_cache_dirs


MODEL_EMB_DIR = CACHE_ROOT / "model_embeddings"


def _key(corpus_hash: str, model_id: str) -> str:
    blob = f"{corpus_hash}:{model_id}".encode("utf-8")
    return hashlib.sha256(blob).hexdigest()[:24]


def _paths(key: str) -> Tuple[Path, Path]:
    return MODEL_EMB_DIR / f"{key}.npz", MODEL_EMB_DIR / f"{key}.json"


def _ensure() -> None:
    ensure_cache_dirs()
    MODEL_EMB_DIR.mkdir(parents=True, exist_ok=True)


def load(
    corpus_hash: str,
    model_id: str,
) -> Optional[Tuple[np.ndarray, dict]]:
    """Return (embeddings, meta) or None on cache miss."""
    _ensure()
    npz_path, json_path = _paths(_key(corpus_hash, model_id))
    if not npz_path.exists() or not json_path.exists():
        return None
    try:
        with np.load(npz_path) as npz:
            embeddings = np.asarray(npz["embeddings"], dtype=np.float32)
        meta = json.loads(json_path.read_text(encoding="utf-8"))
        return embeddings, meta
    except Exception:
        return None


def save(
    corpus_hash: str,
    model_id: str,
    embeddings: np.ndarray,
    meta: dict,
) -> None:
    _ensure()
    npz_path, json_path = _paths(_key(corpus_hash, model_id))
    np.savez_compressed(npz_path, embeddings=embeddings.astype(np.float32))
    json_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
