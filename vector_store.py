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

from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance

# Load config here rather than relying on another module having already
# called load_dotenv(). Without this, QDRANT_URL is read before .env is
# loaded whenever this module happens to be imported first, and the client
# silently falls back to localhost.
load_dotenv()

# Qdrant Cloud: set QDRANT_URL to the cluster URL and QDRANT_API_KEY to the key.
# Local:        leave both unset and it falls back to localhost:6333.
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))

# The client default is a few seconds, which is not enough for large upserts
# to a cloud cluster in a distant region — a batch of vectors is a sizeable
# payload and the round trip is slow.
QDRANT_TIMEOUT = int(os.getenv("QDRANT_TIMEOUT", "120"))

# Must match EMBEDDING_DIM in embeddings.py. Changing it invalidates every
# existing collection, so collections must be dropped and re-indexed.
VECTOR_SIZE = int(os.getenv("EMBEDDING_DIM", "768"))

if QDRANT_URL:
    client = QdrantClient(
        url=QDRANT_URL,
        api_key=QDRANT_API_KEY,
        timeout=QDRANT_TIMEOUT,
    )
else:
    client = QdrantClient(
        host=QDRANT_HOST,
        port=QDRANT_PORT,
        timeout=QDRANT_TIMEOUT,
    )


def normalize_github_url(url: str) -> str:
    """
    Reduce any GitHub URL to its cloneable repository root.

    Handles URLs copied from GitHub's file browser (.../tree/main/some/folder),
    which are not cloneable, and strips a trailing .git.

    Normalizing matters beyond convenience: it guarantees one repository maps
    to one collection and one database row. Without it, ".../repo",
    ".../repo.git" and ".../repo/tree/main" would each create a separate
    collection and a duplicate Repository row for the same project.
    """
    url = url.strip().rstrip("/")

    for marker in ("/tree/", "/blob/", "/commits/", "/commit/", "/issues/", "/pull/"):
        if marker in url:
            url = url.split(marker)[0]
            break

    if url.endswith(".git"):
        url = url[:-4]

    return url


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