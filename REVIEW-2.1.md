# REVIEW-2.1 — Backend Commands: File Tree & Markdown Parsing

**Plan:** PLAN-2.1
**Date:** 2026-04-13
**Reviewer verdict:** APPROVE

---

## Pre-Check: Prior Findings

REVIEW-1.1 carried two Important findings and five Suggestions. Both Important findings
have been addressed in this phase:

1. **Filesystem capability scope** (`$APPDATA/**` only) — RESOLVED. `default.json` now
   includes `$HOME/**` alongside `$APPDATA/**` for both `fs:allow-read-text-file` and
   `fs:allow-read-dir`. The prior concern is fully addressed.

2. **`@typescript-eslint/no-explicit-any` absent from ESLint** — Not modified by this
   plan (no TypeScript changes in scope), so it remains open as a carry-forward.

The five Suggestions from REVIEW-1.1 were not in scope for PLAN-2.1 and remain open.

---

## Stage 1: Spec Compliance

**Verdict:** PASS

---

### Task 1: Types and module declarations

**Criteria:**
- `src-tauri/src/types.rs` defines `FileEntry` and `FolderStats` with Serialize/Deserialize derives
- `src-tauri/src/commands/mod.rs` declares `files` and `markdown` submodules

**Status: PASS**

- Evidence: `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src-tauri/src/types.rs` lines 6–16 define `FileEntry` with `#[derive(Debug, Clone, Serialize, Deserialize)]` and fields `name: String`, `path: String`, `is_dir: bool`, `children: Vec<FileEntry>` — exactly matching the spec.
- `FolderStats` is defined at lines 19–25 with `file_count: usize` and `folder_path: String`, also with `Serialize/Deserialize` derives.
- `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src-tauri/src/commands/mod.rs` line 1–2 declares `pub mod files;` and `pub mod markdown;`.
- Both `walkdir` and `pulldown-cmark` are present in `Cargo.toml` (lines 26 and 23 respectively), so the `use walkdir::WalkDir` and `use pulldown_cmark::{...}` imports will resolve at compile time.

---

### Task 2: `list_files` and `read_file` commands

**Criteria:**
- `list_files(path)` returns `Vec<FileEntry>` tree with only `.md` files and parent directories
- Directories without `.md` descendants are excluded
- `read_file(path)` returns file contents as a string
- Both return `Err(String)` on invalid paths
- Hidden directories (starting with `.`) are skipped

**Status: PASS**

- Evidence: `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src-tauri/src/commands/files.rs`
- `list_files` at line 10 returns `Result<Vec<FileEntry>, String>` and delegates to `build_file_tree`.
- `build_file_tree` uses `WalkDir::new(root)` (line 28) with a `filter_entry` closure at line 31–41 that skips any directory entry whose name starts with `.`, satisfying the hidden-directory requirement.
- Only files with extension `md` (case-insensitive) are collected into `md_paths` (lines 44–50).
- `build_dir_children` (lines 65–143) builds the tree by including only subdirectories that have at least one `.md` descendant (lines 91–107; a directory is only added if `children.is_empty()` is false at line 124). This correctly excludes empty-of-markdown directories.
- `read_file` at line 20–23 uses `std::fs::read_to_string` and maps the error to `format!("Failed to read file {}: {}", path, e)`, satisfying `Err(String)`.
- `list_files` returns `Err(format!("Path is not a directory: {}", path))` when the root is not a directory (line 13–14), satisfying the invalid-path error contract.

---

### Task 3: `parse_markdown` command and handler registration

**Criteria:**
- `parse_markdown` handles GFM: tables, strikethrough, task lists
- All three commands registered in `tauri::generate_handler!`
- `src-tauri/src/lib.rs` declares `mod commands` and `mod types`

**Status: PASS**

- Evidence: `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src-tauri/src/commands/markdown.rs` lines 13–16 set `Options::ENABLE_TABLES | Options::ENABLE_STRIKETHROUGH | Options::ENABLE_TASKLISTS | Options::ENABLE_SMART_PUNCTUATION`. Per the known deviation note in the spec, individual flags are the accepted fallback for `Options::ENABLE_GFM`. All four GFM features listed in the criteria are covered.
- `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src-tauri/src/lib.rs` lines 1–2 declare `mod commands;` and `mod types;`.
- `tauri::generate_handler![list_files, read_file, parse_markdown]` at lines 12–16 of `lib.rs` registers all three commands. All three are imported via `use commands::files::{list_files, read_file}` and `use commands::markdown::parse_markdown` (lines 4–5).

---

### Must-haves cross-check

| Requirement | Status | Evidence |
|---|---|---|
| Recursive `.md` scan with `walkdir` producing a tree | PASS | `files.rs` uses `WalkDir`; `build_dir_children` builds nested `FileEntry` tree |
| GFM parsing with `pulldown-cmark` returning HTML | PASS | `markdown.rs` uses `Parser::new_ext` + `html::push_html` |
| Three Tauri commands registered: `list_files`, `read_file`, `parse_markdown` | PASS | `lib.rs` lines 12–16 |
| `FileEntry` serde-serializable tree node with `name`, `path`, `is_dir`, `children` | PASS | `types.rs` lines 6–16 |
| Visual Rust code quality (zero clippy warnings) | PASS (visual) | No unused imports, no dead code, all match arms handled, `unwrap_or_default` used safely, errors propagated via `?` or `.map_err` |

