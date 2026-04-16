# REVIEW-2.2 — VS Code-Inspired Layout (PLAN-2.2)

**Plan:** PLAN-2.2
**Date:** 2026-04-13
**Reviewer verdict:** APPROVE

---

## Pre-Check: Prior Findings

REVIEW-1.1 flagged two Important findings:
1. Filesystem capability scope too narrow (`$APPDATA/**` only) — not relevant to this plan's scope (UI layout only; Tauri commands are wired in Wave 3).
2. `@typescript-eslint/no-explicit-any` absent from ESLint config — not addressed in this plan; tracked below.

Three Suggestions from REVIEW-1.1 (vitest/vite mismatch, tsconfig.node.json lib/target inversion, shiki version pin) remain open and unchanged. No recurring patterns to escalate.

---

## Stage 1: Spec Compliance

**Verdict:** PASS

---

### Task 1: Types, App shell, CSS Grid layout

- **Status:** PASS
- **Evidence:**
  - `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/types/index.ts` exports `FileEntry` (interface, lines 1-6), `FolderStats` (interface, lines 8-11), and `SidebarView` (union type, line 13). All three required exports are present.
  - `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/App.module.css` declares `display: grid` (line 2), `grid-template-columns: 48px 250px 1fr` (line 3), `grid-template-rows: 1fr 24px` (line 4), and `grid-template-areas` with all four named areas `activitybar`, `sidebar`, `main`, `statusbar` (lines 5-8).
  - `height: 100vh; width: 100vw; overflow: hidden` at lines 9-11 satisfies the full-viewport-no-scrollbar requirement.
  - `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/App.tsx` renders all four panel components inside `<div className={styles.layout}>`. The main panel column uses `1fr` making it flexible and responsive.
  - `npm run typecheck` confirmed PASS by builder.

---

### Task 2: ActivityBar, Sidebar, SearchBar — interactivity

- **Status:** PASS
- **Evidence:**
  - `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/components/ActivityBar/ActivityBar.tsx`: Two `<button>` elements rendered vertically (lines 27-44). Active state applies `styles.active` class; `ActivityBar.module.css` lines 34-43 implement a left border via `::before` pseudo-element (`left: 0; width: 2px; background-color: #007acc`). This satisfies "highlights active view with a left border."
  - `aria-selected` on each button (lines 30, 40); `role="tablist"` on container and `role="tab"` on each button (lines 26, 29, 39); SVG icons carry `aria-hidden="true"`.
  - `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/components/Sidebar/Sidebar.tsx` line 31: renders `'EXPLORER'` when `activeView === 'files'` and `'SEARCH'` otherwise.
  - Lines 39-63: renders placeholder empty-state content when `files.length === 0`.
  - `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/components/Sidebar/SearchBar.tsx`: `<input type="text">` with `aria-label="Search files"` (line 13). Background `#3c3c3c`, color `#cccccc` — dark styling confirmed.
  - `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/App.tsx` line 24: `onViewChange={setSidebarView}` wires ActivityBar clicks directly to `sidebarView` state, satisfying "state managed in App."
  - `npm run typecheck` confirmed PASS by builder.

---

### Task 3: MainPanel, StatusBar, full layout integrity, build

- **Status:** PASS
- **Evidence:**
  - `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/components/MainPanel/MainPanel.tsx` lines 13-18: `content === null` branch renders centered empty state (`emptyState` CSS class uses `align-items: center; justify-content: center; height: 100%`).
  - Lines 19-33: non-null branch renders inside `scrollContainer` (`overflow-y: auto`) with `contentWrapper` capped at `max-width: 800px; margin: 0 auto`.
  - `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/components/StatusBar/StatusBar.tsx` line 12: `folderPath ?? 'No folder open'` satisfies the null-path requirement. Lines 14-17: `fileCount` with singular/plural label rendered only when `folderPath !== null`.
  - `role="status"` present at line 10 (with bonus `aria-live="polite"`).
  - Each panel's CSS module assigns `grid-area` to the matching named area: `activitybar`, `sidebar`, `main`, `statusbar`.
  - `npm run typecheck` and `npm run build` (37 modules, 148 kB) confirmed PASS by builder.

---

### File Checklist

All 12 required files confirmed present:

