from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    Text,
    DateTime,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.connection import Base


# Indexing lifecycle for a repository.
INDEX_PENDING = "pending"
INDEX_RUNNING = "indexing"
INDEX_READY = "ready"
INDEX_FAILED = "failed"


class Repository(Base):
    __tablename__ = "repositories"

    id = Column(Integer, primary_key=True, index=True)
    repo_name = Column(String, nullable=False)
    github_url = Column(String, nullable=False, unique=True)
    qdrant_collection = Column(String, nullable=False)

    # Indexing runs in the background, so its state has to live somewhere
    # every process can see. Keeping it on the row (rather than in memory)
    # is what makes status survive a restart.
    index_status = Column(String, nullable=False, default=INDEX_PENDING)
    index_error = Column(Text, nullable=True)
    chunk_count = Column(Integer, nullable=True)
    indexed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    chats = relationship(
        "ChatSession",
        back_populates="repository",
        cascade="all, delete",
    )


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)

    repository_id = Column(
        Integer,
        ForeignKey("repositories.id"),
        nullable=False,
    )

    # Supabase user id (a UUID string). Repositories are shared because they
    # are public GitHub projects — indexing one once serves everyone and
    # saves embedding quota. Conversations are private, so ownership is
    # tracked here and every chat read is filtered by it.
    user_id = Column(String, nullable=False, index=True)

    title = Column(String, default="New Chat")

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    repository = relationship(
        "Repository",
        back_populates="chats",
    )

    messages = relationship(
        "Message",
        back_populates="chat",
        cascade="all, delete",
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)

    chat_id = Column(
        Integer,
        ForeignKey("chat_sessions.id"),
        nullable=False,
    )

    role = Column(String, nullable=False)

    content = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    chat = relationship(
        "ChatSession",
        back_populates="messages",
    )