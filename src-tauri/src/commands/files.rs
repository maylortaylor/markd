use std::path::Path;
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

fn build_file_tree(root: &Path) -> Result<Vec<FileEntry>, std::io::Error> {
    // Collect all .md file paths (skipping hidden dirs and permission errors)
    let mut md_paths: Vec<std::path::PathBuf> = Vec::new();
    for entry in WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| {
            // Skip hidden directories (starting with '.')
            if e.file_type().is_dir() {
                e.file_name()
                    .to_str()
                    .map(|s| !s.starts_with('.'))
                    .unwrap_or(false)
            } else {
                true
            }
        })
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            if let Some(ext) = entry.path().extension() {
                if ext.eq_ignore_ascii_case("md") {
                    md_paths.push(entry.into_path());
                }
            }
        }
    }

    // Build tree from collected paths
    build_tree_from_paths(root, &md_paths)
}

fn build_tree_from_paths(
    root: &Path,
    md_paths: &[std::path::PathBuf],
) -> Result<Vec<FileEntry>, std::io::Error> {
    // Use a recursive structure: map from dir path to its children
    build_dir_children(root, root, md_paths)
}

fn build_dir_children(
    root: &Path,
    dir: &Path,
    md_paths: &[std::path::PathBuf],
) -> Result<Vec<FileEntry>, std::io::Error> {
    // Find direct .md file children of this dir
    let mut file_entries: Vec<FileEntry> = md_paths
        .iter()
        .filter(|p| p.parent() == Some(dir))
        .map(|p| FileEntry {
            name: p
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string(),
            path: p.to_string_lossy().to_string(),
            is_dir: false,
            children: vec![],
        })
        .collect();
    file_entries.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    // Find direct subdirectory children that contain .md files
    let mut dir_entries: Vec<FileEntry> = Vec::new();

    // Get unique immediate subdirs that have at least one .md descendant
    let mut subdirs: Vec<std::path::PathBuf> = md_paths
        .iter()
        .filter_map(|p| {
            // Strip the root prefix to find relative path components
            let rel = p.strip_prefix(dir).ok()?;
            let mut components = rel.components();
            let first = components.next()?;
            // Only interested in paths with at least one directory component before the file
            if components.next().is_none() {
                // Direct child file — not a subdir
                return None;
            }
            Some(dir.join(first))
        })
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();
    subdirs.sort_by(|a, b| {
        a.file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_lowercase()
            .cmp(
                &b.file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_lowercase(),
            )
    });

    for subdir in subdirs {
        if subdir.is_dir() {
            let children = build_dir_children(root, &subdir, md_paths)?;
            if !children.is_empty() {
                dir_entries.push(FileEntry {
                    name: subdir
                        .file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string(),
                    path: subdir.to_string_lossy().to_string(),
                    is_dir: true,
                    children,
                });
            }
        }
    }

    // Directories first, then files
    let mut result = dir_entries;
    result.extend(file_entries);
    Ok(result)
}