| File | Present |
|------|---------|
| `src/App.tsx` | Yes |
| `src/App.module.css` | Yes |
| `src/components/ActivityBar/ActivityBar.tsx` | Yes |
| `src/components/ActivityBar/ActivityBar.module.css` | Yes |
| `src/components/Sidebar/Sidebar.tsx` | Yes |
| `src/components/Sidebar/Sidebar.module.css` | Yes |
| `src/components/Sidebar/SearchBar.tsx` | Yes |
| `src/components/MainPanel/MainPanel.tsx` | Yes |
| `src/components/MainPanel/MainPanel.module.css` | Yes |
| `src/components/StatusBar/StatusBar.tsx` | Yes |
| `src/components/StatusBar/StatusBar.module.css` | Yes |
| `src/types/index.ts` | Yes |

---

## Stage 2: Code Quality

### Critical

None.

---

### Important

- **`SearchBar.tsx` uses inline style mutation for focus/blur instead of CSS Modules** at `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/components/Sidebar/SearchBar.tsx` lines 25-31.
  - `onFocus` and `onBlur` handlers directly mutate `e.currentTarget.style.borderColor`. This bypasses the virtual DOM, makes the component untestable via RTL (style properties set this way are not readable in jsdom), and is inconsistent with every other component in the codebase which uses CSS Modules. The component also has no CSS module file at all — all styling is in inline `style` props — while the spec explicitly calls for "CSS Modules where needed."
  - Remediation: Create `src/components/Sidebar/SearchBar.module.css`. Move all inline styles there and replace the `onFocus`/`onBlur` handlers with a CSS `:focus` rule: `.searchInput:focus { border-color: #007acc; outline: none; }`. Apply via `className={styles.searchInput}`.

- **Open `dangerouslySetInnerHTML` prop in `MainPanel.tsx` lacks a call-site contract** at `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/components/MainPanel/MainPanel.tsx` lines 26-30.
  - The inline comment correctly documents the Tauri trust chain (Rust/pulldown-cmark only). However, `content: string | null` is a generic prop — nothing in the type system prevents a future developer from supplying arbitrary HTML. The risk is low now (Wave 2 scaffold, no network content), but as Wave 3 wires up `setMarkdownHtml`, the only guarantee is that it happens to flow from a Tauri command result.
  - Remediation: When `onContentChange` is wired in Wave 3, add a `// SECURITY: must only be called with output from the parse_markdown Tauri command` comment at the `setMarkdownHtml` call site in `App.tsx`. Consider a branded/opaque type (`type TauriHtml = string & { readonly __brand: 'tauri' }`) to make the trust boundary explicit in the type system.

---

### Suggestions

- **`SearchBar` has no CSS module** while every other component does — addressed in the Important finding above, restated here for tracking completeness.

- **`FolderStats` type is defined but not yet consumed** at `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/types/index.ts` lines 8-11.
  - Expected — it will be used in Wave 3. No action needed now; noting so it is not removed during cleanup.

- **`countFiles` is defined inside the component body** at `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/App.tsx` lines 19-20.
  - It is a pure utility with no dependency on state or props; it is re-created on every render. Moving it above the `App` function or into `src/lib/utils.ts` is cleaner and slightly more efficient.
  - Remediation: Hoist `const countFiles = ...` above the `App` function declaration.

- **Sidebar placeholder text for non-empty `files` is currently unreachable** at `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/components/Sidebar/Sidebar.tsx` line 61.
  - The `onOpenFolder` stub in `App.tsx` always calls `setFiles([])`, so `files.length > 0` cannot be true in Wave 2. The `"File tree renders here (Wave 3)"` message is dead code until Wave 3. Benign, will be replaced.

---

## Summary

**Verdict:** APPROVE

All 12 required files are present and every acceptance criterion is met. The CSS Grid layout has correctly named areas, components are properly typed, accessibility attributes (`role`, `aria-selected`, `aria-label`, `role="status"`) are present throughout, and both typecheck and build pass. The one quality gap worth addressing before this component grows is `SearchBar.tsx` using inline style mutation instead of CSS Modules — inconsistent with the rest of the codebase and untestable. The HTML rendering in `MainPanel` is acceptable under the documented Tauri trust model but warrants a call-site contract when wired in Wave 3.

Critical: 0 | Important: 2 | Suggestions: 4
