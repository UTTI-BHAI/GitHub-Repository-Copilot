from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from backend import (
    index_repository,
    ask_question
)

from services.session_manager import (
    create_session,
    get_session,
    list_sessions
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
class CloneRequest(BaseModel):
    url: str


class ChatRequest(BaseModel):
    session_id: str
    question: str
@app.post("/clone")
def clone_repo(request: CloneRequest):

    all_chunks = index_repository(request.url)

    repo_name = request.url.split("/")[-1]

    session_id = create_session(
        repo_name,
        request.url,
        all_chunks
    )

    return {
        "session_id": session_id,
        "repo_name": repo_name
    }
@app.post("/chat")
def chat(request: ChatRequest):

    session = get_session(request.session_id)

    if session is None:
        return {
            "error": "Session not found"
        }

    answer = ask_question(
        request.question,
        session["all_chunks"],
        session["chat_history"]
    )

    return {
        "answer": answer
    }
@app.get("/sessions")
def get_sessions():

    return list_sessions()

@app.get("/")
def home():
    return {
        "message": "Repository Copilot API is running"
    }