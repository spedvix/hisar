# H.İ.S.A.R. Mark I — Backend Plan

The missing half of Hisar: a FastAPI service that turns the web desktop from an
in-memory demo into a real, sandboxed file vault at
`https://hisar.spedatox.systems`, serving three consumers:

1. **The owner** — daily file transfer from any device, through the desktop UI.
2. **SPEDA Mark VI agents** — write-only deposits via `hisar_deposit`
   (machine-token scope; see `speda-mark6/docs/HISAR_FORGE_PLACEMENT_PLAN.md`).
3. **The Forge** — writes directly into the shared vault subtree on the same
   host (`Forge/`), no HTTP involved; archived scaffolds may also POST to
   `/deposit` when Forge runs remote.

This document is the implementation contract for Phase **H1** (backend + client
wiring) and feeds **H2** (deployment). It is written against the current client:
a single `hisar.jsx` whose file operations live behind one seam (`doMkdir`,
`doRename`, `doDelete`, `doUpload`, and the `fs` path→node map).

---

## 1. Shape of the service

```
hisar-mk1/
├── server/
│   ├── __init__.py
│   ├── main.py          # app factory, static hosting, CORS-off, lifespan
│   ├── config.py        # env-driven Settings (pydantic-settings)
│   ├── auth.py          # owner JWT + machine token; login rate-limit
│   ├── sandbox.py       # resolve() — THE path chokepoint (built + tested first)
│   ├── files.py         # /files/* router (owner surface)
│   ├── deposit.py       # /deposit router (machine surface)
│   └── state.py         # /state — desktop layout persistence blob
├── tests/
│   ├── test_sandbox.py  # traversal/symlink/containment table tests
│   ├── test_files.py    # CRUD round-trips over a tmp vault
│   └── test_auth.py     # JWT lifecycle, token scoping, rate-limit
├── Dockerfile           # multi-stage: node build → python slim
├── pyproject.toml       # fastapi, uvicorn, pydantic-settings, argon2-cffi, pyjwt
└── (existing client: hisar.jsx, main.jsx, index.html, vite.config.js)
```

**One process serves everything.** FastAPI mounts the built client
(`dist/`) as static files at `/`, the API under `/api`. No separate web server,
no CORS (same origin), one container, one port (**8600**).

Python 3.11+, mirroring the Mark VI backend's conventions where they apply:
env-driven config, structured logging, no `print()`, constant-time secret
comparison, all state on the app instance (no module globals).

---

## 2. Configuration (`server/config.py`)

| Env var | Default | Meaning |
|---|---|---|
| `HISAR_SANDBOX_ROOT` | — (required) | Absolute path of the vault. Startup **fails loudly** if missing or not a writable directory |
| `HISAR_OWNER_PASSWORD_HASH` | — (required) | Argon2id hash of the owner password (generate: `python -m server.auth hash`) |
| `HISAR_JWT_SECRET` | — (required) | HS256 signing secret, ≥32 bytes |
| `HISAR_MACHINE_TOKEN` | unset | Agent/Forge deposit token. Unset ⇒ `/deposit` returns 404 (surface absent, not just locked) |
| `HISAR_JWT_TTL_HOURS` | `72` | Owner session lifetime — long enough that a phone stays logged in for a workweek |
| `HISAR_MAX_UPLOAD_MB` | `2048` | Per-request upload ceiling (Caddy enforces the same at the proxy) |
| `HISAR_TRASH_DIR` | `.trash` | Relative to vault root; hidden from listings |
| `HISAR_LOG_LEVEL` | `INFO` | |

Secrets never appear in the client bundle, logs, or error bodies.

---

## 3. The sandbox chokepoint (`server/sandbox.py`)

**Every** user-supplied path in the entire service flows through one function.
This is the single most attacked surface of the design, so it is built first
and tested exhaustively before any route exists:

```python
def resolve(root: Path, user_path: str) -> Path:
    """
    Map a client path ("/Documents/notes.md") to a real filesystem path,
    guaranteed inside `root`. Raises SandboxViolation otherwise.
    """
```

