"""Local vault operations. Everything here has already been through resolve()."""

from __future__ import annotations

import os
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import BinaryIO

from fastapi import HTTPException, status

from .config import DEFAULT_TREE, TRASH_DIR, get_settings
from .paths import PathError, check_name, resolve, to_vault_path, unique_path

# Never surfaced in listings: Hisar's own state and the trash can.
HIDDEN = {TRASH_DIR, ".hisar"}

CHUNK = 1024 * 1024


def bootstrap(root: Path) -> None:
    """Create the vault skeleton on first start. Idempotent."""
    root.mkdir(parents=True, exist_ok=True)
    for rel in DEFAULT_TREE:
        (root / rel).mkdir(parents=True, exist_ok=True)
    (root / TRASH_DIR).mkdir(exist_ok=True)
    (root / ".hisar").mkdir(exist_ok=True)


def _iso(ts: float) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()


def describe(real: Path, root: Path) -> dict:
    st = real.stat()
    is_dir = real.is_dir()
    name = real.name or "/"
    ext = "" if is_dir else (name.rsplit(".", 1)[-1].lower() if "." in name[1:] else "")
    return {
        "name": name,
        "path": to_vault_path(root, real),
        "kind": "dir" if is_dir else "file",
        "size": None if is_dir else st.st_size,
        "modified": _iso(st.st_mtime),
        "ext": ext,
        "provider": "vault",
    }


def list_dir(root: Path, vault_path: str) -> list[dict]:
    real = resolve(root, vault_path, must_exist=True)
    if not real.is_dir():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Not a directory")

    out = []
    with os.scandir(real) as it:
        for entry in it:
            if entry.name in HIDDEN and real == Path(os.path.realpath(root)):
                continue
            if entry.name.startswith(".") and entry.name not in (".gitignore",):
                continue
            try:
                out.append(describe(Path(entry.path), root))
            except (OSError, ValueError):
                # A broken symlink or a file that vanished mid-scan is not a
                # reason to fail the whole listing.
                continue
    out.sort(key=lambda e: (e["kind"] != "dir", e["name"].lower()))
    return out


def mkdir(root: Path, vault_path: str, name: str) -> dict:
    parent = resolve(root, vault_path, must_exist=True)
    target = resolve(root, f"{vault_path.rstrip('/')}/{check_name(name)}")
    if target.exists():
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Already exists")
    if not parent.is_dir():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Parent is not a directory")
    target.mkdir(parents=False)
    return describe(target, root)


def rename(root: Path, vault_path: str, new_name: str) -> dict:
    src = resolve(root, vault_path, must_exist=True)
    if src == Path(os.path.realpath(root)):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Cannot rename the vault root")
    # Re-run the containment check on the destination: check_name() forbids
    # separators, but the resolve() chokepoint is what we actually trust.
    dst = resolve(root, to_vault_path(root, src.parent).rstrip("/") + "/" + check_name(new_name))
    if dst.exists():
        raise HTTPException(status.HTTP_409_CONFLICT, detail="A file with that name already exists")
    src.rename(dst)
    return describe(dst, root)


def move_to_trash(root: Path, vault_path: str) -> dict:
    """Delete is a move to `.trash/` — recoverable, and it makes an agent or a
    mis-click non-catastrophic."""
    src = resolve(root, vault_path, must_exist=True)
    real_root = Path(os.path.realpath(root))
    if src == real_root:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Cannot delete the vault root")

    trash = real_root / TRASH_DIR
    trash.mkdir(exist_ok=True)
    stamp = time.strftime("%Y%m%d-%H%M%S")
    dst = unique_path(trash, f"{stamp}_{src.name}")
    shutil.move(str(src), str(dst))
    return {"trashed": to_vault_path(root, dst), "original": vault_path}


def save_stream(root: Path, vault_path: str, filename: str, stream: BinaryIO,
                *, overwrite: bool, max_bytes: int) -> dict:
    """Stream an upload to disk, enforcing the size cap as bytes arrive.

    Writes to a temp file in the destination directory and renames on success,
    so an interrupted upload never leaves a half file where the owner expects a
    whole one.
    """
    parent = resolve(root, vault_path, must_exist=True)
    if not parent.is_dir():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Target is not a directory")

    name = check_name(filename)
    target = (parent / name) if overwrite else unique_path(parent, name)
    tmp = parent / f".upload-{os.getpid()}-{int(time.time()*1000)}.part"

    written = 0
    try:
        with open(tmp, "wb") as fh:
            while True:
                chunk = stream.read(CHUNK)
                if not chunk:
                    break
                written += len(chunk)
                if written > max_bytes:
                    raise HTTPException(
                        413,  # Content Too Large
                        detail=f"Upload exceeds the {max_bytes} byte limit",
                    )
                fh.write(chunk)
        os.replace(tmp, target)
    except BaseException:
        tmp.unlink(missing_ok=True)
        raise

    return describe(target, root)


async def save_upload_async(root: Path, vault_path: str, filename: str, upload,
                            *, overwrite: bool, max_bytes: int) -> dict:
    """Async variant for FastAPI's UploadFile (its read() is a coroutine)."""
    parent = resolve(root, vault_path, must_exist=True)
    if not parent.is_dir():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Target is not a directory")

    name = check_name(filename)
    target = (parent / name) if overwrite else unique_path(parent, name)
    tmp = parent / f".upload-{os.getpid()}-{int(time.time()*1000)}.part"

    written = 0
    try:
        with open(tmp, "wb") as fh:
            while True:
                chunk = await upload.read(CHUNK)
                if not chunk:
                    break
                written += len(chunk)
                if written > max_bytes:
                    raise HTTPException(
                        413,  # Content Too Large
                        detail=f"Upload exceeds the {max_bytes} byte limit",
                    )
                fh.write(chunk)
        os.replace(tmp, target)
    except BaseException:
        tmp.unlink(missing_ok=True)
        raise

    return describe(target, root)


def ensure_dir(root: Path, vault_path: str) -> Path:
    """mkdir -p inside the sandbox, used by /deposit."""
    real = resolve(root, vault_path)
    real.mkdir(parents=True, exist_ok=True)
    return real


def usage(root: Path) -> dict:
    total, used, free = shutil.disk_usage(root)
    return {"total": total, "used": used, "free": free}
