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
print("Base in models:", id(Base))


class Repository(Base):
    print("Repository class created")
    __tablename__ = "repositories"

    id = Column(Integer, primary_key=True, index=True)
    repo_name = Column(String, nullable=False)
    github_url = Column(String, nullable=False, unique=True)
    qdrant_collection = Column(String, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    chats = relationship(
        "ChatSession",
        back_populates="repository",
        cascade="all, delete",
    )


class ChatSession(Base):
    print("ChatSession class created")
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)

    repository_id = Column(
        Integer,
        ForeignKey("repositories.id"),
        nullable=False,
    )

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
    print("Message class created")
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
    print("Tables after models load:", Base.metadata.tables.keys())