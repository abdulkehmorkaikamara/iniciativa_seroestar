"""Create students' @<workspace domain> Google accounts.

Off unless ``GOOGLE_PROVISION_STUDENTS=true``: every Workspace user is a
licence, so accounts are only created once the academy has chosen to pay for
(or been granted) them.

Google's directory is the record of who already has an account: each account
carries the student's ID code as an external ID, so no database column is
needed and an account deleted in the Admin console is simply created again.
"""

import os
import re
import secrets
import string
import unicodedata
import urllib.parse

from . import google_workspace

DIRECTORY_SCOPE = "https://www.googleapis.com/auth/admin.directory.user"
USERS_URL = "https://admin.googleapis.com/admin/directory/v1/users"
STUDENT_ID_TYPE = "student_id"
_MAX_ADDRESS_ATTEMPTS = 10
# Leave out characters that are easy to misread when copied by hand.
_PASSWORD_ALPHABET = "".join(c for c in string.ascii_letters + string.digits if c not in "0OoIl1")


def provisioning_enabled() -> bool:
    return os.getenv("GOOGLE_PROVISION_STUDENTS", "false").strip().lower() == "true"


def missing_settings() -> list[str]:
    required = {
        "GOOGLE_SERVICE_ACCOUNT_JSON": os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip(),
        "GOOGLE_WORKSPACE_DOMAIN": google_workspace.workspace_domain(),
        "GOOGLE_ADMIN_EMAIL": admin_email(),
    }
    return [name for name, value in required.items() if not value]


def admin_email() -> str:
    return os.getenv("GOOGLE_ADMIN_EMAIL", "").strip().lower()


def admin_token() -> str:
    return google_workspace.access_token(admin_email(), [DIRECTORY_SCOPE])


def _ascii_words(full_name: str) -> list[str]:
    plain = unicodedata.normalize("NFKD", full_name or "").encode("ascii", "ignore").decode("ascii").lower()
    return [word for word in re.split(r"[^a-z0-9]+", plain) if word]


def address_candidates(full_name: str, student_code: str, domain: str):
    """``first.last``, then ``first.last2``..., falling back to the student code."""
    words = _ascii_words(full_name)
    if words:
        base = f"{words[0]}.{words[-1]}" if len(words) > 1 else words[0]
        yield f"{base}@{domain}"
        for number in range(2, _MAX_ADDRESS_ATTEMPTS + 1):
            yield f"{base}{number}@{domain}"
    yield f"{re.sub(r'[^a-z0-9]+', '', student_code.lower())}@{domain}"


def split_name(full_name: str, student_code: str) -> tuple[str, str]:
    parts = (full_name or "").split()
    if not parts:
        return student_code, "Student"
    given = parts[0][:60]
    family = " ".join(parts[1:])[:60] or "Student"
    return given, family


def temporary_password() -> str:
    while True:
        password = "".join(secrets.choice(_PASSWORD_ALPHABET) for _ in range(14))
        if any(c.islower() for c in password) and any(c.isupper() for c in password) and any(c.isdigit() for c in password):
            return password


def existing_student_accounts(token: str) -> tuple[dict[str, str], set[str]]:
    """Map student codes to their Workspace address, plus every address already taken."""
    by_code: dict[str, str] = {}
    taken: set[str] = set()
    page_token = ""
    while True:
        query = {"domain": google_workspace.workspace_domain(), "maxResults": "500", "projection": "basic"}
        if page_token:
            query["pageToken"] = page_token
        page = google_workspace.api_request("GET", f"{USERS_URL}?{urllib.parse.urlencode(query)}", token)
        for user in page.get("users", []):
            email = str(user.get("primaryEmail", "")).lower()
            taken.add(email)
            for alias in user.get("aliases", []) or []:
                taken.add(str(alias).lower())
            for external_id in user.get("externalIds", []) or []:
                if external_id.get("customType") == STUDENT_ID_TYPE and external_id.get("value"):
                    by_code[str(external_id["value"])] = email
        page_token = page.get("nextPageToken", "")
        if not page_token:
            return by_code, taken


def create_student_account(token: str, full_name: str, student_code: str, recovery_email: str, taken: set[str]) -> tuple[str, str]:
    """Create the account under the first free address; returns (address, temporary password)."""
    domain = google_workspace.workspace_domain()
    given, family = split_name(full_name, student_code)
    password = temporary_password()
    body = {
        "name": {"givenName": given, "familyName": family},
        "password": password,
        "changePasswordAtNextLogin": True,
        "orgUnitPath": os.getenv("GOOGLE_STUDENT_ORG_UNIT", "/").strip() or "/",
        "externalIds": [{"type": "custom", "customType": STUDENT_ID_TYPE, "value": student_code}],
    }
    recovery = (recovery_email or "").strip().lower()
    if recovery and "@" in recovery and not recovery.endswith(f"@{domain}"):
        body["recoveryEmail"] = recovery

    for address in address_candidates(full_name, student_code, domain):
        if address in taken:
            continue
        try:
            google_workspace.api_request("POST", USERS_URL, token, {**body, "primaryEmail": address})
        except google_workspace.GoogleApiError as exc:
            if exc.status == 409:
                taken.add(address)
                continue
            raise
        taken.add(address)
        return address, password
    raise google_workspace.GoogleApiError("No free address was found for this student.")
