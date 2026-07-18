"""
chunk_store.py

Reads a repository's chunks back out of Qdrant, replacing the in-memory
`all_chunks` list that BM25 and dependency expansion previously depended on.

Qdrant is the source of truth. The dictionaries cached here are a DERIVED
cache — losing them costs one reload, never a re-clone, and any process can
rebuild them independently. That is what makes multi-process deployment and
restarts safe.

Chunk payloads stored in Qdrant already have the exact shape the retrieval
code expects ({name, type, file, code}), so no conversion is needed.
"""

from typing import Dict, List, Optional

from rank_bm25 import BM25Okapi

from vector_store import client

# collection_name -> list of chunk dicts
_chunk_cache: Dict[str, List[dict]] = {}

# collection_name -> (BM25Okapi index, chunks it was built from)
_bm25_cache: Dict[str, tuple] = {}

SCROLL_BATCH = 256


def load_chunks(collection_name: str) -> List[dict]:
    """
    All chunks for one repository, read from its Qdrant collection.

    Cached in memory after the first call. Scrolls in batches so large
    repositories don't arrive in a single oversized response.
    """
    cached = _chunk_cache.get(collection_name)
    if cached is not None:
        return cached

    chunks: List[dict] = []
    offset = None

    while True:
        points, next_offset = client.scroll(
            collection_name=collection_name,
            limit=SCROLL_BATCH,
            offset=offset,
            with_payload=True,
            with_vectors=False,   # vectors aren't needed for BM25 or dependencies
        )

        for point in points:
            if point.payload:
                chunks.append(point.payload)

        if next_offset is None:
            break

        offset = next_offset

    _chunk_cache[collection_name] = chunks
    return chunks


def get_bm25(collection_name: str):
    """
    BM25 index for a repository, built once and cached.

    Previously the index was rebuilt from scratch on every single query.
    Returns (bm25_index, chunks) so callers can map scores back to chunks.
    """
    cached = _bm25_cache.get(collection_name)
    if cached is not None:
        return cached

    chunks = load_chunks(collection_name)

    documents = []
    for chunk in chunks:
        # Indexing file and code in addition to name and type — filename and
        # identifier queries were previously very weak (blocker E).
        text = f"""
        {chunk.get("file", "")}
        {chunk.get("name", "")}
        {chunk.get("type", "")}
        {chunk.get("code", "")}
        """
        documents.append(text.split())

    bm25 = BM25Okapi(documents) if documents else None

    _bm25_cache[collection_name] = (bm25, chunks)
    return bm25, chunks


def invalidate(collection_name: str) -> None:
    """Drop cached data for a repository. Call after re-indexing it."""
    _chunk_cache.pop(collection_name, None)
    _bm25_cache.pop(collection_name, None)


def is_indexed(collection_name: str) -> bool:
    """True if the collection holds at least one chunk."""
    return len(load_chunks(collection_name)) > 0