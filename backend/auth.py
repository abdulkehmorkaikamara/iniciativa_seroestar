"""Password hashing and JWT issuing/validation.

Two persistence guarantees live here:

* Passwords are only ever stored as bcrypt hashes, never in plaintext.
* The JWT signing key is stable across restarts. It used to be regenerated with
  ``secrets.token_urlsafe`` on every boot during development, which silently
  invalidated every issued session the moment the server restarted. Now the key
  comes from ``JWT_SECRET``, and when that is unset locally it is generated once
  and cached in ``backend/data/.jwt_secret`` so the next boot reuses it.
"""

import os
import secrets
import hashlib
import stat
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from .database import DATA_DIR
from .roles import STUDENT, TUTOR, normalize_role

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
PASSWORD_RESET_TOKEN_EXPIRE_MINUTES = 20

# bcrypt only consumes the first 72 bytes of a password and raises on longer input.
BCRYPT_MAX_BYTES = 72

_SECRET_FILE = DATA_DIR / ".jwt_secret"


def _load_or_create_development_secret() -> str:
    """Read the cached local signing key, creating it on first use."""
    try:
        cached = _SECRET_FILE.read_text(encoding="utf-8").strip()
        if cached:
            return cached
    except OSError:
        pass

    generated = secrets.token_urlsafe(48)
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        _SECRET_FILE.write_text(generated, encoding="utf-8")
        _SECRET_FILE.chmod(stat.S_IRUSR | stat.S_IWUSR)
    except OSError:
        # Read-only filesystem: sessions still work, they just do not survive a
        # restart. Production never reaches this branch because JWT_SECRET is
        # mandatory there.
        print(
            "[auth] Warning: unable to cache a development JWT secret at "
            f"{_SECRET_FILE}. Set JWT_SECRET to keep sessions valid across restarts."
        )
    return generated


def _resolve_secret_key() -> str:
    configured = os.getenv("JWT_SECRET", "").strip()
    if configured:
        return configured
    if ENVIRONMENT == "production":
        raise RuntimeError("JWT_SECRET is required in production.")
    return _load_or_create_development_secret()


SECRET_KEY = _resolve_secret_key()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")


def _bcrypt_safe(password: str) -> str:
    encoded = password.encode("utf-8")
    if len(encoded) <= BCRYPT_MAX_BYTES:
        return password
    return encoded[:BCRYPT_MAX_BYTES].decode("utf-8", "ignore")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    try:
        return pwd_context.verify(_bcrypt_safe(plain_password), hashed_password)
    except ValueError:
        # Unrecognised or corrupted hash: treat as a failed login, not a 500.
        return False


def get_password_hash(password: str) -> str:
    return pwd_context.hash(_bcrypt_safe(password))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    issued_at = datetime.now(timezone.utc)
    expire = issued_at + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"iat": issued_at, "exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired or is no longer valid. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

def password_hash_fingerprint(hashed_password: str) -> str:
    return hashlib.sha256(hashed_password.encode("utf-8")).hexdigest()

# Only these two portals offer self-service password recovery; the root
# developer account is recovered by an operator, not by email.
RECOVERABLE_ROLES = frozenset({STUDENT, TUTOR})


def create_password_reset_token(user_id: int, email: str, hashed_password: str, role: str) -> str:
    canonical_role = normalize_role(role)
    if canonical_role not in RECOVERABLE_ROLES:
        raise ValueError("Password recovery is only available for student and tutor accounts.")
    return create_access_token(
        {
            "sub": email.lower(),
            "id": user_id,
            "role": canonical_role,
            "purpose": "password_reset",
            "pwd": password_hash_fingerprint(hashed_password),
            "nonce": secrets.token_urlsafe(16),
        },
        expires_delta=timedelta(minutes=PASSWORD_RESET_TOKEN_EXPIRE_MINUTES),
    )

def decode_password_reset_token(token: str) -> dict:
    payload = decode_token(token)
    if (
        payload.get("purpose") != "password_reset"
        or not payload.get("id")
        or not payload.get("pwd")
        # Accept reset links issued before the developer/tutor rename.
        or normalize_role(payload.get("role")) not in RECOVERABLE_ROLES
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link is invalid or has expired.",
        )
    payload["role"] = normalize_role(payload.get("role"))
    return payload
