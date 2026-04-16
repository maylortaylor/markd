# Plan 2.2: Frontend Shell — VS Code Layout with Dark Theme

---
phase: 1-foundation
plan: "2.2"
wave: 2
dependencies: ["1.1"]
must_haves:
  - VS Code-inspired layout with activity bar, sidebar, main panel, status bar
  - Hard-coded dark theme matching design doc colors
  - Activity bar with Files icon (active by default) and Search icon
  - Sidebar panel with placeholder file tree area and search bar
  - Main panel with empty state message
  - Status bar with placeholder text
  - All components use Tailwind CSS utilities plus CSS Modules where needed
  - Layout is responsive to window resize (flexbox/grid, no fixed pixel widths for panels)
files_touched:
  - src/App.tsx
  - src/App.module.css
  - src/components/ActivityBar/ActivityBar.tsx
  - src/components/ActivityBar/ActivityBar.module.css
  - src/components/Sidebar/Sidebar.tsx
  - src/components/Sidebar/Sidebar.module.css
  - src/components/Sidebar/SearchBar.tsx
  - src/components/MainPanel/MainPanel.tsx
  - src/components/MainPanel/MainPanel.module.css
  - src/components/StatusBar/StatusBar.tsx
  - src/components/StatusBar/StatusBar.module.css
  - src/types/index.ts
tdd: false
risk: low
---

## Context

This plan builds the static frontend shell -- the VS Code-inspired layout with activity bar, sidebar, main panel, and status bar. At this stage, all content is placeholder/static. No Tauri commands are invoked. The shell provides the structural foundation that Plan 3.1 (integration) will wire up to real data.

Risk is low because this is standard React component work with Tailwind CSS. No external dependencies beyond React and Tailwind.

This plan touches only `src/` files. Plan 2.1 (Rust backend) touches only `src-tauri/` files. They share zero files and can execute in parallel.

## Dependencies

- **Plan 1.1** (Wave 1): Project scaffold must exist with React, Tailwind, and Vite configured.

## Tasks

### Task 1: Create TypeScript types and the App layout shell

**Files:**
- `src/types/index.ts`
- `src/App.tsx`
- `src/App.module.css`

**Action:** create

**Description:**

Create `src/types/index.ts` with shared frontend types. These mirror the Rust types and will be used when invoking Tauri commands in Wave 3:

```typescript
export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  children: FileEntry[];
}

export interface FolderStats {
  file_count: number;
  folder_path: string;
}

export type SidebarView = 'files' | 'search';
```

Create `src/App.tsx` as the top-level layout component. Use CSS Grid for the four-panel layout:

```
+------+----------------+---------------------------+
| Act  |   Sidebar      |      Main Panel           |
| Bar  |   (250px)      |      (flex: 1)            |
| (48px)|               |                           |
+------+----------------+---------------------------+
|              Status Bar (full width, 24px)         |
+---------------------------------------------------+
```

The App component should manage a `sidebarView` state (`'files' | 'search'`) and pass it to the ActivityBar and Sidebar. Use `useState` for:
- `sidebarView: SidebarView` (default: `'files'`)
- `folderPath: string | null` (default: `null`)
- `selectedFile: FileEntry | null` (default: `null`)
- `files: FileEntry[]` (default: `[]`)
- `markdownHtml: string | null` (default: `null`)
- `searchQuery: string` (default: `''`)

For now these are just declared -- they will be populated in Wave 3.

The layout grid in `src/App.module.css`:

```css
.layout {
  display: grid;
  grid-template-columns: 48px 250px 1fr;
  grid-template-rows: 1fr 24px;
  grid-template-areas:
    "activitybar sidebar main"
    "statusbar statusbar statusbar";
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: #1e1e1e;
  color: #cccccc;
}
```

**Acceptance Criteria:**
- `src/types/index.ts` exports `FileEntry`, `FolderStats`, and `SidebarView` types
- `src/App.tsx` renders a CSS Grid layout with four named grid areas
- The layout fills the full viewport (`100vh` x `100vw`) with no scrollbars on the shell itself
- `npm run typecheck` passes

### Task 2: Create ActivityBar, Sidebar, and SearchBar components

**Files:**
- `src/components/ActivityBar/ActivityBar.tsx`
- `src/components/ActivityBar/ActivityBar.module.css`
- `src/components/Sidebar/Sidebar.tsx`
- `src/components/Sidebar/Sidebar.module.css`
- `src/components/Sidebar/SearchBar.tsx`

**Action:** create

**Description:**

