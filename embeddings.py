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
import time
import random

import requests
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "gemini-embedding-001")

# Must match VECTOR_SIZE in vector_store.py. Changing this invalidates
# every existing collection — they have to be re-indexed.
EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", "768"))

REQUEST_TIMEOUT = int(os.getenv("EMBEDDING_TIMEOUT", "60"))

# Free-tier quota is per-minute, so a 429 during a large index is expected
# rather than exceptional. Retrying with backoff turns it into a pause
# instead of a failed index.
MAX_RETRIES = int(os.getenv("EMBEDDING_MAX_RETRIES", "6"))
INITIAL_BACKOFF = float(os.getenv("EMBEDDING_BACKOFF", "5"))

BATCH_SIZE = int(os.getenv("EMBEDDING_BATCH_SIZE", "100"))

_BASE = f"https://generativelanguage.googleapis.com/v1beta/models/{EMBEDDING_MODEL}"

ENDPOINT = f"{_BASE}:embedContent"
BATCH_ENDPOINT = f"{_BASE}:batchEmbedContents"


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

    backoff = INITIAL_BACKOFF

    for attempt in range(MAX_RETRIES):

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

        # 429 = quota exhausted for this window; 5xx = transient server issue.
        # Both are worth waiting out rather than failing the whole index.
        if response.status_code == 429 or response.status_code >= 500:

            if attempt == MAX_RETRIES - 1:
                raise EmbeddingError(
                    f"Embedding failed after {MAX_RETRIES} attempts "
                    f"({response.status_code}): {response.text[:200]}"
                )

            # Jitter avoids every in-flight request retrying in lockstep.
            wait = backoff + random.uniform(0, 1)
            # Print the body — it distinguishes a per-minute limit (clears
            # in a moment) from a per-day quota (retrying is pointless).
            print(
                f"Embedding {response.status_code}, retrying in {wait:.1f}s "
                f"| {response.text[:200]}"
            )
            time.sleep(wait)
            backoff *= 2
            continue

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

    raise EmbeddingError("Embedding failed: retries exhausted")


def get_embeddings_batch(texts, task_type="RETRIEVAL_DOCUMENT"):
    """
    Embed many texts in a single request.

    Indexing one chunk per call meant a 449-chunk repository cost 449
    requests, which exhausts free-tier quota quickly. The batch endpoint
    accepts up to BATCH_SIZE texts per call and counts as one request, so
    the same repository costs ~5.

    Returns a list of embeddings in the same order as `texts`.
    """
    if not GEMINI_API_KEY:
        raise EmbeddingError("GEMINI_API_KEY is not set")

    if not texts:
        return []

    results = []

    for start in range(0, len(texts), BATCH_SIZE):
        window = texts[start:start + BATCH_SIZE]

        payload = {
            "requests": [
                {
                    "model": f"models/{EMBEDDING_MODEL}",
                    "content": {"parts": [{"text": text}]},
                    "taskType": task_type,
                    "outputDimensionality": EMBEDDING_DIM,
                }
                for text in window
            ]
        }

        backoff = INITIAL_BACKOFF
        batch_values = None

        for attempt in range(MAX_RETRIES):

            response = requests.post(
                BATCH_ENDPOINT,
                headers={
                    "Content-Type": "application/json",
                    "x-goog-api-key": GEMINI_API_KEY,
                },
                json=payload,
                timeout=REQUEST_TIMEOUT * 2,
            )

            if response.status_code == 429 or response.status_code >= 500:

                if attempt == MAX_RETRIES - 1:
                    raise EmbeddingError(
                        f"Batch embedding failed after {MAX_RETRIES} attempts "
                        f"({response.status_code}): {response.text[:300]}"
                    )

                wait = backoff + random.uniform(0, 1)
                print(
                    f"Batch embedding {response.status_code}, "
                    f"retrying in {wait:.1f}s | {response.text[:200]}"
                )
                time.sleep(wait)
                backoff *= 2
                continue

            if not response.ok:
                raise EmbeddingError(
                    f"Batch embedding error {response.status_code}: "
                    f"{response.text[:300]}"
                )

            data = response.json()
            batch_values = [e["values"] for e in data["embeddings"]]
            break

        if batch_values is None:
            raise EmbeddingError("Batch embedding failed: retries exhausted")

        if len(batch_values) != len(window):
            raise EmbeddingError(
                f"Batch returned {len(batch_values)} embeddings "
                f"for {len(window)} inputs"
            )

        results.extend(batch_values)
        print(f"Embedded {len(results)}/{len(texts)}")

    return results