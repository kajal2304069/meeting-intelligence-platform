"""
Auth: password hashing, JWT issuing/verification, and the FastAPI
dependencies routers use to find out who's asking and which company's
data they're allowed to see.

Set JWT_SECRET in your .env for production — a random default is used
only so local dev doesn't crash with no .env, but tokens won't survive
a server restart if you rely on the default (a new random secret is
generated each process start, invalidating old tokens).
"""
from __future__ import annotations
import os
import secrets
import datetime as dt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import bcrypt
from sqlalchemy.orm import Session

from backend.db_models import get_session, User, Company

JWT_SECRET = os.getenv("JWT_SECRET") or secrets.token_hex(32)
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "72"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# bcrypt truncates/ignores anything past 72 bytes — cap input so a very long
# password doesn't silently lose its tail, instead of relying on bcrypt's
# own (version-dependent) handling of the overflow.
_MAX_PW_BYTES = 72


def hash_password(password: str) -> str:
    pw_bytes = password.encode("utf-8")[:_MAX_PW_BYTES]
    return bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    pw_bytes = plain.encode("utf-8")[:_MAX_PW_BYTES]
    try:
        return bcrypt.checkpw(pw_bytes, hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user_id: int, company_id: int) -> str:
    expire = dt.datetime.utcnow() + dt.timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {"sub": str(user_id), "company_id": company_id, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_session)) -> User:
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    payload = decode_token(token)
    user = db.query(User).get(int(payload["sub"]))
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


def require_manager(user: User = Depends(get_current_user)) -> User:
    if user.role != "manager":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Manager role required")
    return user


def new_invite_code() -> str:
    return secrets.token_hex(4).upper()
