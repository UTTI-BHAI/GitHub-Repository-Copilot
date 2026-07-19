"""
check_auth.py

Prints exactly what Supabase says when the backend tries to verify a token.

The endpoint returns a bare 401 for several different reasons — bad apikey,
expired token, wrong project — and the API response body distinguishes them
where the status code alone cannot.

Usage:
    1. In the browser console on your app, run:

       JSON.parse(Object.entries(localStorage).find(([k]) => k.includes('auth-token'))[1]).access_token

    2. Copy the token it prints (without the quotes), then:

       python check_auth.py <token>
"""

import json
import sys

import requests

from auth import SUPABASE_URL, SUPABASE_ANON_KEY

print(f"SUPABASE_URL: {SUPABASE_URL or '(not set)'}")
print(f"SUPABASE_ANON_KEY: {(SUPABASE_ANON_KEY[:18] + '...') if SUPABASE_ANON_KEY else '(not set)'}")
print()

if len(sys.argv) < 2:
    print("No token supplied — pass one as an argument to test verification.")
    sys.exit(0)

token = sys.argv[1].strip().strip('"').strip("'")

response = requests.get(
    f"{SUPABASE_URL}/auth/v1/user",
    headers={
        "Authorization": f"Bearer {token}",
        "apikey": SUPABASE_ANON_KEY,
    },
    timeout=10,
)

print(f"Status: {response.status_code}\n")

try:
    print(json.dumps(response.json(), indent=2)[:2000])
except Exception:
    print(response.text[:2000])