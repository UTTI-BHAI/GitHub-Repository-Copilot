"""
embeddings.py

Embeddings via the Gemini API (gemini-embedding-001).

Replaces the local BAAI/bge-small-en-v1.5 model, which pulled torch and
sentence-transformers into the deployment image and reloaded weights on
every cold start.

Two things this buys beyond image size:

1. Task types. The model produces asymmetric embeddings — documents and
   queries are embedded differently. CODE_RETRIEVAL_QUERY exists
   specifically for finding code from a natural-language question, which
   is exactly what this project does.

2. Dimension choice. The model supports Matryoshka Representation
   Learning, so output can be scaled down from the 3072 default. 768
   dimensions costs roughly 0.26% quality against 3072 while using a
   quarter of the storage — the right trade on a 1GB Qdrant cluster.

NOTE: input is limited to 2048 tokens per text and is silently truncated
by default. Very large functions or classes will lose their tail.
"""

import os

import requests
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "gemini-embedding-001")

# Must match VECTOR_SIZE in vector_store.py. Changing this invalidates
# every existing collection — they have to be re-indexed.
EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", "768"))

REQUEST_TIMEOUT = int(os.getenv("EMBEDDING_TIMEOUT", "60"))

ENDPOINT = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{EMBEDDING_MODEL}:embedContent"
)


class EmbeddingError(RuntimeError):
    pass


def get_embedding(text, task_type="RETRIEVAL_DOCUMENT"):
    """
    Return the embedding for `text` as a plain list of floats.

    task_type:
      RETRIEVAL_DOCUMENT   - indexing code chunks
      CODE_RETRIEVAL_QUERY - a natural-language question about code
    """
    if not GEMINI_API_KEY:
        raise EmbeddingError("GEMINI_API_KEY is not set")

    response = requests.post(
        ENDPOINT,
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY,
        },
        json={
            "content": {"parts": [{"text": text}]},
            "taskType": task_type,
            "outputDimensionality": EMBEDDING_DIM,
        },
        timeout=REQUEST_TIMEOUT,
    )

    if response.status_code == 429:
        raise EmbeddingError("Embedding rate limit reached. Try again shortly.")

    if not response.ok:
        raise EmbeddingError(
            f"Embedding error {response.status_code}: {response.text[:300]}"
        )

    try:
        return response.json()["embedding"]["values"]
    except (KeyError, TypeError):
        raise EmbeddingError(
            f"Unexpected embedding response: {str(response.json())[:300]}"
        )