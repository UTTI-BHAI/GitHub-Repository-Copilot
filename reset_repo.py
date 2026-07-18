"""
reset_repo.py

Small maintenance helper — avoids fighting PowerShell quoting with
python -c one-liners.

Usage:
    python reset_repo.py                 # list repositories and their status
    python reset_repo.py fastapi         # reset one repo to 'pending' so /clone retries
    python reset_repo.py fastapi --drop  # also delete its Qdrant collection
"""

import sys

from database.connection import SessionLocal
from database.models import Repository
from vector_store import client


def list_repos(db):
    repos = db.query(Repository).all()
    if not repos:
        print("No repositories.")
        return

    for r in repos:
        print(
            f"[{r.id}] {r.repo_name:35} {r.index_status:10} "
            f"chunks={r.chunk_count} collection={r.qdrant_collection}"
        )
        if r.index_error:
            print(f"      error: {r.index_error[:120]}")


def reset(db, repo_name, drop_collection=False):
    repo = (
        db.query(Repository)
        .filter(Repository.repo_name == repo_name)
        .first()
    )

    if repo is None:
        print(f"No repository named {repo_name!r}")
        return

    if drop_collection:
        try:
            existing = [c.name for c in client.get_collections().collections]
            if repo.qdrant_collection in existing:
                client.delete_collection(repo.qdrant_collection)
                print(f"Deleted collection {repo.qdrant_collection}")
            else:
                print(f"Collection {repo.qdrant_collection} not present")
        except Exception as exc:
            print(f"Could not delete collection: {exc}")

    repo.index_status = "pending"
    repo.index_error = None
    repo.chunk_count = None
    db.commit()

    print(f"Reset {repo.repo_name} to 'pending' — re-run /clone to retry.")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        if len(sys.argv) < 2:
            list_repos(db)
        else:
            reset(db, sys.argv[1], drop_collection="--drop" in sys.argv)
    finally:
        db.close()