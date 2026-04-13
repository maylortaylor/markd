# Markd — Design Document

> **Date:** 2026-04-13
> **Author:** Matt Taylor + Claude (brainstorming session)
> **Status:** Draft — ready for review before implementation
> **Repo (planned):** `github.com/maylortaylor/markd`

---

## 1. Core Identity

**Markd** is a cross-platform desktop app that watches a folder of markdown files
and renders them in a clean, highly customizable reading UI.

- **Read-only viewer** — editing may come later, not now
- **Customization is a feature, not an afterthought** — extensive theming and style controls from day one
- **Security-first, privacy-guaranteed** — your files never leave your machine
- **VS Code-inspired UI** — familiar layout, zero learning curve for developers
- **Open source** — MIT or similar license, public repo, auditable by anyone

**Primary use cases:**
- **Developer documentation browser** — point it at a repo's `docs/` folder and browse rendered markdown while coding
- **Personal knowledge base** — lightweight reader for a vault of markdown notes without editing overhead

---

## 2. Privacy & Security Promise

This is non-negotiable and central to the app's identity.

- **100% local** — No network calls, no telemetry, no analytics, no phone-home. The app never touches the internet. Period.
- **No data leaves your machine** — Files are read from disk and rendered in-app. Nothing is cached externally, uploaded, or sent anywhere.
- **No training data** — Your markdown files are never used for AI training, analytics, or any data collection.
- **Filesystem sandbox** — Tauri's security model restricts the app to only the folders you explicitly grant access to. It cannot read outside the watched directory and app config.
- **Open source verifiable** — Anyone can audit the code and confirm these claims. The build pipeline is public on GitHub Actions — what you see in the repo is what gets compiled.
- **No accounts, no cloud, no sign-in** — The app works fully offline, forever.

This will be front and center in: the README, the app's About page, and a `SECURITY.md` in the repo.

---

## 3. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| App framework | **Tauri v2** | Small binary (~5-10MB), Rust backend, strong security sandbox, cross-platform |
| Backend | **Rust** | Memory safety, performance, no runtime needed |
| Frontend | **React + TypeScript** | Familiar UI layer, large ecosystem, Vite bundler (comes with Tauri) |
| Markdown parsing | **pulldown-cmark** (Rust) | Fast, GFM extensions, battle-tested |
| Syntax highlighting | **syntect** (Rust) or **shiki** (frontend) | Rich language support, theme variety |
| File watching | **notify** crate (Rust) | Cross-platform filesystem events, battle-tested |
| Config format | **TOML** via **serde** | Human-readable, Rust-native, easy to parse |
| CI/CD | **GitHub Actions** | Free for public repos, supports macOS/Linux/Windows runners |
| Build/release | **tauri-action** | Official Tauri GitHub Action for cross-platform builds |

---

## 4. Architecture

```
+---------------------------------------------------+
|                   Tauri Shell                      |
|  +-------------------+  +-----------------------+ |
|  |   Rust Backend     |  |  React Frontend       | |
|  |                    |  |                        | |
|  |  File Watcher      |<->  Sidebar Tree         | |
|  |  (notify crate)    |  |  Search Bar            | |
|  |                    |  |  Markdown Renderer     | |
|  |  Markdown Parser   |  |  Theme Engine          | |
|  |  (pulldown-cmark)  |  |  Settings Panel        | |
|  |                    |  |  Workspace Switcher    | |
|  |  Config Manager    |  |                        | |
|  |  (serde + TOML)    |  |                        | |
|  |                    |  |                        | |
|  |  Workspace Manager |  |                        | |
|  +-------------------+  +-----------------------+ |
|            ^                                       |
|            | reads only                            |
|  +---------+------------------+                    |
|  |  Local Filesystem          |                    |
|  |  ~/.config/markd/     |                    |
|  |    config.toml (global)    |                    |
|  |  /your/docs/               |                    |
|  |    .markd.toml        |                    |
|  |    (per-folder override)   |                    |
|  +----------------------------+                    |
+---------------------------------------------------+
```

### Rust Backend Responsibilities

- Watch the target folder for file changes via `notify`
- Read and parse `.md` files with `pulldown-cmark`
- Load and merge config (global + per-folder TOML)
- Manage workspaces (add, remove, pin, switch)
- Expose Tauri commands: `list_files`, `read_file`, `get_config`, `update_config`, `list_workspaces`, `add_workspace`, `remove_workspace`, `pin_workspace`
- **No network access** — Tauri's `allowlist` explicitly denies all HTTP/fetch/WebSocket capabilities

