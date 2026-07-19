"""The single path-resolution chokepoint for the vault.

Every user- or agent-supplied path in H.İ.S.A.R. passes through `resolve()`.
It is the most attacked surface in the system, so it is deliberately small,
dependency-free and unit-tested first (see tests/test_paths.py).

Vault paths are POSIX-style, absolute-looking strings rooted at the sandbox:
"/", "/Documents", "/SPEDA/sentinel/report.pdf". They never touch the host's
real root.
"""

from __future__ import annotations

import os
import posixpath
import re
import unicodedata
from pathlib import Path

# Characters that are illegal in a single path component. Control chars and the
# path separators; also the Windows-reserved set so vaults stay portable.
_ILLEGAL_COMPONENT = re.compile(r'[\x00-\x1f\x7f/\\:*?"<>|]')

# Components that must never appear, whatever the casing.
_RESERVED = {"", ".", ".."}


class PathError(ValueError):
    """Raised when a supplied path is malformed or escapes the sandbox."""


def normalize(user_path: str | None) -> str:
    """Normalize an untrusted vault path to a canonical `/a/b/c` form.

    Rejects traversal, NUL bytes and control characters. Does not touch the
    filesystem — pure string work, so it is cheap and easy to reason about.
    """
    if user_path is None:
        return "/"
    if not isinstance(user_path, str):
        raise PathError("path must be a string")
    if "\x00" in user_path:
        raise PathError("path contains a NUL byte")

    # Unicode normalization keeps "é" (NFC) and "é" (NFD) from being two
    # different vault entries that resolve to the same file on macOS clients.
    p = unicodedata.normalize("NFC", user_path).replace("\\", "/").strip()
    if not p:
        return "/"

    parts: list[str] = []
    for raw in p.split("/"):
        if raw in ("", "."):
            continue
        if raw == "..":
            raise PathError("path traversal is not allowed")
        if _ILLEGAL_COMPONENT.search(raw):
            raise PathError(f"illegal characters in path component: {raw!r}")
        if raw.endswith(" ") or raw.endswith("."):
            # Trailing dots/spaces are silently stripped by some filesystems,
            # which would let "foo.txt." alias "foo.txt".
            raise PathError("path components may not end with '.' or a space")
        if len(raw.encode("utf-8")) > 255:
            raise PathError("path component is too long")
        parts.append(raw)

    out = "/" + "/".join(parts)
    if len(out) > 4096:
        raise PathError("path is too long")
    return out


def check_name(name: str) -> str:
    """Validate a single file/folder name (no separators allowed)."""
    if not isinstance(name, str) or not name.strip():
        raise PathError("name is required")
    n = unicodedata.normalize("NFC", name).strip()
    if n in _RESERVED or _ILLEGAL_COMPONENT.search(n):
        raise PathError(f"illegal name: {name!r}")
    if n.endswith(".") or len(n.encode("utf-8")) > 255:
        raise PathError(f"illegal name: {name!r}")
    return n


def resolve(root: Path, user_path: str | None, *, must_exist: bool = False) -> Path:
    """Map an untrusted vault path onto a real path inside `root`.

    Containment is checked with `os.path.realpath`, so symlinks that point out
    of the sandbox are rejected even when every string component looks benign.
    The check is applied to the *parent* when the leaf does not exist yet, which
    is what makes create/upload/mkdir safe without pre-creating anything.
    """
    real_root = Path(os.path.realpath(root))
    rel = normalize(user_path).lstrip("/")
    candidate = real_root / rel if rel else real_root

    # Resolve as far as the filesystem allows; realpath() on a non-existent
    # leaf still canonicalizes every existing ancestor, which is the part that
    # could contain an escaping symlink.
    resolved = Path(os.path.realpath(candidate))

    if resolved != real_root and real_root not in resolved.parents:
        raise PathError("path escapes the sandbox")

    if must_exist and not resolved.exists():
        raise PathError("path does not exist")

    # A dangling symlink resolves to a contained path but points nowhere useful;
    # an existing symlink whose target passed the check above is fine to follow.
    if candidate.is_symlink() and not resolved.exists():
        raise PathError("path is a broken symlink")

    return resolved


def to_vault_path(root: Path, real: Path) -> str:
    """Inverse of `resolve` — a real path back to its `/vault/style` path."""
    real_root = Path(os.path.realpath(root))
    rel = Path(os.path.realpath(real)).relative_to(real_root)
    return "/" + rel.as_posix() if rel.as_posix() != "." else "/"


def join(parent: str, name: str) -> str:
    """Join a normalized vault directory with a validated child name."""
    return posixpath.join(normalize(parent), check_name(name))


def parent_of(path: str) -> str:
    p = normalize(path)
    return posixpath.dirname(p) or "/"


def is_within(path: str, prefix: str) -> bool:
    """True when `path` is `prefix` or lives under it. Used for token scopes."""
    p, q = normalize(path), normalize(prefix)
    return p == q or p.startswith(q.rstrip("/") + "/")


def unique_path(directory: Path, filename: str) -> Path:
    """Return a non-colliding path in `directory` — `note.txt`, `note-2.txt`, …

    Deposits never overwrite: an agent that misfires must not be able to
    destroy something the owner already has.
    """
    name = check_name(filename)
    stem, dot, ext = name.rpartition(".")
    if not dot:
        stem, ext = name, ""
    target = directory / name
    n = 2
    while target.exists():
        target = directory / (f"{stem}-{n}{'.' + ext if ext else ''}")
        n += 1
        if n > 9999:
            raise PathError("could not find a free filename")
    return target
