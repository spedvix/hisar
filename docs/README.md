# H.İ.S.A.R. Documentation

This folder documents the current state of the H.İ.S.A.R. Mark I project in detail.

## Contents

- [Project overview](./project-overview.md)
- [Architecture](./architecture.md)
- [UI and interaction guide](./ui-and-interactions.md)
- [Filesystem and data model](./filesystem-and-data-model.md)
- [Development guide](./development-guide.md)
- [Backend integration notes](./backend-integration.md)

## Repository summary

H.İ.S.A.R. is currently a React + Vite frontend prototype that simulates a desktop operating system for browsing and managing files in a sandboxed reserve. The current implementation is entirely client-side and uses an in-memory filesystem seeded at startup.

## Source map

- `index.html` — root HTML shell
- `main.jsx` — React bootstrap
- `hisar.jsx` — the application, UI, styling, demo filesystem, and window manager
- `vite.config.js` — Vite configuration
- `package.json` — scripts and dependencies

## Current implementation shape

The application is intentionally compact. Almost all behavior lives in `hisar.jsx`, including:

- translation strings and language context
- CSS injected from JavaScript
- icon components
- demo filesystem seed data
- desktop, dock, menus, windows, Finder, Spotlight, Quick Look, and login

This documentation reflects that architecture as it exists now.