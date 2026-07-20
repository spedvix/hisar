# Backend integration notes

## Current state

The current frontend does not call a server. All file browsing and mutation happens against in-memory React state.

The README already identifies the intended backend direction as a FastAPI service.

## Best integration seam

The cleanest place to integrate a backend is the Finder data flow.

Current local handlers:

- `doMkdir` at `hisar.jsx:1031`
- `doRename` at `hisar.jsx:1039`
- `doDelete` at `hisar.jsx:1058`
- `doUpload` at `hisar.jsx:1071`

Current local listing derivation:

- `items` at `hisar.jsx:999`

These should eventually stop mutating `fs` directly and instead:

1. call the backend
2. receive authoritative file metadata
3. update local UI state from server responses

## Likely API responsibilities

The README proposes these backend endpoints:

- `POST /auth/login`
- `GET /files/list?path=`
- `POST /files/upload?path=`
- `GET /files/download?path=`
- `DELETE /files/delete?path=`
- `POST /files/mkdir`
- `POST /files/rename`

Those align well with the current frontend behavior.

## Frontend adaptation strategy

### Authentication
Current login behavior is local-only. To integrate real auth:

- replace the fake login accept path in `Login`
- store a session token after successful auth
- use authenticated requests for filesystem operations
- define logout as token/session clearing

Relevant current root/auth locations:
- `hisar.jsx:1528`
- `hisar.jsx:1760`

### Directory listing
Right now a Finder window derives visible children by traversing the local `fs` map.

A backend-backed version should fetch directory contents for `cwd` and normalize the response into a shape the UI can render.

The easiest path is to keep Finder's visible item interface similar to today's:

```js
[{ name, node }]
```

Where `node` still includes at least:

```js
{
  type: "dir" | "file",
  size,
  modified,
  ext,
  content?
}
```

### Uploads
Current uploads only create metadata entries. A real upload integration should:

- submit `File` objects via `multipart/form-data`
- return created file metadata
- refresh the current directory listing after completion
- optionally surface progress UI later

### Rename and delete
Current rename and delete update the local map immediately. A backend-backed version should:

- perform the server mutation
- refresh the affected directory or subtree
- preserve UI selection where sensible

### Quick Look and TextEdit
Current text viewing depends on `node.content` already being in memory.

With a backend, there are two reasonable patterns:

- include inline preview text only for small text files
- lazily fetch file content when TextEdit or Quick Look opens

For non-text files, Quick Look can continue to be metadata-only until richer preview support exists.

## Suggested response model

A backend response that maps well to the current UI would include fields like:

```json
{
  "path": "/Documents/readme.txt",
  "name": "readme.txt",
  "type": "file",
  "ext": "txt",
  "sizeBytes": 1228,
  "sizeLabel": "1.2 KB",
  "modifiedAt": "2026-06-14T09:14:00Z",
  "modifiedLabel": "Today, 09:14",
  "previewText": "Welcome to H.İ.S.A.R."
}
```

This lets the frontend display polished labels while still retaining machine-usable fields.

## Security considerations for the future backend

The README explicitly calls out a sandbox root. That is important.

Backend requirements should include:

- normalize and validate all incoming paths
- prevent `..` traversal outside the sandbox
- prevent symlink escapes if symlinks are allowed on disk
- restrict rename and move operations to sandbox-contained paths
- validate uploaded filenames
- authenticate every file operation

## Frontend concerns once backend-backed

When the app gains network behavior, it will also need:

- loading states for directory changes and mutations
- error states for failed file operations
- retry or refresh logic
- stale-data handling across multiple open Finder windows
- token expiry handling

None of that exists yet because the current data source is synchronous local state.

## Minimal migration plan

A low-risk migration path would be:

1. add an API module with login and file methods
2. keep the UI shapes as close as possible to current `fs`-derived shapes
3. replace Finder mutations one by one
4. introduce fetch-on-navigate for Finder directories
5. introduce content fetch for TextEdit/Quick Look if needed
6. remove or reduce the seeded in-memory filesystem once real data is stable

## Persistence and multi-window behavior

Today, all Finder windows share one React state object. With a backend, that shared-state benefit disappears unless you centralize data fetching or cache directory listings.

If multiple Finder windows remain a core feature, consider a shared client-side cache keyed by path so:

- one mutation can invalidate multiple open windows
- repeated folder openings do not always refetch immediately
- Spotlight can search from cached data or call a dedicated search endpoint