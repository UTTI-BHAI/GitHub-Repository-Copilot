from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend import index_repository, ask_question

from database.connection import engine, Base, get_db
from database import crud, models          # noqa: F401  (import registers tables on Base)

# Transient RAM cache for all_chunks (blocker B will remove this).
from services.session_manager import cache_chunks, get_chunks


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI()

# Create tables if they don't exist yet. Fine for now; swap for Alembic
# migrations once the schema starts changing in production.
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Single Qdrant collection for now. Becomes per-repo in blocker C — at which
# point this constant is replaced by a name derived from the repository.
DEFAULT_COLLECTION = "repo_chunks"


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
    # .rstrip("/") guards against trailing slashes producing an empty name.
    repo_name = request.url.rstrip("/").split("/")[-1]

    # Build chunks in memory. index_repository always rebuilds all_chunks;
    # it only re-embeds/upserts into Qdrant when the collection is empty.
    all_chunks = index_repository(request.url)

    # Persist (or fetch) the repository row. `created` replaces the old
    # "skip if Qdrant point count == 0" heuristic.
    repository, created = crud.get_or_create_repository(
        db,
        repo_name=repo_name,
        github_url=request.url,
        qdrant_collection=DEFAULT_COLLECTION,
    )

    # Cache chunks for retrieval — RAM only, keyed by repository id.
    cache_chunks(repository.id, all_chunks)

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

    all_chunks = get_chunks(chat.repository_id)
    if all_chunks is None:
        # Chunks aren't in memory — typically after a server restart.
        # Blocker B removes this failure mode by backing retrieval with Qdrant/DB.
        raise HTTPException(
            status_code=409,
            detail="Repository not loaded in memory. Re-run /clone for this repository.",
        )

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

    answer = ask_question(request.question, all_chunks, chat_history)

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