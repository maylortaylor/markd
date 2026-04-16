# Simplification Report
**Phase:** Phase 1 — Initial Implementation
**Date:** 2026-04-13
**Files analyzed:** 12 (10 frontend + 2 config/infra)
**Findings:** 2 high, 3 medium, 3 low

---

## High Priority

### `fileName` prop accepted but never used in MainPanel
- **Type:** Remove
- **Effort:** Trivial
- **Locations:** `src/components/MainPanel/MainPanel.tsx:13`
- **Description:** The `MainPanel` component declares `fileName: string | null` in its
  props interface and receives it as `_fileName` (prefixed to suppress the unused-variable
  warning). The component never reads `_fileName` — it does not render a title bar, use
  the name in an `aria-label`, or pass it anywhere. The `_` prefix is a code smell
  signalling that the prop was wired up in anticipation of future use but has no current
  caller effect.
- **Suggestion:** Remove the `fileName` field from `MainPanelProps`, the destructured
  parameter `_fileName`, and the `fileName={selectedFile?.name ?? null}` prop in `App.tsx:74`.
  When a title bar or breadcrumb is added in a later phase, re-introduce it at that point
  with an actual render site.
- **Impact:** Removes 3 lines across 2 files; eliminates a misleading `_` prefix that
  implies intentional suppression rather than a genuinely unused prop.

---

### `FolderStats` type defined but never used
- **Type:** Remove
- **Effort:** Trivial
- **Locations:** `src/types/index.ts:8-11`
- **Description:** `FolderStats` declares two fields (`file_count`, `folder_path`) that
  map to what `StatusBar` receives as individual props today. No component, hook, or
  command imports or references this type. It appears to be a leftover from an earlier
  design iteration where `StatusBar` would receive a single stats object.
- **Suggestion:** Delete the `FolderStats` interface. If a future phase consolidates
  status data into a single object, the type can be re-introduced then.
- **Impact:** Removes 4 lines; prevents confusion about whether `FolderStats` is the
  intended shape for future status-related APIs.

---

## Medium Priority

### Inline file-button JSX duplicated between tree view and search results
- **Type:** Consolidate
- **Effort:** Moderate
- **Locations:** `src/components/Sidebar/FileTree.tsx:65-76` (tree file button inside `FileTreeNode`), `src/components/Sidebar/FileTree.tsx:125-135` (search results file button in `FileTree`)
- **Description:** Two `<button>` blocks render a file row with identical structure:
  icon span + name span, shared class names (`styles.fileRow`, `styles.selected`),
  `aria-label={file.name}`, and `aria-current` logic. The only difference is that the
  tree node receives `paddingLeft` based on `depth` while the search result always uses
  `paddingLeft: '8px'`. Both also omit `aria-hidden` on the icon span in the search
  result path (the tree node correctly has `aria-hidden="true"` on its icon).
- **Suggestion:** Extract a `FileRowButton` component (or a small helper function) that
  accepts `file`, `isSelected`, `indentPx`, and `onSelect`. Replace both call sites.
  This also fixes the missing `aria-hidden` on the search result icon as a by-product.
- **Impact:** ~12 lines removed, single change point for file-row styling, accessibility
  consistency guaranteed.

---

### `searchQuery` prop routed through `Sidebar` but only consumed by `FileTree`
- **Type:** Refactor
- **Effort:** Trivial
- **Locations:** `src/components/Sidebar/Sidebar.tsx:8-16` (prop declared), `src/components/Sidebar/Sidebar.tsx:68` (passed to `FileTree` when `activeView === 'search'`), `src/components/Sidebar/Sidebar.tsx:77` (passed to `FileTree` in search empty-state path — never actually reaches `FileTree` because the outer condition short-circuits)
- **Description:** When `activeView === 'files'`, `Sidebar` passes `searchQuery=""` (a
  hardcoded empty string) to `FileTree` on line 68 rather than simply not passing the
  query. This suppresses search within the file-tree view correctly, but the intent is
  obscured — it looks like the query is conditionally cleared rather than the search
  feature being inactive. The prop is then passed again on line 77, but that branch
  only renders when `isEmpty === true`, so `FileTree` never actually receives it in
  the non-empty search path (line 77 is the empty-folder message, not a `FileTree`).
  Reading the two `<FileTree>` instantiations side-by-side requires careful tracing
  to understand what searchQuery each receives.
