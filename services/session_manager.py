import uuid

sessions = {}


def create_session(repo_name, url, all_chunks):
    session_id = str(uuid.uuid4())

    sessions[session_id] = {
        "repo_name": repo_name,
        "url": url,
        "all_chunks": all_chunks,
        "chat_history": []
    }

    return session_id


def get_session(session_id):
    return sessions.get(session_id)


def list_sessions():
    return [
        {
            "id": sid,
            "repo_name": session["repo_name"],
            "url": session["url"]
        }
        for sid, session in sessions.items()
    ]