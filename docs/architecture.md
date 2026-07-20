# Architecture

## High-level architecture

The application is a single-page React frontend with a mostly single-file implementation.

```text
index.html
  -> main.jsx
    -> App (hisar.jsx)
      -> LanguageContext provider
      -> Login or Desktop
           -> MenuBar
           -> Desktop icons
           -> FinderWindow(s)
           -> TextEditWindow(s)
           -> Dock
           -> Spotlight
```

## File responsibilities

### `index.html`
Defines the `#root` mount point and base full-height page styling.

### `main.jsx`
Mounts the app with React `StrictMode`.

Relevant location:
- `main.jsx:1`

### `vite.config.js`
Uses the React plugin and exposes the dev server on the network with `host: true`.

Relevant location:
- `vite.config.js:1`

### `hisar.jsx`
Acts as the application's module boundary. It contains almost everything.

Key sections include:

- language context and translations at `hisar.jsx:3`
- global constants and helpers at `hisar.jsx:227`
- seed filesystem at `hisar.jsx:236`
- icon components beginning at `hisar.jsx:299`
- menu bar at `hisar.jsx:797`
- generic window shell at `hisar.jsx:903`
- Finder window at `hisar.jsx:978`
- dialog prompt at `hisar.jsx:1322`
- Quick Look at `hisar.jsx:1346`
- TextEdit window at `hisar.jsx:1383`
- Spotlight at `hisar.jsx:1399`
- Dock at `hisar.jsx:1456`
- Login at `hisar.jsx:1528`
- Desktop/window manager at `hisar.jsx:1570`
- root app at `hisar.jsx:1760`

## State ownership

The app uses local React state and prop drilling rather than a global store.

### Root-level state in `App`
`App` owns:

- `theme`
- `user`
- `lang`

It also creates the translation function and exposes it through `LanguageContext`.

Relevant location:
- `hisar.jsx:1760`

### Desktop-level state in `Desktop`
`Desktop` owns the global desktop session state:

- `fs` — the in-memory filesystem
- `windows` — all open windows and their geometry
- `activeId` — currently focused window
- `spotlight` — Spotlight visibility
- `bouncing` — current dock bounce animation target
- `deskIcons` — desktop icon positions and metadata
- `deskSel` and `deskDrag` — desktop icon interaction state

Relevant location:
- `hisar.jsx:1575`

### Finder-level state in `FinderWindow`
Each Finder window owns its own browsing state:

- `cwd`
- `history`
- `hi`
- `sel`
- `anchor`
- `view`
- `query`
- `searchOpen`
- `showInfo`
- `showSidebar`
- `dragOver`
- `ctx`
- `dlg`
- `band`
- `ql`

Relevant location:
- `hisar.jsx:978`

This means multiple Finder windows share the same underlying filesystem but maintain independent navigation and selection state.

## Component roles

### `MenuBar`
Provides the top menubar, dropdown menus, language switcher, live clock, theme toggle entry points, logout action, and Spotlight trigger.

Relevant location:
- `hisar.jsx:797`

### `WindowShell`
Provides the shared window chrome and interactions used by Finder and TextEdit:

- focus handling
- drag movement
- eight-way resize
- minimize
- maximize/restore

Relevant location:
- `hisar.jsx:903`

### `FinderWindow`
Implements the primary file browsing experience. It is the most behavior-rich component.

Responsibilities include:

- path navigation
- sorting and filtering items
- selection mechanics
- directory CRUD in local state
- upload simulation
- grid/list presentation
- info panel
- status bar
- dialog and context menu orchestration
- Quick Look orchestration

Relevant location:
- `hisar.jsx:978`

### `TextEditWindow`
Displays text content from filesystem nodes.

Relevant location:
- `hisar.jsx:1383`

### `Spotlight`
Provides cross-filesystem search by basename substring matching.

Relevant location:
- `hisar.jsx:1399`

### `Dock`
Displays application launchers, running indicators, minimized windows, trash icon, and hover magnification.

Relevant location:
- `hisar.jsx:1456`

### `Login`
Renders the lock-screen-style login view. Authentication is currently fake: any non-empty password succeeds.

Relevant location:
- `hisar.jsx:1528`

## Rendering model

There is no client-side router. The app is rendered as a single tree with conditional overlays and window components.

Important patterns:

- modal overlays are rendered conditionally within the component tree
- window layering is controlled with numeric `z` values stored in window state
- active window tracking is explicit via `activeId`
- CSS is injected through a `<style>{css}</style>` node inside `Desktop`

Relevant location for style injection:
- `hisar.jsx:1720`

## Styling architecture

Styling is centralized in a single `css` string embedded in `hisar.jsx`.

Implications:

- easy portability for a prototype
- no CSS modules or external stylesheet organization
- styles and behavior remain tightly coupled
- theming is handled through the `data-theme` attribute on `.os`

Relevant location for theme host:
- `hisar.jsx:1719`

## Window manager model

Each window object carries geometry and state such as:

- `id`
- `kind`
- `x`, `y`, `w`, `h`
- `z`
- `minimized`
- `maximized`
- `initPath` for Finder windows
- `path` for TextEdit windows

The desktop updates windows by mapping over the array and patching the matching item.

Relevant locations:
- initial window state at `hisar.jsx:1576`
- focus at `hisar.jsx:1630`
- open Finder at `hisar.jsx:1638`
- open TextEdit at `hisar.jsx:1662`
- close/minimize/change/zoom at `hisar.jsx:1678`

## Internationalization model

Translations are stored in a static object with English and Turkish keys.

The translation flow is:

1. `App` stores the current `lang`
2. `App` creates `t(key)` with English fallback
3. `LanguageContext` provides `{ lang, setLang, t }`
4. child components call `useLanguage()`

Relevant locations:
- context setup at `hisar.jsx:3`
- translations at `hisar.jsx:6`
- translation fallback at `hisar.jsx:1766`

## Architectural seam for backend integration

The main seam between UI and a real backend currently sits inside `FinderWindow`, where filesystem operations mutate local state directly.

These handlers are the main swap points:

- `doMkdir` at `hisar.jsx:1031`
- `doRename` at `hisar.jsx:1039`
- `doDelete` at `hisar.jsx:1058`
- `doUpload` at `hisar.jsx:1071`

Additionally, listing currently derives from the local `fs` map in:

- `items` computation at `hisar.jsx:999`

Replacing those local mutations with API calls would convert the prototype into a real client.