- **Suggestion:** Derive `activeSearchQuery` inline before the return:
  `const activeSearchQuery = activeView === 'search' ? searchQuery : '';`
  Then pass `activeSearchQuery` to both `FileTree` instances. Remove the hardcoded `""`
  on line 68. This makes the intent immediately legible without changing behaviour.
- **Impact:** 1 line added, 1 literal removed, clarity gained on the search activation logic.

---

### `on:push` trigger in CI runs on every branch including draft commits
- **Type:** Refactor
- **Effort:** Trivial
- **Locations:** `.github/workflows/ci.yml:4`
- **Description:** The `push` event has no branch filter — it triggers on every push to
  every branch, including force-pushes to in-progress feature branches with broken code.
  This causes unnecessary runner consumption and can flood the Actions tab with failing
  runs during active development. The `pull_request` trigger already covers the main
  integration gates (`develop`, `stage`, `main`).
- **Suggestion:** Restrict the `push` trigger to the same set of protected branches:
  ```yaml
  on:
    push:
      branches: [develop, stage, main]
    pull_request:
      branches: [develop, stage, main]
  ```
  This is consistent with how the `pull_request` event is already scoped, and matches
  the intent noted in the existing ISSUES.md entry S-9.
- **Impact:** Eliminates redundant CI runs on feature branches; no change to protected
  branch coverage.

---

## Low Priority

- **`SearchBar` is a one-liner wrapper** (`src/components/Sidebar/SearchBar.tsx:8-19`).
  The component is a thin pass-through over a plain `<input>` with no added logic,
  styling, or accessibility beyond what the input element already provides. At this scale
  (one caller: `Sidebar.tsx:36`) it adds a file and an import for minimal gain. Worth
  inlining into `Sidebar` directly. That said, it provides a clean extension point for
  debounce logic or a clear-button — if those are coming in Phase 2, keep it. Effort:
  trivial.

- **`countFiles` helper in `App.tsx` could move to `src/lib/`** (`src/App.tsx:13-18`).
  It is a pure recursive utility with no dependency on React state or JSX. Keeping pure
  utilities in `lib/` is a pattern already established by `tauri-commands.ts` and
  `shiki.ts`. Not urgent — the function is small and `App.tsx` is the only caller.
  Effort: trivial.

- **Shiki theme hardcoded as `'one-dark-pro'`** (`src/lib/shiki.ts:54`). PROJECT.md
  specifies a full theming system as a core requirement (3 built-in themes, visual settings
  panel, per-folder overrides). When theming lands in a later phase, this literal will need
  to be replaced with a dynamic value. A `// TODO: wire to active theme` comment would
  prevent it from being missed. Not a simplification issue, just a forward-visibility note.
  Effort: trivial.

---

## Summary

- **Duplication found:** 1 instance (file-row button repeated in tree view and search results)
- **Dead code found:** 2 unused definitions (`fileName` prop, `FolderStats` type)
- **Complexity hotspots:** 0 functions exceed thresholds (largest is `FileTree` at ~60 lines
  including both exported component and internal helpers, well within bounds)
- **AI bloat patterns:** 1 instance (`_fileName` suppression indicating a prop wired up
  defensively without a render site)
- **Estimated cleanup impact:** ~20 lines removable, 1 abstraction (SearchBar) potentially
  eliminable, 0 logic changes required

## Recommendation

The Phase 1 codebase is clean overall. The two high-priority findings are mechanical
removals (dead prop and dead type) that take under five minutes combined and reduce future
confusion. The file-row duplication is worth addressing before `FileTree` grows further —
a Phase 2 that adds icons, badges, or modified-file indicators will have to apply the same
change twice if the duplicate is left in place.

The medium and low items can be deferred without risk. Simplification of the two high-priority
findings is recommended before Phase 2 begins.
