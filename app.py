import os
import traceback

from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend import index_repository, ask_question
from vector_store import (
    collection_name_for,
    normalize_github_url,
    delete_collection,
)

from database.connection import engine, Base, get_db, SessionLocal
from database import crud, models          # noqa: F401  (import registers tables on Base)
from database.models import (
    INDEX_PENDING,
    INDEX_RUNNING,
    INDEX_READY,
    INDEX_FAILED,
)


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI()

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


@app.on_event("startup")
def recover_interrupted_jobs():
    """
    Background jobs run in this process, so a restart mid-index leaves rows
    stuck in 'indexing'. Mark them failed at startup so they can be retried.
    """
    db = SessionLocal()
    try:
        count = crud.reset_stuck_indexing(db)
        if count:
            print(f"Reset {count} interrupted indexing job(s)")
    finally:
        db.close()


class CloneRequest(BaseModel):
    url: str


class ChatRequest(BaseModel):
    session_id: str
    question: str


# ---------------------------------------------------------------------------
# Background work
# ---------------------------------------------------------------------------

def run_indexing(repository_id: int, url: str, collection_name: str):
    """
    Runs after the /clone response has been sent.

    Opens its OWN database session — the request-scoped session from
    Depends(get_db) is already closed by the time this executes.
    """
    db = SessionLocal()
    try:
        crud.set_index_running(db, repository_id)

        chunk_count = index_repository(url, collection_name)

        crud.set_index_ready(db, repository_id, chunk_count)
        print(f"Indexed {chunk_count} chunks into {collection_name}")

    except Exception as exc:
        # Never let a background exception vanish silently — record it on the
        # row so the status endpoint can report why indexing failed.
        traceback.print_exc()

        # Drop the partially-written collection. index_repository skips any
        # collection that already has points, so leaving a half-finished one
        # behind would make the next /clone treat it as complete and silently
        # serve an incomplete index forever.
        try:
            delete_collection(collection_name)
            print(f"Removed partial collection {collection_name}")
        except Exception:
            traceback.print_exc()

        try:
            crud.set_index_failed(db, repository_id, f"{type(exc).__name__}: {exc}")
        except Exception:
            traceback.print_exc()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.post("/clone", status_code=202)
def clone_repo(
    request: CloneRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Starts indexing and returns immediately.

    Indexing takes minutes on a real repository, which is far longer than
    hosting platforms allow a single HTTP request to run. The client polls
    /repositories/{id}/status instead of waiting.
    """
    url = normalize_github_url(request.url)
    repo_name = url.rstrip("/").split("/")[-1]
    collection_name = collection_name_for(url)

    repository, created = crud.get_or_create_repository(
        db,
        repo_name=repo_name,
        github_url=url,
        qdrant_collection=collection_name,
    )

    chat = crud.create_chat(db, repository_id=repository.id, title=repo_name)

    # Re-run indexing for new repositories and for ones that previously
    # failed; leave ready and in-progress ones alone.
    should_index = repository.index_status in (INDEX_PENDING, INDEX_FAILED)

    if should_index:
        background_tasks.add_task(
            run_indexing, repository.id, url, collection_name
        )

    return {
        "session_id": str(chat.id),
        "repository_id": repository.id,
        "repo_name": repo_name,
        "index_status": INDEX_RUNNING if should_index else repository.index_status,
    }


@app.get("/repositories/{repository_id}/status")
def repository_status(repository_id: int, db: Session = Depends(get_db)):
    """Polled by the client while indexing runs."""
    repository = crud.get_repository(db, repository_id)
    if repository is None:
        raise HTTPException(status_code=404, detail="Repository not found")

    return {
        "repository_id": repository.id,
        "repo_name": repository.repo_name,
        "index_status": repository.index_status,
        "chunk_count": repository.chunk_count,
        "error": repository.index_error,
        "ready": repository.index_status == INDEX_READY,
    }


@app.post("/chat")
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    chat = crud.get_chat(db, int(request.session_id))
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat session not found")

    repository = crud.get_repository(db, chat.repository_id)
    if repository is None:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Questions can only be answered once the repository is indexed.
    if repository.index_status != INDEX_READY:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Repository is not ready yet.",
                "index_status": repository.index_status,
                "error": repository.index_error,
            },
        )

    past = crud.get_messages(db, chat.id)
    chat_history = [
        {"question": m.content, "functions": []}
        for m in past
        if m.role == "user"
    ]

    crud.create_message(db, chat_id=chat.id, role="user", content=request.question)

    try:
        answer = ask_question(
            request.question,
            chat_history,
            repository.qdrant_collection,
        )
    except Exception as exc:
        # Surface a useful message instead of a bare 500 — rate limits and
        # provider errors are the common case here.
        traceback.print_exc()
        raise HTTPException(
            status_code=502,
            detail=f"Failed to generate an answer: {type(exc).__name__}: {exc}",
        )

    crud.create_message(db, chat_id=chat.id, role="assistant", content=answer)

    return {"answer": answer}


@app.get("/chats/{chat_id}/messages")
def get_chat_messages(chat_id: int, db: Session = Depends(get_db)):
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
    result = []
    for repository in crud.list_repositories(db):
        for chat in repository.chats:
            result.append({
                "id": str(chat.id),
                "repo_name": repository.repo_name,
                "url": repository.github_url,
                "title": chat.title,
                "index_status": repository.index_status,
            })
    return result


@app.get("/health")
def health():
    """Liveness probe for hosting platforms."""
    return {"status": "ok"}


@app.get("/")
def home():
    return {"message": "Repository Copilot API is running"}