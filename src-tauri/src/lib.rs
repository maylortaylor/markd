mod commands;
mod types;

use commands::files::{list_files, read_file};
use commands::markdown::parse_markdown;
use commands::watcher::{stop_watching, watch_workspace_configs, watch_workspace_folders, WatcherState};
use commands::workspaces::{add_favorite, get_favorites, read_workspace, remove_favorite, save_workspace};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(WatcherState::new())
        .invoke_handler(tauri::generate_handler![
            list_files,
            read_file,
            parse_markdown,
            get_favorites,
            add_favorite,
            remove_favorite,
            read_workspace,
            save_workspace,
            watch_workspace_configs,
            watch_workspace_folders,
            stop_watching,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
