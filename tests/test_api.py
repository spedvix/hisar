"""End-to-end tests over the HTTP surface: auth scopes, CRUD, and deposit.

The Drive provider is not exercised here — it needs live Google credentials.
What is tested is that Drive paths are routed and scoped correctly.
"""

import io

import pytest
from fastapi.testclient import TestClient

from server.auth import hash_password
from server.config import get_settings

PASSWORD = "correct-horse-battery-staple"
MACHINE_TOKEN = "machine-token-for-tests"


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("HISAR_SANDBOX_ROOT", str(tmp_path / "vault"))
    monkeypatch.setenv("HISAR_OWNER_PASSWORD_HASH", hash_password(PASSWORD))
    monkeypatch.setenv("HISAR_JWT_SECRET", "test-secret-not-used-anywhere-real")
    monkeypatch.setenv("HISAR_MACHINE_TOKEN", MACHINE_TOKEN)
    monkeypatch.setenv("HISAR_COOKIE_SECURE", "false")
    monkeypatch.setenv("HISAR_STATIC_DIR", str(tmp_path / "no-dist"))
    monkeypatch.delenv("HISAR_GOOGLE_CLIENT_ID", raising=False)
    monkeypatch.delenv("HISAR_GOOGLE_CLIENT_SECRET", raising=False)
    get_settings.cache_clear()

    # The limiter is process-global by design (one owner, one box), so tests
    # must reset it or the rate-limit case poisons every case after it.
    import server.auth as auth_module
    auth_module._attempts.clear()

    from server.main import create_app

    with TestClient(create_app()) as c:
        yield c
    get_settings.cache_clear()


@pytest.fixture()
def owner(client):
    r = client.post("/auth/login", json={"password": PASSWORD})
    assert r.status_code == 200
    return client


MACHINE = {"X-Hisar-Token": MACHINE_TOKEN}


# ── auth ─────────────────────────────────────────────────────────────────

def test_health_needs_no_auth(client):
    assert client.get("/health").json()["status"] == "ok"


def test_login_rejects_wrong_password(client):
    r = client.post("/auth/login", json={"password": "hunter2"})
    assert r.status_code == 401


def test_login_sets_httponly_cookie(client):
    r = client.post("/auth/login", json={"password": PASSWORD})
    assert r.status_code == 200
    cookie = r.headers["set-cookie"]
    assert "HttpOnly" in cookie and "SameSite=lax" in cookie


def test_login_is_rate_limited(client):
    codes = [client.post("/auth/login", json={"password": "no"}).status_code for _ in range(12)]
    assert 429 in codes


def test_unauthenticated_cannot_list(client):
    assert client.get("/files/list", params={"path": "/"}).status_code == 401


def test_logout_clears_session(owner):
    assert owner.get("/auth/me").status_code == 200
    owner.post("/auth/logout")
    assert owner.get("/auth/me").status_code == 401


# ── vault CRUD ───────────────────────────────────────────────────────────

def test_vault_is_bootstrapped(owner):
    names = {e["name"] for e in owner.get("/files/list", params={"path": "/"}).json()["entries"]}
    assert {"Documents", "Transfers", "SPEDA", "Forge"} <= names


def test_trash_is_hidden_from_the_root_listing(owner):
    names = {e["name"] for e in owner.get("/files/list", params={"path": "/"}).json()["entries"]}
    assert ".trash" not in names and ".hisar" not in names


def test_upload_download_roundtrip(owner):
    r = owner.post("/files/upload", params={"path": "/Transfers"},
                   files={"file": ("note.txt", io.BytesIO(b"hello hisar"), "text/plain")})
    assert r.status_code == 200
    assert r.json()["path"] == "/Transfers/note.txt"

    d = owner.get("/files/download", params={"path": "/Transfers/note.txt"})
    assert d.status_code == 200
    assert d.content == b"hello hisar"


def test_upload_does_not_overwrite_by_default(owner):
    for _ in range(2):
        owner.post("/files/upload", params={"path": "/Transfers"},
                   files={"file": ("dup.txt", io.BytesIO(b"x"), "text/plain")})
    names = {e["name"] for e in owner.get("/files/list", params={"path": "/Transfers"}).json()["entries"]}
    assert names == {"dup.txt", "dup-2.txt"}


def test_upload_respects_the_size_cap(owner, monkeypatch):
    monkeypatch.setenv("HISAR_MAX_UPLOAD_BYTES", "16")
    get_settings.cache_clear()
    r = owner.post("/files/upload", params={"path": "/Transfers"},
                   files={"file": ("big.bin", io.BytesIO(b"y" * 1024), "application/octet-stream")})
    assert r.status_code == 413


def test_mkdir_rename_and_trash(owner):
    assert owner.post("/files/mkdir", json={"path": "/Documents", "name": "reports"}).status_code == 200
    assert owner.post("/files/mkdir", json={"path": "/Documents", "name": "reports"}).status_code == 409

    r = owner.post("/files/rename", json={"path": "/Documents/reports", "name": "archive"})
    assert r.json()["name"] == "archive"

    r = owner.request("DELETE", "/files/delete", params={"path": "/Documents/archive"})
    assert r.status_code == 200
    # Deleting moves to .trash rather than destroying — recoverable by design.
    assert r.json()["trashed"].startswith("/.trash/")
    names = {e["name"] for e in owner.get("/files/list", params={"path": "/Documents"}).json()["entries"]}
    assert "archive" not in names


