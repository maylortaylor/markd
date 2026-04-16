# REVIEW-3.1 — Feature Integration (PLAN-3.1)

**Plan:** PLAN-3.1
**Date:** 2026-04-13
**Reviewer verdict:** APPROVE (with one Important finding to track)

---

## Pre-Check: Prior Findings

REVIEW-2.2 flagged two Important findings:

1. **SearchBar inline style mutation** — not directly relevant to PLAN-3.1 scope, but
   the SearchBar component was not touched in this wave so the issue persists as-is.
   Carried forward below.
2. **Raw HTML rendering call-site contract** — PLAN-3.1 explicitly wired
   `setMarkdownHtml` in `App.tsx` (line 52). The trust-chain comment is
   present on the render side (MainPanel.tsx lines 32-38) but the setter call site in
   App.tsx has no guard comment as the prior review recommended.
   This is a carry-forward Important finding.

No escalation needed — no new recurrence pattern across reviews.

---

## Stage 1: Spec Compliance

**Verdict:** PASS

---

### Task 1: tauri-commands.ts and shiki.ts typed wrapper modules

- **Status:** PASS
- **Evidence:**
  - `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/lib/tauri-commands.ts` exports three functions with full TypeScript generics:
    - `listFiles(path: string): Promise<FileEntry[]>` — invokes `'list_files'` (line 8-10)
    - `readFile(path: string): Promise<string>` — invokes `'read_file'` (line 15-17)
    - `parseMarkdown(content: string): Promise<string>` — invokes `'parse_markdown'` (line 22-24)
  - All three use `invoke<T>()` from `@tauri-apps/api/core` (line 1), satisfying the typed wrapper requirement.
  - `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/lib/shiki.ts` exports `highlightCodeBlocks(container: HTMLElement): Promise<void>` (line 36).
  - The function queries `pre code[class*="language-"]` (line 37), extracts the language via `/language-(\w+)/` regex (line 40), resolves aliases (`bash` to `shellscript`, etc.) via `LANGUAGE_ALIASES` (lines 5-9), and replaces the parent `<pre>` via `block.parentElement.outerHTML = highlighted` (line 57). Unknown languages are skipped silently (lines 47-49). Failures are caught to avoid breaking the render (lines 59-61).

---

### Task 2: FileTree component — expand/collapse, selection, search, indentation

- **Status:** PASS
- **Evidence:**
  - `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/components/Sidebar/FileTree.tsx` renders `FileTreeNode` recursively. Directory nodes render children only when `expandedPaths.has(entry.path)` (line 49), controlled by `togglePath` (lines 105-115) via `useState<Set<string>>`.
  - Chevron indicator: `v` when expanded, `>` when collapsed (line 45). `aria-expanded` is set on directory buttons (line 43).
  - Selected state: `styles.selected` applied when `entry.path === selectedPath` (line 67); `aria-current="true"` also set (line 71).
  - Hover styling present in `FileTree.module.css` lines 24-27 (`background-color: #2a2d2e` on `:hover`).
  - Indentation: `paddingLeft: 8 + indent` px where `indent = depth * 16` (lines 33, 41, 68) — each level is 16px deeper as specified.
  - Search filtering: `flattenSearch()` (lines 79-95) recursively walks the tree, case-insensitively matches `item.name.toLowerCase().includes(lowerQuery)`, and returns a flat list of matching files. Empty query (`!searchQuery.trim()`) renders the full tree (line 117).
  - Empty search result renders "No files match" paragraph (line 120).
  - `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/components/Sidebar/FileTree.module.css` is present with all required rules.

---

### Task 3: App.tsx wiring — folder picker, file load, shiki, status bar, search

