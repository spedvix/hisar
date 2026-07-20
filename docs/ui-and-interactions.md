# UI and interaction guide

## Login screen

The app starts on a lock-screen-like login view.

Behavior:

- displays current date and time
- shows the configured username
- accepts any non-empty password
- shows an error shake state if submitted empty

Relevant location:
- `hisar.jsx:1528`

## Desktop

After login, the app shows the desktop environment.

Main visible areas:

- wallpaper/background layer
- top menu bar
- desktop icons
- open windows
- dock
- Spotlight overlay when active

Relevant location:
- `hisar.jsx:1718`

## Menu bar

The menu bar provides:

- application label and system indicator
- dropdown menus
- Spotlight trigger icon
- language switcher
- live clock

Actions available through the menus include:

- open About content
- open a new Finder window
- show Spotlight
- toggle theme
- switch language
- log out

Relevant location:
- `hisar.jsx:797`

## Desktop icons

The desktop begins with five icons:

- Reserve
- Documents
- Media
- Projects
- Transfers

Behavior:

- selectable
- draggable
- snapped to a fixed grid on drop
- double-click opens the related path in Finder

The icon layout is computed against a desktop grid defined by `DGRID`.

Relevant locations:
- grid constants at `hisar.jsx:230`
- initial desktop icons at `hisar.jsx:1587`
- drag handling at `hisar.jsx:1608`

## Window shell

All application windows share a common shell.

Provided interactions:

- click to focus
- drag by title bar
- resize from edges and corners
- close
- minimize
- zoom/maximize
- compact title bar mode for TextEdit

Relevant location:
- `hisar.jsx:903`

## Finder

Finder is the main file browser and the central app experience.

### Finder layout

A Finder window contains:

- toolbar
- optional sidebar
- content area
- optional info panel
- status bar

Relevant location:
- `hisar.jsx:1182`

### Toolbar actions

The toolbar supports:

- back and forward navigation
- sidebar toggle
- breadcrumb path navigation
- grid/list view switch
- info panel toggle
- upload trigger
- new folder dialog
- in-window search field

Relevant location:
- `hisar.jsx:1152`

### Sidebar

The sidebar contains favorite locations and tag chips.

Favorites are currently driven by a static `SIDEBAR` array.

Relevant location:
- `hisar.jsx:970`

### Item display modes

Finder supports two display modes:

- grid view
- list view

Sorting rules:

- directories first
- alphabetical order within type groups

Filtering is applied by basename substring matching against the search query.

Relevant locations:
- item derivation at `hisar.jsx:999`
- view mode state at `hisar.jsx:985`

### Selection behavior

Finder supports desktop-like selection patterns:

- single click selects one item
- Ctrl/Cmd-click toggles an item in the selection
- Shift-click selects a contiguous range
- drag on empty area creates a rubber-band selection
- Ctrl/Cmd-A selects all items in the current view
- arrow keys move selection

Relevant locations:
- click selection at `hisar.jsx:1087`
- rubber-band selection at `hisar.jsx:1097`
- keyboard handling at `hisar.jsx:1127`

### Navigation behavior

Opening behavior:

- directories navigate into the selected path
- text-like files open in TextEdit
- other files open Quick Look

Relevant location:
- `hisar.jsx:1021`

### Context menu

Finder renders a custom context menu.

When right-clicking an item, actions include:

- open
- Quick Look
- rename
- upload here
- move to trash

When right-clicking empty space, actions include:

- new folder
- upload files
- switch grid/list mode
- open new window

Relevant location:
- `hisar.jsx:1271`

### Dialogs

Finder uses a reusable prompt dialog for:

- creating a folder
- renaming an item

Relevant location:
- `hisar.jsx:1322`

### Drag-and-drop upload

Dropping files into Finder triggers simulated upload.

Current behavior:

- new file nodes are inserted into the in-memory filesystem
- uploaded file size is calculated from the browser `File` object
- content is stored as `null`, so previews are metadata-only unless the seeded demo file has embedded text content

Relevant locations:
- upload handler at `hisar.jsx:1071`
- drag/drop event wiring at `hisar.jsx:1185`

### Info panel

When enabled and a single item is selected, Finder shows an inspector panel with:

- icon
- file/folder name
- kind
- item count or size
- modified value
- current location
- inline content preview for text-backed seeded files

Relevant location:
- `hisar.jsx:1237`

### Status bar

The status bar shows:

- item count
- selection count
- current sandbox path

Relevant location:
- `hisar.jsx:1255`

## Quick Look

Quick Look is a transient preview overlay.

Behavior:

- opens from Space key or context menu
- closes on Escape, Space, close button, or background click
- shows full text content when `node.content` exists
- otherwise shows a large icon and metadata-only placeholder

Relevant location:
- `hisar.jsx:1346`

## TextEdit

TextEdit is a simple read-only text viewer.

Behavior:

- one window per path; opening the same file focuses the existing window
- displays `node.content` or an empty-file message
- uses a compact shared `WindowShell`

Relevant locations:
- window opening logic at `hisar.jsx:1662`
- component at `hisar.jsx:1383`

## Spotlight

Spotlight is a centered global search overlay.

Behavior:

- toggled with Ctrl/Cmd-Space
- searches the entire in-memory filesystem
- matches by lowercase basename substring
- returns up to eight results
- supports keyboard navigation with arrows and Enter

When a result is chosen:

- directories open in Finder
- text files open in TextEdit
- file handling defers to the desktop opener logic

Relevant locations:
- desktop shortcut at `hisar.jsx:1708`
- component at `hisar.jsx:1399`

## Dock

The dock provides launchers and minimized-window restoration.

Static app entries:

- Finder
- Terminal
- TextEdit
- Appearance
- Trash

Current behavior details:

- Finder is functional
- Appearance toggles theme
- minimized Finder/TextEdit windows are inserted between app entries and Trash
- icons magnify based on cursor proximity
- running applications show indicator dots
- Finder/TextEdit launch actions are only partially implemented for some static entries

Relevant location:
- `hisar.jsx:1456`

## Keyboard shortcuts

Implemented global shortcuts:

- `Ctrl/Cmd + Space` — toggle Spotlight
- `Ctrl/Cmd + N` — open new Finder window when not typing
- `Escape` — close Spotlight

Implemented Finder-focused shortcuts:

- `Ctrl/Cmd + A` — select all
- `Delete` or `Backspace` — delete selection
- `Space` — toggle Quick Look for a single selected item
- `Enter` — open selected item
- arrow keys — move selection
- `Escape` — close context menu or Quick Look

Relevant locations:
- desktop shortcuts at `hisar.jsx:1706`
- Finder shortcuts at `hisar.jsx:1127`

## Theme and language

### Theme
The root desktop node uses `data-theme` to switch between dark and light appearance.

Relevant location:
- `hisar.jsx:1719`

### Language
The UI supports English and Turkish through a static translation dictionary.

Relevant locations:
- translations at `hisar.jsx:6`
- language fallback logic at `hisar.jsx:1766`