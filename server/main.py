"""H.İ.S.A.R. backend — app factory, auth routes, Drive OAuth, static hosting."""

from __future__ import annotations

import hmac
import logging
import secrets
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import vault
from .auth import (
    Principal,
    clear_login_attempts,
    issue_token,
    rate_limit_login,
    require_owner,
    verify_password,
)
from .config import DRIVE_MOUNT, get_settings
from .drive import DriveNotConnected, get_drive
from .files import router as files_router
from .paths import PathError

log = logging.getLogger("hisar")

OAUTH_STATE_COOKIE = "hisar_oauth_state"


class LoginBody(BaseModel):
    username: str | None = None
    password: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    vault.bootstrap(settings.sandbox_root)
    for warning in settings.warnings():
        log.warning(warning)
    log.info("Vault ready at %s", settings.sandbox_root)
    yield
    if settings.drive_enabled:
        await get_drive().aclose()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="H.İ.S.A.R.", version="1.0.0", lifespan=lifespan,
                  docs_url=None, redoc_url=None, openapi_url=None)

    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # A malformed path is a client error, not a 500 — and the message must not
    # leak anything about the host filesystem.
    @app.exception_handler(PathError)
    async def _path_error(request: Request, exc: PathError):
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"detail": str(exc)})

    # ── health ───────────────────────────────────────────────────────────

    @app.get("/health")
    async def health():
        return {"status": "ok", "drive": settings.drive_enabled}

    # ── owner auth ───────────────────────────────────────────────────────

    @app.get("/auth/owner")
    async def owner():
        """The name the lock screen greets, before any session exists.

        Deliberately public: it is the one thing an anonymous visitor is meant
        to see, and the login screen renders it either way. Without this the
        client falls back to a hardcoded name and sends it as the username,
        which fails the comparison below for any owner named anything else.
        """
        s = get_settings()
        return {"user": s.owner_username, "login_enabled": s.owner_login_enabled}

    @app.post("/auth/login")
    async def login(body: LoginBody, request: Request, response: Response):
        rate_limit_login(request)
        s = get_settings()
        if not s.owner_login_enabled:
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE,
                                detail="Owner login is not configured on this server.")

        username_ok = True
        if body.username is not None:
            username_ok = hmac.compare_digest(body.username.strip().lower(),
                                              s.owner_username.strip().lower())
        # Always run the hash verification so a wrong username and a wrong
        # password cost the same wall-clock time.
        password_ok = verify_password(body.password, s.owner_password_hash)
        if not (username_ok and password_ok):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")

        clear_login_attempts(request)
        token = issue_token(s.owner_username)
        response.set_cookie(
            s.cookie_name, token,
            httponly=True, secure=s.cookie_secure, samesite="lax",
            max_age=s.jwt_ttl_seconds, path="/",
        )
        return {"ok": True, "user": s.owner_username, "expires_in": s.jwt_ttl_seconds}

    @app.post("/auth/logout")
    async def logout(response: Response):
        response.delete_cookie(get_settings().cookie_name, path="/")
        return {"ok": True}

    @app.get("/auth/me")
    async def me(principal: Principal = Depends(require_owner)):
        return {"user": principal.name, "kind": principal.kind}

    # ── Google Drive OAuth ───────────────────────────────────────────────

    @app.get("/drive/status")
    async def drive_status(principal: Principal = Depends(require_owner)):
        s = get_settings()
        if not s.drive_enabled:
            return {"enabled": False, "connected": False, "mount": DRIVE_MOUNT}
        drive = get_drive()
        if not drive.connected:
            return {"enabled": True, "connected": False, "mount": DRIVE_MOUNT}
        try:
            info = await drive.about()
        except DriveNotConnected:
            return {"enabled": True, "connected": False, "mount": DRIVE_MOUNT}
        return {"enabled": True, "connected": True, "mount": DRIVE_MOUNT, **info}

    @app.get("/drive/connect")
    async def drive_connect(principal: Principal = Depends(require_owner)):
        s = get_settings()
        if not s.drive_enabled:
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE,
                                detail="Google credentials are not configured.")
        state = secrets.token_urlsafe(24)
        url = get_drive().authorize_url(state)
        # State lives in an httpOnly cookie and is compared on callback: this
        # is what stops someone else's consent from being grafted onto this
        # session.
        resp = JSONResponse({"authorize_url": url})
        resp.set_cookie(OAUTH_STATE_COOKIE, state, httponly=True,
                        secure=s.cookie_secure, samesite="lax", max_age=600, path="/")
        return resp

    @app.get("/drive/oauth/callback")
    async def drive_callback(request: Request, code: str | None = None,
                             state: str | None = None, error: str | None = None):
        s = get_settings()
        expected = request.cookies.get(OAUTH_STATE_COOKIE)

        if error:
            return _oauth_done(f"Google returned an error: {error}", ok=False)
        if not code or not state or not expected or not hmac.compare_digest(state, expected):
            return _oauth_done("OAuth state mismatch — the link was stale or forged.", ok=False)

        await get_drive().exchange_code(code)
        resp = _oauth_done("Google Drive connected. You can close this tab.", ok=True)
        resp.delete_cookie(OAUTH_STATE_COOKIE, path="/")
        return resp

    @app.post("/drive/disconnect")
    async def drive_disconnect(principal: Principal = Depends(require_owner)):
        get_drive().disconnect()
        return {"ok": True, "connected": False}

    # ── file routes ──────────────────────────────────────────────────────

    app.include_router(files_router)

    # ── static client (dist/) with SPA fallback ──────────────────────────

    dist = settings.static_dir
    if dist.is_dir():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

        @app.get("/{full_path:path}")
        async def spa(full_path: str):
            candidate = dist / full_path
            if full_path and candidate.is_file() and dist.resolve() in candidate.resolve().parents:
                return FileResponse(candidate)
            return FileResponse(dist / "index.html")
    else:
        log.warning("No client build at %s — serving API only.", dist)

    return app


def _oauth_done(message: str, *, ok: bool) -> Response:
    """A tiny self-contained page: the callback lands in a popup/new tab, and
    pulling in the whole SPA just to say 'done' is silly."""
    color = "#36abca" if ok else "#e0564f"
    html = f"""<!doctype html><meta charset="utf-8">
<title>H.İ.S.A.R. — Google Drive</title>
<style>
  body{{margin:0;height:100vh;display:grid;place-items:center;background:#0a1014;
       color:#dbe6ea;font:16px/1.6 system-ui,sans-serif}}
  .c{{text-align:center;padding:2rem 3rem;border:1px solid #1e3038;border-radius:14px;
      background:#0e161b}}
  h1{{font-size:1rem;letter-spacing:.18em;text-transform:uppercase;color:{color};margin:0 0 .75rem}}
</style>
<div class="c"><h1>{'Connected' if ok else 'Failed'}</h1><p>{message}</p></div>
<script>
  if (window.opener) {{ window.opener.postMessage({{type:"hisar-drive",ok:{str(ok).lower()}}}, "*"); setTimeout(()=>window.close(), 1200); }}
</script>"""
    return Response(html, media_type="text/html", status_code=200 if ok else 400)


app = create_app()
