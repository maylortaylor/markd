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

