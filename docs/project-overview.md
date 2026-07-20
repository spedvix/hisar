# Project overview

## What H.İ.S.A.R. is

H.İ.S.A.R. Mark I is a browser-based desktop-style file management interface. It presents a self-contained operating-system-like UI with a lock screen, desktop icons, menu bar, dock, window manager, Finder-like file browser, Spotlight-like search, and Quick Look preview.

The current repository contains only the frontend application. It is a proof-of-concept and interaction prototype rather than a full file-transfer product.

## Expansion of the name

H.İ.S.A.R. stands for:

- **Hızlı**
- **İletişim**
- **Saklama**
- **Aktarım**
- **Rezervi**

The README also translates this as "Rapid Communication Storage & Transfer Reserve".

## Current goals of the codebase

The code in this repository is focused on:

- demonstrating the desktop metaphor in the browser
- proving the visual design language
- simulating a sandboxed file reserve
- establishing the seam where a real backend can be attached later

It does **not** yet implement:

- real authentication
- persistent storage
- server-backed file operations
- real file previews for uploaded binaries
- production-grade multi-user access

## Tech stack

From `package.json`:

- React 18
- React DOM 18
- Vite 5
- `@vitejs/plugin-react`

No routing library, state library, CSS framework, or component library is used.

## Entry points

### `index.html`
Provides the root container and minimal page-level styling.

### `main.jsx`
Bootstraps the React application with `StrictMode` and mounts `App` from `hisar.jsx`.

### `hisar.jsx`
This is the real application entry and contains nearly the entire codebase:

- shared constants
- seed filesystem
- utility functions
- all UI components
- global CSS string
- root `App` component

## Runtime flow

1. Vite serves `index.html`.
2. `main.jsx` mounts the React app.
3. `App` shows the login screen until a user is set.
4. After login, `Desktop` renders the desktop environment.
5. `Desktop` owns global desktop state such as windows, dock state, theme, spotlight visibility, and demo filesystem state.
6. Finder windows receive the filesystem state and mutate it through local handlers.

## Design direction

The UI aims to blend:

- macOS-style desktop affordances
- Windows-style desktop icon grid behavior
- a custom SPEDA Mark VI / JARVIS-inspired visual identity

That design identity is reflected in:

- fluid-glass surfaces
- cyan primary accents
- amber highlight accents
- custom SVG icons
- Rajdhani and Share Tech Mono typography

## Important limitations

The present implementation is intentionally centralized and monolithic. This keeps the prototype easy to ship, but it also means:

- `hisar.jsx` is large and handles many concerns at once
- state is passed through props rather than separated into modules
- CSS is not split into files
- file operations are only local state mutations

That is fine for the current stage, but it should be kept in mind when extending the project.