### React Frontend Responsibilities

- Render the sidebar tree and search
- Display parsed markdown with styling
- Theme engine — apply user's customization choices in real-time via CSS variables
- Settings panel UI for all visual preferences
- Workspace switcher UI
- Tab management for multiple open files
- Command palette (Ctrl/Cmd+P)
- Listen for file-change events from Rust backend via Tauri event system

### Data Flow

1. User opens app -> loads last active workspace (or prompts to pick a folder)
2. Rust scans folder, builds file tree, sends to frontend
3. User clicks a file -> Rust reads + parses it -> sends HTML to frontend
4. Frontend applies theme/styles and renders
5. `notify` detects a change -> Rust re-reads -> pushes update to frontend
6. User switches workspace -> Rust loads new folder + per-folder config -> frontend reloads

---

## 5. UI Layout (VS Code-Inspired)

```
+--------------------------------------------------------------+
|  Activity Bar |  Sidebar              |  Main Panel           |
|  (icon rail)  |                       |                       |
|  +---------+  |  +-----------------+  |  +-----------------+  |
|  | Files   |  |  | Workspace      |  |  | Tab Bar         |  |
|  | Search  |  |  | Switcher       |  |  | file.md  x      |  |
|  | Config  |  |  +-----------------+  |  +-----------------+  |
|  |         |  |  | Search...      |  |  |                 |  |
|  |         |  |  +-----------------+  |  |  Rendered       |  |
|  |         |  |  | (pin) PSD Docs |  |  |  Markdown       |  |
|  |         |  |  | (pin) Personal |  |  |  Content        |  |
|  |         |  |  |  Side Project  |  |  |                 |  |
|  |         |  |  +-----------------+  |  |                 |  |
|  |         |  |  | > docs/        |  |  |                 |  |
|  |         |  |  |   > guides/    |  |  |                 |  |
|  |         |  |  |     setup.md   |  |  |                 |  |
|  |         |  |  |     deploy.md  |  |  |                 |  |
|  |         |  |  |   README.md    |  |  |                 |  |
|  |         |  |  |   CHANGELOG.md |  |  |                 |  |
|  +---------+  |  +-----------------+  |  +-----------------+  |
+---------------+----------------------------------------------- +
|  Status Bar                                                   |
|  workspace: PSD Docs  -  12 files  -  watching (active)       |
+--------------------------------------------------------------+
```

### Key Elements

- **Activity bar** (left icon rail) — Switch between file explorer, search, and settings views
- **Sidebar** — Context changes based on activity bar selection. Default is file explorer with workspace switcher at top
- **Workspace switcher** — Pinned workspaces sort to top with pin icon. Click to switch, right-click for manage/remove/rename
- **Search bar** — Filter files in current workspace by name
- **File tree** — Collapsible folder structure, click to open in main panel
- **Tab bar** — Open multiple files in tabs. Click to switch, middle-click or x to close
- **Status bar** (bottom) — Current workspace name, file count, watching indicator
- **Command palette** (Ctrl/Cmd+P) — Quick file search, switch workspace, change settings
- **Resizable panels** — Drag the sidebar edge to resize, collapse with a click

### Excluded from v1

- No terminal, no git panel, no extensions sidebar
- No minimap, no breadcrumbs
- No multi-pane split view

---

## 6. Workspace Management

A **workspace** is a saved reference to a folder path. The app maintains a list of
workspaces so you can switch between doc sets quickly.

### Behavior

- **Add workspace** — Pick a folder, give it a name (defaults to folder name). Saved to global config.
- **Pin workspaces** — Pinned workspaces sort to the top of the list. Unpinned sort alphabetically or by last-opened.
- **Switch workspace** — Click a workspace, the sidebar tree reloads with that folder's files. Per-folder `.markd.toml` applies immediately.
- **Remove workspace** — Removes the saved reference only. Never touches the actual folder or files.
- **Last-opened memory** — App reopens the last active workspace on launch.

### Config Representation

```toml
[app]
last_workspace = "psd-docs"

[[workspaces]]
name = "PSD Docs"
id = "psd-docs"
path = "/Users/matt/docs/psd"
pinned = true

[[workspaces]]
name = "Personal Notes"
id = "personal-notes"
path = "/Users/matt/notes"
pinned = true

[[workspaces]]
name = "Side Project"
id = "side-project"
path = "/Users/matt/dev/coolapp/docs"
pinned = false
```

