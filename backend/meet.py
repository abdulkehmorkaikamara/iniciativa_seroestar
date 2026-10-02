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

import os
import re

from . import google_workspace

MEET_SCOPE = "https://www.googleapis.com/auth/meetings.space.created"
MEET_SPACES_URL = "https://meet.googleapis.com/v2/spaces"
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


def auto_create_enabled() -> bool:
    return live_provider() == "meet" and bool(os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip())


def organizer_for(tutor_email: str | None) -> str:
    """The Workspace user a tutor's Meet space is created as."""
    domain = google_workspace.workspace_domain()
    email = (tutor_email or "").strip().lower()
    if domain and email.endswith(f"@{domain}"):
        return email
    fallback = os.getenv("GOOGLE_MEET_ORGANIZER_EMAIL", "").strip().lower()
    if not fallback:
        raise MeetError("No Google Workspace organizer is configured for this tutor.")
    return fallback


def create_meet_space(tutor_email: str | None) -> str:
    """Create a Meet space for a class and return its meeting link."""
    if not google_workspace.service_account_info():
        raise MeetError("Google Meet automatic links are not configured.")
    organizer = organizer_for(tutor_email)
    try:
        token = google_workspace.access_token(organizer, [MEET_SCOPE])
        space = google_workspace.api_request("POST", MEET_SPACES_URL, token, {"config": {"accessType": "TRUSTED"}})
    except google_workspace.GoogleApiError as exc:
        raise MeetError("Google Meet could not create the class link.") from exc

    meeting_url = normalize_meet_url(space.get("meetingUri"))
    if not meeting_url:
        raise MeetError("Google Meet returned an unexpected meeting link.")
    return meeting_url