Rules, in order:

1. Normalize: strip nulls, decode exactly one layer of URL-encoding upstream
   (FastAPI), reject any `\` (Windows separators never valid on the wire),
   collapse repeated `/`.
2. Reject any segment equal to `.` or `..` **before** touching the filesystem —
   textual traversal never reaches `realpath`.
3. Join to `root`, then `Path.resolve(strict=False)` and verify
   `resolved.is_relative_to(root.resolve())` — catches symlink escapes on the
   *existing* portion of the path.
4. For operations that follow the final component (download, delete, rename
   source): `lstat` the target; **refuse symlinks outright**. The vault has no
   legitimate symlinks — Forge workspaces are real trees.
5. Names starting with `.` are invisible to listings and un-creatable through
   the API (reserves `.trash`, keeps dotfile junk out of the desktop).

`test_sandbox.py` is a table test: plain paths, `..` in every position,
percent-encoded traversal, symlink-inside-vault pointing out, absolute-path
injection, 1000-char names, empty and root paths. All green before H1 continues.

---

## 4. Auth (`server/auth.py`)

Two credentials, two scopes, deliberately asymmetric:

### Owner — password → JWT

- `POST /api/auth/login {password}` → verify against Argon2id hash → JWT
  (`sub: "owner"`, `exp`) set as an **httpOnly, Secure, SameSite=Lax cookie**.
  The SPA never touches the token; `fetch` sends it automatically same-origin.
- `POST /api/auth/logout` clears the cookie. `GET /api/auth/session` → 200/401
  so the client knows whether to show the lock screen (its login flow already
  exists — it just becomes real).
- Login rate-limit: 5 failures / minute / IP, in-memory sliding window (single
  process, single user — no Redis ceremony). 429 with retry-after.
- On the wire the lock screen's "any password works" demo is replaced by a
  real 401 shake (client `login-err` element already renders errors).

### Machine — static token header

- `X-Hisar-Token: <secret>`, constant-time compare (`hmac.compare_digest`),
  accepted **only** by `/api/deposit` (and nothing else — not even list).
- Writes restricted to `SPEDA/**` and `Forge/**`. Enforced server-side after
  `resolve()`, not by convention: a deposit targeting `/Documents` is a 403
  regardless of the token being valid.
- The asymmetry is the point: an exfiltrated agent credential can *add* clutter
  to two folders; it cannot read, list, overwrite, or delete anything.

---

## 5. API contract

All routes under `/api`. Errors are `{"detail": str}` with correct status
codes; no stack traces, no absolute paths in messages.

### Owner surface (JWT cookie)

| Method | Route | Request | Response |
|---|---|---|---|
| `GET` | `/files/list?path=/` | — | `{path, entries: [{name, type: "dir"\|"file", size, mtime, ext}]}` — one level, sorted dirs-first |
| `GET` | `/files/download?path=` | — | `FileResponse`, `Accept-Ranges`, correct `Content-Type`; `?inline=1` for Quick Look previews |
| `POST` | `/files/upload?path=` | multipart, N files | `{uploaded: [name...]}` — streamed to disk in 1 MiB chunks, temp-file + atomic rename, name-collision suffixing (`report-2.pdf`) |
| `POST` | `/files/mkdir` | `{path, name}` | `{created: path}` |
| `POST` | `/files/rename` | `{path, new_name}` **or** `{path, dest_dir}` | `{path: new}` — rename in place or move; both are `os.rename` within the vault |
| `DELETE` | `/files/delete` | `{paths: [..]}` | `{trashed: [..]}` — moved to `.trash/<epoch>-<name>`, never unlinked directly |
| `POST` | `/files/restore` | `{trash_id}` | restores to original parent (stored in a `.trash/index.json`) |
| `POST` | `/files/empty-trash` | — | actually unlinks |
| `GET` | `/files/search?q=` | — | Spotlight backend: case-insensitive substring over cached tree walk (single user, vault ≪ 1M files — a 2s in-memory index refresh is fine) |
| `GET/PUT` | `/state` | opaque JSON ≤64 KiB | desktop icon layout + window positions, one blob file `.state.json` in the vault root |

### Machine surface (`X-Hisar-Token`)

| Method | Route | Request | Response |
|---|---|---|---|
| `POST` | `/deposit` | multipart file + form fields `folder` (default `SPEDA/unsorted`), `filename` (optional override) | `{path: "/SPEDA/sentinel/report.pdf"}` — parents auto-created, never overwrites (suffixes), 404 when `HISAR_MACHINE_TOKEN` unset |

### Shared

| Method | Route | Auth | |
|---|---|---|---|
| `GET` | `/health` | none | `{status: "ok"}` — uptime checks, Igor-side reachability probe for the `hisar_deposit` skill |

**Contract details that matter:**

- `mtime` is epoch seconds (int); the client formats "Today, 09:14" itself.
- `size` is bytes (int) — `fmtBytes` already exists client-side. The demo's
  pre-formatted strings ("1.2 KB") die with the demo.
- Text preview (TextEdit/Quick Look) is just `download?inline=1` with the
  client reading `.text()` for known-text extensions — no separate endpoint.
- Uploads: unknown/duplicate names never 409 — the desktop paradigm is
  "it just lands, possibly as `name-2.ext`", matching Finder.

---

## 6. Client wiring (changes inside `hisar.jsx`)

The seam stays exactly where the README promised. A new `ops` object replaces
the four `setFs` mutators and the seed:

```js
const API = import.meta.env.VITE_API_BASE ?? "/api";   // same-origin default
```

1. **Hydration** — on login (and on directory navigation), `GET /files/list`
   for the visible path; responses merge into the same `fs` path→node map the
   whole UI already reads (`{type, children}` for dirs, `{type, size, mtime,
   ext}` for files). Lazy per-directory loading; a `loaded` flag per dir node
   prevents refetch loops. Spotlight switches to `/files/search`.
2. **Mutations** — `doMkdir`/`doRename`/`doDelete` become `fetch` calls that
   optimistically update `fs` and reconcile with the response (revert + toast
   on failure). `doUpload` becomes XHR (for `upload.onprogress`) with a
   per-file progress row — the one new UI element this plan adds, styled as a
   thin amber progress bar in the existing transfer aesthetic.
3. **Login** — posts to `/auth/login`; 401 shakes; on boot `GET /auth/session`
   decides lock screen vs desktop. Logout via the existing menu.
4. **Quick Look / TextEdit** — image/video previews point `src` at
   `download?inline=1`; text files fetch content on open.
5. **Desktop persistence** — icon drag-end and window close debounce a
   `PUT /state`; boot merges `GET /state`.

No component-tree restructuring; the demo FS object literally becomes a cache
of the server truth.

---

## 7. Dockerfile (multi-stage)

```dockerfile
# Stage 1 — client
FROM node:20-alpine AS client
WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY index.html main.jsx hisar.jsx vite.config.js ./
RUN npm run build                      # → /build/dist

# Stage 2 — server
FROM python:3.12-slim
RUN useradd -r -u 10001 hisar
WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir .
COPY server/ server/
COPY --from=client /build/dist/ dist/
USER hisar
EXPOSE 8600
CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8600"]
```

Runs non-root; the vault bind mount (`/vault`) is the only writable path.
Compose/Caddy wiring lives in the speda-mark6 placement plan (Phase H2) and is
unchanged by this document.

---

## 8. Tests (done signal for H1)

| Suite | Covers |
|---|---|
| `test_sandbox.py` | the traversal table (§3) — **written first, before routes** |
| `test_auth.py` | login happy path, wrong password, rate-limit trip, expired JWT, machine token on wrong routes (403/401), unset machine token ⇒ deposit 404 |
| `test_files.py` | full CRUD round-trip over a tmp vault: mkdir → upload (incl. collision suffix) → list shape → download bytes+range → rename → move → trash → restore → empty-trash; dotfile invisibility; upload cap 413 |
| `test_deposit.py` | deposit lands under `SPEDA/`, parent auto-create, scope 403 outside allowed roots, never-overwrite |

Plus one manual end-to-end: `npm run build`, `uvicorn server.main:app`, log in
from a phone on the LAN, drag a file in, watch progress, pull it back down.

---

## 9. Build order

| Step | Deliverable | Depends on |
|---|---|---|
| 1 | `server/config.py` + `server/sandbox.py` + `test_sandbox.py` green | — |
| 2 | `server/auth.py` + tests | 1 |
| 3 | `server/files.py` list/upload/download + tests | 2 |
| 4 | rename/delete/trash/restore/search/state + tests | 3 |
| 5 | `server/deposit.py` + tests | 2 |
| 6 | `main.py` assembly: static hosting, lifespan, logging | 3 |
| 7 | Client wiring (§6) — hydration, mutations, login, progress | 6 |
| 8 | Dockerfile + manual e2e from a second device | 7 |

Steps 4 and 5 can interleave. After step 8, Phase H2 (Caddy block, compose
service, DNS for `hisar.spedatox.systems`) proceeds per the placement plan, and
the Igor-side `hisar_deposit` skill (H3) can be built against `/api/deposit`.

---

## 10. Explicitly out of scope for H1

- Share links / guest drop URLs (H5 in the placement plan).
- Multi-user anything. One owner, by design.
- Thumbnails/transcoding — previews stream originals.
- WebDAV/SFTP alternate protocols — the desktop and `/deposit` are the doors.
- Postgres/Redis — the filesystem is the database; JSON blobs carry the rest.

---

## 11. Implementation status — H1 shipped

Phase H1 is complete and verified end-to-end, plus one addition beyond this
plan: **Google Drive is mounted as a virtual folder** (`/Google Drive`) served
by the same `/files/*` routes, so the desktop treats vault and Drive folders
identically.

| Piece | Where | State |
|---|---|---|
| Path sandbox | `server/paths.py` | Done — 46 unit tests (traversal, symlink escape, prefix confusion, unicode aliasing) |
| Owner auth — Argon2 hash, JWT httpOnly cookie, login rate limit | `server/auth.py` | Done |
| Machine token — write-only, scoped to `/SPEDA` + `/Forge` | `server/auth.py` | Done |
| File routes + `/deposit` + `/files/usage` | `server/files.py`, `server/vault.py` | Done — 29 HTTP tests |
| Google Drive provider — OAuth, list/upload/download/mkdir/rename/trash | `server/drive.py` | Done; needs live credentials to exercise |
| Client wired to the API — upload progress, real previews, Drive UI | `api.js`, `hisar.jsx` | Done — verified in a real browser, no console errors |
| Dockerfile (multi-stage, non-root), compose, deploy guide | `Dockerfile`, `deploy/` | Done — **not yet deployed** |
| `hisar_deposit` skill (H3) | `integrations/speda_hisar_skill.py` | Reference implementation; installs into speda-mark6 |
| Forge archive (H4) | — | Not started; the passive layer ships with H2 |

### Deviations from this document

- **`server/sandbox.py` is named `server/paths.py`**, and `server/deposit.py`
  folded into `server/files.py` — the deposit route is twenty lines and shares
  every helper with upload.
- **Delete is a move to `.trash/`**, never a hard delete, on both the vault and
  Drive (which gets Drive's own trash). H5's "restore from Trash" is now only
  UI work.
- **`/files/upload` accepts the machine token too** (scope-limited), not just
  `/deposit`, so Forge can push archives through one code path.
- **Drive is owner-only.** Machine credentials are refused on Drive paths
  outright — an agent must never reach the owner's Google account.
- **No `/state` blob yet** — desktop layout persistence stays in H5.

### Next

H2 (DNS + Caddy block + compose service) per `deploy/README.md`. Nothing in
H1 blocks it.