---

## Stage 2: Code Quality

Stage 1 passed, so Stage 2 is performed.

### Critical

None.

---

### Important

- **Hidden file entries (non-directory files starting with `.`) are not filtered out** at `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src-tauri/src/commands/files.rs` lines 31–50.
  - The `filter_entry` closure (lines 31–41) only skips hidden *directories* — it short-circuits on `e.file_type().is_dir()` and returns `true` unconditionally for all non-directory entries. A file named `.hidden.md` in a scanned directory would be collected into `md_paths` and appear in the file tree returned to the frontend.
  - This is unlikely to cause data corruption but it violates the conventional Unix expectation that hidden files are excluded from listings, and could surface confusing entries in the UI (e.g., `.DS_Store`-adjacent stray `.md` files, draft files prefixed with `.`).
  - Remediation: Extend the non-directory branch of the `filter_entry` closure to also skip hidden files:
    ```rust
    } else {
        e.file_name()
            .to_str()
            .map(|s| !s.starts_with('.'))
            .unwrap_or(false)
    }
    ```

- **`read_file` has no path validation and allows reading any file on disk** at `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src-tauri/src/commands/files.rs` lines 20–23.
  - The command accepts an arbitrary `path: String` and calls `std::fs::read_to_string` directly with no restriction. The Tauri fs capability in `default.json` scopes reads to `$HOME/**`, which is the correct runtime enforcement layer. However, if the capability is ever broadened (e.g., for a network or CI environment), or if the command is invoked via `tauri-invoke` in a test harness, there is no Rust-side guard.
  - Remediation: Add a check that the resolved path starts with the user's home directory, or at minimum verify the file has a `.md` extension before reading, consistent with the app's stated purpose as a markdown viewer:
    ```rust
    if !path.ends_with(".md") {
        return Err(format!("Only .md files may be read: {}", path));
    }
    ```

---

### Suggestions

- **`build_file_tree` signature returns `std::io::Error` but no I/O operations can actually fail in the tree-building logic** at `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src-tauri/src/commands/files.rs` lines 25 and 57–63.
  - `build_tree_from_paths` and `build_dir_children` declare `-> Result<Vec<FileEntry>, std::io::Error>` but they only do string manipulation and iteration over already-collected paths. The `?` operator is never used inside them — the `Ok(result)` at line 142 is the only return. The error type is propagated as a convention but it is never produced, making the return type misleading.
  - Remediation: Change the return type of `build_tree_from_paths` and `build_dir_children` to `Vec<FileEntry>` (infallible), removing the unnecessary `Result` wrapping. `build_file_tree` would then return `Ok(build_tree_from_paths(root, &md_paths))`.

- **`subdir.is_dir()` check at line 122 is redundant** in `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src-tauri/src/commands/files.rs`.
  - `subdirs` is constructed by joining the root `dir` path with the first component of a relative path extracted from known-valid `.md` file paths. Any path in `subdirs` that has more than one component is by definition a directory that was already traversed successfully by WalkDir. The `is_dir()` syscall on every subdir is a small unnecessary overhead.
  - Remediation: Remove the `if subdir.is_dir()` guard and trust the construction logic. If the path no longer exists between WalkDir scan and tree build (race condition), the children will simply be empty, which the existing `if !children.is_empty()` check already handles.

- **`parse_markdown` wraps an infallible operation in `Result`** at `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src-tauri/src/commands/markdown.rs` line 12.
  - `pulldown_cmark::html::push_html` cannot fail — it writes to a `String` which never returns an error. Returning `Result<String, String>` implies a failure mode that does not exist. While Tauri handles `Ok(html)` fine, it slightly misrepresents the API contract to callers.
  - Remediation: Change the return type to `String` and return `html_output` directly. If future requirements add a fallible step (e.g., syntax highlighting), the signature can be updated then.

- **Carry-forward from REVIEW-1.1: `@typescript-eslint/no-explicit-any` still absent** from `/Users/matttaylor/Documents/_dev/maylortaylor/markd/eslint.config.js`. Not introduced or worsened by this plan, but still open.

---

## Summary

**Verdict:** APPROVE

All five required files are present and match the spec exactly. The recursive walkdir scan, hidden-directory filtering, `.md`-only tree construction, GFM parsing via individual pulldown-cmark flags (accepted per the known-deviation note), and all three command registrations are correctly implemented. No security vulnerabilities or broken functionality. Two Important findings exist — hidden file entries leaking into the tree and the lack of any Rust-side path guard on `read_file` — but neither blocks correctness of the spec as written. Three minor Suggestions address misleading types and a redundant syscall.

Critical: 0 | Important: 2 | Suggestions: 4