---

## 7. Theming & Customization System

This is the heart of Markd. Users control every visual aspect of how their
markdown looks.

### Two Layers of Customization

1. **App chrome** — The shell: sidebar, activity bar, tabs, status bar colors
2. **Content rendering** — The markdown itself: fonts, spacing, colors, code blocks

### Built-in Themes (v1)

| Theme | App Chrome | Content Style |
|-------|-----------|---------------|
| Dark (default) | VS Code dark | GitHub dark markdown |
| Light | VS Code light | GitHub light markdown |
| Solarized Dark | Solarized colors | Solarized content |

Users pick a base theme, then override anything they want.

### Full Configuration Reference

```toml
[theme]
base = "dark"                # dark | light | solarized-dark

[theme.chrome]
sidebar_bg = "#1e1e1e"
sidebar_text = "#cccccc"
activity_bar_bg = "#333333"
tab_active_bg = "#1e1e1e"
tab_inactive_bg = "#2d2d2d"
status_bar_bg = "#007acc"

[theme.content]
font_family = "Inter"
font_size = 16
line_height = 1.6
max_width = 800              # content max-width in px, 0 = full width
paragraph_spacing = 16

[theme.content.headings]
h1_size = 32
h2_size = 24
h3_size = 20
h1_color = "#ffffff"
h1_border_bottom = true      # underline like GitHub

[theme.content.code]
font_family = "Fira Code"
font_size = 14
block_bg = "#1e1e1e"
block_border_radius = 6
inline_bg = "#2d2d2d"
syntax_theme = "one-dark"    # maps to a syntect/shiki theme

[theme.content.links]
color = "#4493f8"
underline = true

[theme.content.blockquotes]
border_color = "#3b3b3b"
bg = "#161b22"
italic = false

[theme.content.tables]
striped = true
border_color = "#30363d"
header_bg = "#161b22"

[theme.content.images]
max_width = "100%"
border_radius = 4
shadow = true
```

### Per-Folder Overrides

A `.markd.toml` file in a watched folder is a **partial** config. Only the keys
present override the global config. Everything else falls back to global defaults.

```toml
# .markd.toml — shipped with a repo
[theme]
base = "light"

[theme.content]
font_family = "IBM Plex Sans"
max_width = 720
```

This means a project maintainer can ship a preferred reading style with their docs.

---

## 8. Settings Panel

