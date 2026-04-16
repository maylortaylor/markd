use std::path::Path;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::types::WorkspaceInfo;

// ── On-disk schema for a .code-workspace file ────────────────────────────────

#[derive(Debug, Deserialize)]
struct WorkspaceFile {
    folders: Vec<WorkspaceFolder>,
}

#[derive(Debug, Deserialize)]
struct WorkspaceFolder {
    path: String,
}

// ── On-disk schema for the persisted favorites list ──────────────────────────

#[derive(Debug, Serialize, Deserialize)]
struct FavoritesFile {
    workspaces: Vec<String>,
}

// ── Helpers ──────────────────────────────────────────────────────────────────

fn favorites_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|d| d.join("favorites.json"))
        .map_err(|e| format!("Failed to resolve app data dir: {e}"))
}

fn load_favorites(path: &Path) -> Result<FavoritesFile, String> {
    if !path.exists() {
        return Ok(FavoritesFile { workspaces: vec![] });
    }
    let raw = std::fs::read_to_string(path)
        .map_err(|e| format!("Failed to read favorites: {e}"))?;
    serde_json::from_str(&raw).map_err(|e| format!("Failed to parse favorites: {e}"))
}

fn save_favorites(path: &Path, data: &FavoritesFile) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create data dir: {e}"))?;
    }
    let json = serde_json::to_string_pretty(data)
        .map_err(|e| format!("Failed to serialize favorites: {e}"))?;
    std::fs::write(path, json).map_err(|e| format!("Failed to write favorites: {e}"))
}

/// Parse a .code-workspace file into a `WorkspaceInfo`, resolving relative
/// folder paths against the file's parent directory.
fn parse_workspace(workspace_path: &str) -> Result<WorkspaceInfo, String> {
    let file_path = Path::new(workspace_path);
    if !file_path.exists() {
        return Err(format!("Workspace file not found: {workspace_path}"));
    }

    let raw = std::fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read workspace file: {e}"))?;
    // Use json5 parser — VSCode workspace files are JSONC: they allow
    // block/line comments, trailing commas, and the /** @format */ header.
    let workspace: WorkspaceFile =
        json5::from_str(&raw).map_err(|e| format!("Failed to parse workspace JSON: {e}"))?;

    let workspace_dir = file_path.parent().unwrap_or(Path::new("/"));

    let folders: Vec<String> = workspace
        .folders
        .iter()
        .map(|f| {
            let p = Path::new(&f.path);
            if p.is_absolute() {
                f.path.clone()
            } else {
                workspace_dir.join(p).to_string_lossy().into_owned()
            }
        })
        // Only include paths that are real directories on disk
        .filter(|p| Path::new(p).is_dir())
        .collect();

    let name = file_path
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();

    Ok(WorkspaceInfo {
        name,
        path: workspace_path.to_string(),
        folders,
    })
}

// ── Tauri commands ────────────────────────────────────────────────────────────

/// Return all favorited workspaces, skipping any whose files no longer exist.
#[tauri::command]
pub fn get_favorites(app: AppHandle) -> Result<Vec<WorkspaceInfo>, String> {
    let path = favorites_path(&app)?;
    let data = load_favorites(&path)?;
    Ok(data
        .workspaces
        .iter()
        .filter_map(|p| parse_workspace(p).ok())
        .collect())
}

/// Add a workspace file path to favorites (no-op if already present).
#[tauri::command]
pub fn add_favorite(app: AppHandle, workspace_path: String) -> Result<(), String> {
    let path = favorites_path(&app)?;
    let mut data = load_favorites(&path)?;
    if !data.workspaces.contains(&workspace_path) {
        data.workspaces.push(workspace_path);
        save_favorites(&path, &data)?;
    }
    Ok(())
}

/// Remove a workspace file path from favorites.
#[tauri::command]
pub fn remove_favorite(app: AppHandle, workspace_path: String) -> Result<(), String> {
    let path = favorites_path(&app)?;
    let mut data = load_favorites(&path)?;
    data.workspaces.retain(|p| p != &workspace_path);
    save_favorites(&path, &data)
}

/// Parse and return the info for a single .code-workspace file.
#[tauri::command]
pub fn read_workspace(workspace_path: String) -> Result<WorkspaceInfo, String> {
    parse_workspace(&workspace_path)
}
