"""Idempotent startup bootstrap for the three portals.

Responsibilities, in order:

1. Make sure the schema exists (Alembic owns it in production).
2. Normalize legacy role spellings (``admin``/``teacher``) to the canonical
   ``developer``/``tutor``.
3. Create the default developer / student / tutor accounts *if they are
   missing*.

Step 3 is strictly create-if-absent. An account that already exists is never
recreated and its password is never rewritten, so a credential the team changed
later survives every subsequent restart. The single exception is the explicit
``SEED_RESET_PASSWORDS=true`` recovery switch.
"""

import os
from dataclasses import dataclass, field
from datetime import datetime, timezone

from sqlalchemy import inspect, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from . import auth, models, roles
from .database import Base, SessionLocal, database_description, engine

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
IS_PRODUCTION = ENVIRONMENT == "production"


@dataclass(frozen=True)
class DefaultAccount:
    """A portal's default login, resolved from the environment at boot."""

    role: str
    env_prefix: str
    default_email: str
    default_password: str
    full_name: str
    legacy_email_env: str | None = None
    legacy_password_env: str | None = None
    profile: dict = field(default_factory=dict)

    def email(self) -> str:
        for key in (f"{self.env_prefix}_EMAIL", self.legacy_email_env):
            value = os.getenv(key, "").strip() if key else ""
            if value:
                return value.lower()
        return self.default_email

    def password(self) -> str:
        """The configured password, or "" when production has not supplied one."""
        for key in (f"{self.env_prefix}_PASSWORD", self.legacy_password_env):
            value = os.getenv(key, "") if key else ""
            if value:
                return value
        # Well-known defaults are a local-development convenience only; a
        # production deployment has to supply its own secret.
        return "" if IS_PRODUCTION else self.default_password

    def password_env_name(self) -> str:
        return f"{self.env_prefix}_PASSWORD"


