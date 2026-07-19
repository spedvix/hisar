# ── stage 1: build the desktop client ────────────────────────────────────
FROM node:20-slim AS client

WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js main.jsx hisar.jsx api.js ./
# VITE_API_BASE stays empty: the API and the client are served from the same
# origin, so relative paths are correct and no CORS is involved.
RUN npm run build


# ── stage 2: the API, serving the built client ───────────────────────────
FROM python:3.12-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HISAR_SANDBOX_ROOT=/vault \
    HISAR_STATIC_DIR=/app/dist

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY server/ ./server/
COPY --from=client /build/dist ./dist

# Non-root, and the vault bind mount is the only path this user can write to.
RUN useradd --system --uid 10001 --create-home hisar \
 && mkdir -p /vault \
 && chown -R hisar:hisar /app /vault
USER hisar

EXPOSE 8600

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8600/health', timeout=4).status==200 else 1)"

# One worker: uploads stream to a shared vault and the login rate-limiter is
# in-process. This is a single-owner service — concurrency is not the problem
# it is solving.
CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8600", \
     "--workers", "1", "--proxy-headers", "--forwarded-allow-ips", "*"]