- **Status:** PASS
- **Evidence:**
  - **Folder picker:** `App.tsx` imports `open` from `@tauri-apps/plugin-dialog` (line 2). `openFolder()` calls `open({ directory: true, multiple: false })` (lines 30-33), then calls `listFiles(selected)` and sets `folderPath`, `files`, `selectedFile`, `markdownHtml`, and `searchQuery` (lines 35-41). Uses `typeof selected === 'string'` guard (line 35) to handle cancellation correctly.
  - **File load:** `selectFile()` calls `readFile(file.path)` then `parseMarkdown(raw)` and sets `selectedFile` + `markdownHtml` (lines 48-57). Errors are caught (line 53).
  - **Shiki post-processing:** `MainPanel.tsx` runs `highlightCodeBlocks(contentRef.current)` in a `useEffect` keyed on `content` (lines 16-19). This fires after every new markdown render.
  - **Status bar:** `StatusBar` receives `folderPath` and `countFiles(files)` (lines 75-79). `countFiles` recursively counts non-directory entries (lines 13-18). Status bar renders the folder path and file count correctly.
  - **Search bar wiring:** `searchQuery` state flows from `App` to `Sidebar` to `FileTree`. `Sidebar.tsx` passes `searchQuery=""` (hardcoded, line 66) when in the Explorer view and passes the live `searchQuery` prop when in the Search view (line 80). This correctly scopes filtering to the Search view only.
  - **"Open Folder" button when no folder loaded:** `Sidebar.tsx` renders the button in the empty state (lines 43-49) and also above the tree when files are present (lines 54-62). Spec criterion is met.
  - **GFM CSS:** `markdown.css` covers tables (lines 59-74), task list checkboxes (`li input[type='checkbox']`, lines 85-88), blockquotes (lines 90-98), strikethrough via `del` (lines 112-115), code blocks, headings, lists, links, images, and `hr`. All required GFM elements are styled.

---

### File Checklist

All 8 required files confirmed present:

| File | Present |
|------|---------|
| `src/lib/tauri-commands.ts` | Yes |
| `src/lib/shiki.ts` | Yes |
| `src/components/Sidebar/FileTree.tsx` | Yes |
| `src/components/Sidebar/FileTree.module.css` | Yes |
| `src/components/Sidebar/Sidebar.tsx` | Yes (modified) |
| `src/components/MainPanel/MainPanel.tsx` | Yes (modified) |
| `src/components/MainPanel/markdown.css` | Yes |
| `src/App.tsx` | Yes (modified) |

---

## Stage 2: Code Quality

### Critical

None.

---

### Important

- **`setMarkdownHtml` call site in `App.tsx` lacks a security comment** at `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/App.tsx` line 52 (carry-forward from REVIEW-2.2).
  - The raw HTML rendering in `MainPanel.tsx` has a well-written trust-chain comment (lines 32-38 documenting that content comes exclusively from the Rust/pulldown-cmark backend). However, the setter `setMarkdownHtml(html)` in `App.tsx` at line 52 carries no annotation. A future developer adding another call site would have no indication that the value ends up in a raw HTML render.
  - Remediation: Add `// SECURITY: html is Tauri/Rust-parsed output only — see MainPanel trust-chain comment` immediately before `setMarkdownHtml(html)` in `App.tsx`.

- **SearchBar still uses inline style mutation for focus state** (carry-forward from REVIEW-2.2) at `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/components/Sidebar/SearchBar.tsx`.
  - PLAN-3.1 scope did not include SearchBar, so this is not a new failure. Carried forward as it remains unaddressed.
  - Remediation: Create `SearchBar.module.css`, move all inline styles there, and replace the `onFocus`/`onBlur` direct style-mutation handlers with a CSS `:focus` rule (e.g. `.searchInput:focus { border-color: #007acc; outline: none; }`).

---

### Suggestions

- **`shiki.ts` silently swallows highlight failures** at `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/lib/shiki.ts` lines 59-61.
  - The empty `catch` block is intentional (preserves the original block on failure), but if shiki throws for an unexpected reason (e.g. WASM load failure), the failure is completely invisible during development.
  - Remediation: Add `console.warn('[shiki] Failed to highlight block:', err)` inside the catch. The lint config treats `console.error` in catch blocks as warning-only; `console.warn` is equally acceptable here.

- **Emoji icon spans are not `aria-hidden`** at `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/components/Sidebar/FileTree.tsx` lines 47 and 73.
  - The folder and file emoji rendered inside `<span className={styles.icon}>` will be announced by screen readers (e.g. "folder" or "page facing up") in addition to the parent button's `aria-label`. The `aria-label` on the button already communicates the item name.
  - Remediation: Add `aria-hidden="true"` to each icon span: `<span className={styles.icon} aria-hidden="true">`.

---

## Summary

**Verdict:** APPROVE

All eight required files are present and every acceptance criterion is satisfied. The typed Tauri command wrappers, shiki post-processing pipeline, FileTree expand/collapse with 16px-per-level indentation, case-insensitive search filtering, folder picker wiring, and GFM CSS are all correctly implemented. The most actionable improvement is adding the security call-site comment at `App.tsx:52` before `setMarkdownHtml(html)` to complete the trust-chain documentation promised by the prior review.

Critical: 0 | Important: 2 (1 carry-forward, 1 confirmed new) | Suggestions: 2
