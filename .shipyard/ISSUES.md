# Shipyard Non-Blocking Issues

Issues tracked here survive across sessions and are carried forward into future reviews.

---

## PLAN-1.1 — Tauri v2 Project Scaffold

**Review date:** 2026-04-13

### Important

#### I-1: Filesystem capability scope is too narrow for a markdown viewer
- **File:** `src-tauri/capabilities/default.json` lines 13–18
- **Detail:** Both `fs:allow-read-text-file` and `fs:allow-read-dir` are scoped to
  `$APPDATA/**` only. Markd is a markdown *viewer* — users open files from arbitrary
  disk locations (Documents, Downloads, Desktop, etc.). Any file-read command targeting
  a path outside `$APPDATA` will be silently denied by the Tauri runtime. This capability
  gap will surface as a runtime failure the moment the first `readTextFile` command is
  wired to a user-chosen file path.
- **Remediation:** Add `$HOME/**` (or `$DOCUMENT/**` and `$DOWNLOAD/**`) to the `allow`
  array, or use the `fs:scope-home-recursive` preset. Must be done before any
  file-reading commands are implemented.
- **Status:** RESOLVED in PLAN-2.1 — `$HOME/**` added to both fs permissions.

#### I-2: `@typescript-eslint/no-explicit-any` not enforced
- **File:** `eslint.config.js`
- **Detail:** `strict: true` in `tsconfig.json` prevents *implicit* `any` but not
  explicit `as any` casts or `: any` annotations. The `typescript-eslint` recommended
  config includes this rule at `warn` level. Without `error` enforcement, type safety
  can be eroded silently as business logic is added.
- **Remediation:** Add `'@typescript-eslint/no-explicit-any': 'error'` to the `rules`
  block in `eslint.config.js`.
- **Status:** Open

---

### Suggestions

#### S-1: `react-hooks/exhaustive-deps` and `rules-of-hooks` not configured
- **File:** `eslint.config.js`
- **Detail:** `eslint-plugin-react-hooks` is not installed or configured. These rules
  catch missing effect dependencies and conditional hook calls — a common source of
  subtle React bugs. The absence of this rule allowed IMPORTANT-1 (stale `drawMinimap`
  closure) to go undetected in Phase 5.
- **Remediation:** `npm install -D eslint-plugin-react-hooks` and add the flat config
  recommended preset to `eslint.config.js`.
- **Status:** Open

#### S-2: `vitest@^2` / `vite@^6` version mismatch
- **File:** `package.json` devDependencies
- **Detail:** Vite 6 pairs with Vitest 3. Vitest 2 was designed for Vite 5. The pairing
  may work but is not officially supported and can produce subtle test environment
  inconsistencies.
- **Remediation:** Upgrade `vitest` and `@vitest/ui` to `^3.0.0`.
- **Status:** RESOLVED in PLAN-4.1 — both upgraded to `^3.2.4`.

#### S-3: `tsconfig.node.json` lib/target mismatch
- **File:** `tsconfig.node.json` lines 3–4
- **Detail:** `target: "ES2022"` but `lib: ["ES2023"]`. The lib is ahead of the target,
  meaning TypeScript will accept ES2023 built-ins that the ES2022 target won't guarantee
  are available.
- **Remediation:** Align to `"lib": ["ES2022"]` or raise `target` to `"ES2023"`.
- **Status:** Open

#### S-4: `shiki` version pin is overly broad
- **File:** `package.json` line 24 (`"shiki": "^1.0.0"`)
- **Detail:** Resolves to the latest 1.x which has had API surface changes within the
  minor series. After initial install, tighten to the resolved minor version.
- **Remediation:** Update to the installed version's minor lower bound (e.g. `^1.24.0`).
- **Status:** Open

#### S-5: Hardcoded colour values in placeholder component
- **File:** `src/App.tsx` line 3 (`bg-[#1e1e1e] text-[#cccccc]`)
- **Detail:** Arbitrary Tailwind values in the placeholder should be replaced with
  semantic tokens before they proliferate. Not urgent — scaffold only.
- **Remediation:** Use Tailwind CSS variables or semantic classes (`bg-zinc-900
  text-zinc-300`) when building out the actual UI.
