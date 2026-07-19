"""Environment-driven configuration. No secret ever has a usable default."""

from __future__ import annotations

import os
import secrets
from functools import lru_cache
from pathlib import Path

# Vault subtrees a machine token (agents, Forge) may write into. Everything
# else in the vault is owner-only, and machine tokens can never read at all.
MACHINE_WRITE_SCOPES = ("/SPEDA", "/Forge")

# The folder layout the vault is bootstrapped with on first start.
DEFAULT_TREE = (
    "Desktop",
    "Documents",
    "Media",
    "Projects",
    "Transfers",
    "SPEDA",
    "Forge/workspaces",
    "Forge/projects",
)

# Virtual mount point for Google Drive. It is not a real directory in the
# vault — requests under this prefix are served by the Drive provider.
DRIVE_MOUNT = "/Google Drive"

TRASH_DIR = ".trash"


def _bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    return default if raw is None else raw.strip().lower() in ("1", "true", "yes", "on")


class Settings:
    def __init__(self) -> None:
        self.sandbox_root = Path(os.getenv("HISAR_SANDBOX_ROOT", "./vault")).expanduser()

        # ── owner auth ──
        self.owner_username = os.getenv("HISAR_OWNER_USERNAME", "ahmet")
        self.owner_password_hash = os.getenv("HISAR_OWNER_PASSWORD_HASH", "")
        # A generated secret means sessions do not survive a restart, which is
        # the right failure mode for a missing config value.
        self.jwt_secret = os.getenv("HISAR_JWT_SECRET") or secrets.token_urlsafe(48)
        self.jwt_ttl_seconds = int(os.getenv("HISAR_JWT_TTL", str(12 * 3600)))
        self.cookie_secure = _bool("HISAR_COOKIE_SECURE", True)
        self.cookie_name = "hisar_session"

        # ── machine (agent / Forge) auth ──
        self.machine_token = os.getenv("HISAR_MACHINE_TOKEN", "")

        # ── limits ──
        self.max_upload_bytes = int(os.getenv("HISAR_MAX_UPLOAD_BYTES", str(2 * 1024**3)))
        self.login_rate_limit = int(os.getenv("HISAR_LOGIN_RATE_LIMIT", "8"))
        self.login_rate_window = int(os.getenv("HISAR_LOGIN_RATE_WINDOW", "300"))

        # ── Google Drive (optional; absent = the mount simply never appears) ──
        self.google_client_id = os.getenv("HISAR_GOOGLE_CLIENT_ID", "")
        self.google_client_secret = os.getenv("HISAR_GOOGLE_CLIENT_SECRET", "")
        self.google_redirect_uri = os.getenv(
            "HISAR_GOOGLE_REDIRECT_URI", "http://localhost:8600/drive/oauth/callback"
        )
        self.google_token_store = Path(
            os.getenv("HISAR_GOOGLE_TOKEN_STORE", str(self.sandbox_root / ".hisar" / "google_token.json"))
        )

        # ── serving ──
        self.static_dir = Path(os.getenv("HISAR_STATIC_DIR", "./dist"))
        self.cors_origins = [
            o.strip() for o in os.getenv("HISAR_CORS_ORIGINS", "").split(",") if o.strip()
        ]

    @property
    def drive_enabled(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)

    @property
    def owner_login_enabled(self) -> bool:
        return bool(self.owner_password_hash)

    def warnings(self) -> list[str]:
        """Misconfigurations worth shouting about at startup."""
        out = []
        if not self.owner_password_hash:
            out.append(
                "HISAR_OWNER_PASSWORD_HASH is unset — owner login is disabled. "
                "Generate one with: python -m server.auth hash-password"
            )
        if not os.getenv("HISAR_JWT_SECRET"):
            out.append("HISAR_JWT_SECRET is unset — sessions will not survive a restart.")
        if not self.machine_token:
            out.append("HISAR_MACHINE_TOKEN is unset — /deposit is disabled.")
        if not self.drive_enabled:
            out.append("Google Drive credentials unset — the Drive mount is hidden.")
        return out


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
