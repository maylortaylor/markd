# Plan 2.1: Rust Backend — File Scanning, Markdown Parsing, Tauri Commands

---
phase: 1-foundation
plan: "2.1"
wave: 2
dependencies: ["1.1"]
must_haves:
  - Recursive .md file scanning with walkdir producing a tree structure
  - GFM markdown parsing with pulldown-cmark returning HTML
  - Three Tauri commands registered and callable from frontend — list_files, read_file, parse_markdown
  - Serde-serializable types for FileEntry (tree node with name, path, is_dir, children)
  - Rust code compiles with zero clippy warnings
files_touched:
  - src-tauri/src/lib.rs
  - src-tauri/src/commands/mod.rs
  - src-tauri/src/commands/files.rs
  - src-tauri/src/commands/markdown.rs
  - src-tauri/src/types.rs
tdd: false
risk: low
---

## Context

This plan builds the three Rust Tauri commands that the frontend will invoke: `list_files` (scan a folder for .md files and return a tree), `read_file` (return raw file contents), and `parse_markdown` (convert markdown to HTML with GFM support). These are the core backend operations for Phase 1 -- everything the app does flows through these commands.

Risk is low because pulldown-cmark and walkdir are stable, well-documented crates, and the logic is straightforward file I/O plus parsing.

This plan touches only `src-tauri/` files. Plan 2.2 (frontend shell) touches only `src/` files. They share zero files and can execute in parallel.

## Dependencies

- **Plan 1.1** (Wave 1): Project scaffold must exist with Cargo.toml dependencies declared and `cargo check` passing.

## Tasks

### Task 1: Define shared types and create module structure

**Files:**
- `src-tauri/src/types.rs`
- `src-tauri/src/commands/mod.rs`

**Action:** create

**Description:**

Create `src-tauri/src/types.rs` with the serializable types used across commands:

```rust
use serde::{Deserialize, Serialize};

/// Represents a file or directory node in the file tree.
/// Directories have `is_dir: true` and may contain `children`.
/// Files have `is_dir: false` and empty `children`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    /// Display name (e.g., "README.md" or "docs")
    pub name: String,
    /// Absolute path on disk
    pub path: String,
    /// True if this entry is a directory
    pub is_dir: bool,
    /// Child entries (only populated for directories)
    pub children: Vec<FileEntry>,
}

/// Summary stats for the status bar
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderStats {
    /// Total number of .md files found
    pub file_count: usize,
    /// The root folder path
    pub folder_path: String,
}
```

Create `src-tauri/src/commands/mod.rs`:

```rust
pub mod files;
pub mod markdown;
```

**Acceptance Criteria:**
- `src-tauri/src/types.rs` compiles and defines `FileEntry` and `FolderStats` with Serialize/Deserialize derives
- `src-tauri/src/commands/mod.rs` re-exports `files` and `markdown` submodules
- `cd src-tauri && cargo check` passes

### Task 2: Implement list_files and read_file Tauri commands

**Files:**
- `src-tauri/src/commands/files.rs`

**Action:** create

**Description:**

Create `src-tauri/src/commands/files.rs` with two Tauri commands:

**`list_files`** -- Recursively scans a directory for `.md` files using `walkdir`. Returns a tree structure (nested `FileEntry` nodes) representing the folder hierarchy, but only including directories that contain `.md` files (directly or in subdirectories). Directories are sorted before files, both alphabetically.

```rust
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

use crate::types::FileEntry;

/// Scan a directory recursively and return a tree of .md files.
/// Only directories that contain .md files (at any depth) are included.
/// Entries are sorted: directories first (alphabetical), then files (alphabetical).
#[tauri::command]
pub fn list_files(path: String) -> Result<Vec<FileEntry>, String> {
    let root = Path::new(&path);
    if !root.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    build_file_tree(root).map_err(|e| e.to_string())
}

/// Read the raw contents of a file and return as a string.
#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file {}: {}", path, e))
}
```

The `build_file_tree` function should:
1. Walk the directory with `WalkDir::new(root)` collecting all `.md` file paths
2. Build a tree by grouping files into their parent directories
3. Prune directories that contain no `.md` files at any depth
4. Sort each level: directories first (alphabetical), then files (alphabetical)
5. Return `Vec<FileEntry>` representing the top-level children (not the root itself)

Edge cases to handle:
- Empty directory returns empty vec
- Hidden directories (starting with `.`) are skipped
- Symlinks are not followed (walkdir default)
- Permission errors on individual entries are skipped (log nothing -- silent skip)

**Acceptance Criteria:**
- `list_files("/some/path")` returns a `Vec<FileEntry>` tree with only `.md` files and their parent directories
- Directories without any `.md` descendants are excluded
- `read_file("/some/path/file.md")` returns the file contents as a string
- Both functions return `Err(String)` on invalid paths
- `cd src-tauri && cargo check` passes with no errors

### Task 3: Implement parse_markdown command and register all commands

**Files:**
- `src-tauri/src/commands/markdown.rs`
- `src-tauri/src/lib.rs`

**Action:** create/modify

**Description:**

Create `src-tauri/src/commands/markdown.rs`:

```rust
use pulldown_cmark::{html, Options, Parser};

/// Parse a markdown string into HTML with GFM extensions enabled.
/// Returns the rendered HTML string.
///
/// Enabled GFM features:
/// - Tables (pipe syntax)
/// - Strikethrough (~~text~~)
/// - Task lists (- [x] / - [ ])
/// - Smart punctuation
#[tauri::command]
pub fn parse_markdown(content: String) -> Result<String, String> {
    let options = Options::ENABLE_GFM
        | Options::ENABLE_TABLES
        | Options::ENABLE_STRIKETHROUGH
        | Options::ENABLE_TASKLISTS
        | Options::ENABLE_SMART_PUNCTUATION;

    let parser = Parser::new_ext(&content, options);
    let mut html_output = String::new();
    html::push_html(&mut html_output, parser);

    Ok(html_output)
}
```

Note: Check the actual `pulldown_cmark` 0.12 API at build time -- `Options::ENABLE_GFM` may be a single flag that includes tables, strikethrough, and tasklists, or they may be separate flags. Use the combination that produces GFM output. The key requirement is that tables, strikethrough, and task lists all render correctly.

Update `src-tauri/src/lib.rs` to declare modules and register all three commands:

```rust
mod commands;
mod types;

use commands::files::{list_files, read_file};
use commands::markdown::parse_markdown;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            list_files,
            read_file,
            parse_markdown
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Acceptance Criteria:**
- `parse_markdown("# Hello\n\n~~struck~~\n\n| a | b |\n|---|---|\n| 1 | 2 |")` returns HTML containing `<h1>`, `<del>`, and `<table>` tags
- All three commands (`list_files`, `read_file`, `parse_markdown`) are registered in the Tauri invoke handler
- `cd src-tauri && cargo check` passes
- `cd src-tauri && cargo clippy -- -D warnings` passes with zero warnings

## Verification

```bash
cd /Users/matttaylor/Documents/_dev/maylortaylor/markd/src-tauri
cargo check && echo "PASS: cargo check" || echo "FAIL: cargo check"
cargo clippy -- -D warnings && echo "PASS: clippy" || echo "FAIL: clippy"
cargo build && echo "PASS: cargo build" || echo "FAIL: cargo build"
```
