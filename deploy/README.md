# Deploying H.İ.S.A.R. (Phase H2)

Target: `https://hisar.spedatox.systems`, beside SPEDA Mark VI on the Contabo
host, sharing one vault with Forge.

---

## 1. Host preparation

```bash
sudo mkdir -p /opt/hisar/vault
sudo chown -R 10001:10001 /opt/hisar/vault     # the container's non-root uid
```

The API bootstraps the folder skeleton (`Desktop/`, `Documents/`, `Transfers/`,
`SPEDA/`, `Forge/workspaces/`, `Forge/projects/`, `.trash/`) on first start.

## 2. Secrets

```bash
cd /opt/hisar-mk1
cp .env.example .env

python -m server.auth hash-password      # → HISAR_OWNER_PASSWORD_HASH
openssl rand -base64 48                  # → HISAR_JWT_SECRET
openssl rand -hex 32                     # → HISAR_MACHINE_TOKEN
```

Keep `HISAR_MACHINE_TOKEN` — Igor's `hisar_deposit` skill (Phase H3) and Forge
(Phase H4) need the same value.

## 3. DNS

One A record: `hisar.spedatox.systems` → the Contabo IP.

## 4. Caddy

Nothing to edit by hand. SPEDA's `Caddyfile` imports `caddy-sites/*.caddy`, and
its `deploy.sh` generates `caddy-sites/hisar.caddy` from `HISAR_PUBLIC_DOMAIN`
in the `.env` above — so the hostname lives with Hisar's other config instead of
in a public repo. Caddy provisions the certificate automatically.

Note that Hisar's hostname is a **sibling** of SPEDA's `$DOMAIN`
(`speda.spedatox.systems`), not a subdomain of it — which is exactly why it
cannot be written as `hisar.{$DOMAIN}`.

## 5. Compose

The service block and the Caddy import already live in `speda-mark6`
(option (b) in the plan — matches how Forge deploys). Nothing to edit there;
this repo just has to be cloned **beside** it, because the build context is
`../hisar-mk1`:

```bash
cd "$(dirname "$DEPLOY_PATH")"        # the directory holding speda-mark6
git clone https://github.com/spedatox/hisar-mk1.git
```

The service sits behind the `hisar` compose profile and reads
`../hisar-mk1/.env` directly (step 2). `deploy.sh` turns the profile on **only**
when that `.env` exists, and pulls this clone to `origin/main` on every deploy —
so a server without Hisar configured is untouched.

```bash
cd /path/to/speda-mark6
./deploy.sh
curl -s https://hisar.spedatox.systems/health
```

After the first deploy, pushing to `hisar-mk1` does **not** redeploy by itself —
Hisar rides along with speda-mark6's deploy workflow. Trigger it with a
`workflow_dispatch` run of *deploy-backend*, or `./deploy.sh` on the server.

## 6. Forge placement

No container change — the workspace root just moves into the shared vault:

```bash
FORGE_WORKSPACE_ROOT=/opt/hisar/vault/Forge/workspaces
```

Live Cell workspaces become browsable at `Forge/workspaces/{agent}/…` with
nothing else to build (Phase H4, passive layer).

## 7. Google Drive

In Google Cloud Console → **APIs & Services**:

1. Enable the **Google Drive API**.
2. **OAuth consent screen**: External, publishing status *Testing* is fine for
   a single owner; add your own Google account as a test user.
   Scope: `https://www.googleapis.com/auth/drive`.
3. **Credentials → OAuth client ID → Web application**. Authorized redirect
   URI, exactly:
   `https://hisar.spedatox.systems/drive/oauth/callback`
4. Put the client ID/secret into `.env`, restart, then in the desktop:
   **H.İ.S.A.R. menu → Connect Google Drive…**

The refresh token is written to `/opt/hisar/vault/.hisar/google_token.json`
(mode 0600) and survives container recreation because it lives in the vault
volume. "Disconnect Google Drive" deletes it.

> Testing-mode refresh tokens expire after 7 days. Publish the consent screen
> when you want the link to stay up indefinitely.

---

## Verification checklist (plan's H2 done-signals)

- [ ] `https://hisar.spedatox.systems` serves the desktop over TLS
- [ ] Login with the owner password succeeds; a refresh keeps the session
- [ ] Upload from a phone lands in `Transfers/` with a progress bar
- [ ] `docker compose down && up` — the vault contents survive
- [ ] `curl -X POST .../deposit -H "X-Hisar-Token: …" -F file=@x` lands in `SPEDA/`
- [ ] The same token gets **403** on `GET /files/list`
