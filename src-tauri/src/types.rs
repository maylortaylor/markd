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

/// Parsed representation of a .code-workspace file.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceInfo {
    /// Display name derived from the filename (without extension)
    pub name: String,
    /// Absolute path to the .code-workspace file
    pub path: String,
    /// Resolved absolute paths of the folders listed in the workspace
    pub folders: Vec<String>,
}

