"""Reference implementation of the `hisar_deposit` skill (Phase H3).

This file does not run here — it belongs in speda-mark6 at
`packages/api/app/skills/hisar.py`. It lives in this repo because it is the
consumer contract for `POST /deposit`, and the two must not drift.

To install:
  1. Copy to `packages/api/app/skills/hisar.py` (Rule 5: dropping a file in
     `skills/` is the whole registration — the orchestrator never changes).
  2. Add `hisar_url` and `hisar_machine_token` to `app/config.py` as optional
     settings, exactly like the other optional integrations.
  3. Opt each agent in via its `app/profiles/*.py` tool allowlist.
"""

from __future__ import annotations

import os
from pathlib import Path

import httpx

# ── these two imports resolve inside speda-mark6, not here ──
# from app.config import settings
# from app.core.files import resolve_output_file
# from app.skills.base import skill

OUTPUT_DIR = Path("/tmp/speda_outputs")

DESCRIPTION = """\
Deposits a file into H.İ.S.A.R., the owner's permanent file vault at \
hisar.spedatox.systems. Use it when the owner asks to save, keep, archive, or \
"put in Hisar" a file you generated or received — deliverables written to \
/tmp/speda_outputs are wiped after 24 hours, so anything worth keeping must be \
deposited here to survive. Do NOT use it for scratch output nobody asked to \
keep, for intermediate working files, or as a substitute for simply showing the \
owner a short result inline. The vault is write-only for agents: this skill can \
add a file but can never read, list, move, or delete vault contents, so do not \
attempt to use it to inspect what the owner already has. Returns the vault path \
where the file landed and its location on the owner's web desktop — tell the \
owner where it went in one sentence, since depositing is user-visible work."""


# @skill(
#     name="hisar_deposit",
#     description=DESCRIPTION,
#     read_only=False,
#     requires_network=True,
# )
async def hisar_deposit(
    source: str,
    folder: str | None = None,
    filename: str | None = None,
    *,
    agent_id: str = "speda",
    settings=None,
) -> dict:
    """Stream a deliverable into the vault.

    Args:
        source:   a filename in /tmp/speda_outputs, or a file_id from
                  register_file.
        folder:   vault folder, default "SPEDA/{agent_id}".
        filename: override the deposited name.
    """
    base = getattr(settings, "hisar_url", None) or os.getenv("HISAR_URL", "")
    token = getattr(settings, "hisar_machine_token", None) or os.getenv("HISAR_MACHINE_TOKEN", "")
    if not base or not token:
        # The skill should not have registered at all in this case; treat it as
        # a configuration error rather than a user-facing failure.
        raise RuntimeError("Hisar is not configured (hisar_url / hisar_machine_token).")

    # Resolve `source` against the outputs directory only — an agent must not
    # be able to name an arbitrary host path here and have it uploaded.
    candidate = (OUTPUT_DIR / Path(source).name).resolve()
    if not str(candidate).startswith(str(OUTPUT_DIR.resolve())) or not candidate.is_file():
        raise FileNotFoundError(f"No such deliverable in {OUTPUT_DIR}: {source}")

    target_folder = folder or f"SPEDA/{agent_id}"
    if not target_folder.startswith("/"):
        target_folder = "/" + target_folder

    async with httpx.AsyncClient(timeout=httpx.Timeout(30.0, write=None, read=300.0)) as client:
        with open(candidate, "rb") as fh:
            r = await client.post(
                f"{base.rstrip('/')}/deposit",
                headers={"X-Hisar-Token": token},
                data={"folder": target_folder, "filename": filename or candidate.name},
                files={"file": (filename or candidate.name, fh, "application/octet-stream")},
            )

    if r.status_code == 403:
        raise PermissionError(
            "Hisar refused the deposit: agents may only write under /SPEDA and /Forge."
        )
    r.raise_for_status()
    body = r.json()

    return {
        "ok": True,
        "vault_path": body["path"],
        "desktop_location": body["desktop_location"],
        "size": body["size"],
        "url": f"{base.rstrip('/')}/",
    }
