"""The file API. One surface over two providers: the local vault and Drive.

Routing rule: a path under DRIVE_MOUNT goes to the Drive provider, everything
else to the local vault. The client never needs to know which is which — that
is what makes Drive feel like a folder rather than a separate app.
"""

from __future__ import annotations

import mimetypes
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from . import vault
from .auth import (Principal, authorize_write, current_principal, require_machine,
                   require_owner, require_reader)
from .config import DRIVE_MOUNT, get_settings
from .drive import DriveEntry, get_drive, is_drive_path
from .paths import PathError, check_name, normalize, parent_of

router = APIRouter()


def _root() -> Path:
    return get_settings().sandbox_root


def _drive_entry_to_json(entry: DriveEntry, parent_path: str) -> dict:
    exported = entry.export_as()
    name = entry.name
    ext = ""
    if entry.is_google_doc and exported:
        ext = exported[1]
    elif not entry.is_dir and "." in name[1:]:
        ext = name.rsplit(".", 1)[-1].lower()
    return {
        "name": name,
        "path": normalize(f"{parent_path.rstrip('/')}/{name}"),
        "kind": "dir" if entry.is_dir else "file",
        "size": entry.size,
        "modified": entry.modified,
        "ext": ext,
        "provider": "drive",
        "web_link": entry.web_link,
        "google_doc": entry.is_google_doc,
    }


class MkdirBody(BaseModel):
    path: str = Field(default="/", description="Parent directory")
    name: str


class RenameBody(BaseModel):
    path: str
    name: str = Field(description="New name (not a path)")


# ── list ──────────────────────────────────────────────────────────────────

@router.get("/files/list")
async def list_files(path: str = Query("/"), principal: Principal = Depends(require_reader)):
    p = normalize(path)

    if is_drive_path(p):
        drive = get_drive()
        if not drive.connected:
            raise HTTPException(status.HTTP_409_CONFLICT, detail="Google Drive is not connected.")
        entries = await drive.list_dir(p)
        return {"path": p, "provider": "drive",
                "entries": [_drive_entry_to_json(e, p) for e in entries]}

    entries = vault.list_dir(_root(), p)
    # The Drive mount is synthesized into the vault root listing so it shows up
    # in the Finder as a folder without existing on disk.
    if p == "/" and get_settings().drive_enabled and get_drive().connected:
        entries.insert(0, {
            "name": DRIVE_MOUNT.lstrip("/"),
            "path": DRIVE_MOUNT,
            "kind": "dir",
            "size": None,
            "modified": None,
            "ext": "",
            "provider": "drive",
            "mount": True,
        })
    return {"path": p, "provider": "vault", "entries": entries}


# ── upload ────────────────────────────────────────────────────────────────

@router.post("/files/upload")
async def upload_file(
    path: str = Query("/", description="Destination directory"),
    overwrite: bool = Query(False),
    file: UploadFile = File(...),
    principal: Principal = Depends(current_principal),
):
    p = normalize(path)
    authorize_write(principal, p)
    settings = get_settings()

    if is_drive_path(p):
        if not principal.is_owner:
            raise HTTPException(status.HTTP_403_FORBIDDEN,
                                detail="Machine credentials cannot write to Google Drive.")
        drive = get_drive()
        entry = await drive.upload(p, file.filename or "upload.bin", file.file,
                                   mime=file.content_type)
        return _drive_entry_to_json(entry, p)

    return await vault.save_upload_async(
        _root(), p, file.filename or "upload.bin", file,
        overwrite=overwrite and principal.is_owner,
        max_bytes=settings.max_upload_bytes,
    )


# ── download ──────────────────────────────────────────────────────────────

@router.get("/files/download")
async def download_file(
    path: str = Query(...),
    inline: bool = Query(False, description="Serve inline (Quick Look) instead of attachment"),
    principal: Principal = Depends(require_reader),
):
    p = normalize(path)
    disposition = "inline" if inline else "attachment"

    if is_drive_path(p):
        drive = get_drive()
        entry, filename, stream = await drive.download(p)
        mime = entry.mime
        if entry.is_google_doc and entry.export_as():
            mime = entry.export_as()[0]
        return StreamingResponse(
            stream,
            media_type=mime,
            headers={"Content-Disposition": f'{disposition}; filename="{filename}"'},
        )

    real = vault.resolve(_root(), p, must_exist=True)
    if real.is_dir():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Cannot download a directory")
    mime = mimetypes.guess_type(real.name)[0] or "application/octet-stream"
    # FileResponse handles Range requests, which is what makes media preview
    # and resumable downloads work from a phone.
    return FileResponse(real, media_type=mime, filename=real.name,
                        content_disposition_type=disposition)


# ── mutate ────────────────────────────────────────────────────────────────

@router.post("/files/mkdir")
async def make_dir(body: MkdirBody, principal: Principal = Depends(current_principal)):
    p = normalize(body.path)
    authorize_write(principal, p)

    if is_drive_path(p):
        if not principal.is_owner:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Machine credentials cannot write to Google Drive.")
        entry = await get_drive().mkdir(p, body.name)
        return _drive_entry_to_json(entry, p)

    return vault.mkdir(_root(), p, body.name)


@router.post("/files/rename")
async def rename_entry(body: RenameBody, principal: Principal = Depends(require_owner)):
    p = normalize(body.path)

    if is_drive_path(p):
        entry = await get_drive().rename(p, body.name)
        return _drive_entry_to_json(entry, parent_of(p))

    return vault.rename(_root(), p, body.name)


@router.delete("/files/delete")
async def delete_entry(path: str = Query(...), principal: Principal = Depends(require_owner)):
    p = normalize(path)

    if is_drive_path(p):
        await get_drive().delete(p)
        return {"trashed": p, "provider": "drive"}

    return vault.move_to_trash(_root(), p)


# ── the agent / Forge door ────────────────────────────────────────────────

@router.post("/deposit")
async def deposit(
    request: Request,
    folder: str = Form("/SPEDA"),
    filename: str = Form(None),
    file: UploadFile = File(...),
    principal: Principal = Depends(require_machine),
):
    """Machine-token-only write. Creates parent directories, never overwrites.

    This is the single auditable door for anything an agent or Forge puts in
    the vault: write-only, scope-limited, and collision-safe by construction.
    """
    p = normalize(folder)
    authorize_write(principal, p)

    if is_drive_path(p):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Deposits go to the vault, not Drive.")

    settings = get_settings()
    vault.ensure_dir(_root(), p)
    name = check_name(filename or file.filename or "deposit.bin")
    saved = await vault.save_upload_async(
        _root(), p, name, file, overwrite=False, max_bytes=settings.max_upload_bytes
    )
    return {
        "ok": True,
        "path": saved["path"],
        "desktop_location": saved["path"].lstrip("/").replace("/", " › "),
        "size": saved["size"],
    }


# ── storage info ──────────────────────────────────────────────────────────

@router.get("/files/usage")
async def storage_usage(principal: Principal = Depends(require_reader)):
    return vault.usage(_root())
