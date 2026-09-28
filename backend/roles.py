"""Canonical role names for the three portals.

The platform exposes three login areas and each one maps to exactly one
canonical role that is stored in the database:

* ``developer`` -- the root developer shell (previously stored as ``admin``)
* ``student``   -- the student portal
* ``tutor``     -- the tutor portal (previously stored as ``teacher``)

Older rows and older JWTs may still carry the legacy ``admin``/``teacher``
spelling, so every comparison goes through :func:`normalize_role` and tokens
are accepted under either spelling. Responses carry both the canonical role and
the legacy alias so existing clients keep working.
"""

DEVELOPER = "developer"
STUDENT = "student"
TUTOR = "tutor"

CANONICAL_ROLES = frozenset({DEVELOPER, STUDENT, TUTOR})

# Anything we have ever written into ``users.role`` or into a JWT payload.
ROLE_ALIASES = {
    "developer": DEVELOPER,
    "admin": DEVELOPER,
    "administrator": DEVELOPER,
    "root": DEVELOPER,
    "superuser": DEVELOPER,
    "student": STUDENT,
    "learner": STUDENT,
    "tutor": TUTOR,
    "teacher": TUTOR,
    "instructor": TUTOR,
}

# Spelling still expected by older frontend builds and stored records.
LEGACY_ROLE_NAMES = {
    DEVELOPER: "admin",
    STUDENT: "student",
    TUTOR: "teacher",
}

# Roles that may administer the platform.
DEVELOPER_ROLES = frozenset({DEVELOPER})
# Roles allowed to run a class (tutors plus the developer shell).
STAFF_ROLES = frozenset({TUTOR, DEVELOPER})
# Every authenticated role.
ALL_ROLES = frozenset({STUDENT, TUTOR, DEVELOPER})


def _stored_values_for(canonical: str) -> tuple[str, ...]:
    """Every spelling that may sit in ``users.role`` for a canonical role.

    Used by queries that filter on the column directly, so rows written before
    the rename are still found.
    """
    return tuple(sorted(alias for alias, target in ROLE_ALIASES.items() if target == canonical))


DEVELOPER_ROLE_VALUES = _stored_values_for(DEVELOPER)
STUDENT_ROLE_VALUES = _stored_values_for(STUDENT)
TUTOR_ROLE_VALUES = _stored_values_for(TUTOR)


def normalize_role(value: str | None) -> str:
    """Return the canonical role for ``value`` ("" when it is unknown)."""
    if not value:
        return ""
    return ROLE_ALIASES.get(str(value).strip().lower(), "")


def legacy_role(value: str | None) -> str:
    """Return the legacy spelling for a role, for backwards-compatible payloads."""
    return LEGACY_ROLE_NAMES.get(normalize_role(value), "")


def role_matches(value: str | None, allowed: frozenset[str] | set[str]) -> bool:
    """True when ``value`` normalizes into one of the ``allowed`` canonical roles."""
    normalized = normalize_role(value)
    return bool(normalized) and normalized in {normalize_role(role) for role in allowed}
