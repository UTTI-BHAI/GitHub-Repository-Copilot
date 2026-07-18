"""
vector_store.py

Single source of truth for the Qdrant client and per-repository collections.

Replaces the two separately-hardcoded QdrantClient instances that previously
lived in backend.py and retrieval/retrieve.py, and removes the shared
"repo_chunks" collection that caused cross-repository contamination.
"""

import os
import re
import hashlib

from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance

QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))

# bge-small-en-v1.5 produces 384-dimensional vectors.
VECTOR_SIZE = 384

client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)


def collection_name_for(github_url: str) -> str:
    """
    Deterministically derive a collection name from a repository URL.

    Deterministic (rather than derived from the database id) because the
    collection name is needed *before* the Repository row exists, and because
    the same URL should always resolve to the same collection.

    The short hash disambiguates same-named repos from different owners
    (e.g. alice/utils vs bob/utils).
    """
    url = github_url.rstrip("/")
    name = url.split("/")[-1]

    safe_name = re.sub(r"[^a-zA-Z0-9_]", "_", name).lower()[:32]
    digest = hashlib.sha1(url.encode()).hexdigest()[:8]

    return f"repo_{safe_name}_{digest}"


def ensure_collection(collection_name: str) -> None:
    """Create the collection if it does not already exist."""
    existing = [c.name for c in client.get_collections().collections]

    if collection_name not in existing:
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(
                size=VECTOR_SIZE,
                distance=Distance.COSINE,
            ),
        )


def collection_point_count(collection_name: str) -> int:
    """
    Live point count, queried at call time.

    The previous implementation read points_count ONCE at module import, so
    the value went stale immediately after the first index — causing every
    later /clone to re-embed and overwrite existing points.
    """
    if collection_name not in [c.name for c in client.get_collections().collections]:
        return 0

    return client.get_collection(collection_name).points_count


def delete_collection(collection_name: str) -> None:
    """Used by re-indexing / repository refresh (blocker H)."""
    existing = [c.name for c in client.get_collections().collections]
    if collection_name in existing:
        client.delete_collection(collection_name)