def test_cannot_delete_the_vault_root(owner):
    assert owner.request("DELETE", "/files/delete", params={"path": "/"}).status_code == 400


# ── traversal, over HTTP ─────────────────────────────────────────────────

@pytest.mark.parametrize("evil", ["/../../etc/passwd", "../../etc/passwd", "/Documents/../../.."])
def test_traversal_is_rejected_on_every_route(owner, evil):
    assert owner.get("/files/list", params={"path": evil}).status_code == 400
    assert owner.get("/files/download", params={"path": evil}).status_code == 400
    assert owner.request("DELETE", "/files/delete", params={"path": evil}).status_code == 400
    assert owner.post("/files/mkdir", json={"path": evil, "name": "x"}).status_code == 400


def test_upload_filename_cannot_escape(owner):
    r = owner.post("/files/upload", params={"path": "/Transfers"},
                   files={"file": ("../../escaped.txt", io.BytesIO(b"x"), "text/plain")})
    assert r.status_code == 400


# ── machine scope ────────────────────────────────────────────────────────

def test_deposit_lands_in_the_vault(client):
    r = client.post("/deposit", headers=MACHINE, data={"folder": "/SPEDA/sentinel"},
                    files={"file": ("budget.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")})
    assert r.status_code == 200
    assert r.json()["path"] == "/SPEDA/sentinel/budget.pdf"


def test_deposit_creates_parents_and_never_overwrites(client):
    paths = []
    for _ in range(3):
        r = client.post("/deposit", headers=MACHINE, data={"folder": "/SPEDA/speda/nested/deep"},
                        files={"file": ("r.txt", io.BytesIO(b"x"), "text/plain")})
        paths.append(r.json()["path"])
    assert paths == [
        "/SPEDA/speda/nested/deep/r.txt",
        "/SPEDA/speda/nested/deep/r-2.txt",
        "/SPEDA/speda/nested/deep/r-3.txt",
    ]


def test_deposit_rejects_a_bad_token(client):
    r = client.post("/deposit", headers={"X-Hisar-Token": "wrong"},
                    files={"file": ("a.txt", io.BytesIO(b"x"), "text/plain")})
    assert r.status_code == 401


def test_deposit_rejects_an_owner_cookie(owner):
    """The agent door takes one credential shape and only one."""
    r = owner.post("/deposit", files={"file": ("a.txt", io.BytesIO(b"x"), "text/plain")})
    assert r.status_code == 401


def test_machine_cannot_write_outside_its_scopes(client):
    r = client.post("/deposit", headers=MACHINE, data={"folder": "/Documents"},
                    files={"file": ("a.txt", io.BytesIO(b"x"), "text/plain")})
    assert r.status_code == 403

    r = client.post("/files/upload", headers=MACHINE, params={"path": "/Documents"},
                    files={"file": ("a.txt", io.BytesIO(b"x"), "text/plain")})
    assert r.status_code == 403


def test_machine_may_write_into_forge_and_speda(client):
    for folder in ("/Forge/projects", "/SPEDA"):
        r = client.post("/files/upload", headers=MACHINE, params={"path": folder},
                        files={"file": ("a.txt", io.BytesIO(b"x"), "text/plain")})
        assert r.status_code == 200, folder


def test_machine_cannot_read_list_or_delete(client):
    """Write-only is the whole security story for agent credentials."""
    assert client.get("/files/list", headers=MACHINE, params={"path": "/"}).status_code == 403
    assert client.get("/files/download", headers=MACHINE,
                      params={"path": "/Documents"}).status_code == 403
    assert client.request("DELETE", "/files/delete", headers=MACHINE,
                          params={"path": "/Documents"}).status_code == 403
    assert client.post("/files/rename", headers=MACHINE,
                       json={"path": "/Documents", "name": "x"}).status_code == 403


def test_machine_scope_is_not_prefix_confusable(client):
    """'/SPEDAX' must not pass as being inside '/SPEDA'."""
    r = client.post("/deposit", headers=MACHINE, data={"folder": "/SPEDAX"},
                    files={"file": ("a.txt", io.BytesIO(b"x"), "text/plain")})
    assert r.status_code == 403


# ── Drive routing while disconnected ─────────────────────────────────────

def test_drive_status_reports_disabled_without_credentials(owner):
    body = owner.get("/drive/status").json()
    assert body == {"enabled": False, "connected": False, "mount": "/Google Drive"}


def test_drive_listing_fails_cleanly_when_not_connected(owner):
    r = owner.get("/files/list", params={"path": "/Google Drive"})
    assert r.status_code == 409


def test_drive_connect_requires_credentials(owner):
    assert owner.get("/drive/connect").status_code == 503


def test_machine_cannot_touch_drive(client):
    r = client.post("/deposit", headers=MACHINE, data={"folder": "/Google Drive"},
                    files={"file": ("a.txt", io.BytesIO(b"x"), "text/plain")})
    assert r.status_code == 403
