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
cd /opt/speda/hisar-mk1
cp .env.example .env

python -m server.auth hash-password      # → HISAR_OWNER_PASSWORD_HASH
openssl rand -base64 48                  # → HISAR_JWT_SECRET
openssl rand -hex 32                     # → HISAR_MACHINE_TOKEN
```

Keep `HISAR_MACHINE_TOKEN` — Igor's `hisar_deposit` skill (Phase H3) and Forge
(Phase H4) need the same value.

## 3. DNS

One A record: `hisar.spedatox.systems` → the Contabo IP (same as the apex).

## 4. Caddy

Add one site block to the `Caddyfile` in `speda-mark6`. Caddy provisions the
certificate automatically.

```caddyfile
{$DOMAIN} {
    reverse_proxy app:8000
}

hisar.{$DOMAIN} {
    reverse_proxy hisar:8600

    # Must be at least HISAR_MAX_UPLOAD_BYTES or Caddy truncates large
    # uploads before the API ever sees them.
    request_body {
        max_size 2GB
    }
}
```

## 5. Compose

Clone this repo beside `speda-mark6` on the server and add the service to
speda-mark6's `docker-compose.yml` (option (b) in the plan — matches how Forge
already deploys):

```yaml
  hisar:
    build: ../hisar-mk1
    restart: unless-stopped
    expose: ["8600"]
    environment:
      HISAR_SANDBOX_ROOT: /vault
      HISAR_OWNER_USERNAME: ${HISAR_OWNER_USERNAME}
      HISAR_OWNER_PASSWORD_HASH: ${HISAR_OWNER_PASSWORD_HASH}
      HISAR_JWT_SECRET: ${HISAR_JWT_SECRET}
      HISAR_MACHINE_TOKEN: ${HISAR_MACHINE_TOKEN}
      HISAR_GOOGLE_CLIENT_ID: ${HISAR_GOOGLE_CLIENT_ID}
      HISAR_GOOGLE_CLIENT_SECRET: ${HISAR_GOOGLE_CLIENT_SECRET}
      HISAR_GOOGLE_REDIRECT_URI: https://hisar.spedatox.systems/drive/oauth/callback
    volumes:
      - /opt/hisar/vault:/vault
    security_opt: [no-new-privileges:true]
```

Then:

```bash
docker compose up -d --build hisar caddy
curl -s https://hisar.spedatox.systems/health
```

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
