"""
Zotero ingestion via pyzotero.

Two modes:
  - Discovery: list collections and tags in a library (cheap, live).
  - Ingestion: pull every item in a collection into a list of Documents.

Zotero credentials are supplied per-request by the frontend and never
persisted server-side. The user can store them in localStorage on the
frontend if they choose; the backend holds no secrets at rest.

The document text used for embedding is the abstract where available,
falling back to title alone. Phase 2 will add full-text via attachments.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from .loader import Document


ZoteroLibraryType = str  # "user" | "group"


@dataclass
class ZoteroCollection:
    key: str
    name: str
    parent_key: Optional[str]
    num_items: int


def _make_client(library_id: str, library_type: str, api_key: str):
    """Lazy import so the module can be read without pyzotero installed."""
    try:
        from pyzotero import zotero
    except ImportError as e:  # pragma: no cover
        raise RuntimeError(
            "pyzotero is not installed. Run backend/setup.sh to install "
            "the backend requirements."
        ) from e

    if library_type not in {"user", "group"}:
        raise ValueError(
            f"Invalid library_type '{library_type}' (expected 'user' or 'group')"
        )
    return zotero.Zotero(library_id, library_type, api_key)


def list_collections(
    library_id: str,
    library_type: ZoteroLibraryType,
    api_key: str,
) -> List[ZoteroCollection]:
    """Return every collection in the library, flat (not nested)."""
    zot = _make_client(library_id, library_type, api_key)
    raw = zot.collections()
    collections: List[ZoteroCollection] = []
    for c in raw:
        data = c.get("data", {})
        meta = c.get("meta", {})
        collections.append(
            ZoteroCollection(
                key=c.get("key", ""),
                name=data.get("name", "(untitled)"),
                parent_key=data.get("parentCollection") or None,
                num_items=int(meta.get("numItems", 0) or 0),
            )
        )
    collections.sort(key=lambda c: c.name.lower())
    return collections


def _first_author(creators: List[Dict[str, Any]]) -> str:
    """Return 'Lastname, F.' or 'Lastname' for the first author-type creator."""
    for creator in creators or []:
        if creator.get("creatorType", "").lower() not in {
            "author",
            "editor",
            "contributor",
            "bookauthor",
        }:
            continue
        last = creator.get("lastName") or ""
        first = creator.get("firstName") or ""
        if creator.get("name"):
            return creator["name"]
        if last and first:
            return f"{last}, {first[0]}."
        if last:
            return last
    return "(unknown)"


def _year_from_date(date: str) -> int:
    """Best-effort year extraction from Zotero's 'date' field."""
    if not date:
        return 0
    for token in date.replace("/", " ").replace("-", " ").split():
        if token.isdigit() and len(token) == 4:
            try:
                return int(token)
            except ValueError:
                continue
    return 0


def _item_to_document(item: Dict[str, Any]) -> Optional[Document]:
    data = item.get("data", {})
    item_type = data.get("itemType", "")

    if item_type in {"attachment", "note", "annotation"}:
        return None

    title = (data.get("title") or "").strip()
    if not title:
        return None

    abstract = (data.get("abstractNote") or "").strip()
    text = abstract if abstract else title

    tags = [t.get("tag", "") for t in data.get("tags", []) if t.get("tag")]

    return Document(
        id=item.get("key", title[:32]),
        author=_first_author(data.get("creators") or []),
        year=_year_from_date(data.get("date") or ""),
        title=title,
        text=text,
        tags=tags,
    )


def fetch_collection(
    library_id: str,
    library_type: ZoteroLibraryType,
    api_key: str,
    collection_key: str,
    limit: int = 500,
) -> List[Document]:
    """Pull every substantive item (paper, book, chapter) in a collection."""
    zot = _make_client(library_id, library_type, api_key)
    raw_items = zot.collection_items(collection_key, limit=limit)
    documents: List[Document] = []
    for item in raw_items:
        doc = _item_to_document(item)
        if doc is not None:
            documents.append(doc)
    return documents
