# Markd — Project Definition

## Description

Markd is a cross-platform desktop markdown viewer built with Tauri v2 (Rust backend + React/TypeScript frontend). It watches a folder of markdown files and renders them in a clean, highly customizable reading UI inspired by VS Code's layout. Markd is 100% local — no network calls, no telemetry, no cloud, no accounts. Files never leave the machine.

The app's core differentiator is deep visual customization. Users control every aspect of how their markdown looks — fonts, colors, spacing, code blocks, headings — with a visual settings panel and per-folder config overrides.

## Goals

1. Provide a fast, beautiful, cross-platform markdown viewer (macOS, Linux, Windows)
2. Give users full control over visual presentation via an extensive theming system
3. Guarantee privacy — 100% local, zero network access, no telemetry, fully auditable open source
4. Support multiple workspace folders with quick-switching and pinning
5. Live file watching so external edits appear immediately
6. Ship with GitHub CI/CD from day one for quality assurance
7. Be open source (MIT) with clear contributor documentation

## Non-Goals

- No markdown editing (viewer only — editing is a future consideration)
- No plugin system in v1 (architecture should not block it, but don't build it)
- No web version in v1 (plan for later, Tauri frontend is portable)
- No mobile support
- No cloud sync — ever (users sync via Git, Dropbox, Syncthing, etc.)
- No accounts, sign-in, or user tracking of any kind
- No auto-updater in v1

## Requirements

### Core Viewing
- Open a folder and display all `.md` files in a sidebar tree
- Render GFM (GitHub Flavored Markdown) with syntax-highlighted code blocks
- Support CommonMark, tables, task lists, strikethrough, autolinks
- Tab system for viewing multiple files simultaneously

### Workspace Management
- Save folder paths as named workspaces
- Pin favorite workspaces to the top of the list
- Quick-switch between workspaces
- Remember last-opened workspace on launch

### File Watching
- Live filesystem watching via Rust `notify` crate
- New/changed/deleted files update the sidebar in real-time
- Only watch `.md` files

### Theming & Customization
- Two layers: app chrome (sidebar, tabs, status bar) + content rendering (fonts, colors, spacing)
- 3 built-in themes: dark (default), light, solarized dark
- Visual settings panel with sliders, color pickers, dropdowns
- Per-folder `.markd.toml` overrides that merge on top of global config
- Changes apply immediately (no save button, like VS Code)
- Search/filter settings by keyword

### UI Layout
- VS Code-inspired: activity bar, sidebar, main panel, status bar
- Activity bar with file explorer, search, and settings views
- Command palette (Ctrl/Cmd+P) for quick file/workspace/settings access
- Resizable sidebar panel

## Non-Functional Requirements

- **Security:** Tauri filesystem sandbox, no network access in allowlist, no HTTP/fetch/WebSocket
- **Performance:** App should launch in under 2 seconds, markdown rendering should feel instant
- **Cross-platform:** macOS, Linux (.deb/.AppImage), Windows (.msi) from the same codebase
- **Config format:** Human-readable TOML for all configuration
- **Testing:** Rust unit tests + frontend vitest, lint + type check in CI
- **Open source:** MIT license, public GitHub repo, contributor docs in README

## Success Criteria

1. App opens on macOS, Linux, and Windows from a single codebase
2. User can pick a folder and browse/read all markdown files with proper GFM rendering
3. Syntax highlighting works in fenced code blocks
4. Multiple workspaces can be saved, pinned, and switched between
5. File changes appear in the sidebar without manual refresh
6. User can customize every visual aspect via the settings panel
7. Per-folder `.markd.toml` overrides work correctly
8. CI pipeline catches lint/test/type failures on every push
9. Tagged releases produce downloadable installers for all 3 platforms
10. No network calls can be observed during any usage of the app

## Constraints

- **Tech stack:** Tauri v2, Rust, React, TypeScript, Vite (decided)
- **Git flow:** main → stage → develop → feature/* with branch protection
- **CI provider:** GitHub Actions
- **License:** MIT
- **Privacy:** Absolute — no telemetry, no analytics, no network access. Non-negotiable.
