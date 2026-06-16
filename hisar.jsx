import { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from "react";

const LanguageContext = createContext();
export const useLanguage = () => useContext(LanguageContext);

const TRANSLATIONS = {
  en: {
    // Menubar
    about_reserve: "About This Reserve",
    system_settings: "System Settings…",
    lock_screen: "Lock Screen",
    log_out: "Log Out",
    about_finder: "About Finder",
    preferences: "Preferences…",
    empty_trash: "Empty Trash…",
    new_folder: "New Folder",
    untitled_folder: "untitled folder",
    find: "Find…",
    light_appearance: "Switch to Light Appearance",
    dark_appearance: "Switch to Dark Appearance",
    show_spotlight: "Show Spotlight",
    file: "File",
    edit: "Edit",
    view: "View",
    go: "Go",
    
    // Sidebar
    favorites: "Favorites",
    sidebar: "Sidebar",
    get_info: "Get Info",
    upload: "Upload",
    search: "Search",
    tags: "Tags",
    red: "Red",
    orange: "Orange",
    green: "Green",
    blue: "Blue",

    // Folders
    home: "Home",
    documents: "Documents",
    media: "Media",
    projects: "Projects",
    transfers: "Transfers",
    reserve: "Reserve",

    // Finder Area
    no_matching_items: "No matching items.",
    empty_folder: "This folder is empty. Drop files here to upload.",
    name: "Name",
    size: "Size",
    modified: "Modified",
    item: "item",
    items: "items",
    selected: "selected",
    drop_to_upload: "Drop to upload",

    // Info Panel
    kind: "Kind",
    folder: "Folder",
    document: "document",
    where: "Where",

    // Context Menu
    open: "Open",
    quick_look: "Quick Look",
    rename: "Rename…",
    upload_here: "Upload Here…",
    move_to_trash: "Move to Trash",
    upload_files: "Upload Files…",
    view_as_list: "View as List",
    view_as_icons: "View as Icons",
    open_new_window: "Open in New Window",

    // Dialogs
    dialog_new_folder_title: "New Folder",
    dialog_new_folder_desc: "Name of new folder inside ",
    dialog_rename_title: "Rename",
    dialog_rename_desc: "Enter a new name for “{name}”",
    create: "Create",
    cancel: "Cancel",

    // Quick Look
    no_preview: "No preview available",

    // TextEdit
    empty_file: "(empty file)",

    // Spotlight
    spotlight_search: "Spotlight Search",
    no_results: "No results for “{query}”",

    // Dock
    dock_finder: "Finder",
    dock_terminal: "Terminal",
    dock_textedit: "TextEdit",
    dock_appearance: "Appearance",
    dock_trash: "Trash",

    // Login
    enter_password: "Enter Password",
    password_required: "Password required",
    touch_id_or_password: "Touch ID or Enter Password",
    appName_subtitle: "Fast Communication Storage and Transfer Reserve",
  },
  tr: {
    // Menubar
    about_reserve: "Bu Rezerv Hakkında",
    system_settings: "Sistem Ayarları…",
    lock_screen: "Ekranı Kilitle",
    log_out: "Çıkış Yap",
    about_finder: "Finder Hakkında",
    preferences: "Tercihler…",
    empty_trash: "Çöpü Boşalt…",
    new_finder_window: "Yeni Finder Penceresi",
    new_folder: "Yeni Klasör",
    untitled_folder: "adsız klasör",
    find: "Bul…",
    light_appearance: "Açık Görünüme Geç",
    dark_appearance: "Koyu Görünüme Geç",
    show_spotlight: "Spotlight'ı Göster",
    file: "Dosya",
    edit: "Düzen",
    view: "Görüntü",
    go: "Git",
    
    // Sidebar
    favorites: "Favoriler",
    sidebar: "Kenar Çubuğu",
    get_info: "Bilgi Al",
    upload: "Yükle",
    search: "Ara",
    tags: "Etiketler",
    red: "Kırmızı",
    orange: "Turuncu",
    green: "Yeşil",
    blue: "Mavi",

    // Folders
    home: "Ev",
    documents: "Belgeler",
    media: "Medya",
    projects: "Projeler",
    transfers: "Aktarımlar",
    reserve: "Rezerv",

    // Finder Area
    no_matching_items: "Eşleşen öge bulunamadı.",
    empty_folder: "Bu klasör boş. Yüklemek için dosyaları buraya sürükleyin.",
    name: "Ad",
    size: "Boyut",
    modified: "Değiştirilme",
    item: "öge",
    items: "öge",
    selected: "seçildi",
    drop_to_upload: "Yüklemek için sürükleyin",

    // Info Panel
    kind: "Tür",
    folder: "Klasör",
    document: "belgesi",
    where: "Konum",

    // Context Menu
    open: "Aç",
    quick_look: "Hızlı Bakış",
    rename: "Yeniden Adlandır…",
    upload_here: "Buraya Yükle…",
    move_to_trash: "Çöp Kutusuna Taşı",
    upload_files: "Dosya Yükle…",
    view_as_list: "Liste Olarak Görüntüle",
    view_as_icons: "Simge Olarak Görüntüle",
    open_new_window: "Yeni Pencerede Aç",

    // Dialogs
    dialog_new_folder_title: "Yeni Klasör",
    dialog_new_folder_desc: "Şunun içindeki yeni klasörün adı: ",
    dialog_rename_title: "Yeniden Adlandır",
    dialog_rename_desc: "“{name}” için yeni bir ad girin",
    create: "Oluştur",
    cancel: "İptal",

    // Quick Look
    no_preview: "Önizleme mevcut değil",

    // TextEdit
    empty_file: "(boş dosya)",

    // Spotlight
    spotlight_search: "Spotlight Arama",
    no_results: "“{query}” için sonuç bulunamadı",

    // Dock
    dock_finder: "Finder",
    dock_terminal: "Terminal",
    dock_textedit: "TextEdit",
    dock_appearance: "Görünüm",
    dock_trash: "Çöp Kutusu",

    // Login
    enter_password: "Şifre Girin",
    password_required: "Şifre gerekli",
    touch_id_or_password: "Touch ID veya Şifre Girin",
    appName_subtitle: "Hızlı İletişim Saklama ve Aktarım Rezervi",
  }
};

/* ════════════════════════════════════════════════════════════════════════
   H.İ.S.A.R. — Hızlı İletişim Saklama ve Aktarım Rezervi
   macOS-grade desktop client (Sonoma/Sequoia aesthetic).
   Single-file React component. Pure in-memory demo filesystem; swap the
   `ops` layer for the FastAPI backend (/auth, /files/*) when wiring live.
   ════════════════════════════════════════════════════════════════════════ */

// ── Web fonts (SF Pro substitutes for non-Apple platforms) ──────────────────
(() => {
  if (typeof document === "undefined") return;
  if (document.getElementById("hisar-fonts")) return;
  const l = document.createElement("link");
  l.id = "hisar-fonts";
  l.rel = "stylesheet";
  l.href =
    "https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600;700&family=Share+Tech+Mono&display=swap";
  document.head.appendChild(l);
})();

const MENUBAR_H = 28;
const TEXT_EXTS = ["txt", "md", "py", "json", "js", "csv", "log", "yml", "yaml", "sh", "ts", "jsx"];

// Desktop icon grid (Windows-style snap-to-grid), anchored top-left
const DGRID = { ox: 22, oy: MENUBAR_H + 16, cw: 92, ch: 98 };
const gridPos = (col, row) => ({ x: DGRID.ox + col * DGRID.cw, y: DGRID.oy + row * DGRID.ch });
const gridCell = (x, y) => ({ col: Math.max(0, Math.round((x - DGRID.ox) / DGRID.cw)), row: Math.max(0, Math.round((y - DGRID.oy) / DGRID.ch)) });

// ── Initial filesystem ──────────────────────────────────────────────────────
const initFS = () => ({
  "/": { type: "dir", children: ["Documents", "Media", "Projects", "Transfers"] },
  "/Documents": { type: "dir", children: ["readme.txt", "notes.md"] },
  "/Documents/readme.txt": {
    type: "file", size: "1.2 KB", modified: "Today, 09:14", ext: "txt",
    content:
      "Welcome to H.İ.S.A.R.\nHızlı İletişim Saklama ve Aktarım Rezervi\n\nThis is your sandboxed transfer directory.\nDrop files here to move them across devices.",
  },
  "/Documents/notes.md": {
    type: "file", size: "0.8 KB", modified: "Today, 08:00", ext: "md",
    content: "# HISAR Notes\n\n- Phase 1: Desktop UI ✓\n- Phase 2: Backend VPS bridge\n- Phase 3: Multi-user support",
  },
  "/Media": { type: "dir", children: ["logo.png", "demo.mp4", "shot.jpg"] },
  "/Media/logo.png": { type: "file", size: "340 KB", modified: "Jun 14", content: null, ext: "png" },
  "/Media/demo.mp4": { type: "file", size: "12.4 MB", modified: "Jun 14", content: null, ext: "mp4" },
  "/Media/shot.jpg": { type: "file", size: "2.1 MB", modified: "Jun 13", content: null, ext: "jpg" },
  "/Projects": { type: "dir", children: ["speda", "codex"] },
  "/Projects/speda": { type: "dir", children: ["backend.py", "config.json"] },
  "/Projects/speda/backend.py": { type: "file", size: "4.1 KB", modified: "Jun 15", ext: "py", content: "# Speda Mark VI Backend\n# FastAPI + Anthropic SDK\n\nasync def run(context):\n    ..." },
  "/Projects/speda/config.json": { type: "file", size: "0.9 KB", modified: "Jun 15", ext: "json", content: '{\n  "model": "claude-sonnet-4-6",\n  "max_tokens": 1000\n}' },
  "/Projects/codex": { type: "dir", children: ["bom.txt"] },
  "/Projects/codex/bom.txt": { type: "file", size: "0.4 KB", modified: "Jun 12", ext: "txt", content: "ESP32 CP2102 - 260TL\nCC1101 433MHz - 348TL\nPN532 NFC - 380TL\nSSD1306 OLED - 120TL\nLiPo + TP4056 - 150TL\nTotal: ~1,358 TL" },
  "/Transfers": { type: "dir", children: [] },
});

// ── File-type metadata (label + accent for the doc icon) ────────────────────
const EXT_META = {
  txt: { label: "TXT", color: "#8E8E93" },
  md: { label: "MD", color: "#5E5CE6" },
  py: { label: "PY", color: "#4B8BBE" },
  js: { label: "JS", color: "#E6B800" },
  jsx: { label: "JSX", color: "#61DAFB" },
  ts: { label: "TS", color: "#3178C6" },
  json: { label: "JSON", color: "#FF9F0A" },
  csv: { label: "CSV", color: "#34C759" },
  png: { label: "PNG", color: "#BF5AF2", kind: "image" },
  jpg: { label: "JPG", color: "#BF5AF2", kind: "image" },
  jpeg: { label: "JPG", color: "#BF5AF2", kind: "image" },
  gif: { label: "GIF", color: "#BF5AF2", kind: "image" },
  svg: { label: "SVG", color: "#FF9500", kind: "image" },
  mp4: { label: "MP4", color: "#FF375F", kind: "video" },
  mov: { label: "MOV", color: "#FF375F", kind: "video" },
  pdf: { label: "PDF", color: "#FF453A" },
  zip: { label: "ZIP", color: "#A2845E" },
  default: { label: "DOC", color: "#8E8E93" },
};
const extMeta = (ext) => EXT_META[(ext || "").toLowerCase()] || EXT_META.default;

// ── Path helpers ────────────────────────────────────────────────────────────
const joinPath = (base, name) => (base === "/" ? `/${name}` : `${base}/${name}`);
const baseName = (p) => p.split("/").pop();
const fmtBytes = (b) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(1)} GB`;
};

/* ════════════════════════════════════════════════════════════════════════
   ICONS — hand-built SVGs (no emoji) for a native feel
   ════════════════════════════════════════════════════════════════════════ */

// Arc-reactor system indicator (JARVIS signature) — replaces the Apple mark
const ArcReactor = ({ s = 15 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden>
    <circle cx="12" cy="12" r="10.2" fill="none" stroke="currentColor" strokeWidth="1.1" opacity=".35" />
    <circle cx="12" cy="12" r="6.6" fill="none" stroke="currentColor" strokeWidth="1.1" opacity=".65" />
    <g stroke="currentColor" strokeWidth="1" opacity=".55">
      <line x1="12" y1="2" x2="12" y2="5.4" /><line x1="12" y1="18.6" x2="12" y2="22" />
      <line x1="2" y1="12" x2="5.4" y2="12" /><line x1="18.6" y1="12" x2="22" y2="12" />
    </g>
    <circle cx="12" cy="12" r="3.1" fill="currentColor" />
  </svg>
);

// Stark tech folder icon — fluid glass tabbed folder with corrected aspect ratio
const FolderIcon = ({ s = 30 }) => (
  <svg width={s} height={Math.round(s * 52 / 64)} viewBox="0 0 64 52" aria-hidden style={{ display: "block" }}>
    {/* Folder back tab (open path at bottom to avoid overlapping wireframe stroke inside the glass body) */}
    <path d="M6 17V10a3 3 0 0 1 3-3h12l4 4h32a3 3 0 0 1 3 3v3" fill="rgba(54,171,202,0.08)" stroke="var(--dock-gly)" strokeWidth="1.2" opacity="0.75" />
    {/* Folder front body */}
    <rect x="4" y="17" width="56" height="30" rx="6" fill="rgba(54,171,202,0.12)" stroke="var(--dock-gly)" strokeWidth="1.2" />
    {/* specular reflection glaze */}
    <path d="M4 23a6 6 0 0 1 6-6h44a6 6 0 0 1 6 6v2H4z" fill="#fff" opacity="0.06" />
    {/* tech detail lines */}
    <line x1="16" y1="28" x2="48" y2="28" stroke="var(--dock-gly)" strokeWidth="1" opacity="0.35" />
    <line x1="16" y1="34" x2="38" y2="34" stroke="var(--dock-gly)" strokeWidth="1" opacity="0.35" />
    {/* activity node */}
    <circle cx="48" cy="34" r="2.4" fill="var(--amber-bright)" />
  </svg>
);

// Reserve drive (storage) — glass slab with cyan platter + amber activity light
const DriveIcon = ({ s = 56 }) => (
  <svg width={s} height={s} viewBox="0 0 64 56" aria-hidden style={{ display: "block" }}>
    <rect x="5" y="8" width="54" height="40" rx="8" fill="rgba(54,171,202,0.14)" stroke="rgba(150,205,245,0.42)" strokeWidth="1.2" />
    <path d="M5 16a8 8 0 0 1 8-8h38a8 8 0 0 1 8 8z" fill="#fff" opacity=".07" />
    <circle cx="28" cy="28" r="12" fill="none" stroke="#8fdcef" strokeWidth="2.4" />
    <circle cx="28" cy="28" r="3.2" fill="#8fdcef" />
    <circle cx="48" cy="40" r="2.4" fill="#f2b75c" />
  </svg>
);

// Generic document: white sheet, folded corner, colored ext label
const DocIcon = ({ ext, s = 30 }) => {
  const m = extMeta(ext);
  return (
    <svg width={s} height={s} viewBox="0 0 52 64" aria-hidden style={{ display: "block" }}>
      <path d="M8 2h26l12 12v44a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4z" fill="#E7F0F4" stroke="rgba(120,180,205,.55)" strokeWidth="1" />
      <path d="M34 2l12 12H38a4 4 0 0 1-4-4z" fill="#CDDEE6" />
      {m.kind === "image" ? (
        <>
          <rect x="11" y="24" width="30" height="20" rx="2" fill={m.color} opacity=".16" />
          <circle cx="18" cy="31" r="3" fill={m.color} />
          <path d="M13 44l8-9 6 6 5-5 6 8z" fill={m.color} opacity=".7" />
        </>
      ) : m.kind === "video" ? (
        <>
          <rect x="11" y="24" width="30" height="20" rx="3" fill={m.color} opacity=".16" />
          <path d="M23 30l9 5-9 5z" fill={m.color} />
        </>
      ) : (
        <g stroke="#A6C5D2" strokeWidth="2" strokeLinecap="round">
          <line x1="12" y1="28" x2="40" y2="28" />
          <line x1="12" y1="34" x2="40" y2="34" />
          <line x1="12" y1="40" x2="32" y2="40" />
        </g>
      )}
      <rect x="2" y="46" width="34" height="13" rx="3" fill={m.color} />
      <text x="19" y="55.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff" fontFamily="Albert Sans, sans-serif">{m.label}</text>
    </svg>
  );
};

const ItemIcon = ({ node, s }) =>
  node?.type === "dir" ? <FolderIcon s={s} /> : <DocIcon ext={node?.ext} s={s} />;

// Dock app icons — fluid-glass tiles with cyan line glyphs
const GLY = "var(--dock-gly)";
const Tile = () => (
  <>
    <rect x="3" y="3" width="58" height="58" rx="15" fill="rgba(54,171,202,0.10)" stroke="rgba(150,205,245,0.32)" strokeWidth="1" />
    <path d="M3 18a15 15 0 0 1 15-15h28a15 15 0 0 1 15 15z" fill="#fff" opacity=".06" />
  </>
);
const IcFinder = () => (
  <svg viewBox="0 0 64 64" width="100%" height="100%">
    <Tile />
    <g fill="none" stroke={GLY} strokeWidth="3" strokeLinejoin="round">
      <rect x="17" y="15" width="30" height="9.5" rx="3" />
      <rect x="17" y="27.5" width="30" height="9.5" rx="3" />
      <rect x="17" y="40" width="30" height="9.5" rx="3" />
    </g>
    <g fill={GLY}><circle cx="23" cy="19.7" r="1.7" /><circle cx="23" cy="32.2" r="1.7" /><circle cx="23" cy="44.7" r="1.7" /></g>
  </svg>
);
const IcTerminal = () => (
  <svg viewBox="0 0 64 64" width="100%" height="100%">
    <Tile />
    <polyline points="19,25 28,33 19,41" fill="none" stroke={GLY} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="31" y="39" width="15" height="3.4" rx="1.7" fill={GLY} />
  </svg>
);
const IcTextEdit = () => (
  <svg viewBox="0 0 64 64" width="100%" height="100%">
    <Tile />
    <g stroke={GLY} strokeWidth="3" strokeLinecap="round">
      <line x1="20" y1="22" x2="44" y2="22" /><line x1="20" y1="30" x2="44" y2="30" />
      <line x1="20" y1="38" x2="44" y2="38" /><line x1="20" y1="46" x2="36" y2="46" />
    </g>
  </svg>
);
const IcSettings = () => (
  <svg viewBox="0 0 64 64" width="100%" height="100%">
    <Tile />
    <circle cx="32" cy="32" r="14" fill="none" stroke={GLY} strokeWidth="3.2" strokeDasharray="3 6.2" />
    <circle cx="32" cy="32" r="6" fill="none" stroke={GLY} strokeWidth="3.2" />
  </svg>
);
const IcTrash = ({ full }) => (
  <svg viewBox="0 0 64 64" width="100%" height="100%">
    <path d="M19 22h26l-2.6 32a4 4 0 0 1-4 3.7H25.6a4 4 0 0 1-4-3.7z" fill="none" stroke={GLY} strokeWidth="3" strokeLinejoin="round" />
    <line x1="14" y1="20" x2="50" y2="20" stroke={GLY} strokeWidth="3" strokeLinecap="round" />
    <path d="M26 13h12" stroke={GLY} strokeWidth="3" strokeLinecap="round" fill="none" />
    <g stroke={GLY} strokeWidth="2" opacity=".7"><line x1="28" y1="30" x2="29" y2="51" /><line x1="36" y1="30" x2="35" y2="51" /></g>
  </svg>
);

// Tiny sidebar glyphs (monochrome, tinted via currentColor)
const SideGlyph = ({ name }) => {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "home": return <svg width="15" height="15" viewBox="0 0 16 16"><path {...p} d="M2.5 7L8 2.5 13.5 7M4 6.2V13h8V6.2M6.5 13V9.5h3V13" /></svg>;
    case "docs": return <svg width="15" height="15" viewBox="0 0 16 16"><path {...p} d="M3 2.5h6l4 4V13.5H3z M9 2.5V6.5h4" /></svg>;
    case "media": return <svg width="15" height="15" viewBox="0 0 16 16"><rect {...p} x="2.5" y="3.5" width="11" height="9" rx="1.5" /><circle cx="6" cy="6.5" r="1.2" {...p} /><path {...p} d="M3 11l3-3 2.5 2.5L11 7.5l2 2.5" /></svg>;
    case "projects": return <svg width="15" height="15" viewBox="0 0 16 16"><path {...p} d="M2.5 5.5l3-3 2 2-3 3z M5.5 6.5l5 5 2-2-5-5 M3 13h3" /></svg>;
    case "transfers": return <svg width="15" height="15" viewBox="0 0 16 16"><path {...p} d="M8 2.5v7M5.5 7L8 9.5 10.5 7M3 11.5v1A1 1 0 0 0 4 13.5h8a1 1 0 0 0 1-1v-1" /></svg>;
    default: return null;
  }
};

// Menubar control-center glyphs
const TopGlyph = ({ name }) => {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "wifi": return <svg width="16" height="13" viewBox="0 0 18 14"><path {...p} d="M2 5a10 10 0 0 1 14 0" /><path {...p} d="M4.5 7.6a6.4 6.4 0 0 1 9 0" /><path {...p} d="M7 10.2a2.8 2.8 0 0 1 4 0" /><circle cx="9" cy="12" r="0.7" fill="currentColor" stroke="none" /></svg>;
    case "battery": return <svg width="26" height="13" viewBox="0 0 28 14"><rect {...p} x="1" y="2.5" width="22" height="9" rx="2.5" opacity=".5" /><rect x="3" y="4.5" width="15" height="5" rx="1.2" fill="currentColor" /><path d="M25 5v4a2.2 2.2 0 0 0 0-4z" fill="currentColor" opacity=".5" /></svg>;
    case "search": return <svg width="15" height="15" viewBox="0 0 16 16"><circle {...p} cx="7" cy="7" r="4.2" /><line {...p} x1="10.2" y1="10.2" x2="13.5" y2="13.5" /></svg>;
    case "control": return <svg width="16" height="15" viewBox="0 0 18 16"><rect {...p} x="2" y="2.5" width="14" height="4.6" rx="2.3" /><circle cx="6" cy="4.8" r="1.2" fill="currentColor" stroke="none" /><rect {...p} x="2" y="9" width="14" height="4.6" rx="2.3" /><circle cx="12" cy="11.3" r="1.2" fill="currentColor" stroke="none" /></svg>;
    default: return null;
  }
};

// Toolbar glyphs
const TbGlyph = ({ name }) => {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "back": return <svg width="16" height="16" viewBox="0 0 16 16"><path {...p} d="M10 3.5L5.5 8 10 12.5" /></svg>;
    case "fwd": return <svg width="16" height="16" viewBox="0 0 16 16"><path {...p} d="M6 3.5L10.5 8 6 12.5" /></svg>;
    case "grid": return <svg width="15" height="15" viewBox="0 0 16 16"><rect {...p} x="2.5" y="2.5" width="4.5" height="4.5" rx="1" /><rect {...p} x="9" y="2.5" width="4.5" height="4.5" rx="1" /><rect {...p} x="2.5" y="9" width="4.5" height="4.5" rx="1" /><rect {...p} x="9" y="9" width="4.5" height="4.5" rx="1" /></svg>;
    case "list": return <svg width="15" height="15" viewBox="0 0 16 16"><g {...p}><line x1="6" y1="4" x2="13.5" y2="4" /><line x1="6" y1="8" x2="13.5" y2="8" /><line x1="6" y1="12" x2="13.5" y2="12" /><circle cx="3" cy="4" r="0.8" fill="currentColor" /><circle cx="3" cy="8" r="0.8" fill="currentColor" /><circle cx="3" cy="12" r="0.8" fill="currentColor" /></g></svg>;
    case "upload": return <svg width="16" height="16" viewBox="0 0 16 16"><path {...p} d="M8 10.5V3M5 5.5L8 2.5 11 5.5M3 11v1.5A1 1 0 0 0 4 13.5h8a1 1 0 0 0 1-1V11" /></svg>;
    case "newfolder": return <svg width="16" height="16" viewBox="0 0 16 16"><path {...p} d="M2 4.5a1 1 0 0 1 1-1h3l1.3 1.3H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" /><line {...p} x1="8" y1="7" x2="8" y2="11" /><line {...p} x1="6" y1="9" x2="10" y2="9" /></svg>;
    case "search": return <svg width="14" height="14" viewBox="0 0 16 16"><circle {...p} cx="7" cy="7" r="4.2" /><line {...p} x1="10.2" y1="10.2" x2="13.5" y2="13.5" /></svg>;
    case "sidebar": return <svg width="16" height="16" viewBox="0 0 16 16"><rect {...p} x="2" y="3" width="12" height="10" rx="1.5" /><line {...p} x1="6" y1="3" x2="6" y2="13" /></svg>;
    case "info": return <svg width="16" height="16" viewBox="0 0 16 16"><circle {...p} cx="8" cy="8" r="5.5" /><circle cx="8" cy="5.4" r="0.8" fill="currentColor" /><line {...p} x1="8" y1="7.5" x2="8" y2="11" /></svg>;
    default: return null;
  }
};

/* ════════════════════════════════════════════════════════════════════════
   STYLESHEET
   ════════════════════════════════════════════════════════════════════════ */
const css = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

.os{
  --font:'Rajdhani',-apple-system,'Segoe UI',sans-serif;
  --mono:'Share Tech Mono',ui-monospace,Menlo,monospace;
  --accent:#36abca;
  font-family:var(--font);
  -webkit-font-smoothing:antialiased;
  position:fixed; inset:0; overflow:hidden;
}
/* SPEDA Mark VI — fluid-glass FUI. Liquid glass = whisper-white fill + deep
   frost + lit cyan rim + specular catch. Cyan accent; amber = folders /
   selection / timestamps. No grids, brackets, ticks or scanlines. */
.os[data-theme="dark"]{
  --accent:#36abca; --accent-bright:#5fcce6; --amber:#d99c44; --amber-bright:#f2b75c;
  --txt:#cadbe2; --txt2:#7a96a1; --txt3:#46626d;
  --sep:rgba(95,165,188,.14); --sep2:rgba(150,205,245,.24);
  --mat:rgba(190,215,235,.05); --mat-bar:rgba(10,16,26,.34); --mat-side:rgba(6,11,19,.32);
  --ctl:rgba(95,165,188,.08); --ctl-h:rgba(95,165,188,.16);
  --sheet:#e7f0f4;
  --shadow:inset 0 1px 0 0 rgba(255,255,255,.22),inset 0 -1px 0 0 rgba(255,255,255,.06),0 18px 50px rgba(0,0,0,.5);
  --menu:rgba(11,21,29,.5); --selrow:rgba(95,165,188,.06);
  --dock-gly:#8fdcef;
  --mb-brand-color:var(--accent-bright);
}
.os[data-theme="light"]{
  --accent:#1f7e99; --accent-bright:#36abca; --amber:#b9802f; --amber-bright:#d99c44;
  --txt:rgba(8,28,36,.9); --txt2:rgba(8,28,36,.68); --txt3:rgba(8,28,36,.45);
  --sep:rgba(40,90,110,.24); --sep2:rgba(40,110,140,.36);
  --mat:rgba(226,240,245,.7); --mat-bar:rgba(220,238,245,.82); --mat-side:rgba(214,232,238,.6);
  --ctl:rgba(40,90,110,.10); --ctl-h:rgba(40,90,110,.18);
  --sheet:#fff;
  --shadow:inset 0 1px 0 0 rgba(255,255,255,.7),inset 0 -1px 0 0 rgba(255,255,255,.3),0 18px 50px rgba(20,40,60,.22);
  --menu:rgba(230,242,246,.85); --selrow:rgba(40,90,110,.08);
  --dock-gly:var(--accent);
  --mb-brand-color:var(--accent);
  --desk-lbl-txt:var(--txt);
  --desk-lbl-bg:rgba(226,240,245,.75);
  --desk-lbl-border:.5px solid rgba(40,90,110,.2);
  --desk-lbl-bf:blur(8px);
  --desk-lbl-sel-txt:#fff;
}

/* ── Wallpaper — sleeping-system void: drifting petrol/teal pools, no grids ── */
.wallpaper{position:absolute;inset:0;z-index:0;overflow:hidden;}
.os[data-theme="dark"] .wallpaper{background:linear-gradient(160deg,#03070a 0%,#060d14 38%,#08131d 62%,#040a10 100%);}
.os[data-theme="light"] .wallpaper{background:linear-gradient(160deg,#dde9ef 0%,#e9f1f5 40%,#dae8ee 70%,#e6eef2 100%);}
.wallpaper::before{content:'';position:absolute;inset:-40%;pointer-events:none;
  animation:hbDrift 18s ease-in-out infinite alternate;will-change:transform;}
.os[data-theme="dark"] .wallpaper::before{
  background:
    radial-gradient(ellipse 42% 36% at 28% 26%,rgba(30,86,112,.5),transparent 62%),
    radial-gradient(ellipse 38% 34% at 74% 72%,rgba(18,58,80,.44),transparent 60%),
    radial-gradient(ellipse 26% 24% at 56% 42%,rgba(36,105,128,.22),transparent 65%);}
.os[data-theme="light"] .wallpaper::before{
  background:
    radial-gradient(ellipse 42% 36% at 28% 26%,rgba(120,185,210,.45),transparent 62%),
    radial-gradient(ellipse 38% 34% at 74% 72%,rgba(150,205,225,.4),transparent 60%),
    radial-gradient(ellipse 26% 24% at 56% 42%,rgba(180,150,90,.18),transparent 65%);}
@keyframes hbDrift{from{transform:translate3d(-2.5%,-2%,0) scale(1);}to{transform:translate3d(2.5%,2.5%,0) scale(1.07);}}
.wallpaper::after{content:'';position:absolute;inset:0;opacity:.04;
  background:url("data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");}

/* ── Menubar ── */
.menubar{position:absolute;top:0;left:0;right:0;height:${MENUBAR_H}px;z-index:9000;
  display:flex;align-items:center;gap:2px;padding:0 10px;color:var(--txt);
  background:var(--mat-bar);backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);
  border-bottom:.5px solid var(--sep);font-size:13px;}
.mb-brand{font-weight:700;font-size:14px;letter-spacing:.16em;padding:3px 11px 3px 12px;border-radius:5px;cursor:default;
  color:var(--mb-brand-color);text-shadow:0 0 12px color-mix(in srgb,var(--mb-brand-color) 60%,transparent);}
.mb-brand:hover,.mb-brand.open{background:var(--ctl-h);}
.mb-item{padding:3px 9px;border-radius:5px;cursor:default;white-space:nowrap;line-height:1;font-weight:500;letter-spacing:.04em;}
.mb-item.bold{font-weight:700;}
.mb-item:hover,.mb-item.open{background:var(--accent);color:#fff;}
.mb-right{margin-left:auto;display:flex;align-items:center;gap:3px;}
.mb-tray{display:flex;align-items:center;justify-content:center;padding:3px 6px;border-radius:5px;cursor:default;color:var(--txt2);}
.mb-tray:hover{background:var(--ctl-h);color:var(--txt);}
.mb-tray.arc{color:var(--accent-bright);filter:drop-shadow(0 0 4px color-mix(in srgb,var(--accent) 70%,transparent));animation:arcPulse 3.2s ease-in-out infinite;}
@keyframes arcPulse{0%,100%{opacity:.82;}50%{opacity:1;}}
.mb-clock{font-family:var(--mono);font-size:12px;padding:3px 6px;white-space:nowrap;letter-spacing:.06em;color:var(--txt);}

/* ── Dropdown menus ── */
.menu{position:absolute;top:${MENUBAR_H - 1}px;z-index:9500;min-width:200px;padding:5px;
  background:var(--menu);backdrop-filter:blur(40px) saturate(180%);-webkit-backdrop-filter:blur(40px) saturate(180%);
  border:.5px solid var(--sep2);border-radius:10px;box-shadow:var(--shadow);
  animation:menuIn .11s ease;color:var(--txt);font-size:13px;}
@keyframes menuIn{from{opacity:0;transform:translateY(-4px) scale(.99);}to{opacity:1;transform:none;}}
.menu-row{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:5px 9px;border-radius:6px;cursor:default;}
.menu-row:hover{background:var(--accent);color:#fff;}
.menu-row.disabled{opacity:.38;}
.menu-row.disabled:hover{background:transparent;color:var(--txt);}
.menu-key{font-size:12px;opacity:.7;}
.menu-sep{height:.5px;background:var(--sep);margin:5px 8px;}

/* ── Windows ── */
.win{position:absolute;display:flex;flex-direction:column;border-radius:11px;overflow:hidden;
  background:var(--mat);backdrop-filter:blur(50px) saturate(180%);-webkit-backdrop-filter:blur(50px) saturate(180%);
  border:.5px solid var(--sep2);box-shadow:var(--shadow);color:var(--txt);
  transition:box-shadow .2s,transform .26s cubic-bezier(.3,1.2,.5,1),opacity .26s;}
.win{animation:winOpen .26s cubic-bezier(.3,1.2,.5,1);}
@keyframes winOpen{from{opacity:0;transform:scale(.95);}to{opacity:1;transform:scale(1);}}
.win:not(.active){box-shadow:0 18px 48px rgba(0,0,0,.35);}
.win.min{transform:scale(.18) translateY(60vh);opacity:0;pointer-events:none;}
.win-bar{height:48px;display:flex;align-items:center;gap:12px;padding:0 0 0 14px;flex-shrink:0;
  border-bottom:.5px solid var(--sep);cursor:default;user-select:none;}
.win-bar.compact{height:38px;}
.win-title{flex:1;text-align:left;font-size:13px;font-weight:600;color:var(--txt2);}

/* Windows Window Controls */
.win-ctrls{display:flex;align-self:stretch;height:100%;margin-left:auto;}
.win-btn{width:46px;height:100%;display:flex;align-items:center;justify-content:center;
  background:transparent;border:none;color:var(--txt2);cursor:pointer;transition:background .1s,color .1s;}
.win-btn:hover{background:var(--ctl-h);color:var(--txt);}
.win-btn.close:hover{background:#e81123!important;color:#fff!important;}
.win-btn svg{width:10px;height:10px;display:block;}

.win-body{flex:1;display:flex;overflow:hidden;}

/* resize handles */
.rsz{position:absolute;z-index:5;}
.rsz-n{top:-3px;left:8px;right:8px;height:6px;cursor:ns-resize;}
.rsz-s{bottom:-3px;left:8px;right:8px;height:6px;cursor:ns-resize;}
.rsz-e{right:-3px;top:8px;bottom:8px;width:6px;cursor:ew-resize;}
.rsz-w{left:-3px;top:8px;bottom:8px;width:6px;cursor:ew-resize;}
.rsz-ne{top:-4px;right:-4px;width:12px;height:12px;cursor:nesw-resize;}
.rsz-nw{top:-4px;left:-4px;width:12px;height:12px;cursor:nwse-resize;}
.rsz-se{bottom:-4px;right:-4px;width:12px;height:12px;cursor:nwse-resize;}
.rsz-sw{bottom:-4px;left:-4px;width:12px;height:12px;cursor:nesw-resize;}

/* ── Finder toolbar ── */
.tb{flex:1;display:flex;align-items:center;gap:7px;min-width:0;}
.tb-btn{height:26px;min-width:28px;padding:0 7px;display:flex;align-items:center;justify-content:center;gap:5px;
  background:transparent;border:none;border-radius:6px;color:var(--txt2);cursor:pointer;font-family:var(--font);font-size:12.5px;}
.tb-btn:hover{background:var(--ctl-h);color:var(--txt);}
.tb-btn:disabled{opacity:.3;cursor:default;background:transparent;}
.segmented{display:flex;background:var(--ctl);border-radius:7px;padding:2px;gap:2px;}
.seg{width:30px;height:22px;display:flex;align-items:center;justify-content:center;border:none;background:transparent;border-radius:5px;color:var(--txt2);cursor:pointer;}
.seg.on{background:var(--ctl-h);color:var(--txt);box-shadow:0 1px 2px rgba(0,0,0,.15);}
.crumbs{flex:1;display:flex;align-items:center;gap:2px;min-width:0;overflow:hidden;}
.crumb{font-size:13px;font-weight:500;color:var(--txt);padding:2px 6px;border-radius:5px;border:none;background:transparent;cursor:pointer;font-family:var(--font);white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis;}
.crumb:hover{background:var(--ctl-h);}
.crumb.cur{color:var(--txt2);}
.crumb-sep{color:var(--txt3);font-size:11px;flex-shrink:0;}
.search-wrap{display:flex;align-items:center;gap:6px;height:26px;padding:0 8px;border-radius:7px;background:var(--ctl);
  width:34px;transition:width .25s ease;color:var(--txt2);overflow:hidden;}
.search-wrap.open,.search-wrap:focus-within{width:170px;}
.search-wrap input{flex:1;background:transparent;border:none;outline:none;color:var(--txt);font-family:var(--font);font-size:12.5px;min-width:0;}
.search-wrap input::placeholder{color:var(--txt3);}

/* ── Sidebar ── */
.sidebar{width:178px;flex-shrink:0;background:var(--mat-side);border-right:.5px solid var(--sep);
  padding:10px 0;overflow-y:auto;}
.side-head{font-size:11px;font-weight:600;color:var(--txt3);padding:6px 16px 4px;letter-spacing:.2px;}
.side-item{display:flex;align-items:center;gap:9px;padding:5px 10px 5px 18px;font-size:13px;color:var(--txt);cursor:pointer;
  border-radius:7px;margin:1px 8px;}
.side-item:hover{background:var(--ctl-h);}
.side-item.on{background:var(--accent);color:#fff;}
.side-item .gl{color:var(--accent);display:flex;flex-shrink:0;}
.side-item.on .gl{color:#fff;}
.side-tag{width:11px;height:11px;border-radius:50%;flex-shrink:0;}

/* ── File area ── */
.area{flex:1;overflow-y:auto;padding:14px;position:relative;}
.area::-webkit-scrollbar{width:9px;}
.area::-webkit-scrollbar-thumb{background:transparent;border-radius:5px;}
.area:hover::-webkit-scrollbar-thumb{background:var(--ctl-h);}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:10px;align-content:start;}
.fitem{display:flex;flex-direction:column;align-items:center;gap:7px;padding:10px 6px 8px;border-radius:9px;cursor:default;text-align:center;}
.fitem .ic{filter:drop-shadow(0 3px 5px rgba(0,0,0,.22));transition:transform .1s;}
.fitem:hover{background:var(--ctl);}
.fitem.sel{background:color-mix(in srgb,var(--amber) 24%,transparent);}
.fname{font-size:12px;line-height:1.25;color:var(--txt);max-width:88px;word-break:break-word;padding:1px 5px;border-radius:4px;}
.fitem.sel .fname{background:var(--amber);color:#1b1206;}

.list{display:flex;flex-direction:column;}
.lhead{display:flex;align-items:center;gap:10px;padding:4px 10px;font-size:11px;color:var(--txt3);border-bottom:.5px solid var(--sep);font-weight:600;position:sticky;top:-14px;}
.lrow{display:flex;align-items:center;gap:10px;padding:5px 10px;border-radius:6px;cursor:default;font-size:13px;}
.lrow:hover{background:var(--ctl);}
.lrow.sel{background:var(--amber);color:#1b1206;}
.lrow .lname{flex:1;display:flex;align-items:center;gap:9px;min-width:0;}
.lrow .lname span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.lrow .lmeta{font-family:var(--mono);font-size:11px;color:var(--txt3);flex-shrink:0;width:74px;text-align:right;}
.lrow.sel .lmeta{color:rgba(27,18,6,.72);}
.empty{text-align:center;margin-top:64px;color:var(--txt3);font-size:13px;}

/* ── Info pane ── */
.info{width:218px;flex-shrink:0;background:var(--mat-side);border-left:.5px solid var(--sep);padding:18px 16px;overflow-y:auto;display:flex;flex-direction:column;gap:12px;}
.info-ic{display:flex;justify-content:center;margin-bottom:2px;filter:drop-shadow(0 5px 10px rgba(0,0,0,.28));}
.info-name{text-align:center;font-size:14px;font-weight:600;word-break:break-word;}
.info-row{display:flex;justify-content:space-between;gap:12px;font-size:12px;}
.info-k{color:var(--txt3);}
.info-v{color:var(--txt2);text-align:right;}
.info-sep{height:.5px;background:var(--sep);}
.info-pre{font-family:var(--mono);font-size:11px;line-height:1.55;color:var(--txt2);background:var(--ctl);border-radius:8px;padding:10px;white-space:pre-wrap;word-break:break-word;max-height:200px;overflow-y:auto;}

/* ── Status bar ── */
.statusbar{height:24px;flex-shrink:0;border-top:.5px solid var(--sep);display:flex;align-items:center;justify-content:center;gap:14px;font-size:11px;color:var(--txt3);background:var(--mat-side);}

/* ── Drop overlay & rubber band ── */
.drop{position:absolute;inset:8px;border:2px dashed var(--accent);border-radius:12px;
  background:color-mix(in srgb,var(--accent) 10%,transparent);display:flex;align-items:center;justify-content:center;
  z-index:60;pointer-events:none;color:var(--accent);font-size:16px;font-weight:600;animation:menuIn .15s ease;}
.band{position:fixed;z-index:8000;border:1px solid var(--accent);background:color-mix(in srgb,var(--accent) 18%,transparent);pointer-events:none;border-radius:2px;}

/* ── Context menu ── */
.ctx{position:fixed;z-index:9700;min-width:184px;padding:5px;background:var(--menu);
  backdrop-filter:blur(40px) saturate(180%);-webkit-backdrop-filter:blur(40px) saturate(180%);
  border:.5px solid var(--sep2);border-radius:10px;box-shadow:var(--shadow);color:var(--txt);font-size:13px;animation:menuIn .1s ease;}
.ctx-row{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:5px 9px;border-radius:6px;cursor:default;}
.ctx-row:hover{background:var(--accent);color:#fff;}
.ctx-row.danger{color:#ff453a;}
.ctx-row.danger:hover{background:#ff453a;color:#fff;}
.ctx-row.disabled{opacity:.4;}
.ctx-row.disabled:hover{background:transparent;color:var(--txt);}
.ctx-sep{height:.5px;background:var(--sep);margin:5px 8px;}

/* ── Dialog ── */
.dialog-bg{position:fixed;inset:0;z-index:9800;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35);backdrop-filter:blur(3px);}
.dialog{width:330px;padding:22px;border-radius:14px;background:var(--mat);backdrop-filter:blur(50px) saturate(180%);-webkit-backdrop-filter:blur(50px) saturate(180%);border:.5px solid var(--sep2);box-shadow:var(--shadow);color:var(--txt);animation:winOpen .18s ease;}
.dialog h3{font-size:14px;font-weight:600;margin-bottom:4px;}
.dialog p{font-size:12px;color:var(--txt2);margin-bottom:14px;}
.dialog input{width:100%;padding:8px 11px;border-radius:8px;border:1px solid var(--sep2);background:var(--sheet);color:#111;font-family:var(--font);font-size:13px;outline:none;}
.os[data-theme="dark"] .dialog input{background:rgba(255,255,255,.07);color:var(--txt);}
.dialog input:focus{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 25%,transparent);}
.dialog-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:18px;}
.btn{padding:7px 16px;border-radius:8px;font-family:var(--font);font-size:13px;font-weight:500;cursor:pointer;border:none;}
.btn.sec{background:var(--ctl);color:var(--txt);}
.btn.sec:hover{background:var(--ctl-h);}
.btn.pri{background:var(--accent);color:#fff;}
.btn.pri:hover{filter:brightness(1.08);}

/* ── Quick Look ── */
.ql-bg{position:fixed;inset:0;z-index:9600;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.4);backdrop-filter:blur(6px);animation:menuIn .15s ease;}
.ql{width:min(560px,72vw);max-height:78vh;border-radius:14px;overflow:hidden;background:var(--mat);backdrop-filter:blur(50px) saturate(180%);-webkit-backdrop-filter:blur(50px) saturate(180%);border:.5px solid var(--sep2);box-shadow:var(--shadow);display:flex;flex-direction:column;animation:winOpen .2s cubic-bezier(.3,1.2,.5,1);}
.ql-bar{height:42px;display:flex;align-items:center;padding:0 0 0 14px;border-bottom:.5px solid var(--sep);}
.ql-bar .t{flex:1;text-align:left;font-size:13px;font-weight:600;color:var(--txt2);}
.ql-body{padding:26px;overflow:auto;color:var(--txt);}
.ql-pre{font-family:var(--mono);font-size:13px;line-height:1.6;white-space:pre-wrap;word-break:break-word;}
.ql-blank{display:flex;flex-direction:column;align-items:center;gap:14px;padding:30px;color:var(--txt2);}

/* ── Dock ── */
.dock-wrap{position:absolute;bottom:8px;left:0;right:0;z-index:8500;display:flex;justify-content:center;pointer-events:none;}
.dock{display:flex;align-items:flex-end;gap:6px;padding:7px 9px;pointer-events:auto;
  background:var(--mat);backdrop-filter:blur(40px) saturate(180%);-webkit-backdrop-filter:blur(40px) saturate(180%);
  border:.5px solid var(--sep2);border-radius:20px;box-shadow:0 14px 40px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.10);}
.dock-item{position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:transform .14s cubic-bezier(.3,1.2,.5,1);transform-origin:bottom center;will-change:transform;}
.dock-ic{width:54px;height:54px;}
.dock-ic svg{filter:drop-shadow(0 0 5px rgba(95,204,230,.40));}
.dock-item.mini .dock-ic{width:44px;height:44px;}
.dock-dot{width:4px;height:4px;border-radius:50%;background:var(--txt2);margin-top:3px;opacity:0;}
.dock-item.run .dock-dot{opacity:1;}
.dock-tip{position:absolute;bottom:100%;margin-bottom:10px;padding:4px 10px;border-radius:7px;font-size:12px;white-space:nowrap;
  background:var(--menu);backdrop-filter:blur(20px);border:.5px solid var(--sep2);box-shadow:var(--shadow);color:var(--txt);
  opacity:0;transform:translateY(4px);transition:opacity .12s,transform .12s;pointer-events:none;}
.dock-item:hover .dock-tip{opacity:1;transform:translateY(0);}
.dock-sep{width:.5px;height:42px;background:var(--sep2);margin:0 5px;align-self:center;}
@keyframes bounce{0%,100%{transform:translateY(0);}40%{transform:translateY(-22px);}70%{transform:translateY(-6px);}}
.dock-item.bounce{animation:bounce .7s ease;}

/* ── Desktop icons ── */
.desk-ic{position:absolute;width:84px;display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 6px;border-radius:10px;cursor:grab;user-select:none;transition:left .18s cubic-bezier(.3,1,.5,1),top .18s cubic-bezier(.3,1,.5,1);}
.desk-ic:active{cursor:grabbing;}
.desk-ic.drag{transition:none;z-index:10;}
.desk-ic:hover{background:rgba(150,205,245,.10);}
.desk-ic.sel{background:color-mix(in srgb,var(--accent) 22%,transparent);}
.desk-ic svg{filter:drop-shadow(0 5px 10px rgba(0,0,0,.45));}
.desk-ic .lbl{font-size:12px;color:var(--desk-lbl-txt, #eaf6fa);text-align:center;line-height:1.3;max-width:84px;word-break:break-word;background:var(--desk-lbl-bg, rgba(4,10,16,.42));padding:1px 7px;border-radius:6px;border:var(--desk-lbl-border, none);backdrop-filter:var(--desk-lbl-bf, none);}
.desk-ic.sel .lbl{background:var(--accent);color:var(--desk-lbl-sel-txt, #04141a);}

/* ── Spotlight ── */
.spot-bg{position:absolute;inset:0;z-index:9900;display:flex;flex-direction:column;align-items:center;padding-top:18vh;background:rgba(0,0,0,.06);}
.spot{width:min(620px,86vw);border-radius:16px;overflow:hidden;background:var(--menu);
  backdrop-filter:blur(50px) saturate(180%);-webkit-backdrop-filter:blur(50px) saturate(180%);
  border:.5px solid var(--sep2);box-shadow:0 40px 100px rgba(0,0,0,.5);animation:spotIn .18s cubic-bezier(.3,1.1,.5,1);}
@keyframes spotIn{from{opacity:0;transform:translateY(-12px) scale(.97);}to{opacity:1;transform:none;}}
.spot-input{display:flex;align-items:center;gap:14px;padding:16px 20px;}
.spot-input .gl{color:var(--txt3);display:flex;}
.spot-input input{flex:1;background:transparent;border:none;outline:none;color:var(--txt);font-family:var(--font);font-size:22px;font-weight:300;}
.spot-input input::placeholder{color:var(--txt3);}
.spot-res{border-top:.5px solid var(--sep);max-height:46vh;overflow-y:auto;padding:6px;}
.spot-row{display:flex;align-items:center;gap:12px;padding:8px 12px;border-radius:9px;cursor:pointer;color:var(--txt);}
.spot-row.on{background:var(--accent);color:#fff;}
.spot-row .sp-meta{margin-left:auto;font-size:11px;font-family:var(--mono);opacity:.6;}
.spot-empty{padding:18px;text-align:center;color:var(--txt3);font-size:13px;}

/* ── Login ── */
.login{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10;animation:fadeIn .5s ease;}
@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
.login-clock{position:absolute;top:14vh;text-align:center;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.4);}
.login-clock .d{font-size:19px;font-weight:500;opacity:.92;letter-spacing:.3px;}
.login-clock .t{font-size:88px;font-weight:600;line-height:1;letter-spacing:-2px;margin-top:2px;}
.login-card{display:flex;flex-direction:column;align-items:center;gap:14px;animation:fadeUp .6s ease both;}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:none;}}
.login-av{width:88px;height:88px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(150deg,#5fcce6,#1d5d70);color:#04141a;font-size:34px;font-weight:700;letter-spacing:.08em;
  box-shadow:0 10px 30px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.3);}
.login-user{color:#fff;font-size:20px;font-weight:500;text-shadow:0 1px 8px rgba(0,0,0,.5);}
.login-pwd{display:flex;align-items:center;gap:8px;width:230px;padding:8px 8px 8px 16px;border-radius:20px;
  background:rgba(255,255,255,.22);backdrop-filter:blur(14px);border:.5px solid rgba(255,255,255,.3);}
.login-pwd input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-family:var(--font);font-size:14px;}
.login-pwd input::placeholder{color:rgba(255,255,255,.7);}
.login-go{width:30px;height:30px;border-radius:50%;border:none;background:rgba(255,255,255,.85);color:#222;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;}
.login-go:hover{background:#fff;}
.login-hint{color:rgba(255,255,255,.7);font-size:12px;height:16px;}
.login-err{color:#ff6b6b;font-size:12px;height:16px;font-family:var(--mono);}
.login-brand{position:absolute;bottom:6vh;display:flex;flex-direction:column;align-items:center;gap:3px;color:#fff;}
.login-brand .n{font-size:15px;font-weight:600;letter-spacing:.5px;text-shadow:0 1px 8px rgba(0,0,0,.5);}
.login-brand .s{font-size:11px;font-family:var(--mono);letter-spacing:2px;text-transform:uppercase;opacity:.65;}
.shake{animation:shake .35s;}
@keyframes shake{0%,100%{transform:translateX(0);}20%,60%{transform:translateX(-7px);}40%,80%{transform:translateX(7px);}}
`;

