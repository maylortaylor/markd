# Plan 3.1: Integration — Folder Picker, File Tree, Markdown Rendering with Shiki

---
phase: 1-foundation
plan: "3.1"
wave: 3
dependencies: ["2.1", "2.2"]
must_haves:
  - Folder picker dialog opens via Tauri plugin-dialog and invokes list_files
  - Sidebar file tree renders collapsible folders and clickable .md files
  - Clicking a file invokes read_file + parse_markdown and renders HTML in MainPanel
  - Shiki post-processes code blocks for syntax highlighting
  - Search bar filters the file tree by filename
  - Status bar shows live folder path and file count
  - Typed Tauri command wrapper module for all invoke() calls
files_touched:
  - src/lib/tauri-commands.ts
  - src/lib/shiki.ts
  - src/components/Sidebar/FileTree.tsx
  - src/components/Sidebar/FileTree.module.css
  - src/components/Sidebar/Sidebar.tsx
  - src/components/MainPanel/MainPanel.tsx
  - src/components/MainPanel/MainPanel.module.css
  - src/components/MainPanel/markdown.css
  - src/App.tsx
tdd: false
risk: medium
---

## Context

This is the critical integration plan that connects the frontend shell (Plan 2.2) to the Rust backend commands (Plan 2.1). After this plan, the app is functional end-to-end: user picks a folder, sees files in the sidebar, clicks a file, and reads styled markdown with syntax-highlighted code blocks.

Risk is medium because this plan involves Tauri IPC (invoke), the dialog plugin, shiki async initialization, and DOM post-processing -- multiple async boundaries that need to coordinate correctly.

## Dependencies

- **Plan 2.1** (Wave 2): Rust commands `list_files`, `read_file`, `parse_markdown` must be compiled and registered.
- **Plan 2.2** (Wave 2): Frontend shell components must exist (App, Sidebar, MainPanel, StatusBar, ActivityBar).

## Tasks

### Task 1: Create Tauri command wrappers and shiki highlighter utility

**Files:**
- `src/lib/tauri-commands.ts`
- `src/lib/shiki.ts`

**Action:** create

**Description:**

**Tauri command wrappers** -- Create `src/lib/tauri-commands.ts` with typed wrapper functions around `invoke()`. This is the single import point for all Tauri IPC calls:

```typescript
import { invoke } from '@tauri-apps/api/core';
import type { FileEntry } from '../types';

/**
 * Scan a directory recursively for .md files and return a tree structure.
 */
export async function listFiles(path: string): Promise<FileEntry[]> {
  return invoke<FileEntry[]>('list_files', { path });
}

/**
 * Read the raw text content of a file.
 */
export async function readFile(path: string): Promise<string> {
  return invoke<string>('read_file', { path });
}

/**
 * Parse markdown content into HTML with GFM extensions.
 */
export async function parseMarkdown(content: string): Promise<string> {
  return invoke<string>('parse_markdown', { content });
}
```

**Shiki highlighter** -- Create `src/lib/shiki.ts`. This module initializes a shiki highlighter instance (lazily, once) and exports a function to post-process a DOM container's code blocks:

```typescript
import { codeToHtml, type BundledLanguage } from 'shiki';

const SUPPORTED_LANGUAGES: BundledLanguage[] = [
  'javascript', 'typescript', 'python', 'rust', 'go',
  'java', 'json', 'yaml', 'bash', 'html', 'css',
  'markdown', 'sql', 'toml', 'xml', 'c', 'cpp',
];

/**
 * Find all <pre><code class="language-X"> blocks in a container
 * and replace them with shiki-highlighted HTML.
 */
export async function highlightCodeBlocks(container: HTMLElement): Promise<void> {
  const codeBlocks = container.querySelectorAll('pre code[class*="language-"]');

  for (const block of codeBlocks) {
    const langMatch = block.className.match(/language-(\w+)/);
    const lang = langMatch?.[1] || 'text';
    const code = block.textContent || '';

    // Only highlight if the language is in our supported list
    const shikiLang = SUPPORTED_LANGUAGES.includes(lang as BundledLanguage)
      ? (lang as BundledLanguage)
      : 'text';

    try {
      const highlighted = await codeToHtml(code, {
        lang: shikiLang,
        theme: 'one-dark-pro',
      });
      // Replace the entire <pre> element with shiki's output
      if (block.parentElement) {
        block.parentElement.outerHTML = highlighted;
      }
    } catch {
      // If highlighting fails for any block, leave it as-is
    }
  }
}
```

