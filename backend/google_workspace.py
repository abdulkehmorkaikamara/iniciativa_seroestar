"""Shared Google Workspace API access through a service account.

The service account (``GOOGLE_SERVICE_ACCOUNT_JSON``, raw JSON or base64)
needs domain-wide delegation for every scope requested here; each call acts
as a real Workspace user (the ``subject``).
"""

import base64
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

from jose import jwt

DEFAULT_TOKEN_URI = "https://oauth2.googleapis.com/token"


class GoogleApiError(Exception):
    """A Google API call failed; ``status`` is the HTTP status when there was one."""

    def __init__(self, message: str, status: int | None = None):
        super().__init__(message)
        self.status = status


def service_account_info() -> dict | None:
    raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
    if not raw:
        return None
    if not raw.startswith("{"):
        # Allow base64 so the JSON survives dashboards that mangle newlines.
        raw = base64.b64decode(raw).decode("utf-8")
    return json.loads(raw)


def workspace_domain() -> str:
    return os.getenv("GOOGLE_WORKSPACE_DOMAIN", "").strip().lower().lstrip("@")


def access_token(subject: str, scopes: list[str]) -> str:
    """Exchange a signed service-account assertion for an access token acting as ``subject``."""
    info = service_account_info()
    if not info:
        raise GoogleApiError("GOOGLE_SERVICE_ACCOUNT_JSON is not configured.")
    token_uri = info.get("token_uri") or DEFAULT_TOKEN_URI
    issued_at = int(time.time())
    assertion = jwt.encode(
        {
            "iss": info["client_email"],
            "sub": subject,
            "scope": " ".join(scopes),
            "aud": token_uri,
            "iat": issued_at,
            "exp": issued_at + 3600,
        },
        info["private_key"],
        algorithm="RS256",
        headers={"kid": info.get("private_key_id", "")},
    )
    body = urllib.parse.urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": assertion,
    }).encode("utf-8")
    return _send(urllib.request.Request(token_uri, data=body, method="POST"))["access_token"]


def api_request(method: str, url: str, token: str, body: dict | None = None) -> dict:
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8") if body is not None else None,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method=method,
    )
    return _send(request)


def _send(request: urllib.request.Request) -> dict:
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            payload = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        print(f"[google] {request.get_method()} {request.full_url.split('?', 1)[0]} failed ({exc.code}): {detail}")
        raise GoogleApiError(_error_message(detail) or f"Google returned HTTP {exc.code}.", status=exc.code) from exc
    except Exception as exc:
        print(f"[google] {request.get_method()} {request.full_url.split('?', 1)[0]} failed: {exc}")
        raise GoogleApiError("Google could not be reached.") from exc
    return json.loads(payload) if payload else {}


def _error_message(detail: str) -> str:
    try:
        error = json.loads(detail).get("error")
    except ValueError:
        return ""
    if isinstance(error, dict):
        return str(error.get("message") or "")
    return str(error or "")
