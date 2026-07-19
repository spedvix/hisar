/* ════════════════════════════════════════════════════════════════════════
   H.İ.S.A.R. — backend client
   The single place the desktop talks to the server. Everything below returns
   plain data in the shape the `fs` map already uses, so the UI stays unaware
   of whether a folder lives in the vault or in Google Drive.
   ════════════════════════════════════════════════════════════════════════ */

// Empty base = same origin, which is how it runs in production behind Caddy.
export const API_BASE = (import.meta.env?.VITE_API_BASE || "").replace(/\/$/, "");

export const DRIVE_MOUNT = "/Google Drive";
export const isDrivePath = (p) => p === DRIVE_MOUNT || p.startsWith(DRIVE_MOUNT + "/");

const TEXT_PREVIEW_MAX = 512 * 1024;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const url = (path, params) => {
  const u = new URL(API_BASE + path, window.location.origin);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) u.searchParams.set(k, v);
  });
  return u.toString();
};

async function request(path, { params, ...init } = {}) {
  const res = await fetch(url(path, params), { credentials: "include", ...init });
  if (res.status === 204) return null;

  let body = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(body?.detail || res.statusText || "Request failed", res.status);
  }
  return body;
}

const json = (path, method, payload) =>
  request(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

/* ── formatting helpers (kept here so server and UI agree on one style) ── */

export const fmtBytes = (b) => {
  if (b === null || b === undefined) return "--";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(1)} GB`;
};

export const fmtWhen = (iso, lang = "tr") => {
  if (!iso) return "--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  const loc = lang === "tr" ? "tr-TR" : "en-US";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit", hour12: false });
  if (d.getFullYear() === now.getFullYear())
    return d.toLocaleDateString(loc, { month: "short", day: "numeric" });
  return d.toLocaleDateString(loc, { year: "numeric", month: "short", day: "numeric" });
};

/* ── auth ───────────────────────────────────────────────────────────── */

export const login = (password, username) => json("/auth/login", "POST", { password, username });
export const logout = () => request("/auth/logout", { method: "POST" });
export const me = () => request("/auth/me");

/* ── files ──────────────────────────────────────────────────────────── */

/**
 * List a directory and return `{ dirNode, childNodes }` already in `fs` shape.
 * The caller merges these into the map; nothing here mutates state.
 */
export async function listDir(path, lang) {
  const data = await request("/files/list", { params: { path } });
  const children = [];
  const nodes = {};

  for (const e of data.entries) {
    children.push(e.name);
    nodes[e.path] =
      e.kind === "dir"
        ? {
            type: "dir",
            children: [],       // filled in when this directory is itself listed
            loaded: false,
            provider: e.provider,
            mount: !!e.mount,
            modified: e.modified ? fmtWhen(e.modified, lang) : "",
          }
        : {
            type: "file",
            ext: e.ext || "",
            bytes: e.size,
            size: fmtBytes(e.size),
            modified: fmtWhen(e.modified, lang),
            content: null,
            provider: e.provider,
            googleDoc: !!e.google_doc,
            webLink: e.web_link || null,
          };
  }

  return {
    path: data.path,
    dirNode: { type: "dir", children, loaded: true, provider: data.provider },
    nodes,
  };
}

export const mkdir = (path, name) => json("/files/mkdir", "POST", { path, name });
export const rename = (path, name) => json("/files/rename", "POST", { path, name });
export const remove = (path) => request("/files/delete", { method: "DELETE", params: { path } });
export const usage = () => request("/files/usage");

export const downloadUrl = (path, inline = false) =>
  url("/files/download", { path, inline: inline ? "true" : undefined });

/** Trigger a browser download without navigating away from the desktop. */
export function saveAs(path) {
  const a = document.createElement("a");
  a.href = downloadUrl(path);
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Fetch a text file's contents for TextEdit / Quick Look. */
export async function readText(path, bytes) {
  if (bytes !== null && bytes !== undefined && bytes > TEXT_PREVIEW_MAX) {
    return "— file is too large to preview —";
  }
  const res = await fetch(downloadUrl(path, true), { credentials: "include" });
  if (!res.ok) throw new ApiError("Could not read file", res.status);
  return res.text();
}

/**
 * Upload one file with progress. Uses XHR rather than fetch because upload
 * progress is the point — this is a file-transfer system, and a 4 GB upload
 * with no feedback is unusable.
 *
 * Returns a promise with an extra `.abort()` for cancel support.
 */
export function upload(path, file, { onProgress } = {}) {
  const xhr = new XMLHttpRequest();
  const promise = new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file, file.name);

    xhr.open("POST", url("/files/upload", { path }));
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded, e.total);
    };
    xhr.onload = () => {
      let body = null;
      try { body = JSON.parse(xhr.responseText); } catch { /* non-JSON error page */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else reject(new ApiError(body?.detail || `Upload failed (${xhr.status})`, xhr.status));
    };
    xhr.onerror = () => reject(new ApiError("Network error during upload", 0));
    xhr.onabort = () => reject(new ApiError("Upload cancelled", 0));
    xhr.send(form);
  });
  promise.abort = () => xhr.abort();
  return promise;
}

/* ── Google Drive ───────────────────────────────────────────────────── */

export const driveStatus = () => request("/drive/status");
export const driveDisconnect = () => request("/drive/disconnect", { method: "POST" });

/**
 * Open Google's consent screen in a popup and resolve when it reports back.
 * The popup posts a message from the callback page; we also poll for the
 * window closing, since a user who cancels never sends one.
 */
export async function driveConnect() {
  const { authorize_url } = await request("/drive/connect");
  const popup = window.open(authorize_url, "hisar-drive", "width=520,height=680");
  if (!popup) throw new ApiError("Popup blocked — allow popups for this site.", 0);

  return new Promise((resolve) => {
    const finish = (ok) => {
      window.removeEventListener("message", onMsg);
      clearInterval(timer);
      resolve(ok);
    };
    const onMsg = (e) => {
      if (e.data && e.data.type === "hisar-drive") finish(!!e.data.ok);
    };
    window.addEventListener("message", onMsg);
    const timer = setInterval(() => {
      if (popup.closed) finish(false);
    }, 600);
  });
}