Note: Check the actual shiki v1+ API at build time. The import path may be `shiki` or `shiki/bundle/web`. The `codeToHtml` function is the standard entry point. The `BundledLanguage` type may need adjustment based on the installed version.

**Acceptance Criteria:**
- `src/lib/tauri-commands.ts` exports `listFiles`, `readFile`, `parseMarkdown` with correct TypeScript types
- `src/lib/shiki.ts` exports `highlightCodeBlocks` that finds `<pre><code class="language-X">` blocks and replaces them with shiki output
- `npm run typecheck` passes

### Task 2: Build the interactive FileTree component with search filtering

**Files:**
- `src/components/Sidebar/FileTree.tsx`
- `src/components/Sidebar/FileTree.module.css`
- `src/components/Sidebar/Sidebar.tsx` (modify)

**Action:** create/modify

**Description:**

**FileTree** -- A recursive tree component that renders `FileEntry[]` as a collapsible folder hierarchy. Directories can be expanded/collapsed by clicking them. Files are clickable and trigger `onFileSelect`.

Props:
```typescript
interface FileTreeProps {
  entries: FileEntry[];
  selectedPath: string | null;
  searchQuery: string;
  onFileSelect: (file: FileEntry) => void;
}
```

Internal component `FileTreeNode` renders a single entry:
- **Directory**: Shows a chevron icon (right when collapsed, down when expanded) + folder icon + name. Clicking toggles expansion. Manage expanded state with a `Set<string>` of expanded paths in local state.
- **File**: Shows a document icon + name. Clicking calls `onFileSelect`. Selected file is highlighted with background `#37373d`.
- Indent each nesting level by 16px using `paddingLeft`.
- Each row is 24px tall, with hover state `#2a2d2e`.

**Search filtering logic:**
- When `searchQuery` is non-empty, filter the tree to only show files whose `name` includes the query (case-insensitive)
- When filtering, flatten the tree -- show matching files without directory nesting, each showing its relative path
- When `searchQuery` is empty, show the full tree

**Update Sidebar.tsx** to import and render `FileTree` instead of the placeholder text. When `activeView` is `'files'`, render `FileTree`. When `activeView` is `'search'`, render `SearchBar` above `FileTree` (with search query passed through). Add an "Open Folder" button at the top of the sidebar when no folder is loaded -- this button will be wired to the folder picker in Task 3.

The "Open Folder" button should:
- Appear only when `files` array is empty
- Be styled as a simple outlined button: border `#007acc`, text `#007acc`, hover fills with `#007acc` text `#ffffff`
- Have `aria-label="Open folder"`

**Acceptance Criteria:**
- FileTree recursively renders directories and files from a `FileEntry[]` array
- Directories expand/collapse on click with a chevron indicator
- Files highlight on hover and show selected state
- Each nesting level is indented 16px deeper
- Search query filters to matching files (case-insensitive on filename)
- Empty search shows full tree
- "Open Folder" button appears when no folder is loaded
- `npm run typecheck` passes

### Task 3: Wire everything together — folder picker, file loading, markdown rendering

**Files:**
- `src/App.tsx` (modify)
- `src/components/MainPanel/MainPanel.tsx` (modify)
- `src/components/MainPanel/markdown.css`

**Action:** modify/create

**Description:**

**App.tsx integration** -- Wire up the full data flow:

1. **Folder picker**: Import `open` from `@tauri-apps/plugin-dialog`. Create an `openFolder` async function that:
   - Calls `open({ directory: true, multiple: false, title: 'Select a folder to view' })`
   - If a path is returned, calls `listFiles(path)` from `src/lib/tauri-commands.ts`
   - Sets `folderPath`, `files` state, clears `selectedFile` and `markdownHtml`
   - Counts total `.md` files recursively for the status bar `fileCount`