- **Status:** Open

---

## PLAN-2.1 — Backend Commands: File Tree & Markdown Parsing

**Review date:** 2026-04-13

### Important

#### I-3: Hidden file entries (non-directory files starting with `.`) not filtered
- **File:** `src-tauri/src/commands/files.rs` lines 31–50
- **Detail:** The `filter_entry` closure skips hidden *directories* but returns `true`
  unconditionally for all non-directory entries. A file named `.hidden.md` would be
  collected and appear in the tree returned to the frontend.
- **Remediation:** Extend the non-directory branch of `filter_entry` to exclude files
  whose name starts with `.`:
  ```rust
  } else {
      e.file_name()
          .to_str()
          .map(|s| !s.starts_with('.'))
          .unwrap_or(false)
  }
  ```
- **Status:** RESOLVED in PLAN-2.1 — `filter_entry` now filters any entry (file or dir) starting with `.`

#### I-4: `read_file` has no Rust-side path validation
- **File:** `src-tauri/src/commands/files.rs` lines 20–23
- **Detail:** Accepts any arbitrary `path: String` and calls `std::fs::read_to_string`
  with no restriction. Runtime enforcement via the Tauri capability (`$HOME/**`) is
  the only guard. If the capability is ever broadened or the command is invoked in a
  test harness, there is no Rust-side constraint.
- **Remediation:** Add a `.md` extension check (or home-directory prefix check) before
  calling `read_to_string`:
  ```rust
  if !path.ends_with(".md") {
      return Err(format!("Only .md files may be read: {}", path));
  }
  ```
- **Status:** RESOLVED in PLAN-2.1 — extension check and hidden-file filter both applied.

---

### Suggestions

#### S-6: `build_tree_from_paths` / `build_dir_children` return misleading `Result` type
- **File:** `src-tauri/src/commands/files.rs` lines 57–63 and 65–143
- **Detail:** Both functions declare `-> Result<Vec<FileEntry>, std::io::Error>` but
  are infallible — the error type is never produced and `?` is never used inside them.
- **Remediation:** Change both return types to `Vec<FileEntry>` (infallible) and update
  `build_file_tree` to return `Ok(build_tree_from_paths(root, &md_paths))`.
- **Status:** Open

#### S-7: Redundant `subdir.is_dir()` syscall
- **File:** `src-tauri/src/commands/files.rs` line 122
- **Detail:** All paths in `subdirs` are constructed from components of known-traversed
  `.md` file paths and are by definition directories. The `is_dir()` syscall on each
  subdir is an unnecessary filesystem round-trip.
- **Remediation:** Remove the `if subdir.is_dir()` guard; the existing
  `if !children.is_empty()` check at line 124 handles the empty-children case.
- **Status:** Open

#### S-8: `parse_markdown` wraps an infallible operation in `Result`
- **File:** `src-tauri/src/commands/markdown.rs` line 12
- **Detail:** `pulldown_cmark::html::push_html` writes to a `String` and cannot fail.
  Returning `Result<String, String>` implies a failure mode that does not exist, which
  slightly misrepresents the API contract to callers.
- **Remediation:** Change return type to `String` and return `html_output` directly.
  Reintroduce `Result` only if a fallible step (e.g. syntax highlighting) is added later.
- **Status:** Open

---

## PLAN-4.1 — CI Pipeline, README, SECURITY.md, and LICENSE

**Review date:** 2026-04-13

### Important

#### I-9: Third-party GitHub Actions not pinned to commit SHAs
- **File:** `.github/workflows/ci.yml` lines 18, 23
- **Detail:** `dtolnay/rust-toolchain@stable` and `swatinem/rust-cache@v2` use floating
  tag references. A force-pushed tag is an established supply-chain attack vector.
  `actions/checkout@v4` and `actions/setup-node@v4` carry lower risk as first-party
  actions but share the same structural vulnerability.
- **Remediation:** Pin all third-party actions to a full commit SHA with a human-readable
  comment indicating the tag. Tools like `pinact` or Dependabot's `github-actions`
  ecosystem can automate maintenance of pinned SHAs.
- **Status:** Open

