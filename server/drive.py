"""Google Drive as a virtual folder in the vault.

Drive has no paths — only file IDs and parent links. This module builds a
path-addressable view on top of that so the desktop client can treat
"/Google Drive/Projects/notes.md" exactly like any vault path, and the file
routes can stay provider-agnostic.

Talks to the Drive v3 REST API over httpx directly: the official client
libraries are large, synchronous, and would each need their own escape hatch
for the streaming upload/download this service is built around.
"""

from __future__ import annotations

import json
import os
import time
import urllib.parse
from dataclasses import dataclass
from typing import AsyncIterator

import httpx
from fastapi import HTTPException, status

from .config import DRIVE_MOUNT, get_settings
from .paths import PathError, check_name, normalize

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
API = "https://www.googleapis.com/drive/v3"
UPLOAD_API = "https://www.googleapis.com/upload/drive/v3"

# Full read/write on the user's Drive: the point of the mount is to browse and
# add to real Drive content, which the narrower drive.file scope cannot do.
SCOPES = "https://www.googleapis.com/auth/drive"

FOLDER_MIME = "application/vnd.google-apps.folder"

# Google-native documents have no bytes to download; they must be exported.
EXPORT_MAP = {
    "application/vnd.google-apps.document": (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"),
    "application/vnd.google-apps.spreadsheet": (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"),
    "application/vnd.google-apps.presentation": (
        "application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx"),
    "application/vnd.google-apps.drawing": ("image/png", "png"),
    "application/vnd.google-apps.script": ("application/vnd.google-apps.script+json", "json"),
}

FIELDS = "id,name,mimeType,size,modifiedTime,iconLink,webViewLink,trashed,shortcutDetails"


class DriveError(HTTPException):
    def __init__(self, detail: str, code: int = status.HTTP_502_BAD_GATEWAY):
        super().__init__(code, detail=detail)


class DriveNotConnected(DriveError):
    def __init__(self) -> None:
        super().__init__("Google Drive is not connected.", status.HTTP_409_CONFLICT)


@dataclass
class DriveEntry:
    id: str
    name: str
    mime: str
    size: int | None
    modified: str | None
    web_link: str | None

    @property
    def is_dir(self) -> bool:
        return self.mime == FOLDER_MIME

    @property
    def is_google_doc(self) -> bool:
        return self.mime.startswith("application/vnd.google-apps.") and not self.is_dir

    def export_as(self) -> tuple[str, str] | None:
        return EXPORT_MAP.get(self.mime)


def _entry(item: dict) -> DriveEntry:
    return DriveEntry(
        id=item["id"],
        name=item.get("name", "untitled"),
        mime=item.get("mimeType", "application/octet-stream"),
        size=int(item["size"]) if item.get("size") is not None else None,
        modified=item.get("modifiedTime"),
        web_link=item.get("webViewLink"),
    )


class TokenStore:
    """Refresh token on disk, 0600. Small enough not to warrant a database."""

    def __init__(self, path):
        self.path = path

    def load(self) -> dict | None:
        try:
            with open(self.path, "r", encoding="utf-8") as fh:
                return json.load(fh)
        except (FileNotFoundError, json.JSONDecodeError):
            return None

    def save(self, data: dict) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(data, fh)
        os.chmod(tmp, 0o600)
        os.replace(tmp, self.path)

    def clear(self) -> None:
        try:
            os.unlink(self.path)
        except FileNotFoundError:
            pass


class DriveClient:
    """One long-lived client per process. Caches path→id lookups because the
    Finder re-lists the same directories constantly."""

    def __init__(self) -> None:
        s = get_settings()
        self.settings = s
        self.store = TokenStore(s.google_token_store)
        self._http = httpx.AsyncClient(timeout=httpx.Timeout(30.0, read=300.0))
        self._access_token: str | None = None
        self._expires_at: float = 0.0
        self._id_cache: dict[str, tuple[str, float]] = {}
        self._cache_ttl = 60.0

    async def aclose(self) -> None:
        await self._http.aclose()

    # ── connection state ──────────────────────────────────────────────

    @property
    def connected(self) -> bool:
        return bool(self.settings.drive_enabled and (self.store.load() or {}).get("refresh_token"))

    def authorize_url(self, state: str) -> str:
        params = {
            "client_id": self.settings.google_client_id,
            "redirect_uri": self.settings.google_redirect_uri,
            "response_type": "code",
            "scope": SCOPES,
            "access_type": "offline",
            # Google only returns a refresh_token on the first consent unless
            # we force the prompt — without this a re-link silently yields a
            # token that dies in an hour.
            "prompt": "consent",
            "include_granted_scopes": "true",
            "state": state,
        }
        return f"{AUTH_URL}?{urllib.parse.urlencode(params)}"

    async def exchange_code(self, code: str) -> None:
        r = await self._http.post(TOKEN_URL, data={
            "code": code,
            "client_id": self.settings.google_client_id,
            "client_secret": self.settings.google_client_secret,
            "redirect_uri": self.settings.google_redirect_uri,
            "grant_type": "authorization_code",
        })
        if r.status_code != 200:
            raise DriveError(f"Token exchange failed: {r.text[:300]}")
        data = r.json()
        if not data.get("refresh_token"):
            raise DriveError(
                "Google did not return a refresh token. Revoke Hisar's access at "
                "myaccount.google.com/permissions and connect again."
            )
        self.store.save({
            "refresh_token": data["refresh_token"],
            "scope": data.get("scope", ""),
            "connected_at": int(time.time()),
        })
        self._access_token = data.get("access_token")
        self._expires_at = time.monotonic() + int(data.get("expires_in", 3600)) - 60
        self._id_cache.clear()

    def disconnect(self) -> None:
        self.store.clear()
        self._access_token = None
        self._id_cache.clear()

    async def _token(self) -> str:
        if self._access_token and time.monotonic() < self._expires_at:
            return self._access_token
        saved = self.store.load()
        if not saved or not saved.get("refresh_token"):
            raise DriveNotConnected()
        r = await self._http.post(TOKEN_URL, data={
            "refresh_token": saved["refresh_token"],
            "client_id": self.settings.google_client_id,
            "client_secret": self.settings.google_client_secret,
            "grant_type": "refresh_token",
        })
        if r.status_code != 200:
            # A revoked or expired grant is unrecoverable — drop it so the UI
            # shows "connect" instead of retrying a dead token forever.
            if r.status_code in (400, 401):
                self.disconnect()
                raise DriveNotConnected()
            raise DriveError(f"Token refresh failed: {r.text[:300]}")
        data = r.json()
        self._access_token = data["access_token"]
        self._expires_at = time.monotonic() + int(data.get("expires_in", 3600)) - 60
        return self._access_token

    async def _headers(self) -> dict:
        return {"Authorization": f"Bearer {await self._token()}"}

    async def _get(self, url: str, **params) -> dict:
        r = await self._http.get(url, headers=await self._headers(), params=params)
        if r.status_code == 404:
            raise DriveError("Not found in Google Drive.", status.HTTP_404_NOT_FOUND)
        if r.status_code >= 400:
            raise DriveError(f"Drive API error {r.status_code}: {r.text[:300]}")
        return r.json()

    # ── path → id resolution ──────────────────────────────────────────

    @staticmethod
    def relative_path(vault_path: str) -> str:
        """Strip the mount prefix: '/Google Drive/A/B' → '/A/B'."""
        p = normalize(vault_path)
        mount = normalize(DRIVE_MOUNT)
        if p == mount:
            return "/"
        if not p.startswith(mount + "/"):
            raise PathError("not a Drive path")
        return p[len(mount):]

    async def resolve_id(self, vault_path: str) -> str:
        """Walk path segments to a Drive file id. 'root' is My Drive."""
        rel = self.relative_path(vault_path)
        if rel == "/":
            return "root"

        cached = self._id_cache.get(rel)
        if cached and time.monotonic() - cached[1] < self._cache_ttl:
            return cached[0]

        parent = "root"
        walked = ""
        for segment in rel.strip("/").split("/"):
            walked += "/" + segment
            hit = self._id_cache.get(walked)
            if hit and time.monotonic() - hit[1] < self._cache_ttl:
                parent = hit[0]
                continue
            parent = await self._child_id(parent, segment)
            self._id_cache[walked] = (parent, time.monotonic())
        return parent

    async def _child_id(self, parent_id: str, name: str) -> str:
        escaped = name.replace("\\", "\\\\").replace("'", "\\'")
        q = f"name = '{escaped}' and '{parent_id}' in parents and trashed = false"
        data = await self._get(f"{API}/files", q=q, fields=f"files({FIELDS})",
                               pageSize=2, supportsAllDrives="true",
                               includeItemsFromAllDrives="true")
        files = data.get("files", [])
        if not files:
            raise DriveError(f"'{name}' not found in Google Drive.", status.HTTP_404_NOT_FOUND)
        return files[0]["id"]

    def invalidate(self, vault_path: str) -> None:
        """Drop cache entries for a subtree after a mutation."""
        try:
            rel = self.relative_path(vault_path)
        except PathError:
            return
        for key in [k for k in self._id_cache if k == rel or k.startswith(rel.rstrip("/") + "/")]:
            self._id_cache.pop(key, None)

    # ── operations ────────────────────────────────────────────────────

    async def list_dir(self, vault_path: str) -> list[DriveEntry]:
        folder_id = await self.resolve_id(vault_path)
        entries: list[DriveEntry] = []
        page = None
        while True:
            params = {
                "q": f"'{folder_id}' in parents and trashed = false",
                "fields": f"nextPageToken,files({FIELDS})",
                "pageSize": 200,
                "orderBy": "folder,name",
                "supportsAllDrives": "true",
                "includeItemsFromAllDrives": "true",
            }
            if page:
                params["pageToken"] = page
            data = await self._get(f"{API}/files", **params)
            entries.extend(_entry(f) for f in data.get("files", []))
            page = data.get("nextPageToken")
            if not page or len(entries) >= 5000:
                break
        return entries

    async def stat(self, vault_path: str) -> DriveEntry:
        file_id = await self.resolve_id(vault_path)
        if file_id == "root":
            return DriveEntry("root", "Google Drive", FOLDER_MIME, None, None, None)
        return _entry(await self._get(f"{API}/files/{file_id}",
                                      fields=FIELDS, supportsAllDrives="true"))

    async def download(self, vault_path: str) -> tuple[DriveEntry, str, AsyncIterator[bytes]]:
        """Stream a Drive file. Google-native docs are exported on the fly."""
        entry = await self.stat(vault_path)
        if entry.is_dir:
            raise DriveError("Cannot download a folder.", status.HTTP_400_BAD_REQUEST)

        exported = entry.export_as()
        if exported:
            mime, ext = exported
            url = f"{API}/files/{entry.id}/export"
            params = {"mimeType": mime}
            filename = f"{entry.name}.{ext}"
        else:
            url = f"{API}/files/{entry.id}"
            params = {"alt": "media", "supportsAllDrives": "true"}
            mime = entry.mime
            filename = entry.name

        headers = await self._headers()

        async def stream() -> AsyncIterator[bytes]:
            async with self._http.stream("GET", url, headers=headers, params=params) as r:
                if r.status_code >= 400:
                    body = (await r.aread())[:300].decode("utf-8", "replace")
                    raise DriveError(f"Drive download failed {r.status_code}: {body}")
                async for chunk in r.aiter_bytes(1024 * 256):
                    yield chunk

        return entry, filename, stream()

    async def upload(self, vault_path: str, filename: str, source, mime: str | None = None) -> DriveEntry:
        """Resumable upload into the folder at `vault_path`.

        Resumable rather than multipart because the daily-driver case is large
        files over a phone connection, where a single POST is the wrong shape.
        """
        name = check_name(filename)
        parent_id = await self.resolve_id(vault_path)
        headers = await self._headers()
        meta = {"name": name, "parents": [parent_id]}

        init = await self._http.post(
            f"{UPLOAD_API}/files",
            params={"uploadType": "resumable", "supportsAllDrives": "true", "fields": FIELDS},
            headers={**headers, "Content-Type": "application/json; charset=UTF-8",
                     "X-Upload-Content-Type": mime or "application/octet-stream"},
            json=meta,
        )
        if init.status_code not in (200, 201):
            raise DriveError(f"Drive upload init failed: {init.text[:300]}")
        session_url = init.headers.get("Location")
        if not session_url:
            raise DriveError("Drive did not return an upload session URL.")

        r = await self._http.put(
            session_url,
            content=source,
            headers={"Content-Type": mime or "application/octet-stream"},
            timeout=httpx.Timeout(30.0, write=None, read=600.0),
        )
        if r.status_code not in (200, 201):
            raise DriveError(f"Drive upload failed {r.status_code}: {r.text[:300]}")
        self.invalidate(vault_path)
        return _entry(r.json())

    async def mkdir(self, vault_path: str, name: str) -> DriveEntry:
        folder_name = check_name(name)
        parent_id = await self.resolve_id(vault_path)
        r = await self._http.post(
            f"{API}/files",
            headers=await self._headers(),
            params={"fields": FIELDS, "supportsAllDrives": "true"},
            json={"name": folder_name, "mimeType": FOLDER_MIME, "parents": [parent_id]},
        )
        if r.status_code not in (200, 201):
            raise DriveError(f"Drive mkdir failed: {r.text[:300]}")
        self.invalidate(vault_path)
        return _entry(r.json())

    async def rename(self, vault_path: str, new_name: str) -> DriveEntry:
        name = check_name(new_name)
        file_id = await self.resolve_id(vault_path)
        if file_id == "root":
            raise DriveError("Cannot rename the Drive root.", status.HTTP_400_BAD_REQUEST)
        r = await self._http.patch(
            f"{API}/files/{file_id}",
            headers=await self._headers(),
            params={"fields": FIELDS, "supportsAllDrives": "true"},
            json={"name": name},
        )
        if r.status_code != 200:
            raise DriveError(f"Drive rename failed: {r.text[:300]}")
        self.invalidate(vault_path)
        return _entry(r.json())

    async def delete(self, vault_path: str) -> None:
        """Trash rather than destroy — mirrors the vault's own delete."""
        file_id = await self.resolve_id(vault_path)
        if file_id == "root":
            raise DriveError("Cannot delete the Drive root.", status.HTTP_400_BAD_REQUEST)
        r = await self._http.patch(
            f"{API}/files/{file_id}",
            headers=await self._headers(),
            params={"supportsAllDrives": "true"},
            json={"trashed": True},
        )
        if r.status_code != 200:
            raise DriveError(f"Drive delete failed: {r.text[:300]}")
        self.invalidate(vault_path)

    async def about(self) -> dict:
        data = await self._get(f"{API}/about", fields="user,storageQuota")
        user = data.get("user", {})
        quota = data.get("storageQuota", {})
        return {
            "email": user.get("emailAddress"),
            "name": user.get("displayName"),
            "quota_used": int(quota["usage"]) if quota.get("usage") else None,
            "quota_total": int(quota["limit"]) if quota.get("limit") else None,
        }


_client: DriveClient | None = None


def get_drive() -> DriveClient:
    global _client
    if _client is None:
        _client = DriveClient()
    return _client


def is_drive_path(vault_path: str) -> bool:
    p = normalize(vault_path)
    mount = normalize(DRIVE_MOUNT)
    return p == mount or p.startswith(mount + "/")
