# Development guide

## Prerequisites

- Node.js 18 or newer
- npm

## Install

```bash
npm install
```

## Run in development

```bash
npm run dev
```

Vite serves the app locally. The Vite config enables `host: true`, so the dev server can also bind to the local network.

Relevant location:
- `vite.config.js:4`

## Build for production

```bash
npm run build
```

Output goes to `dist/`.

## Preview the production build

```bash
npm run preview
```

## Available scripts

From `package.json`:

- `npm run dev`
- `npm run build`
- `npm run preview`

Relevant location:
- `package.json:6`

## Current project layout

```text
hisar/
├── docs/
├── index.html
├── main.jsx
├── hisar.jsx
├── package.json
└── vite.config.js
```

## How to read the codebase

Because almost all logic lives in one file, the easiest way to understand the code is by reading `hisar.jsx` in sections.

Suggested order:

1. translations and context
2. constants and helper functions
3. seed filesystem
4. icon components
5. generic UI shell components
6. Finder behaviors
7. desktop/window manager
8. root app

## Local development behavior notes

### Login
The app does not authenticate against a backend. Any non-empty password logs in.

Relevant location:
- `hisar.jsx:1533`

### Filesystem persistence
The filesystem resets on every refresh because it is created in component state from `initFS()`.

Relevant location:
- `hisar.jsx:1575`

### Uploaded files
Uploaded files exist only in memory for the current session.

### Text rendering
Only files with embedded `content` show readable text in TextEdit or Quick Look.

## Extending the project safely

### If adding a real backend
Start at the local filesystem handlers in Finder:

- `hisar.jsx:1031`
- `hisar.jsx:1039`
- `hisar.jsx:1058`
- `hisar.jsx:1071`

Those are the narrowest swap points.

### If splitting the monolith
A practical extraction sequence would be:

1. move utility helpers out first
2. move translation data and context out second
3. move reusable components like `WindowShell`, `DialogPrompt`, and icons next
4. move feature components such as `FinderWindow`, `Dock`, and `Spotlight`
5. move the CSS string into one or more stylesheet files last

### If improving state management
Current state is good enough for a prototype, but cross-feature complexity will increase quickly if more apps are added. If the app grows, consider separating:

- desktop session state
- filesystem data access
- per-window state
- shared command/shortcut handling

## Testing status

There is currently no automated test setup in the repository.

That means changes should be validated manually in the browser, especially for:

- dragging and resizing windows
- selection mechanics
- keyboard shortcuts
- drag-and-drop upload
- light and dark theme behavior
- English and Turkish text paths

## Known implementation characteristics

- CSS is embedded in JavaScript
- there are placeholder dock apps with no real app implementation
- file operations are optimistic local mutations
- Quick Look for non-text content is mostly decorative
- the app is designed around desktop interaction, not mobile touch interaction

## Recommended manual smoke-check list

After editing behavior, verify:

1. login still works
2. theme toggle still switches dark/light
3. language toggle still changes visible strings
4. Finder windows can open, move, resize, minimize, and maximize
5. selecting files in grid and list mode still works
6. context menu actions still work
7. Spotlight opens and returns results
8. TextEdit still opens seeded text files
9. desktop icons still drag and snap to grid