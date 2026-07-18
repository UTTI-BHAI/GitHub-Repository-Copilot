"""
llm/provider.py

Single place where the LLM is called. Both generate.py and rewrite.py go
through this, so switching providers is a config change, not a code change.

LLM_PROVIDER=gemini  -> Gemini API (needs GEMINI_API_KEY)
LLM_PROVIDER=ollama  -> local Ollama (needs OLLAMA_HOST)

Keeping this boundary matters because the free Gemini tier may use prompts
to improve Google's products. Anything sensitive should run on Ollama or a
paid tier — this file is the only thing that needs to change to do that.
"""
import os

from dotenv import load_dotenv
import requests

load_dotenv()

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini").lower()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")

REQUEST_TIMEOUT = int(os.getenv("LLM_TIMEOUT", "120"))


class LLMError(RuntimeError):
    pass


def _call_gemini(prompt: str) -> str:
    if not GEMINI_API_KEY:
        raise LLMError("GEMINI_API_KEY is not set")

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_MODEL}:generateContent"
    )

    response = requests.post(
        url,
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY,
        },
        json={"contents": [{"parts": [{"text": prompt}]}]},
        timeout=REQUEST_TIMEOUT,
    )

    if response.status_code == 429:
        # Free tier is rate limited; surface this clearly rather than as a 500.
        raise LLMError("Gemini rate limit reached. Try again shortly.")

    if not response.ok:
        raise LLMError(f"Gemini error {response.status_code}: {response.text[:300]}")

    data = response.json()

    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        # Usually means the response was blocked by a safety filter or the
        # model returned no candidates.
        raise LLMError(f"Unexpected Gemini response: {str(data)[:300]}")


def _call_ollama(prompt: str) -> str:
    response = requests.post(
        f"{OLLAMA_HOST}/api/generate",
        json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
        timeout=REQUEST_TIMEOUT,
    )

    if not response.ok:
        raise LLMError(f"Ollama error {response.status_code}: {response.text[:300]}")

    return response.json().get("response", "")


def complete(prompt: str) -> str:
    """Send a prompt to the configured provider and return the text response."""
    if LLM_PROVIDER == "gemini":
        return _call_gemini(prompt)

    if LLM_PROVIDER == "ollama":
        return _call_ollama(prompt)

    raise LLMError(f"Unknown LLM_PROVIDER: {LLM_PROVIDER}")