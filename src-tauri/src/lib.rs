mod commands;
mod types;

use commands::files::{list_files, read_file};
use commands::markdown::parse_markdown;
use commands::workspaces::{add_favorite, get_favorites, read_workspace, remove_favorite};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            list_files,
            read_file,
            parse_markdown,
            get_favorites,
            add_favorite,
            remove_favorite,
            read_workspace,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