#### I-10: README Testing section omits `cargo fmt --check`
- **File:** `README.md` lines 62–70
- **Detail:** The CI workflow runs `cargo fmt --check` as a distinct step (ci.yml line 42)
  but the README Testing section only lists `cargo clippy` and `cargo test`. A contributor
  following only the README will get an unexpected CI failure on the fmt check.
- **Remediation:** Add `cd src-tauri && cargo fmt --check` to the Rust testing block in
  the README, before the clippy line.
- **Status:** RESOLVED in PLAN-4.1 — `cargo fmt --check` and `npm run test:coverage` added to Testing section.

#### I-11: README Project Structure tree does not match actual directory layout
- **File:** `README.md` lines 48–58
- **Detail:** The tree omits `src/test/` (which exists on disk containing `setup.ts`) and
  shows a flat `src/components/` with no indication of the four named subdirectories
  (`ActivityBar/`, `MainPanel/`, `Sidebar/`, `StatusBar/`). The `src-tauri/` entry omits
  the `src/commands/` subdirectory, which is the primary extension point.
- **Remediation:** Expand the tree to accurately reflect the on-disk layout. See REVIEW-4.1
  for the suggested replacement tree.
- **Status:** RESOLVED in PLAN-4.1 — tree updated to reflect actual layout.

#### I-12: SECURITY.md vulnerability contact is a non-functional placeholder
- **File:** `SECURITY.md` line 21
- **Detail:** `Email: [TO BE ADDED -- maintainer email]` is unresolved. Any researcher
  who finds a real vulnerability has no actionable contact channel. This is acceptable
  during development but must be resolved before the repository is public or any release
  is tagged.
- **Remediation:** Replace with a real email address or a GitHub Security Advisory link
  (`https://github.com/maylortaylor/markd/security/advisories/new`) before going public.
- **Status:** Open

---

### Suggestions

#### S-9: System dependencies step ordering in ci.yml
- **File:** `.github/workflows/ci.yml` lines 27–36
- **Detail:** Node.js is installed (line 27) before Linux system dependencies (line 33).
  The current order works but is unconventional — OS deps conventionally precede language
  toolchain installs. Reordering improves readability and future-proofs against native
  Node addon scenarios.
- **Remediation:** Move "Install system dependencies (Linux)" to immediately after "Rust
  cache" and before "Install Node.js". No functional change.
- **Status:** Open

#### S-10: README dev command `cargo tauri dev` requires a global Cargo CLI install
- **File:** `README.md` line 44
- **Detail:** `cargo tauri dev` only works if `tauri-cli` is installed globally via
  Cargo. The prerequisites listed in the README do not mention this. `npm run tauri dev`
  uses the locally installed `@tauri-apps/cli` (already in devDependencies) and is the
  more reliable instruction.
- **Remediation:** Replace `cargo tauri dev` with `npm run tauri dev` in the install and
  run block.
- **Status:** Open

#### S-11: SECURITY.md Supported Versions table is uninformative pre-release
- **File:** `SECURITY.md` lines 27–31
- **Detail:** The table has only "Latest / Yes" and "Older / No" rows before any release
  exists, which adds no real information and implies versioned releases already exist.
- **Remediation:** Collapse to a prose sentence until the first release is tagged.
- **Status:** Open

#### S-12: README Testing section omits `npm run test:coverage`
- **File:** `README.md` lines 62–70
- **Detail:** `package.json` defines `test:coverage` (vitest with coverage reporting) but
  it is not documented in the README. Contributors have no documented path to check
  coverage before opening a PR.
- **Remediation:** Add `npm run test:coverage` to the Testing section.
- **Status:** Open

---

## Security Audit — Phase 1

**Audit date:** 2026-04-13

### High

#### SEC-1: Unpinned third-party CI action tags (supply-chain risk)
- **File:** `.github/workflows/ci.yml`
- **Detail:** `dtolnay/rust-toolchain@stable` and `swatinem/rust-cache@v2` use floating
  mutable tag references. For a project making explicit privacy/security promises, this
  is a credibility gap. If either account is compromised, malicious code executes silently
  in CI with full runner access.
