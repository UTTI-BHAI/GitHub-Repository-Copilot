"""
check_quota.py

Sends one tiny embedding request and prints the FULL response body.

The inline retry logs truncate the error, which hides the part that matters:
which quota metric was exceeded and what its limit is. A 429 here means the
daily quota is gone; a success means you have headroom and any 429 during
indexing was the per-minute limit instead.
"""

import json

import requests

from embeddings import (
    GEMINI_API_KEY,
    EMBEDDING_MODEL,
    EMBEDDING_DIM,
    ENDPOINT,
)

response = requests.post(
    ENDPOINT,
    headers={
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
    },
    json={
        "content": {"parts": [{"text": "hello"}]},
        "taskType": "RETRIEVAL_DOCUMENT",
        "outputDimensionality": EMBEDDING_DIM,
    },
    timeout=30,
)

print(f"Model:  {EMBEDDING_MODEL}")
print(f"Status: {response.status_code}\n")

try:
    print(json.dumps(response.json(), indent=2)[:4000])
except Exception:
    print(response.text[:4000])