DEFAULT_ACCOUNTS: tuple[DefaultAccount, ...] = (
    DefaultAccount(
        role=roles.DEVELOPER,
        env_prefix="SEED_DEVELOPER",
        default_email="developer@seroestar.com",
        default_password="SeroEstar-Dev-2026!",
        full_name="Root Developer",
        legacy_email_env="ADMIN_EMAIL",
        legacy_password_env="ADMIN_PASSWORD",
    ),
    DefaultAccount(
        role=roles.STUDENT,
        env_prefix="SEED_STUDENT",
        default_email="student@seroestar.com",
        default_password="SeroEstar-Student-2026!",
        full_name="Demo Student",
        profile={
            "student_id_code": "SER-001",
            "course_level": "A1",
            "class_group": "Morning Group",
            "learning_mode": "Online",
            "status": "Active",
        },
    ),
    DefaultAccount(
        role=roles.TUTOR,
        env_prefix="SEED_TUTOR",
        default_email="tutor@seroestar.com",
        default_password="SeroEstar-Tutor-2026!",
        full_name="Demo Tutor",
        profile={
            "teacher_id_code": "TUT-001",
            "assigned_levels": "A1,A2",
        },
    ),
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _reset_requested() -> bool:
    return os.getenv("SEED_RESET_PASSWORDS", "false").strip().lower() == "true"


def ensure_schema() -> None:
    """Create any missing tables.

    Development creates tables directly so a fresh clone just works. Production
    leaves the schema to ``alembic upgrade head`` unless AUTO_CREATE_TABLES is
    explicitly opted into.
    """
    auto_create = os.getenv("AUTO_CREATE_TABLES", "false").strip().lower() == "true"
    if IS_PRODUCTION and not auto_create:
        return
    Base.metadata.create_all(bind=engine, checkfirst=True)


def normalize_legacy_roles(db: Session) -> int:
    """Rewrite pre-existing ``admin``/``teacher`` role values in place."""
    renamed = 0
    for legacy, canonical in (("admin", roles.DEVELOPER), ("teacher", roles.TUTOR)):
        result = db.execute(
            update(models.User)
            .where(models.User.role == legacy)
            .values(role=canonical)
        )
        renamed += result.rowcount or 0
    if renamed:
        db.commit()
    return renamed


def _unique_student_code(db: Session, preferred: str) -> str:
    candidate = preferred
    suffix = 1
    while db.execute(
        select(models.StudentProfile).where(models.StudentProfile.student_id_code == candidate)
    ).scalar_one_or_none():
        suffix += 1
        candidate = f"{preferred}-{suffix}"
    return candidate


def _unique_teacher_code(db: Session, preferred: str) -> str:
    candidate = preferred
    suffix = 1
    while db.execute(
        select(models.TeacherProfile).where(models.TeacherProfile.teacher_id_code == candidate)
    ).scalar_one_or_none():
        suffix += 1
        candidate = f"{preferred}-{suffix}"
    return candidate


def _find_user(db: Session, email: str) -> models.User | None:
    # Emails are stored lowercase, but rows created before that was enforced
    # may not be, so compare case-insensitively.
    return db.query(models.User).filter(models.User.email.ilike(email)).first()


def _ensure_profile(db: Session, user: models.User, account: DefaultAccount) -> None:
    """Attach the role-specific profile row when it is missing."""
    if account.role == roles.STUDENT:
        existing = db.query(models.StudentProfile).filter(
            models.StudentProfile.user_id == user.id
        ).first()
        if existing:
            return
        db.add(models.StudentProfile(
            user_id=user.id,
            student_id_code=_unique_student_code(db, account.profile.get("student_id_code", "SER-001")),
            phone_number=account.profile.get("phone_number"),
            course_level=account.profile.get("course_level", "A1"),
            class_group=account.profile.get("class_group", "Morning Group"),
            learning_mode=account.profile.get("learning_mode", "Online"),
            status=account.profile.get("status", "Active"),
        ))
    elif account.role == roles.TUTOR:
        existing = db.query(models.TeacherProfile).filter(
            models.TeacherProfile.user_id == user.id
        ).first()
        if existing:
            return
        db.add(models.TeacherProfile(
            user_id=user.id,
            teacher_id_code=_unique_teacher_code(db, account.profile.get("teacher_id_code", "TUT-001")),
            assigned_levels=account.profile.get("assigned_levels", "A1,A2"),
        ))


def ensure_default_accounts(db: Session) -> dict:
    """Create the three default logins when absent. Never overwrites an
    account that is already there (unless SEED_RESET_PASSWORDS=true)."""
    summary = {"created": [], "kept": [], "reset": [], "skipped": []}
    reset = _reset_requested()

    for account in DEFAULT_ACCOUNTS:
        email = account.email()
        password = account.password()
        user = _find_user(db, email)

        if user:
            # Already persisted: leave the credential exactly as it is.
            canonical = roles.normalize_role(user.role)
            if canonical and user.role != canonical:
                user.role = canonical
            if reset and password:
                user.hashed_password = auth.get_password_hash(password)
                user.password_changed_at = _now()
                summary["reset"].append(email)
            else:
                summary["kept"].append(email)
            _ensure_profile(db, user, account)
            continue

        if not password:
            # Production without a configured secret: refuse to invent one.
            summary["skipped"].append({
                "email": email,
                "role": account.role,
                "reason": f"set {account.password_env_name()} to create this account",
            })
            continue

        user = models.User(
            email=email,
            hashed_password=auth.get_password_hash(password),
            full_name=account.full_name,
            role=account.role,
            is_active=True,
            is_seeded=True,
            password_changed_at=_now(),
        )
        db.add(user)
        db.flush()  # assign user.id without ending the transaction
        _ensure_profile(db, user, account)
        summary["created"].append({"email": email, "role": account.role})

    db.commit()
    return summary


def run_startup_bootstrap(verbose: bool = True) -> dict:
    """Entry point called once per process start (and by the seed CLI)."""
    ensure_schema()

    with SessionLocal() as db:
        if not inspect(engine).has_table(models.User.__tablename__):
            message = (
                "The 'users' table does not exist yet. Run 'alembic upgrade head' "
                "against the configured database before starting the API."
            )
            if verbose:
                print(f"[bootstrap] {message}")
            return {"ok": False, "error": message, "database": database_description()}

        renamed = normalize_legacy_roles(db)
        summary = ensure_default_accounts(db)

    summary.update({"ok": True, "roles_normalized": renamed, "database": database_description()})

    if verbose:
        print(f"[bootstrap] Persistent database: {summary['database']}")
        if renamed:
            print(f"[bootstrap] Normalized {renamed} legacy role value(s) to developer/tutor.")
        for entry in summary["created"]:
            print(f"[bootstrap] Created default {entry['role']} account: {entry['email']}")
        if summary["kept"]:
            print(f"[bootstrap] Existing accounts left untouched: {', '.join(summary['kept'])}")
        for entry in summary["reset"]:
            print(f"[bootstrap] SEED_RESET_PASSWORDS=true -> password reset for {entry}")
        for entry in summary["skipped"]:
            print(f"[bootstrap] Skipped {entry['role']} account {entry['email']}: {entry['reason']}")

    return summary


def safe_startup_bootstrap() -> dict:
    """``run_startup_bootstrap`` that reports database failures instead of
    crashing the ASGI app, so /api/health can explain what is wrong."""
    try:
        return run_startup_bootstrap()
    except SQLAlchemyError as error:
        message = f"Could not reach the database ({database_description()}): {error.__class__.__name__}"
        print(f"[bootstrap] {message}")
        return {"ok": False, "error": message, "database": database_description()}
