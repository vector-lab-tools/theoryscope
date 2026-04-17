"""
Provenance records.

Every Theoryscope result carries a ProvenanceRecord so that findings can be
reproduced and cited. The record is the methodological commitment of the
Vector Lab made concrete: embedding, corpus, operator, and chunking choices
travel with the result, not separately from it.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


@dataclass
class ChunkingSpec:
    strategy: str  # "paragraph" | "token_window" | "none"
    max_tokens: int = 512
    overlap: int = 0


@dataclass
class EmbeddingSpec:
    model_id: str             # e.g. "sentence-transformers/all-MiniLM-L6-v2"
    model_revision: str = ""  # HF commit hash when known
    dimension: int = 0


@dataclass
class OperatorSpec:
    name: str = ""            # e.g. "aggregative" | "semantic" | "lexical"
    params: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CorpusSource:
    kind: str                 # "hardcoded" | "zotero" | "file"
    identifier: str = ""      # Zotero collection key or list name
    filters: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ProvenanceRecord:
    corpus_source: CorpusSource
    document_ids: List[str]
    ingestion_timestamp: str
    embedding: EmbeddingSpec
    chunking: ChunkingSpec
    operation: str = ""
    operator: OperatorSpec = field(default_factory=OperatorSpec)
    stability_score: Optional[float] = None
    notes: str = ""

    @property
    def corpus_hash(self) -> str:
        """SHA-256 over the sorted document IDs and chunking parameters."""
        payload = {
            "document_ids": sorted(self.document_ids),
            "chunking": asdict(self.chunking),
        }
        blob = json.dumps(payload, sort_keys=True).encode("utf-8")
        return hashlib.sha256(blob).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        out = asdict(self)
        out["corpus_hash"] = self.corpus_hash
        return out


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")