- **Remediation:** Pin all third-party actions to full commit SHAs. Use `pinact` or
  Dependabot's `github-actions` ecosystem for automated SHA maintenance.
- **Status:** Open — address before first public release

### Medium

#### SEC-2: `parse_markdown` does not sanitize HTML — relies on CSP as sole XSS guard
- **File:** `src-tauri/src/commands/markdown.rs`
- **Detail:** `pulldown-cmark`'s `html::push_html` passes raw HTML from the source
  markdown verbatim. A markdown file containing `<script>alert(1)</script>` or
  `<img onerror="...">` will be emitted as-is. The Tauri webview CSP (`script-src 'self'`)
  blocks inline script execution, but CSS-based attacks and `<meta>` redirects are not
  blocked by CSP alone.
- **Remediation:** Add a sanitization pass using the `ammonia` crate before returning HTML
  from `parse_markdown`. This provides defense-in-depth independent of CSP configuration.
- **Status:** Open — address in Phase 2

#### SEC-3: `read_file` has no directory-scope enforcement — path traversal possible
- **File:** `src-tauri/src/commands/files.rs`
- **Detail:** The `.md` extension check is present but there is no check that the resolved
  path stays within the user-selected directory. The Tauri capability (`$HOME/**`) provides
  a backstop, but reads to any `.md` file anywhere under `$HOME` are permitted — not just
  files in the selected folder.
- **Remediation:** In `read_file`, canonicalize the path with `std::fs::canonicalize()` and
  verify the resolved path has the selected root as a prefix before reading. Requires passing
  the selected root path as a parameter or storing it in app state.
- **Status:** Open — address in Phase 2

---

## PLAN-5.1 — Maritime Restyle + Document Outline + Minimap

**Review date:** 2026-04-13

### Important

#### I-13: Minimap `useEffect` observer registration silently skipped when `scrollRef.current` is null at RAF time
- **File:** `src/components/MainPanel/Minimap.tsx` lines 66–90
- **Detail:** `scrollRef.current` is captured on line 72, *outside* the RAF callback. If
  the ref is null at that moment (a real possibility on first mount), the early return
  on line 73 exits after cancelling only the RAF — no scroll listener, ResizeObserver,
  or MutationObserver is registered. The minimap draws once via the RAF but then stops
  updating until the user switches files. See REVIEW-5.2 BLOCKING-1 for full analysis
  and remediation pattern using observer refs.
- **Status:** Open

#### I-14: Minimap canvas `offsetWidth`/`offsetHeight` are `0` on first paint — minimap blank until next file load
- **File:** `src/components/MainPanel/Minimap.tsx` lines 17–19
- **Detail:** The early return guard `if (w === 0 || h === 0) return` correctly avoids
  a degenerate canvas, but a single RAF is not sufficient to guarantee layout has been
  computed in the Tauri webview on first mount. The result is a blank minimap until the
  next `markdownHtml` change triggers a re-run of the effect.
- **Remediation:** Observe the canvas element itself with a `ResizeObserver` that fires
  `drawMinimap` once the canvas has a non-zero size, replacing the initial RAF draw.
  See REVIEW-5.2 BLOCKING-2.
- **Status:** Open

#### I-15: `OutlinePanel` scrolls via global `document.getElementById` — races with MainPanel's ID-injection effect
- **File:** `src/components/Sidebar/OutlinePanel.tsx` line 11
- **Detail:** Heading IDs are injected by `MainPanel`'s `useEffect` (MainPanel.tsx lines
  24–29). There is a timing window between `useMemo` computing `outlineEntries` and the
  effect committing IDs to the DOM. Clicking a heading before the effect runs returns
  null from `getElementById` and the click silently does nothing. Also couples OutlinePanel
  to a sibling's DOM via global query.
- **Remediation:** Pass `scrollRef` from App → Sidebar → OutlinePanel and query within
  `scrollRef.current` instead of `document`. See REVIEW-5.2 BLOCKING-3.
- **Status:** Open

