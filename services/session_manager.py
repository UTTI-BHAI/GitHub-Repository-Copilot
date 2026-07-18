"""
services/session_manager.py

TEMPORARY in-memory cache for `all_chunks`, keyed by repository id.

This is the LAST remaining piece of RAM state. It exists only because BM25
(keyword_search) and dependency expansion still read from the in-memory
all_chunks list. It will be deleted in blocker B, once retrieval is backed
by Qdrant / the database instead.

Project rule: do NOT delete this module until all_chunks is gone. Repo
metadata and chat history now live in Postgres — this cache holds nothing
that needs to survive a restart.
"""

_chunks_by_repo: dict[int, list] = {}


def cache_chunks(repository_id: int, all_chunks: list) -> None:
    _chunks_by_repo[repository_id] = all_chunks


def get_chunks(repository_id: int):
    """Returns the cached chunks, or None if this repo hasn't been loaded
    in the current process (e.g. after a restart)."""
    return _chunks_by_repo.get(repository_id)


def has_chunks(repository_id: int) -> bool:
    return repository_id in _chunks_by_repo