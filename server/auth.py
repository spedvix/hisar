"""Two credentials, two scopes.

  owner JWT   — full CRUD over the vault, short-lived, httpOnly cookie.
  machine tok — X-Hisar-Token, write-only, confined to MACHINE_WRITE_SCOPES.

An agent credential can add files. It can never read, list, or delete the
owner's vault. That asymmetry is the whole point.
"""

from __future__ import annotations

import hmac
import time
from dataclasses import dataclass
from typing import Literal

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError
from fastapi import Depends, HTTPException, Request, status

from .config import MACHINE_WRITE_SCOPES, get_settings
from .paths import is_within

_hasher = PasswordHasher()
ALGORITHM = "HS256"


@dataclass(frozen=True)
class Principal:
    kind: Literal["owner", "machine"]
    name: str

    @property
    def is_owner(self) -> bool:
        return self.kind == "owner"


# ── password + token primitives ──────────────────────────────────────────

def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        return _hasher.verify(stored_hash, password)
    except (VerifyMismatchError, VerificationError, ValueError):
        return False


def issue_token(username: str) -> str:
    s = get_settings()
    now = int(time.time())
    payload = {"sub": username, "scope": "owner", "iat": now, "exp": now + s.jwt_ttl_seconds}
    return jwt.encode(payload, s.jwt_secret, algorithm=ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, get_settings().jwt_secret, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None


def _machine_token_ok(supplied: str) -> bool:
    expected = get_settings().machine_token
    if not expected or not supplied:
        return False
    return hmac.compare_digest(supplied, expected)


# ── login rate limiting ──────────────────────────────────────────────────

_attempts: dict[str, list[float]] = {}


def rate_limit_login(request: Request) -> None:
    """Fixed-window limiter keyed by client IP. In-process is enough: Hisar is
    a single-owner service behind one Caddy instance."""
    s = get_settings()
    ip = (request.client.host if request.client else "unknown")
    now = time.monotonic()
    hits = [t for t in _attempts.get(ip, []) if now - t < s.login_rate_window]
    if len(hits) >= s.login_rate_limit:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Try again later.",
        )
    hits.append(now)
    _attempts[ip] = hits


def clear_login_attempts(request: Request) -> None:
    _attempts.pop(request.client.host if request.client else "unknown", None)


# ── FastAPI dependencies ─────────────────────────────────────────────────

def _principal_from_request(request: Request) -> Principal | None:
    s = get_settings()

    machine = request.headers.get("X-Hisar-Token", "")
    if machine and _machine_token_ok(machine):
        return Principal(kind="machine", name="machine")

    token = request.cookies.get(s.cookie_name)
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth[7:].strip()
    if token:
        claims = decode_token(token)
        if claims and claims.get("scope") == "owner":
            return Principal(kind="owner", name=str(claims.get("sub", "owner")))
    return None


def current_principal(request: Request) -> Principal:
    p = _principal_from_request(request)
    if p is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return p


def require_owner(principal: Principal = Depends(current_principal)) -> Principal:
    """Delete, rename, move — anything that DESTROYS or reorganises."""
    if not principal.is_owner:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="This operation requires the owner credential.",
        )
    return principal


def require_reader(principal: Principal = Depends(current_principal)) -> Principal:
    """List and download — the owner, or an agent navigating the vault.

    The vault is the owner's cloud filesystem and their agents work in it
    alongside them, so an agent that can only WRITE is close to useless: it
    cannot find the report it filed last week, check whether a folder already
    exists, or read a document the owner asked it to work from. Deposit-only
    access made the vault a drop box rather than a shared workspace.

    Reading is deliberately wider than writing. `authorize_write` still pins
    machines to /SPEDA and /Forge, so an agent can SEE the owner's Documents
    and cannot touch them, and destructive operations (delete, rename) remain
    owner-only through `require_owner` above.
    """
    return principal


def require_machine(request: Request) -> Principal:
    """The agent/Forge door. Machine token only — an owner cookie is not
    accepted here, so /deposit has exactly one caller shape."""
    supplied = request.headers.get("X-Hisar-Token", "")
    if not _machine_token_ok(supplied):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid machine token")
    return Principal(kind="machine", name="machine")


def authorize_write(principal: Principal, vault_path: str) -> None:
    """Gate a write by principal scope. Owners write anywhere; machines only
    under SPEDA/ and Forge/."""
    if principal.is_owner:
        return
    if not any(is_within(vault_path, scope) for scope in MACHINE_WRITE_SCOPES):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail=f"Machine credentials may only write under {', '.join(MACHINE_WRITE_SCOPES)}",
        )


if __name__ == "__main__":  # pragma: no cover - operator helper
    import getpass
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "hash-password":
        pw = getpass.getpass("Owner password: ")
        if pw != getpass.getpass("Confirm: "):
            sys.exit("Passwords do not match.")
        print(hash_password(pw))
    else:
        sys.exit("usage: python -m server.auth hash-password")
