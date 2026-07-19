"""Path-sandbox tests. These run before anything else is trusted."""

import os
from pathlib import Path

import pytest

from server.paths import (
    PathError,
    check_name,
    is_within,
    join,
    normalize,
    parent_of,
    resolve,
    to_vault_path,
    unique_path,
)


@pytest.fixture()
def vault(tmp_path: Path) -> Path:
    (tmp_path / "vault").mkdir()
    (tmp_path / "outside").mkdir()
    (tmp_path / "outside" / "secret.txt").write_text("owner private key")
    return tmp_path / "vault"


# ── normalize ────────────────────────────────────────────────────────────

@pytest.mark.parametrize(
    "raw,expected",
    [
        (None, "/"),
        ("", "/"),
        ("/", "/"),
        ("Documents", "/Documents"),
        ("/Documents/", "/Documents"),
        ("//Documents///notes.txt", "/Documents/notes.txt"),
        ("/Documents/./notes.txt", "/Documents/notes.txt"),
        ("\\Documents\\notes.txt", "/Documents/notes.txt"),
        ("  /Transfers  ", "/Transfers"),
    ],
)
def test_normalize_canonicalizes(raw, expected):
    assert normalize(raw) == expected


@pytest.mark.parametrize(
    "raw",
    [
        "../etc/passwd",
        "/Documents/../../etc/passwd",
        "/Documents/..",
        "..",
        "/a/b/../../../c",
        "/Documents/no\x00pe.txt",
        "/Documents/bell\x07.txt",
        "/Doc:uments",
        "/Documents/trailing.",
        "/Documents/trailing /notes.txt",
        "/" + "x" * 300,
    ],
)
def test_normalize_rejects_hostile_input(raw):
    with pytest.raises(PathError):
        normalize(raw)


def test_normalize_unifies_unicode_forms():
    assert normalize("/café") == normalize("/café")


# ── resolve containment ──────────────────────────────────────────────────

def test_resolve_maps_into_the_vault(vault):
    assert resolve(vault, "/Documents/notes.txt") == vault / "Documents" / "notes.txt"
    assert resolve(vault, "/") == Path(os.path.realpath(vault))


def test_resolve_rejects_traversal(vault):
    for bad in ["../outside/secret.txt", "/../outside/secret.txt", "/a/../../outside"]:
        with pytest.raises(PathError):
            resolve(vault, bad)


def test_resolve_rejects_symlink_escape(vault):
    """The case string-normalization alone cannot catch."""
    (vault / "escape").symlink_to(vault.parent / "outside")
    with pytest.raises(PathError):
        resolve(vault, "/escape/secret.txt")
    with pytest.raises(PathError):
        resolve(vault, "/escape")


def test_resolve_rejects_symlinked_file_escape(vault):
    (vault / "leak.txt").symlink_to(vault.parent / "outside" / "secret.txt")
    with pytest.raises(PathError):
        resolve(vault, "/leak.txt")


def test_resolve_allows_internal_symlink(vault):
    (vault / "real").mkdir()
    (vault / "real" / "f.txt").write_text("ok")
    (vault / "link").symlink_to(vault / "real")
    assert resolve(vault, "/link/f.txt").read_text() == "ok"


def test_resolve_rejects_broken_symlink(vault):
    (vault / "dangling").symlink_to(vault / "nope")
    with pytest.raises(PathError):
        resolve(vault, "/dangling")


def test_resolve_allows_nonexistent_leaf_for_creation(vault):
    p = resolve(vault, "/Documents/new.txt")
    assert not p.exists()
    with pytest.raises(PathError):
        resolve(vault, "/Documents/new.txt", must_exist=True)


def test_resolve_is_stable_when_vault_itself_is_a_symlink(tmp_path):
    real = tmp_path / "real-vault"
    real.mkdir()
    (real / "Documents").mkdir()
    link = tmp_path / "vault-link"
    link.symlink_to(real)
    assert resolve(link, "/Documents") == real / "Documents"
    with pytest.raises(PathError):
        resolve(link, "/../real-vault-sibling")


# ── names, joins, scopes ─────────────────────────────────────────────────

@pytest.mark.parametrize("bad", ["", "   ", ".", "..", "a/b", "a\\b", "a\x00b", "tail."])
def test_check_name_rejects(bad):
    with pytest.raises(PathError):
        check_name(bad)


def test_join_and_parent():
    assert join("/SPEDA", "sentinel") == "/SPEDA/sentinel"
    assert parent_of("/SPEDA/sentinel/report.pdf") == "/SPEDA/sentinel"
    assert parent_of("/") == "/"
    with pytest.raises(PathError):
        join("/SPEDA", "../etc")


@pytest.mark.parametrize(
    "path,prefix,expected",
    [
        ("/SPEDA/sentinel/a.pdf", "/SPEDA", True),
        ("/SPEDA", "/SPEDA", True),
        ("/SPEDAX/a.pdf", "/SPEDA", False),   # prefix must be a path boundary
        ("/Documents/a.pdf", "/SPEDA", False),
        ("/Forge/workspaces/x", "/Forge", True),
    ],
)
def test_is_within_respects_path_boundaries(path, prefix, expected):
    assert is_within(path, prefix) is expected


def test_to_vault_path_roundtrips(vault):
    (vault / "Documents").mkdir()
    assert to_vault_path(vault, resolve(vault, "/Documents")) == "/Documents"
    assert to_vault_path(vault, resolve(vault, "/")) == "/"


def test_unique_path_never_overwrites(vault):
    (vault / "report.pdf").write_text("original")
    assert unique_path(vault, "report.pdf").name == "report-2.pdf"
    (vault / "report-2.pdf").write_text("x")
    assert unique_path(vault, "report.pdf").name == "report-3.pdf"
    assert unique_path(vault, "fresh.pdf").name == "fresh.pdf"


def test_unique_path_handles_extensionless(vault):
    (vault / "LICENSE").write_text("x")
    assert unique_path(vault, "LICENSE").name == "LICENSE-2"
