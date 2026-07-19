"""
auth.py

Verifies Supabase auth tokens on protected endpoints.

Approach: hand the token to Supabase's /auth/v1/user endpoint and let it
say whether the token is valid and who it belongs to. The alternative is
verifying the JWT signature locally, which avoids a network call but means
handling Supabase's signing keys and their rotation.

The network call is the right trade here: this is a single-user app whose
requests already take seconds (LLM generation), and a short cache means
repeat requests with the same token skip the check entirely.
"""

import os
import time

import requests
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, Header

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

# Seconds to trust a previously-verified token before re-checking.
CACHE_TTL = int(os.getenv("AUTH_CACHE_TTL", "300"))

# token -> (user dict, timestamp verified)
_cache: dict[str, tuple[dict, float]] = {}


def _verify_with_supabase(token: str) -> dict:
    response = requests.get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={
            "Authorization": f"Bearer {token}",
            "apikey": SUPABASE_ANON_KEY,
        },
        timeout=10,
    )

    if response.status_code == 401:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if not response.ok:
        # Supabase itself is unreachable or erroring — that's a 503, not a
        # rejection of the user's credentials.
        raise HTTPException(
            status_code=503,
            detail="Could not verify authentication right now",
        )

    return response.json()


def get_current_user(authorization: str = Header(default="")) -> dict:
    """
    FastAPI dependency. Add to any endpoint that requires a signed-in user:

        @app.post("/clone")
        def clone_repo(..., user: dict = Depends(get_current_user)):
    """
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(
            status_code=500,
            detail="Auth is not configured (SUPABASE_URL / SUPABASE_ANON_KEY)",
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.removeprefix("Bearer ").strip()

    cached = _cache.get(token)
    if cached is not None:
        user, checked_at = cached
        if time.time() - checked_at < CACHE_TTL:
            return user
        # Expired cache entry — fall through and re-verify.
        _cache.pop(token, None)

    user = _verify_with_supabase(token)
    _cache[token] = (user, time.time())

    return user