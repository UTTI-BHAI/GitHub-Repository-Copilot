"""
database/crud.py

Persistence layer for Repository Copilot.

Every function takes an active SQLAlchemy Session as its first argument
(obtained via database.connection.get_db) and performs exactly ONE logical
database operation. No orchestration or business logic lives here —
backend.py stays the orchestrator, this file only talks to the database.
"""

from __future__ import annotations

from typing import Optional, List, Tuple

from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from database.models import (
    Repository,
    ChatSession,
    Message,
    INDEX_PENDING,
    INDEX_RUNNING,
    INDEX_READY,
    INDEX_FAILED,
)


# ---------------------------------------------------------------------------
# Repository
# ---------------------------------------------------------------------------

def create_repository(
    db: Session,
    repo_name: str,
    github_url: str,
    qdrant_collection: str,
) -> Repository:
    repository = Repository(
        repo_name=repo_name,
        github_url=github_url,
        qdrant_collection=qdrant_collection,
    )
    db.add(repository)
    db.commit()
    db.refresh(repository)
    return repository


def get_repository(db: Session, repository_id: int) -> Optional[Repository]:
    return db.get(Repository, repository_id)


def get_repository_by_url(db: Session, github_url: str) -> Optional[Repository]:
    return (
        db.query(Repository)
        .filter(Repository.github_url == github_url)
        .first()
    )


def list_repositories(db: Session) -> List[Repository]:
    return (
        db.query(Repository)
        .order_by(Repository.created_at.desc())
        .all()
    )


def set_index_running(db: Session, repository_id: int) -> None:
    repository = get_repository(db, repository_id)
    if repository is None:
        return
    repository.index_status = INDEX_RUNNING
    repository.index_error = None
    db.commit()


def set_index_ready(db: Session, repository_id: int, chunk_count: int) -> None:
    repository = get_repository(db, repository_id)
    if repository is None:
        return
    repository.index_status = INDEX_READY
    repository.index_error = None
    repository.chunk_count = chunk_count
    repository.indexed_at = func.now()
    db.commit()


def set_index_failed(db: Session, repository_id: int, error: str) -> None:
    repository = get_repository(db, repository_id)
    if repository is None:
        return
    repository.index_status = INDEX_FAILED
    # Truncated so a huge traceback can't bloat the row.
    repository.index_error = error[:2000]
    db.commit()


def reset_stuck_indexing(db: Session) -> int:
    """
    Mark any repository left in 'indexing' as failed.

    Background jobs run in-process, so a restart mid-index orphans the row.
    Called once at startup so those repositories can be retried instead of
    hanging in 'indexing' forever.
    """
    stuck = (
        db.query(Repository)
        .filter(Repository.index_status == INDEX_RUNNING)
        .all()
    )

    for repository in stuck:
        repository.index_status = INDEX_FAILED
        repository.index_error = "Indexing was interrupted by a server restart."

    if stuck:
        db.commit()

    return len(stuck)


def get_or_create_repository(
    db: Session,
    repo_name: str,
    github_url: str,
    qdrant_collection: str,
) -> Tuple[Repository, bool]:
    """
    Returns (repository, created).

    `created` is False when the repo already existed — the caller uses this
    to decide whether to run indexing. This replaces the current
    "skip if Qdrant point count > 0" heuristic with a real per-repo record.
    """
    existing = get_repository_by_url(db, github_url)
    if existing is not None:
        return existing, False

    repository = create_repository(
        db, repo_name, github_url, qdrant_collection
    )
    return repository, True


# ---------------------------------------------------------------------------
# ChatSession
# ---------------------------------------------------------------------------

def create_chat(
    db: Session,
    repository_id: int,
    user_id: str,
    title: str = "New Chat",
) -> ChatSession:
    chat = ChatSession(
        repository_id=repository_id,
        user_id=user_id,
        title=title,
    )
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return chat


def get_chat(db: Session, chat_id: int) -> Optional[ChatSession]:
    return db.get(ChatSession, chat_id)


def get_owned_chat(
    db: Session,
    chat_id: int,
    user_id: str,
) -> Optional[ChatSession]:
    """
    A chat, but only if it belongs to this user.

    Returning None for someone else's chat means the endpoint responds with
    "not found" rather than "forbidden" — no reason to confirm that another
    user's conversation exists.
    """
    chat = db.get(ChatSession, chat_id)
    if chat is None or chat.user_id != user_id:
        return None
    return chat


def list_chats_for_user(db: Session, user_id: str) -> List[ChatSession]:
    return (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user_id)
        .order_by(ChatSession.created_at.desc())
        .all()
    )


def list_chats_for_repository(
    db: Session,
    repository_id: int,
) -> List[ChatSession]:
    return (
        db.query(ChatSession)
        .filter(ChatSession.repository_id == repository_id)
        .order_by(ChatSession.created_at.desc())
        .all()
    )


def rename_chat(
    db: Session,
    chat_id: int,
    title: str,
) -> Optional[ChatSession]:
    chat = get_chat(db, chat_id)
    if chat is None:
        return None
    chat.title = title
    db.commit()
    db.refresh(chat)
    return chat


def delete_chat(db: Session, chat_id: int) -> bool:
    chat = get_chat(db, chat_id)
    if chat is None:
        return False
    db.delete(chat)   # cascade="all, delete" removes the chat's messages too
    db.commit()
    return True


# ---------------------------------------------------------------------------
# Message
# ---------------------------------------------------------------------------

def create_message(
    db: Session,
    chat_id: int,
    role: str,
    content: str,
) -> Message:
    """
    Persist a single turn. Call once with role="user" for the question,
    and once with role="assistant" for the generated answer.
    """
    message = Message(chat_id=chat_id, role=role, content=content)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def get_messages(db: Session, chat_id: int) -> List[Message]:
    """Full transcript for a chat, oldest first (id order == insertion order)."""
    return (
        db.query(Message)
        .filter(Message.chat_id == chat_id)
        .order_by(Message.id.asc())
        .all()
    )