#### I-16: `drawMinimap` in `Minimap.tsx` recreated every render — stale closure in effect
- **File:** `src/components/MainPanel/Minimap.tsx` lines 11–64, 90
- **Detail:** `drawMinimap` is a plain function defined in the component body. The
  `useEffect` closes over the version from the render in which the effect last ran, not
  the current one. Safe today (the function only reads stable refs), but fragile under
  future refactoring. The absence of `react-hooks/exhaustive-deps` (S-1) means this
  won't be caught automatically.
- **Remediation:** Wrap `drawMinimap` in `useCallback(fn, [])`. See REVIEW-5.2 IMPORTANT-1.
- **Status:** Open

#### I-17: `FileTree` passes `depth={0}` to all recursive children — indentation prop inconsistent with CSS nesting
- **File:** `src/components/Sidebar/FileTree.tsx` line 68
- **Detail:** All children of expanded directories are rendered with `depth={0}` regardless
  of actual nesting depth. The `depth` prop (`8 + depth * 16`) and the CSS margin nesting
  (`ml-3 pl-2 border-l`) both try to control indentation but are inconsistent. `depth`
  should either be removed entirely or pass `depth + 1` to recursive children.
- **Remediation:** Pass `depth={depth + 1}` on line 68, or remove the `depth` prop and
  rely solely on the CSS nesting. See REVIEW-5.2 IMPORTANT-2.
- **Status:** Open

#### I-18: `flattenSearch` in `FileTree.tsx` called on every render without memoization
- **File:** `src/components/Sidebar/FileTree.tsx` lines 137–138
- **Detail:** Synchronous O(N) tree traversal runs on every render of `FileTree`, including
  renders from unrelated state changes. No debounce on the search input. For large folders
  this blocks the main thread.
- **Remediation:** Wrap in `useMemo([entries, searchQuery])`. See REVIEW-5.2 IMPORTANT-5.
- **Status:** Open

### Suggestions

#### S-13: `aria-current` uses string `'true'` instead of boolean `true`
- **File:** `src/components/Sidebar/FileTree.tsx` lines 89, 154
- **Detail:** `aria-current={isSelected ? 'true' : undefined}` — the string `'true'` is
  not a valid `aria-current` enumerated token. Use the boolean `true` in JSX.
- **Remediation:** `aria-current={isSelected ? true : undefined}`
- **Status:** Open

#### S-14: `OutlinePanel` heading buttons lack `aria-label` — screen reader reads "H2 heading text" rather than just the heading text
- **File:** `src/components/Sidebar/OutlinePanel.tsx` lines 31–41
- **Detail:** The `H{level}` span is not `aria-hidden` and will be read aloud. Adding an
  explicit `aria-label` on the button provides a cleaner announcement.
- **Remediation:** `aria-label={\`${entry.text} (H${entry.level})\`}`. See REVIEW-5.2 IMPORTANT-4.
- **Status:** Open

#### S-15: Minimap canvas has both `aria-label` and `aria-hidden="true"` — contradictory
- **File:** `src/components/MainPanel/Minimap.tsx` lines 103–109
- **Detail:** `aria-hidden="true"` removes the element from the accessibility tree, making
  `aria-label` unreachable. Remove `aria-label` and keep `aria-hidden` for a decorative canvas.
- **Status:** Open

#### S-16: `_fileName` prop in `MainPanel` is accepted but unused — dead interface surface
- **File:** `src/components/MainPanel/MainPanel.tsx` line 13
- **Detail:** `fileName: _fileName` is in the public interface but no output is produced.
  Callers (App.tsx) must supply it. Remove from the interface until the feature is implemented.
- **Status:** Open

#### S-17: `countFiles` called inline during App render — should be memoized
- **File:** `src/App.tsx` line 92
- **Detail:** `countFiles(files)` recursively traverses the file tree on every App render,
  including renders from `sidebarView` or `searchQuery` changes that don't affect `files`.
- **Remediation:** `const fileCount = useMemo(() => countFiles(files), [files]);`
- **Status:** Open

#### S-18: `IconButton` references `React.ReactNode` without a React import
- **File:** `src/components/ActivityBar/ActivityBar.tsx` line 14
- **Detail:** `icon: React.ReactNode` resolves via global `@types/react` namespace. Prefer
  an explicit `import type { ReactNode } from 'react'` to avoid implicit global dependency.
- **Status:** Open
