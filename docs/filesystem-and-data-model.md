# Filesystem and data model

## Overview

The current application uses an in-memory object map to represent a sandboxed filesystem. This structure is created fresh on each page load and is not persisted.

Relevant location:
- `hisar.jsx:236`

## Filesystem shape

The filesystem is keyed by absolute path strings.

Example shape:

```js
{
  "/": { type: "dir", children: ["Documents", "Media"] },
  "/Documents": { type: "dir", children: ["readme.txt"] },
  "/Documents/readme.txt": {
    type: "file",
    size: "1.2 KB",
    modified: "Today, 09:14",
    ext: "txt",
    content: "Welcome..."
  }
}
```

## Directory node model

Directory entries use this shape:

```js
{
  type: "dir",
  children: [string, string, ...]
}
```

Notes:

- `children` stores only direct child names, not full paths
- full child paths are reconstructed with `joinPath(base, name)`

Relevant helper:
- `hisar.jsx:285`

## File node model

File entries use this shape:

```js
{
  type: "file",
  size: "human readable size",
  modified: "display string",
  ext: "txt",
  content: string | null
}
```

Notes:

- `size` is stored as a display string rather than a raw byte count
- `modified` is also a display string
- `content` is only present for seeded text files; uploaded files currently get `null`

## Seed data

The seed filesystem contains these top-level folders:

- `/Documents`
- `/Media`
- `/Projects`
- `/Transfers`

Representative contents include:

- text files such as `readme.txt` and `notes.md`
- media placeholders such as `logo.png` and `demo.mp4`
- project example files such as `backend.py` and `config.json`

Relevant location:
- `hisar.jsx:236`

## Helper functions

### `joinPath(base, name)`
Builds a child path from a base path and child name.

Relevant location:
- `hisar.jsx:285`

### `baseName(p)`
Returns the last path segment.

Relevant location:
- `hisar.jsx:286`

### `fmtBytes(b)`
Formats byte counts into `B`, `KB`, `MB`, or `GB` strings.

Relevant location:
- `hisar.jsx:287`

## Derived Finder item list

Finder does not store the visible directory listing separately. It derives `items` from:

- current directory node
- filesystem map
- search query

Derivation steps:

1. read the current directory's `children`
2. map each child name to a filesystem node via `joinPath`
3. filter out missing nodes
4. apply case-insensitive query filtering by item name
5. sort directories before files
6. sort alphabetically

Relevant location:
- `hisar.jsx:999`

## Mutation model

Filesystem mutations are done with functional `setFs` updates so all Finder windows work against the latest shared state.

### Create directory
`doMkdir`:

- trims the provided name
- ignores empty names
- constructs a child path
- no-ops if the target already exists
- appends the child name to the current directory's `children`
- creates a new empty directory node

Relevant location:
- `hisar.jsx:1031`

### Rename item
`doRename`:

- trims the new name
- ignores empty values and no-op renames
- refuses to overwrite an existing sibling path
- renames the full subtree by rewriting matching path prefixes
- replaces the child name in the parent directory's `children`
- reselects the renamed item

Relevant location:
- `hisar.jsx:1039`

This is important: directory rename is recursive because every descendant path key is updated.

### Delete item(s)
`doDelete`:

- accepts one or more child names
- deletes matching path keys and descendant subtree keys
- removes the names from the current directory's `children`
- clears selection

Relevant location:
- `hisar.jsx:1058`

There is no actual trash model yet despite the UI wording.

### Upload file(s)
`doUpload`:

- iterates over dropped or selected browser `File` objects
- extracts extension from the filename
- adds the filename to the current directory's `children` if absent
- creates a file node with formatted size, `Just now`, `content: null`, and the derived extension

Relevant location:
- `hisar.jsx:1071`

## File-type metadata

Document icon styling is driven by `EXT_META`, which maps file extensions to:

- display label
- accent color
- optional semantic kind such as `image` or `video`

Relevant location:
- `hisar.jsx:262`

This metadata affects icon rendering and Quick Look fallback presentation, not filesystem behavior.

## Text file handling

Text-capable files are determined by the `TEXT_EXTS` array.

Relevant location:
- `hisar.jsx:228`

These extensions open in TextEdit when activated from Finder or Spotlight.

## Important constraints of the current data model

The current model is intentionally UI-oriented, not backend-oriented. Limitations include:

- no stable file IDs
- no timestamps stored as machine-readable values
- no MIME types
- no permissions or ownership metadata
- no actual binary payload handling
- no persistence
- no move operation separate from rename
- no trash container

A future backend should likely keep a richer canonical model and adapt it into a UI-friendly response format.