2. **File selection**: Create a `selectFile` async function that:
   - Calls `readFile(file.path)` to get raw markdown
   - Calls `parseMarkdown(rawContent)` to get HTML
   - Sets `selectedFile` and `markdownHtml` state

3. Pass `openFolder` to the Sidebar's "Open Folder" button via a prop (add `onOpenFolder: () => void` to SidebarProps).

4. Pass all data down to child components: files, selectedFile, markdownHtml, folderPath, fileCount, searchQuery, handlers.

**Count helper** -- Write a small utility function to recursively count `.md` files in a `FileEntry[]` tree:

```typescript
function countFiles(entries: FileEntry[]): number {
  return entries.reduce((count, entry) => {
    if (entry.is_dir) return count + countFiles(entry.children);
    return count + 1;
  }, 0);
}
```

**MainPanel.tsx update** -- After rendering HTML content via the content container, use a `useEffect` + `useRef` to run shiki highlighting on code blocks:

```typescript
import { useEffect, useRef } from 'react';
import { highlightCodeBlocks } from '../../lib/shiki';

// Inside the component:
const contentRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (contentRef.current && content) {
    highlightCodeBlocks(contentRef.current);
  }
}, [content]);
```

The content div that receives HTML should have `ref={contentRef}`.

**Markdown CSS** -- Create `src/components/MainPanel/markdown.css` with base styles for rendered markdown content. Import it in MainPanel. This provides readable defaults for all GFM elements:

- Headings: `h1` through `h6` with decreasing sizes, `h1`/`h2` with bottom border
- Paragraphs: `margin-bottom: 16px`
- Links: color `#4493f8`, underlined
- Code blocks (`pre`): background `#161b22`, padding `16px`, border-radius `6px`, overflow-x auto
- Inline code: background `#343942`, padding `2px 6px`, border-radius `3px`
- Tables: full width, border-collapse, striped rows (`nth-child(even)` background `#161b22`)
- Task lists: checkbox styling
- Blockquotes: left border `3px solid #3b3b3b`, background `#161b22`, padding
- Images: `max-width: 100%`, border-radius `4px`
- Lists (`ul`, `ol`): proper indentation and spacing
- Horizontal rules: `border-color: #30363d`
- Strikethrough (`del`): `text-decoration: line-through; opacity: 0.7`

Scope all these styles under the `.markdown-body` class to avoid leaking into the app chrome.

**Acceptance Criteria:**
- Clicking "Open Folder" opens the native folder picker dialog
- Selecting a folder populates the sidebar file tree with `.md` files
- Clicking a file in the tree loads and renders its markdown as styled HTML
- Code blocks in rendered markdown are syntax-highlighted by shiki
- GFM features render correctly: tables have borders/stripes, task lists have checkboxes, strikethrough shows through
- Status bar shows the selected folder path and total file count
- Search bar filters the visible file tree
- Switching between Files and Search views in the activity bar works correctly
- `npm run typecheck` passes
- `npm run build` succeeds
- `cargo tauri dev` launches the app and the full read loop works (manual verification)

## Verification

```bash
cd /Users/matttaylor/Documents/_dev/maylortaylor/markd
npm run typecheck && echo "PASS: typecheck" || echo "FAIL: typecheck"
npm run build && echo "PASS: vite build" || echo "FAIL: vite build"
npm run lint && echo "PASS: lint" || echo "FAIL: lint"
cd src-tauri && cargo check && echo "PASS: cargo check" && cd .. || echo "FAIL: cargo check"

# Manual verification:
# cargo tauri dev
# 1. Click "Open Folder" -> select a folder with .md files
# 2. Verify file tree appears in sidebar
# 3. Click a .md file -> verify rendered markdown in main panel
# 4. Verify code blocks have syntax highlighting
# 5. Type in search bar -> verify file tree filters
# 6. Verify status bar shows folder path and file count
```