/* ════════════════════════════════════════════════════════════════════════
   Clock
   ════════════════════════════════════════════════════════════════════════ */
function useNow() {
  const [t, setT] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

/* ════════════════════════════════════════════════════════════════════════
   Menubar
   ════════════════════════════════════════════════════════════════════════ */
function MenuBar({ user, theme, onToggleTheme, onLogout, onNewFinder, onAbout, onSpotlight }) {
  const { lang, setLang, t } = useLanguage();
  const now = useNow();
  const [open, setOpen] = useState(null);
  const ref = useRef();

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(null); };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  const Row = ({ label, k, on, disabled }) => (
    <div className={`menu-row${disabled ? " disabled" : ""}`} onClick={() => { if (disabled) return; on?.(); setOpen(null); }}>
      <span>{label}</span>{k && <span className="menu-key">{k}</span>}
    </div>
  );
  const Sep = () => <div className="menu-sep" />;

  const menus = {
    apple: (
      <div className="menu" style={{ left: 10 }}>
        <Row label={t("about_reserve")} on={onAbout} />
        <Sep />
        <Row label={t("system_settings")} disabled />
        <Sep />
        <Row label={t("lock_screen")} k="⌃⌘Q" on={onLogout} />
        <Row label={`${t("log_out")} ${user}…`} k="⇧⌘Q" on={onLogout} />
      </div>
    ),
    finder: (
      <div className="menu" style={{ left: 56 }}>
        <Row label={t("about_finder")} on={onAbout} />
        <Sep />
        <Row label={t("preferences")} disabled />
        <Sep />
        <Row label={t("empty_trash")} disabled />
      </div>
    ),
    file: (
      <div className="menu" style={{ left: 96 }}>
        <Row label={t("new_finder_window")} k="⌘N" on={onNewFinder} />
        <Row label={t("new_folder")} k="⇧⌘N" disabled />
        <Sep />
        <Row label={t("find")} k="⌘F" on={onSpotlight} />
      </div>
    ),
    view: (
      <div className="menu" style={{ left: 180 }}>
        <Row label={theme === "dark" ? t("light_appearance") : t("dark_appearance")} on={onToggleTheme} />
        <Sep />
        <Row label={t("show_spotlight")} k="⌘Space" on={onSpotlight} />
      </div>
    ),
    lang: (
      <div className="menu" style={{ right: 80, minWidth: 140 }}>
        <Row label="Türkçe (TR)" on={() => setLang("tr")} />
        <Row label="English (EN)" on={() => setLang("en")} />
      </div>
    ),
  };

  const item = (id, label, bold) => (
    <span
      className={`mb-item${bold ? " bold" : ""}${open === id ? " open" : ""}`}
      onMouseDown={(e) => { e.stopPropagation(); setOpen(open === id ? null : id); }}
      onMouseEnter={() => open && setOpen(id)}
    >{label}</span>
  );

  return (
    <div className="menubar" ref={ref}>
      <span className={`mb-brand${open === "apple" ? " open" : ""}`}
        onMouseDown={(e) => { e.stopPropagation(); setOpen(open === "apple" ? null : "apple"); }}
        onMouseEnter={() => open && setOpen("apple")}>H.İ.S.A.R.</span>
      {item("file", t("file"))}
      {item("edit", t("edit"))}
      {item("view", t("view"))}
      {item("go", t("go"))}
      {open && menus[open]}

      <div className="mb-right">
        <span className="mb-tray arc" title="System nominal"><ArcReactor /></span>
        <span className="mb-tray" title={t("find")} onMouseDown={(e) => { e.stopPropagation(); onSpotlight(); }}><TopGlyph name="search" /></span>
        <span
          className={`mb-item lang-toggle${open === "lang" ? " open" : ""}`}
          onMouseDown={(e) => { e.stopPropagation(); setOpen(open === "lang" ? null : "lang"); }}
          onMouseEnter={() => open && setOpen("lang")}
          style={{ fontWeight: 600, fontSize: 12, fontFamily: "var(--mono)", cursor: "default", padding: "3px 8px", borderRadius: "5px", textShadow: "none" }}
        >
          {lang.toUpperCase()}
        </span>
        <span className="mb-clock">
          {now.toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase()}
          {"  "}
          {now.toLocaleTimeString(lang === "tr" ? "tr-TR" : "en-GB", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Window shell (drag, resize, focus, traffic lights)
   ════════════════════════════════════════════════════════════════════════ */
function WindowShell({ win, active, compact, title, toolbar, onFocus, onClose, onMinimize, onZoom, onChange, children }) {
  const MINW = 460, MINH = 320;

  const startDrag = useCallback((e) => {
    if (e.button !== 0) return;
    if (e.target.closest("button, input, .no-drag")) return;
    onFocus();
    const sx = e.clientX, sy = e.clientY, ox = win.x, oy = win.y;
    const move = (ev) => onChange({ maximized: false, x: ox + (ev.clientX - sx), y: Math.max(MENUBAR_H, oy + (ev.clientY - sy)) });
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
  }, [win.x, win.y, onChange, onFocus]);

  const startResize = (dir) => (e) => {
    e.preventDefault(); e.stopPropagation(); onFocus();
    const s = { mx: e.clientX, my: e.clientY, x: win.x, y: win.y, w: win.w, h: win.h };
    const move = (ev) => {
      let { x, y, w, h } = s;
      const dx = ev.clientX - s.mx, dy = ev.clientY - s.my;
      if (dir.includes("e")) w = Math.max(MINW, s.w + dx);
      if (dir.includes("s")) h = Math.max(MINH, s.h + dy);
      if (dir.includes("w")) { w = Math.max(MINW, s.w - dx); x = s.x + (s.w - w); }
      if (dir.includes("n")) { h = Math.max(MINH, s.h - dy); y = Math.max(MENUBAR_H, s.y + (s.h - h)); }
      onChange({ x, y, w, h, maximized: false });
    };
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
  };

  return (
    <div
      className={`win${active ? " active" : ""}${win.minimized ? " min" : ""}`}
      style={{ left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z }}
      onMouseDown={onFocus}
    >
      <div className={`win-bar${compact ? " compact" : ""}`} onMouseDown={startDrag} onDoubleClick={onZoom}>
        {compact ? <div className="win-title">{title}</div> : toolbar}
        <div className="win-ctrls no-drag" onMouseDown={(e) => e.stopPropagation()}>
          <button className="win-btn" title="Minimize" onClick={onMinimize}>
            <svg viewBox="0 0 10 10"><line x1="1" y1="9" x2="9" y2="9" stroke="currentColor" strokeWidth="1.2" fill="none" /></svg>
          </button>
          <button className="win-btn" title={win.maximized ? "Restore" : "Maximize"} onClick={onZoom}>
            {win.maximized ? (
              <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="1.5" y="3.5" width="5" height="5" />
                <path d="M3.5 3.5V1.5h5v5H6.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="1.5" y="1.5" width="7" height="7" /></svg>
            )}
          </button>
          <button className="win-btn close" title="Close" onClick={onClose}>
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" /></svg>
          </button>
        </div>
      </div>
      <div className="win-body">{children}</div>
      {["n", "s", "e", "w", "ne", "nw", "se", "sw"].map((d) => (
        <div key={d} className={`rsz rsz-${d}`} onMouseDown={startResize(d)} />
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Finder window
   ════════════════════════════════════════════════════════════════════════ */
const SIDEBAR = [
  { glyph: "home", label: "Home", path: "/" },
  { glyph: "docs", label: "Documents", path: "/Documents" },
  { glyph: "media", label: "Media", path: "/Media" },
  { glyph: "projects", label: "Projects", path: "/Projects" },
  { glyph: "transfers", label: "Transfers", path: "/Transfers" },
];

function FinderWindow({ win, active, fs, setFs, onFocus, onClose, onMinimize, onZoom, onChange, onOpenText, onNewFinder }) {
  const { t, lang } = useLanguage();
  const [cwd, setCwd] = useState(win.initPath || "/");
  const [history, setHistory] = useState([win.initPath || "/"]);
  const [hi, setHi] = useState(0);
  const [sel, setSel] = useState(() => new Set());
  const [anchor, setAnchor] = useState(null);
  const [view, setView] = useState("grid");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [ctx, setCtx] = useState(null);
  const [dlg, setDlg] = useState(null);
  const [band, setBand] = useState(null);
  const [ql, setQl] = useState(null);
  const fileInput = useRef();
  const areaRef = useRef();

  const dir = fs[cwd];
  const items = useMemo(() => {
    const ch = (dir?.children || [])
      .map((name) => ({ name, node: fs[joinPath(cwd, name)] }))
      .filter((x) => x.node)
      .filter((x) => !query || x.name.toLowerCase().includes(query.toLowerCase()));
    ch.sort((a, b) => {
      const ad = a.node.type === "dir", bd = b.node.type === "dir";
      if (ad !== bd) return ad ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return ch;
  }, [fs, cwd, dir, query]);

  // ── navigation ──
  const navigate = (path) => {
    if (!fs[path] || fs[path].type !== "dir") return;
    const h = [...history.slice(0, hi + 1), path];
    setHistory(h); setHi(h.length - 1); setCwd(path); setSel(new Set()); setAnchor(null); setQuery("");
  };
  const goBack = () => { if (hi > 0) { setHi(hi - 1); setCwd(history[hi - 1]); setSel(new Set()); } };
  const goFwd = () => { if (hi < history.length - 1) { setHi(hi + 1); setCwd(history[hi + 1]); setSel(new Set()); } };

  const openItem = (name) => {
    const path = joinPath(cwd, name);
    const node = fs[path];
    if (!node) return;
    if (node.type === "dir") navigate(path);
    else if (TEXT_EXTS.includes((node.ext || "").toLowerCase())) onOpenText(path);
    else setQl(name);
  };

  // ── filesystem ops (functional updates → safe with shared fs) ──
  const doMkdir = (name) => {
    const nm = name.trim(); if (!nm) return;
    const path = joinPath(cwd, nm);
    setFs((prev) => {
      if (prev[path]) return prev;
      return { ...prev, [cwd]: { ...prev[cwd], children: [...prev[cwd].children, nm] }, [path]: { type: "dir", children: [] } };
    });
  };
  const doRename = (oldName, newName) => {
    const nm = newName.trim(); if (!nm || nm === oldName) return;
    setFs((prev) => {
      const oldPath = joinPath(cwd, oldName), newPath = joinPath(cwd, nm);
      if (prev[newPath]) return prev;
      const next = { ...prev };
      // move subtree (rename path prefixes)
      Object.keys(prev).forEach((k) => {
        if (k === oldPath || k.startsWith(oldPath + "/")) {
          const nk = newPath + k.slice(oldPath.length);
          next[nk] = prev[k];
          delete next[k];
        }
      });
      next[cwd] = { ...prev[cwd], children: prev[cwd].children.map((c) => (c === oldName ? nm : c)) };
      return next;
    });
    setSel(new Set([nm]));
  };
  const doDelete = (names) => {
    if (!names.length) return;
    setFs((prev) => {
      const next = { ...prev };
      names.forEach((name) => {
        const path = joinPath(cwd, name);
        Object.keys(prev).forEach((k) => { if (k === path || k.startsWith(path + "/")) delete next[k]; });
      });
      next[cwd] = { ...prev[cwd], children: prev[cwd].children.filter((c) => !names.includes(c)) };
      return next;
    });
    setSel(new Set());
  };
  const doUpload = (files) => {
    setFs((prev) => {
      const next = { ...prev };
      const children = [...prev[cwd].children];
      Array.from(files).forEach((file) => {
        const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
        if (!children.includes(file.name)) children.push(file.name);
        next[joinPath(cwd, file.name)] = { type: "file", size: fmtBytes(file.size), modified: "Just now", content: null, ext };
      });
      next[cwd] = { ...prev[cwd], children };
      return next;
    });
    setDragOver(false);
  };

  // ── selection ──
  const clickItem = (e, name, idx) => {
    e.stopPropagation();
    if (e.metaKey || e.ctrlKey) {
      const n = new Set(sel); n.has(name) ? n.delete(name) : n.add(name); setSel(n); setAnchor(idx);
    } else if (e.shiftKey && anchor != null) {
      const [a, b] = [anchor, idx].sort((x, y) => x - y);
      const n = new Set(); for (let i = a; i <= b; i++) n.add(items[i].name); setSel(n);
    } else { setSel(new Set([name])); setAnchor(idx); }
  };

  const onAreaDown = (e) => {
    if (e.button !== 0 || e.target.closest(".fitem,.lrow,.ctx,.lhead")) return;
    setSel(new Set()); setAnchor(null); setCtx(null);
    const sx = e.clientX, sy = e.clientY;
    const move = (ev) => {
      const x = Math.min(sx, ev.clientX), y = Math.min(sy, ev.clientY);
      const w = Math.abs(ev.clientX - sx), h = Math.abs(ev.clientY - sy);
      setBand({ x, y, w, h });
      if (w < 3 && h < 3) return;
      const r = { left: x, top: y, right: x + w, bottom: y + h };
      const next = new Set();
      areaRef.current?.querySelectorAll("[data-name]").forEach((el) => {
        const b = el.getBoundingClientRect();
        if (!(b.right < r.left || b.left > r.right || b.bottom < r.top || b.top > r.bottom)) next.add(el.getAttribute("data-name"));
      });
      setSel(next);
    };
    const up = () => { setBand(null); document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
  };

  const moveSel = (key) => {
    if (!items.length) return;
    const cur = sel.size ? items.findIndex((i) => i.name === [...sel][sel.size - 1]) : -1;
    const delta = key === "ArrowRight" || key === "ArrowDown" ? 1 : -1;
    const ni = Math.max(0, Math.min(items.length - 1, cur < 0 ? 0 : cur + delta));
    setSel(new Set([items[ni].name])); setAnchor(ni);
  };

  // ── keyboard (only when this window is active and not typing) ──
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (dlg) return;
      if (e.key === "Escape") { setCtx(null); setQl(null); return; }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") { e.preventDefault(); setSel(new Set(items.map((i) => i.name))); return; }
      if (e.key === "Delete" || e.key === "Backspace") { if (sel.size) { e.preventDefault(); doDelete([...sel]); } return; }
      if (e.key === " ") { if (sel.size === 1) { e.preventDefault(); setQl((q) => (q ? null : [...sel][0])); } return; }
      if (e.key === "Enter") { if (sel.size === 1) openItem([...sel][0]); return; }
      if (["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(e.key)) { e.preventDefault(); moveSel(e.key); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, sel, items, dlg]);

  const selName = sel.size === 1 ? [...sel][0] : null;
  const selNode = selName ? fs[joinPath(cwd, selName)] : null;
  const crumbs = cwd === "/" ? [{ label: t("home"), path: "/" }] : [{ label: t("home"), path: "/" }, ...cwd.slice(1).split("/").map((p, i, arr) => {
    const translated = t(p.toLowerCase());
    return { label: translated !== p.toLowerCase() ? translated : p, path: "/" + arr.slice(0, i + 1).join("/") };
  })];

  // ── toolbar ──
  const toolbar = (
    <div className="tb">
      <button className="tb-btn" onClick={goBack} disabled={hi === 0}><TbGlyph name="back" /></button>
      <button className="tb-btn" onClick={goFwd} disabled={hi === history.length - 1}><TbGlyph name="fwd" /></button>
      <button className="tb-btn" title={t("sidebar")} onClick={() => setShowSidebar((v) => !v)}><TbGlyph name="sidebar" /></button>
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <span key={c.path} style={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
            {i > 0 && <span className="crumb-sep">›</span>}
            <button className={`crumb${i === crumbs.length - 1 ? " cur" : ""}`} onClick={() => navigate(c.path)}>{c.label}</button>
          </span>
        ))}
      </div>
      <div className="segmented">
        <button className={`seg${view === "grid" ? " on" : ""}`} onClick={() => setView("grid")}><TbGlyph name="grid" /></button>
        <button className={`seg${view === "list" ? " on" : ""}`} onClick={() => setView("list")}><TbGlyph name="list" /></button>
      </div>
      <button className="tb-btn" title={t("get_info")} onClick={() => setShowInfo((v) => !v)}><TbGlyph name="info" /></button>
      <button className="tb-btn" title={t("upload")} onClick={() => fileInput.current?.click()}><TbGlyph name="upload" /></button>
      <button className="tb-btn" title={t("new_folder")} onClick={() => setDlg({ type: "mkdir", value: t("untitled_folder") })}><TbGlyph name="newfolder" /></button>
      <div className={`search-wrap${searchOpen || query ? " open" : ""}`}>
        <TbGlyph name="search" />
        <input placeholder={t("search")} value={query} onFocus={() => setSearchOpen(true)} onBlur={() => setSearchOpen(false)} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <input ref={fileInput} type="file" multiple style={{ display: "none" }} onChange={(e) => doUpload(e.target.files)} />
    </div>
  );

  return (
    <>
      <WindowShell win={win} active={active} title="Finder" toolbar={toolbar}
        onFocus={onFocus} onClose={onClose} onMinimize={onMinimize} onZoom={onZoom} onChange={onChange}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOver(false); }}
          onDrop={(e) => { e.preventDefault(); doUpload(e.dataTransfer.files); }}>
          <div className="win-body" style={{ flex: 1 }}>
            {showSidebar && (
              <div className="sidebar no-drag">
                <div className="side-head">{t("favorites")}</div>
                {SIDEBAR.map((s) => (
                  <div key={s.path} className={`side-item${cwd === s.path ? " on" : ""}`} onClick={() => navigate(s.path)}>
                    <span className="gl"><SideGlyph name={s.glyph} /></span>{t(s.label.toLowerCase())}
                  </div>
                ))}
                <div className="side-head" style={{ marginTop: 8 }}>{t("tags")}</div>
                {[["#ff5f57", "Red"], ["#febc2e", "Orange"], ["#28c840", "Green"], ["#0a84ff", "Blue"]].map(([c, n]) => (
                  <div key={n} className="side-item"><span className="side-tag" style={{ background: c }} />{t(n.toLowerCase())}</div>
                ))}
              </div>
            )}

            <div className="area" ref={areaRef} onMouseDown={onAreaDown}
              onContextMenu={(e) => { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY, target: null }); }}>
              {items.length === 0 ? (
                <div className="empty">{query ? t("no_matching_items") : t("empty_folder")}</div>
              ) : view === "grid" ? (
                <div className="grid">
                  {items.map(({ name, node }, idx) => (
                    <div key={name} data-name={name} className={`fitem${sel.has(name) ? " sel" : ""}`}
                      onClick={(e) => clickItem(e, name, idx)}
                      onDoubleClick={() => openItem(name)}
                      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (!sel.has(name)) setSel(new Set([name])); setAnchor(idx); setCtx({ x: e.clientX, y: e.clientY, target: name }); }}>
                      <div className="ic"><ItemIcon node={node} s={52} /></div>
                      <div className="fname">{name}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="list">
                  <div className="lhead"><span style={{ flex: 1 }}>{t("name")}</span><span style={{ width: 74, textAlign: "right" }}>{t("size")}</span><span style={{ width: 90, textAlign: "right" }}>{t("modified")}</span></div>
                  {items.map(({ name, node }, idx) => (
                    <div key={name} data-name={name} className={`lrow${sel.has(name) ? " sel" : ""}`}
                      onClick={(e) => clickItem(e, name, idx)}
                      onDoubleClick={() => openItem(name)}
                      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (!sel.has(name)) setSel(new Set([name])); setAnchor(idx); setCtx({ x: e.clientX, y: e.clientY, target: name }); }}>
                      <span className="lname"><ItemIcon node={node} s={18} /><span>{name}</span></span>
                      <span className="lmeta">{node.type === "dir" ? "--" : node.size}</span>
                      <span className="lmeta" style={{ width: 90 }}>{node.modified || "--"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {showInfo && selNode && (
              <div className="info no-drag">
                <div className="info-ic"><ItemIcon node={selNode} s={64} /></div>
                <div className="info-name">{selName}</div>
                <div className="info-sep" />
                <div className="info-row"><span className="info-k">{t("kind")}</span><span className="info-v">{selNode.type === "dir" ? t("folder") : `${(selNode.ext || "file").toUpperCase()} ${t("document")}`}</span></div>
                {selNode.type === "dir" ? (
                  <div className="info-row"><span className="info-k">{t("items")}</span><span className="info-v">{selNode.children.length}</span></div>
                ) : (
                  <div className="info-row"><span className="info-k">{t("size")}</span><span className="info-v">{selNode.size}</span></div>
                )}
                {selNode.modified && <div className="info-row"><span className="info-k">{t("modified")}</span><span className="info-v" style={{ color: "var(--amber-bright)", fontFamily: "var(--mono)" }}>{selNode.modified}</span></div>}
                <div className="info-row"><span className="info-k">{t("where")}</span><span className="info-v">{cwd}</span></div>
                {selNode.content && (<><div className="info-sep" /><div className="info-pre">{selNode.content}</div></>)}
              </div>
            )}
          </div>

          <div className="statusbar">
            <span>
              {lang === "tr"
                ? `${items.length} ${t("items")}${sel.size ? `, ${sel.size} ${t("selected")}` : ""}`
                : `${items.length} ${items.length === 1 ? t("item") : t("items")}${sel.size ? `, ${sel.size} ${t("selected")}` : ""}`}
            </span>
            <span style={{ fontFamily: "var(--mono)" }}>sandbox:{cwd}</span>
          </div>

          {dragOver && <div className="drop">{t("drop_to_upload")}</div>}
        </div>
      </WindowShell>

      {/* rubber band */}
      {band && <div className="band" style={{ left: band.x, top: band.y, width: band.w, height: band.h }} />}

      {/* context menu */}
      {ctx && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 9650 }} onMouseDown={() => setCtx(null)} onContextMenu={(e) => { e.preventDefault(); setCtx(null); }} />
          <div className="ctx" style={{ left: Math.min(ctx.x, window.innerWidth - 200), top: Math.min(ctx.y, window.innerHeight - 220) }}>
            {ctx.target ? (
              <>
                <div className="ctx-row" onClick={() => { openItem(ctx.target); setCtx(null); }}>{t("open")}</div>
                <div className="ctx-row" onClick={() => { setQl(ctx.target); setCtx(null); }}>{t("quick_look")}<span className="menu-key">Space</span></div>
                <div className="ctx-sep" />
                <div className="ctx-row" onClick={() => { setDlg({ type: "rename", target: ctx.target, value: ctx.target }); setCtx(null); }}>{t("rename")}</div>
                <div className="ctx-row" onClick={() => { fileInput.current?.click(); setCtx(null); }}>{t("upload_here")}</div>
                <div className="ctx-sep" />
                <div className="ctx-row danger" onClick={() => { doDelete(sel.size ? [...sel] : [ctx.target]); setCtx(null); }}>{t("move_to_trash")}<span className="menu-key">⌘⌫</span></div>
              </>
            ) : (
              <>
                <div className="ctx-row" onClick={() => { setDlg({ type: "mkdir", value: t("untitled_folder") }); setCtx(null); }}>{t("new_folder")}<span className="menu-key">⇧⌘N</span></div>
                <div className="ctx-row" onClick={() => { fileInput.current?.click(); setCtx(null); }}>{t("upload_files")}</div>
                <div className="ctx-sep" />
                <div className="ctx-row" onClick={() => { setView(view === "grid" ? "list" : "grid"); setCtx(null); }}>{view === "grid" ? t("view_as_list") : t("view_as_icons")}</div>
                <div className="ctx-row" onClick={() => { onNewFinder(cwd); setCtx(null); }}>{t("open_new_window")}</div>
              </>
            )}
          </div>
        </>
      )}

      {/* dialog */}
      {dlg && (
        <DialogPrompt
          title={dlg.type === "mkdir" ? t("dialog_new_folder_title") : t("dialog_rename_title")}
          desc={dlg.type === "mkdir" ? t("dialog_new_folder_desc") + cwd : t("dialog_rename_desc").replace("{name}", dlg.target)}
          initial={dlg.value}
          okLabel={dlg.type === "mkdir" ? t("create") : t("rename")}
          onCancel={() => setDlg(null)}
          onOk={(v) => { dlg.type === "mkdir" ? doMkdir(v) : doRename(dlg.target, v); setDlg(null); }}
        />
      )}

      {/* quick look */}
      {ql && fs[joinPath(cwd, ql)] && (
        <QuickLook name={ql} node={fs[joinPath(cwd, ql)]} onClose={() => setQl(null)} />
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Dialog prompt
   ════════════════════════════════════════════════════════════════════════ */
function DialogPrompt({ title, desc, initial, okLabel, onOk, onCancel }) {
  const { t } = useLanguage();
  const [v, setV] = useState(initial || "");
  const ref = useRef();
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return (
    <div className="dialog-bg" onMouseDown={onCancel}>
      <div className="dialog" onMouseDown={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{desc}</p>
        <input ref={ref} value={v} onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onOk(v); if (e.key === "Escape") onCancel(); }} />
        <div className="dialog-actions">
          <button className="btn sec" onClick={onCancel}>{t("cancel")}</button>
          <button className="btn pri" onClick={() => onOk(v)}>{okLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Quick Look
   ════════════════════════════════════════════════════════════════════════ */
function QuickLook({ name, node, onClose }) {
  const { t } = useLanguage();
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape" || e.key === " ") { e.preventDefault(); onClose(); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="ql-bg" onMouseDown={onClose}>
      <div className="ql" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ql-bar">
          <div className="t">{name}</div>
          <div className="win-ctrls no-drag">
            <button className="win-btn close" title="Close" onClick={onClose}>
              <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" /></svg>
            </button>
          </div>
        </div>
        <div className="ql-body">
          {node.content ? (
            <div className="ql-pre">{node.content}</div>
          ) : (
            <div className="ql-blank">
              <ItemIcon node={node} s={120} />
              <div style={{ fontWeight: 600, fontSize: 15 }}>{name}</div>
              <div style={{ fontSize: 12, opacity: .7 }}>{node.size} · {t("no_preview")}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   TextEdit window
   ════════════════════════════════════════════════════════════════════════ */
function TextEditWindow({ win, active, fs, onFocus, onClose, onMinimize, onZoom, onChange }) {
  const { t } = useLanguage();
  const node = fs[win.path];
  const name = baseName(win.path || "");
  return (
    <WindowShell win={win} active={active} compact title={name} onFocus={onFocus} onClose={onClose} onMinimize={onMinimize} onZoom={onZoom} onChange={onChange}>
      <div style={{ flex: 1, overflow: "auto", padding: "26px 30px", fontFamily: "var(--mono)", fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "var(--txt)" }}>
        {node?.content ?? t("empty_file")}
      </div>
    </WindowShell>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Spotlight
   ════════════════════════════════════════════════════════════════════════ */
function Spotlight({ fs, onClose, onOpen }) {
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const ref = useRef();
  useEffect(() => { ref.current?.focus(); }, []);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const targetTerm = q.toLowerCase();
    return Object.keys(fs)
      .filter((p) => p !== "/" && baseName(p).toLowerCase().includes(targetTerm))
      .slice(0, 8)
      .map((p) => ({ path: p, node: fs[p] }));
  }, [q, fs]);

  useEffect(() => { setIdx(0); }, [q]);

  const choose = (r) => { onOpen(r.path, r.node); onClose(); };

  return (
    <div className="spot-bg" onMouseDown={onClose}>
      <div className="spot" onMouseDown={(e) => e.stopPropagation()}>
        <div className="spot-input">
          <span className="gl"><TopGlyph name="search" /></span>
          <input ref={ref} value={q} placeholder={t("spotlight_search")} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              else if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(results.length - 1, i + 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
              else if (e.key === "Enter" && results[idx]) choose(results[idx]);
            }} />
        </div>
        {q.trim() && (
          <div className="spot-res">
            {results.length === 0 ? (
              <div className="spot-empty">{t("no_results").replace("{query}", q)}</div>
            ) : results.map((r, i) => (
              <div key={r.path} className={`spot-row${i === idx ? " on" : ""}`} onMouseEnter={() => setIdx(i)} onClick={() => choose(r)}>
                <ItemIcon node={r.node} s={26} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{baseName(r.path)}</div>
                  <div style={{ fontSize: 11, opacity: .6, fontFamily: "var(--mono)" }}>{r.path}</div>
                </div>
                <span className="sp-meta">{r.node.type === "dir" ? t("folder") : r.node.size}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Dock
   ════════════════════════════════════════════════════════════════════════ */
function Dock({ running, bouncing, minimized, onOpenFinder, onToggleTheme, onRestore }) {
  const { t } = useLanguage();
  const [mx, setMx] = useState(null);
  const ref = useRef();
  const BASE = 54, MAX = 30, RANGE = 90;

  const apps = [
    { id: "finder", label: t("dock_finder"), icon: <IcFinder />, on: onOpenFinder },
    { id: "terminal", label: t("dock_terminal"), icon: <IcTerminal />, on: () => {} },
    { id: "textedit", label: t("dock_textedit"), icon: <IcTextEdit />, on: () => {} },
    { id: "settings", label: t("dock_appearance"), icon: <IcSettings />, on: onToggleTheme },
  ];

  // Flat layout: apps · [minimized windows] · trash (separators between groups)
  const entries = [];
  apps.forEach((a) => entries.push({ ...a, run: running.has(a.id) }));
  if (minimized.length) {
    entries.push({ sep: true, id: "sep-min" });
    minimized.forEach((m) => entries.push({
      id: "min-" + m.id, label: m.title, run: true, mini: true,
      icon: m.kind === "finder" ? <IcFinder /> : <IcTextEdit />,
      on: () => onRestore(m.id),
    }));
  }
  entries.push({ sep: true, id: "sep-trash" });
  entries.push({ id: "trash", label: t("dock_trash"), icon: <IcTrash /> });

  const scaleFor = (centerX) => {
    if (mx == null || centerX == null) return 0;
    const d = Math.abs(mx - centerX);
    if (d > RANGE) return 0;
    return MAX * (1 - d / RANGE);
  };

  // per-entry approximate centers (icons BASE+gap; separators ~11px)
  const centers = useMemo(() => {
    const arr = []; let x = 9;
    entries.forEach((en) => {
      if (en.sep) { x += 11; arr.push(null); }
      else { arr.push(x + BASE / 2); x += BASE + 6; }
    });
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length]);

  return (
    <div className="dock-wrap">
      <div className="dock" ref={ref}
        onMouseMove={(e) => { const r = ref.current.getBoundingClientRect(); setMx(e.clientX - r.left); }}
        onMouseLeave={() => setMx(null)}>
        {entries.map((en, i) => {
          if (en.sep) return <div key={en.id} className="dock-sep" />;
          const grow = scaleFor(centers[i]);
          return (
            <div key={en.id}
              className={`dock-item${en.run ? " run" : ""}${en.mini ? " mini" : ""}${bouncing === en.id ? " bounce" : ""}`}
              style={{ transform: `translateY(${-grow * 0.45}px) scale(${1 + grow / BASE})` }}
              onClick={en.on}>
              <div className="dock-tip">{en.label}</div>
              <div className="dock-ic">{en.icon}</div>
              <div className="dock-dot" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Login (macOS lock screen)
   ════════════════════════════════════════════════════════════════════════ */
function Login({ theme, user, onLogin }) {
  const { t, lang } = useLanguage();
  const now = useNow();
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState(false);

  const submit = () => {
    if (!pwd) { setErr(true); setTimeout(() => setErr(false), 400); return; }
    onLogin(); // demo: any password
  };

  return (
    <div className="os" data-theme={theme}>
      <style>{css}</style>
      <div className="wallpaper" />
      <div className="login">
        <div className="login-clock">
          <div className="d">{now.toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
          <div className="t">{now.toLocaleTimeString(lang === "tr" ? "tr-TR" : "en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}</div>
        </div>
        <div className={`login-card${err ? " shake" : ""}`}>
          <div className="login-av">{user.charAt(0).toUpperCase()}</div>
          <div className="login-user">{user}</div>
          <div className="login-pwd">
            <input type="password" placeholder={t("enter_password")} value={pwd} autoFocus
              onChange={(e) => setPwd(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
            <button className="login-go" onClick={submit}>→</button>
          </div>
          <div className={err ? "login-err" : "login-hint"}>{err ? t("password_required") : t("touch_id_or_password")}</div>
        </div>
        <div className="login-brand">
          <div className="n">H.İ.S.A.R.</div>
          <div className="s">{t("appName_subtitle")}</div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Desktop (window manager)
   ════════════════════════════════════════════════════════════════════════ */
function Desktop({ theme, setTheme, user, onLogout }) {
  const { t } = useLanguage();
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  const [fs, setFs] = useState(initFS);
  const [windows, setWindows] = useState(() => {
    const w = 880, h = 560;
    return [{ id: 1, kind: "finder", initPath: "/", x: Math.round((vw - w) / 2), y: 72, w, h, z: 10, minimized: false, maximized: false }];
  });
  const [activeId, setActiveId] = useState(1);
  const [spotlight, setSpotlight] = useState(false);
  const [bouncing, setBouncing] = useState(null);
  const zRef = useRef(10);
  const idRef = useRef(2);

  // Desktop icons — draggable, snap to a Windows-style grid on drop
  const [deskIcons, setDeskIcons] = useState(() => [
    { id: "reserve", label: "Reserve", path: "/", drive: true, ...gridPos(0, 0) },
    { id: "documents", label: "Documents", path: "/Documents", ...gridPos(0, 1) },
    { id: "media", label: "Media", path: "/Media", ...gridPos(0, 2) },
    { id: "projects", label: "Projects", path: "/Projects", ...gridPos(0, 3) },
    { id: "transfers", label: "Transfers", path: "/Transfers", ...gridPos(0, 4) },
  ]);
  const [deskSel, setDeskSel] = useState(null);
  const [deskDrag, setDeskDrag] = useState(null);

  const snapToGrid = (id, fx, fy) => setDeskIcons((ds) => {
    let { col, row } = gridCell(fx, fy);
    const maxCol = Math.max(0, Math.floor((vw - DGRID.ox - 84) / DGRID.cw));
    const maxRow = Math.max(0, Math.floor((vh - DGRID.oy - 70) / DGRID.ch));
    col = Math.min(col, maxCol); row = Math.min(row, maxRow);
    const taken = new Set(ds.filter((d) => d.id !== id).map((d) => { const c = gridCell(d.x, d.y); return c.col + ":" + c.row; }));
    let guard = 0;
    while (taken.has(col + ":" + row) && guard < 300) { row++; if (row > maxRow) { row = 0; col++; } guard++; }
    return ds.map((d) => (d.id === id ? { ...d, ...gridPos(col, row) } : d));
  });

  const dragDesk = (id) => (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setDeskSel(id);
    setDeskDrag(id);
    const start = deskIcons.find((d) => d.id === id);
    if (!start) return;
    const sx = e.clientX, sy = e.clientY, ox = start.x, oy = start.y;
    let last = { x: ox, y: oy };
    const move = (ev) => {
      last = { x: Math.max(0, Math.min(vw - 84, ox + (ev.clientX - sx))), y: Math.max(MENUBAR_H + 4, Math.min(vh - 96, oy + (ev.clientY - sy))) };
      setDeskIcons((ds) => ds.map((d) => (d.id === id ? { ...d, ...last } : d)));
    };
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      setDeskDrag(null);
      snapToGrid(id, last.x, last.y);
    };
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
  };

  const focus = useCallback((id) => {
    zRef.current += 1;
    setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, z: zRef.current, minimized: false } : w)));
    setActiveId(id);
  }, []);

  const bounce = (app) => { setBouncing(app); setTimeout(() => setBouncing(null), 700); };

  const openFinder = useCallback((initPath = "/") => {
    const n = windows.filter((w) => w.kind === "finder").length;
    const w = 880, h = 560;
    const id = idRef.current++;
    zRef.current += 1;
    setWindows((ws) => [...ws, {
      id, kind: "finder", initPath,
      x: Math.round((vw - w) / 2) + n * 28, y: 72 + n * 28, w, h,
      z: zRef.current, minimized: false, maximized: false,
    }]);
    setActiveId(id);
    bounce("finder");
  }, [windows, vw]);

  // Dock Finder icon: focus the front Finder if visible, restore one if all are
  // minimized, else open a fresh window.
  const dockFinder = () => {
    const fw = windows.filter((w) => w.kind === "finder");
    const visible = fw.filter((w) => !w.minimized);
    if (visible.length) return focus(visible.reduce((a, b) => (a.z > b.z ? a : b)).id);
    if (fw.length) return focus(fw[fw.length - 1].id);
    openFinder("/");
  };

  const openText = useCallback((path) => {
    const existing = windows.find((w) => w.kind === "textedit" && w.path === path);
    if (existing) { focus(existing.id); return; }
    const n = windows.filter((w) => w.kind === "textedit").length;
    const w = 560, h = 460;
    const id = idRef.current++;
    zRef.current += 1;
    setWindows((ws) => [...ws, {
      id, kind: "textedit", path,
      x: Math.round((vw - w) / 2) + 40 + n * 26, y: 110 + n * 26, w, h,
      z: zRef.current, minimized: false, maximized: false,
    }]);
    setActiveId(id);
    bounce("textedit");
  }, [windows, vw, focus]);

  const closeWin = (id) => {
    setWindows((ws) => ws.filter((w) => w.id !== id));
    setActiveId((cur) => {
      if (cur !== id) return cur;
      const rest = windows.filter((w) => w.id !== id);
      return rest.length ? rest.reduce((a, b) => (a.z > b.z ? a : b)).id : null;
    });
  };
  const minimize = (id) => { setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, minimized: true } : w))); setActiveId(null); };
  const change = (id, patch) => setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  const zoom = (id) => setWindows((ws) => ws.map((w) => {
    if (w.id !== id) return w;
    if (w.maximized) return { ...w, ...w.prev, maximized: false };
    return { ...w, prev: { x: w.x, y: w.y, w: w.w, h: w.h }, x: 0, y: MENUBAR_H, w: vw, h: vh - MENUBAR_H, maximized: true };
  }));

  const running = useMemo(() => {
    const s = new Set();
    if (windows.some((w) => w.kind === "finder")) s.add("finder");
    if (windows.some((w) => w.kind === "textedit")) s.add("textedit");
    return s;
  }, [windows]);

  const minimized = useMemo(() => windows.filter((w) => w.minimized).map((w) => ({
    id: w.id, kind: w.kind, title: w.kind === "finder" ? t("dock_finder") : baseName(w.path || "Untitled"),
  })), [windows, t]);

  // global shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.code === "Space") { e.preventDefault(); setSpotlight((v) => !v); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n" && document.activeElement?.tagName !== "INPUT") { e.preventDefault(); openFinder("/"); }
      if (e.key === "Escape" && spotlight) setSpotlight(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spotlight, openFinder]);

  const spotOpen = (path, node) => { if (node.type === "dir") openFinder(path); else if (TEXT_EXTS.includes((node.ext || "").toLowerCase())) openText(path); };

  return (
    <div className="os" data-theme={theme}>
      <style>{css}</style>
      <div className="wallpaper" onMouseDown={() => setDeskSel(null)} />

      <MenuBar user={user} theme={theme}
        onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        onLogout={onLogout} onNewFinder={() => openFinder("/")}
        onAbout={() => openText("/Documents/readme.txt")}
        onSpotlight={() => setSpotlight(true)} />

      {deskIcons.map((d) => (
        <div key={d.id} className={`desk-ic${deskSel === d.id ? " sel" : ""}${deskDrag === d.id ? " drag" : ""}`} style={{ left: d.x, top: d.y }}
          onMouseDown={dragDesk(d.id)} onDoubleClick={() => openFinder(d.path)}>
          {d.drive ? <DriveIcon s={56} /> : <FolderIcon s={56} />}
          <div className="lbl">{t(d.id)}</div>
        </div>
      ))}

      {windows.map((w) => w.kind === "finder" ? (
        <FinderWindow key={w.id} win={w} active={activeId === w.id} fs={fs} setFs={setFs}
          onFocus={() => focus(w.id)} onClose={() => closeWin(w.id)} onMinimize={() => minimize(w.id)}
          onZoom={() => zoom(w.id)} onChange={(p) => change(w.id, p)}
          onOpenText={openText} onNewFinder={openFinder} />
      ) : (
        <TextEditWindow key={w.id} win={w} active={activeId === w.id} fs={fs}
          onFocus={() => focus(w.id)} onClose={() => closeWin(w.id)} onMinimize={() => minimize(w.id)}
          onZoom={() => zoom(w.id)} onChange={(p) => change(w.id, p)} />
      ))}

      <Dock running={running} bouncing={bouncing} minimized={minimized}
        onOpenFinder={dockFinder} onRestore={focus}
        onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")} />

      {spotlight && <Spotlight fs={fs} onClose={() => setSpotlight(false)} onOpen={spotOpen} />}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Root
   ════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [theme, setTheme] = useState("dark");
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState("tr");
  const USERNAME = "ahmet";

  const t = useCallback((key) => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS["en"]?.[key] || key;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);

  if (!user) return (
    <LanguageContext.Provider value={value}>
      <Login theme={theme} user={USERNAME} onLogin={() => setUser(USERNAME)} />
    </LanguageContext.Provider>
  );
  return (
    <LanguageContext.Provider value={value}>
      <Desktop theme={theme} setTheme={setTheme} user={user} onLogout={() => setUser(null)} />
    </LanguageContext.Provider>
  );
}
