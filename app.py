import os

from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend import index_repository, ask_question
from vector_store import collection_name_for

from database.connection import engine, Base, get_db
from database import crud, models          # noqa: F401  (import registers tables on Base)


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI()

# Create tables if they don't exist yet. Fine for now; swap for Alembic
# migrations once the schema starts changing in production.
Base.metadata.create_all(bind=engine)

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CloneRequest(BaseModel):
    url: str


class ChatRequest(BaseModel):
    session_id: str   # kept as a string for wire-compatibility; holds chat.id
    question: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.post("/clone")
def clone_repo(request: CloneRequest, db: Session = Depends(get_db)):
    url = request.url.rstrip("/")
    repo_name = url.split("/")[-1]

    # Deterministic per-repository collection. Derived from the URL rather
    # than the database id, because it is needed before the row exists.
    collection_name = collection_name_for(url)

    index_repository(url, collection_name)

    repository, created = crud.get_or_create_repository(
        db,
        repo_name=repo_name,
        github_url=url,
        qdrant_collection=collection_name,
    )

    # Each clone starts a fresh chat, matching the old one-session-per-clone
    # behaviour. (Later: frontend clones once, then opens new chats explicitly.)
    chat = crud.create_chat(db, repository_id=repository.id, title=repo_name)

    return {
        "session_id": str(chat.id),
        "repo_name": repo_name,
        "repository_id": repository.id,
        "already_indexed": not created,
    }


@app.post("/chat")
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    chat = crud.get_chat(db, int(request.session_id))
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat session not found")

    repository = crud.get_repository(db, chat.repository_id)
    if repository is None:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Rebuild the retrieval-history shape ask_question/rewrite_question expect,
    # from the persisted transcript. `functions` is intentionally empty here —
    # it was a prompt hint that we're not persisting yet (deferred enhancement).
    past = crud.get_messages(db, chat.id)
    chat_history = [
        {"question": m.content, "functions": []}
        for m in past
        if m.role == "user"
    ]

    # Persist the question BEFORE generating, so it's saved even if generation fails.
    crud.create_message(db, chat_id=chat.id, role="user", content=request.question)

    answer = ask_question(
        request.question,
        chat_history,
        repository.qdrant_collection,
    )

    crud.create_message(db, chat_id=chat.id, role="assistant", content=answer)

    return {"answer": answer}


@app.get("/chats/{chat_id}/messages")
def get_chat_messages(chat_id: int, db: Session = Depends(get_db)):
    """Full transcript for a chat — this is what makes persistence visible.
    The frontend calls this to render an existing chat after a reload/restart."""
    chat = crud.get_chat(db, chat_id)
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat session not found")

    messages = crud.get_messages(db, chat_id)
    return [
        {"role": m.role, "content": m.content, "created_at": m.created_at}
        for m in messages
    ]


@app.get("/sessions")
def get_sessions(db: Session = Depends(get_db)):
    """Every chat across every repository (replaces the old in-memory list)."""
    result = []
    for repository in crud.list_repositories(db):
        for chat in repository.chats:
            result.append({
                "id": str(chat.id),
                "repo_name": repository.repo_name,
                "url": repository.github_url,
                "title": chat.title,
            })
    return result


@app.get("/")
def home():
    return {"message": "Repository Copilot API is running"}