**ActivityBar** -- A narrow vertical icon rail on the far left. Dark background (`#333333`). Contains icon buttons for Files and Search views. The active view is indicated with a left border accent (`#007acc`) and brighter icon color (`#ffffff` active vs `#858585` inactive).

Props:
```typescript
interface ActivityBarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
}
```

Use simple SVG icons inline (no icon library needed for two icons):
- **Files icon**: A simple document/folder icon (SVG path)
- **Search icon**: A magnifying glass (SVG path)

Each icon button should:
- Be 48px x 48px, centered content
- Have `role="tab"` and `aria-selected` matching active state for accessibility
- Have hover state with slightly lighter background (`#2a2a2a`)
- The container should have `role="tablist"` and `aria-label="Views"`

**Sidebar** -- Takes up the second grid column. Background `#252526`. Has a header showing "EXPLORER" or "SEARCH" depending on the active view. Below the header, render either the file tree area or the search view.

Props:
```typescript
interface SidebarProps {
  activeView: SidebarView;
  files: FileEntry[];
  selectedFile: FileEntry | null;
  onFileSelect: (file: FileEntry) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}
```

For now, the file tree area shows a placeholder message: "Open a folder to get started" (centered, muted text `#858585`). The search view shows the SearchBar plus a similar placeholder.

**SearchBar** -- A text input for filtering files. Styled to match VS Code's search input: dark background (`#3c3c3c`), subtle border (`#3c3c3c`), lighter border on focus (`#007acc`), placeholder text "Search files...".

Props:
```typescript
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}
```

The input should have `aria-label="Search files"` for accessibility.

**Acceptance Criteria:**
- ActivityBar renders two icon buttons vertically, highlights the active view with a left border
- Sidebar shows "EXPLORER" header when `activeView` is `'files'` and "SEARCH" when `'search'`
- Sidebar shows placeholder text when files array is empty
- SearchBar renders an accessible text input with dark styling
- Clicking activity bar icons updates the sidebar view (state managed in App)
- `npm run typecheck` passes

### Task 3: Create MainPanel and StatusBar components

**Files:**
- `src/components/MainPanel/MainPanel.tsx`
- `src/components/MainPanel/MainPanel.module.css`
- `src/components/StatusBar/StatusBar.tsx`
- `src/components/StatusBar/StatusBar.module.css`

**Action:** create

**Description:**

**MainPanel** -- The primary content area. Background `#1e1e1e`. When no file is selected, show an empty state: the app name "Markd" in large muted text centered in the panel, with a subtitle "Select a folder and click a file to view it". When a file is selected (wired up in Wave 3), this will render the parsed HTML content.

Props:
```typescript
interface MainPanelProps {
  content: string | null;
  fileName: string | null;
}
```

When `content` is not null, render it inside a scrollable container with appropriate padding. The content container should have a `max-width: 800px` centered with `margin: 0 auto` for comfortable reading. Add the class name `markdown-body` to the content div for styling in Wave 3.

**Security note:** The HTML rendered here comes exclusively from our own Rust backend parsing local markdown files via pulldown-cmark. No network content is ever loaded (Tauri CSP and capabilities deny all network access). The Tauri CSP (`script-src 'self'`) also prevents any injected scripts from executing. This is a controlled, trusted pipeline: local file -> Rust parser -> HTML string -> render.

The content wrapper should be scrollable: `overflow-y: auto; height: 100%; padding: 24px 32px;`.

**StatusBar** -- A thin bar across the full bottom. Background `#007acc`. Shows the current folder path on the left and file count on the right. When no folder is open, show "No folder open".

Props:
```typescript
interface StatusBarProps {
  folderPath: string | null;
  fileCount: number;
}
```

Layout: flex row, `justify-between`, with left-aligned folder path and right-aligned file count. Text is small (`text-xs`), white (`#ffffff`), with horizontal padding (`px-3`). The status bar should have `role="status"` for accessibility.

**Acceptance Criteria:**
- MainPanel shows centered "Markd" empty state when `content` is null
- MainPanel renders HTML content in a scrollable, max-width container when `content` is provided
- StatusBar shows "No folder open" when `folderPath` is null
- StatusBar shows folder path (left) and file count (right) when folder is open
- StatusBar has `role="status"` for screen readers
- The full layout (App + all 4 panels) renders without visual overflow or broken grid
- `npm run typecheck` passes
- `npm run build` (Vite frontend build) succeeds

## Verification

```bash
cd /Users/matttaylor/Documents/_dev/maylortaylor/markd
npm run typecheck && echo "PASS: typecheck" || echo "FAIL: typecheck"
npm run build && echo "PASS: vite build" || echo "FAIL: vite build"
npm run lint && echo "PASS: lint" || echo "FAIL: lint"
```
