# Markd — Roadmap

## Phase 1: Foundation

**Goal:** Scaffolded Tauri v2 app with working markdown read loop, VS Code-style layout, basic CI pipeline. Something you can open and actually use.

### Scope

- Tauri v2 project scaffold (Rust backend + React/TypeScript frontend + Vite)
- GitHub Actions CI: lint (`cargo clippy` + `eslint`), test (`cargo test` + `vitest`), type check (`tsc`)
- VS Code-inspired layout: activity bar, sidebar, main panel, status bar — with hard-coded dark theme
- Folder picker dialog (Tauri native)
- Rust backend: scan folder recursively for `.md` files, build file tree, parse markdown with `pulldown-cmark` (GFM), syntax highlighting with `syntect` or `shiki`
- Tauri commands: `list_files`, `read_file`, `parse_markdown`
- Frontend: sidebar file tree (collapsible folders), search/filter bar, click-to-render markdown in main panel
- Status bar showing folder path and file count
- Tauri security config: deny all network access, restrict filesystem to selected folder + app config dir
- Basic Rust unit tests (file scanning, markdown parsing, config types)
- Basic frontend tests (sidebar renders, search filters, markdown displays)
- README with project description, dev setup instructions, and privacy promise
- SECURITY.md
- LICENSE (MIT)

### Success Criteria

1. `cargo tauri dev` launches the app on macOS/Linux/Windows
2. User can select a folder and see all `.md` files in the sidebar tree
3. Clicking a file renders it as styled GFM markdown with syntax highlighting
4. Search bar filters the file tree by filename
5. CI pipeline runs lint + test + type check on push to any branch
6. No network access is possible (Tauri allowlist enforced)
7. All Rust and frontend tests pass

### Dependencies

None — this is the first phase.

---

## Phase 2: Workspaces & File Watching

**Goal:** Multiple workspace support with pinning, live file watching, tabbed file viewing, and command palette.

### Scope

- Workspace management in Rust backend: add, remove, rename, pin/unpin, list, switch
- TOML config file for workspaces (`~/.config/markd/config.toml` or platform equivalent via Tauri app data API)
- Workspace switcher UI in sidebar (pinned at top, unpinned sorted alphabetically)
- Remember last-opened workspace on launch
- `notify` crate for live filesystem watching (create, modify, delete, rename events)
- Sidebar updates in real-time when files change on disk
- Tab bar for multiple open files (click to switch, middle-click/x to close)
- Command palette (Ctrl/Cmd+P) for quick file search, workspace switching
- Tauri commands: `list_workspaces`, `add_workspace`, `remove_workspace`, `pin_workspace`, `switch_workspace`
- Tests for workspace CRUD operations, file watcher events, tab state management

### Success Criteria

1. User can save multiple folder paths as named workspaces
2. Pinned workspaces appear at the top of the workspace list
3. Switching workspaces reloads the sidebar tree immediately
4. App remembers and reopens the last active workspace on launch
5. Adding/editing/deleting a `.md` file in the watched folder updates the sidebar without manual refresh
6. Multiple files can be open in tabs simultaneously
7. Command palette opens with Ctrl/Cmd+P and allows file search and workspace switching
8. All new tests pass, CI stays green

### Dependencies

Phase 1 complete.

---

## Phase 3: Theming & Customization

**Goal:** Full theming engine with visual settings panel, 3 built-in themes, per-folder config overrides, and live preview.

### Scope

- CSS variable-based theme engine in frontend
- 3 built-in themes: dark (default), light, solarized dark
- Full TOML config schema for theme customization (chrome + content rendering)
- Global config: `~/.config/markd/config.toml` `[theme]` section
- Per-folder override: `.markd.toml` in workspace root (partial, merges on top of global)
- Config merging logic in Rust backend (global defaults → per-folder overrides)
- Settings panel UI (gear icon in activity bar):
  - Scope toggle (Global vs Workspace)
  - Grouped sections: Appearance, Typography, Headings, Code Blocks, Links, Blockquotes, Tables, Images
  - Color pickers, sliders with number input, dropdowns, toggles
  - Search/filter settings by keyword
  - Live preview (changes apply immediately to open markdown)
  - Reset per-section and global reset to defaults
- System font detection for font family dropdown
- Tauri commands: `get_config`, `update_config`, `get_theme`, `list_system_fonts`
- Tests for config merging, theme application, settings panel interactions

### Success Criteria

1. User can switch between 3 built-in themes and see the app update immediately
2. Every setting in the TOML schema is controllable from the settings panel
3. Changes apply live without a save button
4. Per-folder `.markd.toml` overrides merge correctly on top of global config
5. Switching workspaces applies the correct per-folder overrides
6. Settings search filters to matching controls
7. Reset controls restore defaults correctly
8. All new tests pass, CI stays green

### Dependencies

Phase 2 complete.

---

## Phase 4: Release & Polish

**Goal:** Full cross-platform release pipeline, contributor documentation, final QA, and v0.1.0 release.

### Scope

- GitHub Actions release workflow: build macOS (.dmg), Linux (.deb + .AppImage), Windows (.msi) on tag push
- `tauri-action` for cross-platform builds
- Manual build workflow dispatch (pick platform + branch for testing)
- GitHub Releases with downloadable installers
- Stage branch CI: compile check (build without artifacts)
- README overhaul:
  - Project description + screenshot
  - Privacy promise
  - Download links
  - Features list
  - Git flow & contributing guide (branch structure, PR rules, CI pipeline)
  - Development setup instructions
  - Testing guide
  - Release process
  - License + security link
- About page in the app (version, privacy promise, link to repo)
- `.markd.toml.example` file in repo root
- CHANGELOG.md
- Final QA pass across macOS, Linux, Windows
- Version bump to v0.1.0 and first tagged release

### Success Criteria

1. Tagged push to `main` produces downloadable installers for all 3 platforms
2. Manual build workflow works from any branch
3. README is complete and useful for new contributors
4. About page displays version and privacy promise
5. App works correctly on macOS, Linux, and Windows
6. CHANGELOG documents all features in v0.1.0
7. GitHub Release page has downloadable installers with release notes

### Dependencies

Phase 3 complete.
