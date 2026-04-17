use std::sync::Mutex;

use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{AppHandle, Emitter, State};

// ── State ─────────────────────────────────────────────────────────────────────

/// Holds live watchers so they stay active between command calls.
/// Dropping a watcher automatically unregisters it from the OS.
pub struct WatcherState {
    /// Watches .code-workspace config files (non-recursive)
    pub config_watcher: Mutex<Option<RecommendedWatcher>>,
    /// Watches open workspace root folders for .md changes (recursive)
    pub folder_watcher: Mutex<Option<RecommendedWatcher>>,
}

impl WatcherState {
    pub fn new() -> Self {
        Self {
            config_watcher: Mutex::new(None),
            folder_watcher: Mutex::new(None),
        }
    }
}

// ── Commands ──────────────────────────────────────────────────────────────────

/// Watch a list of .code-workspace file paths.
/// Emits "markd://config-changed" on any modification.
#[tauri::command]
pub fn watch_workspace_configs(
    paths: Vec<String>,
    app: AppHandle,
    state: State<'_, WatcherState>,
) -> Result<(), String> {
    let mut guard = state
        .config_watcher
        .lock()
        .map_err(|e| format!("Lock error: {e}"))?;
    *guard = None; // drop + unregister existing watcher

    if paths.is_empty() {
        return Ok(());
    }

    let handle = app.clone();
    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                if matches!(
                    event.kind,
                    EventKind::Modify(_) | EventKind::Create(_) | EventKind::Remove(_)
                ) {
                    let _ = handle.emit("markd://config-changed", ());
                }
            }
        },
        Config::default(),
    )
    .map_err(|e| format!("Failed to create watcher: {e}"))?;

    for path in &paths {
        let p = std::path::Path::new(path);
        if p.exists() {
            watcher
                .watch(p, RecursiveMode::NonRecursive)
                .map_err(|e| format!("Failed to watch {path}: {e}"))?;
        }
    }

    *guard = Some(watcher);
    Ok(())
}

/// Watch a list of workspace root directories recursively.
/// Emits "markd://folder-changed" with the changed file paths on any
/// create/modify/remove event.
#[tauri::command]
pub fn watch_workspace_folders(
    paths: Vec<String>,
    app: AppHandle,
    state: State<'_, WatcherState>,
) -> Result<(), String> {
    let mut guard = state
        .folder_watcher
        .lock()
        .map_err(|e| format!("Lock error: {e}"))?;
    *guard = None;

    if paths.is_empty() {
        return Ok(());
    }

    let handle = app.clone();
    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                if matches!(
                    event.kind,
                    EventKind::Modify(_) | EventKind::Create(_) | EventKind::Remove(_)
                ) {
                    let changed: Vec<String> = event
                        .paths
                        .iter()
                        .map(|p| p.to_string_lossy().into_owned())
                        .collect();
                    let _ = handle.emit("markd://folder-changed", changed);
                }
            }
        },
        Config::default(),
    )
    .map_err(|e| format!("Failed to create watcher: {e}"))?;

    for path in &paths {
        let p = std::path::Path::new(path);
        if p.is_dir() {
            watcher
                .watch(p, RecursiveMode::Recursive)
                .map_err(|e| format!("Failed to watch {path}: {e}"))?;
        }
    }

    *guard = Some(watcher);
    Ok(())
}

/// Stop all active watchers.
#[tauri::command]
pub fn stop_watching(state: State<'_, WatcherState>) -> Result<(), String> {
    let mut cfg = state
        .config_watcher
        .lock()
        .map_err(|e| format!("Lock error: {e}"))?;
    *cfg = None;
    let mut fld = state
        .folder_watcher
        .lock()
        .map_err(|e| format!("Lock error: {e}"))?;
    *fld = None;
    Ok(())
}
