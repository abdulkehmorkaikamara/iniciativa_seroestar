"""Google Meet as the live-class video provider.

Selected with ``LIVE_CLASS_PROVIDER=meet``; anything else keeps Daily.

Meet links come from one of two places:

* the tutor pastes a ``https://meet.google.com/...`` link when scheduling, or
* when ``GOOGLE_SERVICE_ACCOUNT_JSON`` is set, the backend creates a Meet
  space through the Meet REST API, acting as the tutor via domain-wide
  delegation (or as ``GOOGLE_MEET_ORGANIZER_EMAIL`` when the tutor has no
  account on ``GOOGLE_WORKSPACE_DOMAIN``).

Spaces are created with the ``TRUSTED`` access type: accounts in the academy's
Workspace join directly, everyone else has to be admitted by the host.
"""

import base64
import json
import os
import re
import time
import urllib.parse
import urllib.request

from jose import jwt

MEET_SCOPE = "https://www.googleapis.com/auth/meetings.space.created"
MEET_SPACES_URL = "https://meet.googleapis.com/v2/spaces"
DEFAULT_TOKEN_URI = "https://oauth2.googleapis.com/token"
_MEET_URL_PATTERN = re.compile(r"^https://meet\.google\.com/[a-z]{3}-[a-z]{4}-[a-z]{3}$")


class MeetError(Exception):
    """Raised when a Meet space cannot be created."""


def live_provider() -> str:
    return "meet" if os.getenv("LIVE_CLASS_PROVIDER", "daily").strip().lower() == "meet" else "daily"


def normalize_meet_url(value: str | None) -> str | None:
    """Return a canonical Meet link, or None if ``value`` is not one."""
    url = (value or "").strip().split("?", 1)[0].rstrip("/").lower()
    if url.startswith("meet.google.com/"):
        url = f"https://{url}"
    return url if _MEET_URL_PATTERN.match(url) else None


def _service_account_info() -> dict | None:
    raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
    if not raw:
        return None
    if not raw.startswith("{"):
        # Allow base64 so the JSON survives dashboards that mangle newlines.
        raw = base64.b64decode(raw).decode("utf-8")
    return json.loads(raw)


def auto_create_enabled() -> bool:
    return live_provider() == "meet" and bool(os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip())


def organizer_for(tutor_email: str | None) -> str:
    """The Workspace user a tutor's Meet space is created as."""
    domain = os.getenv("GOOGLE_WORKSPACE_DOMAIN", "").strip().lower().lstrip("@")
    email = (tutor_email or "").strip().lower()
    if domain and email.endswith(f"@{domain}"):
        return email
    fallback = os.getenv("GOOGLE_MEET_ORGANIZER_EMAIL", "").strip().lower()
    if not fallback:
        raise MeetError("No Google Workspace organizer is configured for this tutor.")
    return fallback


def _access_token(info: dict, subject: str) -> str:
    token_uri = info.get("token_uri") or DEFAULT_TOKEN_URI
    issued_at = int(time.time())
    assertion = jwt.encode(
        {
            "iss": info["client_email"],
            "sub": subject,
            "scope": MEET_SCOPE,
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
    request = urllib.request.Request(token_uri, data=body, method="POST")
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))["access_token"]


def create_meet_space(tutor_email: str | None) -> str:
    """Create a Meet space for a class and return its meeting link."""
    try:
        info = _service_account_info()
        if not info:
            raise MeetError("Google Meet automatic links are not configured.")
        token = _access_token(info, organizer_for(tutor_email))
        request = urllib.request.Request(
            MEET_SPACES_URL,
            data=json.dumps({"config": {"accessType": "TRUSTED"}}).encode("utf-8"),
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=10) as response:
            space = json.loads(response.read().decode("utf-8"))
    except MeetError:
        raise
    except Exception as exc:
        detail = exc.read().decode("utf-8", errors="replace") if hasattr(exc, "read") else str(exc)
        print(f"[live-room] Google Meet space creation failed: {detail}")
        raise MeetError("Google Meet could not create the class link.") from exc

    meeting_url = normalize_meet_url(space.get("meetingUri"))
    if not meeting_url:
        raise MeetError("Google Meet returned an unexpected meeting link.")
    return meeting_url
