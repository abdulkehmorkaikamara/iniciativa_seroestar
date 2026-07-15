import os
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# Configuration Secret keys
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
SECRET_KEY = os.getenv("JWT_SECRET")
if not SECRET_KEY:
    if ENVIRONMENT == "production":
        raise RuntimeError("JWT_SECRET is required in production.")
    SECRET_KEY = secrets.token_urlsafe(48)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 240
PASSWORD_RESET_TOKEN_EXPIRE_MINUTES = 20

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate dynamic access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

def password_hash_fingerprint(hashed_password: str) -> str:
    return hashlib.sha256(hashed_password.encode("utf-8")).hexdigest()

def create_password_reset_token(user_id: int, email: str, hashed_password: str) -> str:
    return create_access_token(
        {
            "sub": email.lower(),
            "id": user_id,
            "purpose": "password_reset",
            "pwd": password_hash_fingerprint(hashed_password),
            "nonce": secrets.token_urlsafe(16),
        },
        expires_delta=timedelta(minutes=PASSWORD_RESET_TOKEN_EXPIRE_MINUTES),
    )

def decode_password_reset_token(token: str) -> dict:
    payload = decode_token(token)
    if payload.get("purpose") != "password_reset" or not payload.get("id") or not payload.get("pwd"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link is invalid or has expired.",
        )
    return payload