Accessed via the gear icon in the activity bar. Replaces the sidebar + main panel
with a full settings view (same pattern as VS Code's settings page).

### Layout

```
+------------------------------------------------------+
| Activity Bar |  Settings                              |
|              |                                        |
|  Files       |  Search settings...                    |
|  Search      |                                        |
|  Config *    |  Scope: [Global] [Workspace]           |
|              |                                        |
|              |  > Appearance                          |
|              |    Base Theme    [Dark]                 |
|              |    Sidebar BG    [## #1e1e1e]          |
|              |    Activity Bar  [## #333333]          |
|              |    Status Bar    [## #007acc]          |
|              |                                        |
|              |  > Typography                          |
|              |    Font Family   [Inter]                |
|              |    Font Size     [---*----] 16px       |
|              |    Line Height   [----*---] 1.6        |
|              |    Max Width     [---*----] 800px      |
|              |                                        |
|              |  > Headings                            |
|              |    H1 Size       [----*---] 32px       |
|              |    H1 Color      [## #ffffff]          |
|              |    H1 Underline  [x]                    |
|              |    H2 Size       [---*----] 24px       |
|              |                                        |
|              |  > Code Blocks                         |
|              |    Font Family   [Fira Code]            |
|              |    Font Size     [---*----] 14px       |
|              |    Background    [## #1e1e1e]          |
|              |    Syntax Theme  [One Dark]             |
|              |    Border Radius [---*----] 6px        |
|              |                                        |
|              |  > Links                               |
|              |  > Blockquotes                         |
|              |  > Tables                              |
|              |  > Images                              |
|              |                                        |
|              |  [Reset All to Default]                |
+------------------------------------------------------+
```

### Key Interactions

- **Scope toggle** — Switch between "Global" (writes to `~/.config/markd/config.toml`) and "Workspace" (writes to `.markd.toml` in current folder). When viewing workspace scope, settings that override global show a dot indicator and a "reset to global" link.
- **Search settings** — Type to filter, just like VS Code. Typing "font" shows only font-related settings.
- **Color pickers** — Click the color swatch to open a picker. Supports hex input directly.
- **Sliders with number input** — Drag the slider or click the number to type an exact value.
- **Dropdowns** — Font family dropdown includes system fonts detected on the machine. Syntax theme dropdown shows available themes with a mini preview swatch.
- **Live preview** — If you have a markdown file open, changes apply immediately behind the settings panel. You can resize/move to see both.
- **Reset controls** — Per-section "Reset" link and a global "Reset All to Default" button at the bottom. Both ask for confirmation.
- **No save button** — Changes apply and persist immediately (like VS Code). Less friction.

---

## 9. File Watching

### v1: Live Filesystem Watching

- Use Rust's `notify` crate to watch the active workspace folder recursively
- Detect: file created, modified, deleted, renamed
- On change: update the sidebar tree and notify the frontend via Tauri events
- Only watch `.md` files (ignore everything else)
- Status bar shows a green "watching" indicator when active

### v1.1 (fast follow): Hot Reload Preview

- When viewing a file that gets edited externally, the rendered view live-updates
- Preserve scroll position on reload
- Great for the "edit in VS Code, read in Markd" workflow

---

## 10. Markdown Feature Roadmap

### v1 Launch — GFM

- CommonMark standard (headings, lists, links, images, code blocks, blockquotes, bold/italic)
- GitHub Flavored Markdown extensions (tables, task lists, strikethrough, autolinks)
- Syntax highlighting in fenced code blocks (language detection)

### v1.x Incremental Additions

- Footnotes
- GitHub-style alert/admonition blocks (`> [!NOTE]`, `> [!WARNING]`, etc.)
- YAML frontmatter display (render as a metadata header or collapse)

### v2+ (Future)

- Mermaid diagram rendering
- LaTeX/math rendering (KaTeX)
- Table of contents generation (from headings)
- Internal link navigation (click a link to another `.md` file, open it in a new tab)

---

## 11. Git Flow & Release Process

### Branch Structure

| Branch | Purpose | Who merges here |
|--------|---------|-----------------|
| `main` | Production releases only. Tagged, built, published. | Merge from `stage` only |
| `stage` | Pre-release validation. Full test suite, manual QA. | Merge from `develop` via PR |
| `develop` | Integration branch. All feature work lands here. | Merge from feature branches via PR |
| `feature/*`, `fix/*` | Individual work branches | Developer creates from `develop` |

### CI Pipeline — What Runs Where

| Branch | Lint | Unit Tests | Type Check | Integration Tests | Build Check | Full Build + Publish |
|--------|------|-----------|------------|-------------------|-------------|---------------------|
| `feature/*`, `fix/*` | Yes | Yes | Yes | — | — | — |
| `develop` | Yes | Yes | Yes | Yes | — | — |
| `stage` | Yes | Yes | Yes | Yes | Yes (compile, no artifacts) | — |
| `main` | Yes | Yes | Yes | Yes | — | Yes (macOS, Linux, Windows) + GitHub Release |

### PR / Branch Protection Rules

| Target Branch | Requirements |
|---------------|-------------|
| `develop` | 1 approval, all checks pass, no self-merge |
| `stage` | 1 approval, all checks pass, PR description includes "what was tested" |
| `main` | 1 approval, all checks pass, version bump in `Cargo.toml` + `package.json`, tagged |

### Manual Build (Any Branch)

A `workflow_dispatch` trigger in GitHub Actions lets you manually kick off a platform
build from any branch for local testing:

- Go to GitHub Actions -> "Build" workflow -> "Run workflow"
- Pick a platform (macOS, Linux, Windows, or all)
- Pick the branch
- Get downloadable artifacts without merging to `main`

### Release Flow

```
feature/cool-thing
    |
    v  PR (1 approval + checks pass)
develop
    |
    v  PR (1 approval + checks pass + "what was tested")
stage  -- compile check confirms it builds
    |
    v  PR (1 approval + checks pass + version bump + tag)
main   -- full build -> GitHub Release with installers
```

### Version Tagging

- Merge to `main` must include a version bump
- Tag format: `v0.1.0`, `v0.2.0`, etc.
- GitHub Action detects the tag and publishes the release automatically
- Follows semver: patch for fixes, minor for features, major for breaking changes

---

## 12. Testing Strategy

### What to Test at Launch (Nimble, Not Exhaustive)

**Rust side:**
- Config loading and merging (global + per-folder override)
- File tree scanning (nested folders, ignoring non-.md files)
- Markdown parsing produces expected HTML output
- Workspace add/remove/pin operations

**Frontend side:**
- Sidebar tree renders from file data
- Search filters the file list correctly
- Theme engine applies CSS variables from config
- Settings controls update config values

### What to Skip for Now

- E2E tests (Playwright/WebDriver for Tauri — add later)
- Snapshot tests for rendered markdown (brittle, low value early on)
- Performance benchmarks

### Tools

- Rust: `cargo test` (built-in)
- Frontend: `vitest` + React Testing Library
- Lint: `cargo clippy` (Rust) + `eslint` (TypeScript)

---

## 13. Future Considerations (Not in v1)

These are acknowledged but explicitly deferred:

- **Plugin system** — JS/TS plugins for UI layer (themes, renderers), WASM/Rust for backend layer. Architecture should not block this but we don't build it now.
- **Web version** — Tauri's frontend is React, so a web port is feasible. Requires replacing Rust backend calls with a service worker or server. Plan for later.
- **Editing** — Markdown editing with live preview. Major scope increase. Only after the viewer is solid.
- **Mobile** — Not planned. Desktop focus.
- **Cloud sync** — Never. Violates the privacy promise. Users can sync via Git, Dropbox, Syncthing, etc.
- **Auto-update** — Tauri has built-in updater. Add once the app is stable enough to warrant it.

---

## 14. README Structure (for Contributors)

The project README should include these sections:

1. **What is Markd** — One paragraph + screenshot
2. **Privacy Promise** — Bullet list from Section 2
3. **Download** — Links to latest release for each platform
4. **Features** — Bullet list of what it does
5. **Git Flow & Contributing** — Full branch structure, PR rules, and CI pipeline from Section 11
6. **Development Setup** — Prerequisites (Rust, Node.js), clone, install, `cargo tauri dev`
7. **Testing** — How to run tests locally
8. **Release Process** — How versions are tagged and published
9. **License** — MIT (or chosen license)
10. **Security** — Link to `SECURITY.md`

---

## Appendix: Project File Structure (Planned)

```
markd/
├── .github/
│   └── workflows/
│       ├── ci.yml              # lint + test on feature/develop
│       ├── stage-build.yml     # compile check on stage
│       ├── release.yml         # full build + publish on main tags
│       └── manual-build.yml    # workflow_dispatch for any branch
├── src-tauri/                  # Rust backend (Tauri)
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/           # Tauri command handlers
│   │   │   ├── files.rs        # list_files, read_file
│   │   │   ├── config.rs       # get_config, update_config
│   │   │   └── workspaces.rs   # workspace CRUD
│   │   ├── watcher.rs          # notify file watcher
│   │   ├── parser.rs           # pulldown-cmark markdown parsing
│   │   ├── config.rs           # TOML config loading/merging
│   │   └── workspace.rs        # workspace management
│   ├── Cargo.toml
│   ├── tauri.conf.json         # Tauri config (permissions, window)
│   └── icons/
├── src/                        # React frontend
│   ├── App.tsx
│   ├── components/
│   │   ├── ActivityBar/
│   │   ├── Sidebar/
│   │   │   ├── FileTree/
│   │   │   ├── SearchBar/
│   │   │   └── WorkspaceSwitcher/
│   │   ├── MainPanel/
│   │   │   ├── TabBar/
│   │   │   └── MarkdownRenderer/
│   │   ├── StatusBar/
│   │   ├── Settings/
│   │   │   ├── SettingsPanel.tsx
│   │   │   ├── ThemeSection.tsx
│   │   │   ├── TypographySection.tsx
│   │   │   ├── CodeBlockSection.tsx
│   │   │   └── ...
│   │   └── CommandPalette/
│   ├── hooks/
│   │   ├── useTheme.ts
│   │   ├── useConfig.ts
│   │   ├── useFileWatcher.ts
│   │   └── useWorkspaces.ts
│   ├── themes/
│   │   ├── dark.css
│   │   ├── light.css
│   │   └── solarized-dark.css
│   └── lib/
│       ├── tauri-commands.ts   # typed wrappers for Tauri invoke()
│       └── config-types.ts     # TypeScript types matching TOML schema
├── package.json
├── vite.config.ts
├── tsconfig.json
├── README.md
├── SECURITY.md
├── LICENSE
└── .markd.toml.example    # example per-folder config
```
