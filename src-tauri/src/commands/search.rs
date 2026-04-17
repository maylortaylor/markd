use std::path::Path;
use walkdir::WalkDir;

use crate::commands::files::SKIP_DIRS;
use crate::types::ContentSearchResult;
use crate::types::MatchLine;

/// Maximum number of matching lines returned per file.
const MAX_MATCHES_PER_FILE: usize = 8;
/// Maximum number of files returned.
const MAX_FILES: usize = 50;

/// Search all .md files in the given folders for lines containing `query`
/// (case-insensitive). Returns results grouped by file, each with up to
/// MAX_MATCHES_PER_FILE matching lines.
#[tauri::command]
pub fn search_content(
    query: String,
    folders: Vec<String>,
) -> Result<Vec<ContentSearchResult>, String> {
    if query.trim().is_empty() {
        return Ok(vec![]);
    }

    let lower_query = query.to_lowercase();
    let mut results: Vec<ContentSearchResult> = Vec::new();

    for folder in &folders {
        let root = Path::new(folder);
        if !root.is_dir() {
            continue;
        }

        for entry in WalkDir::new(root)
            .follow_links(false)
            .into_iter()
            .filter_entry(|e| {
                e.file_name()
                    .to_str()
                    .map(|s| !s.starts_with('.') && !SKIP_DIRS.contains(&s))
                    .unwrap_or(false)
            })
            .filter_map(|e| e.ok())
        {
            if !entry.file_type().is_file() {
                continue;
            }
            let path = entry.path();
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if !ext.eq_ignore_ascii_case("md") {
                continue;
            }

            let content = match std::fs::read_to_string(path) {
                Ok(c) => c,
                Err(_) => continue,
            };

            let mut matches: Vec<MatchLine> = Vec::new();
            for (i, line) in content.lines().enumerate() {
                if line.to_lowercase().contains(&lower_query) {
                    matches.push(MatchLine {
                        line_num: (i + 1) as u32,
                        text: line.trim().to_string(),
                    });
                    if matches.len() >= MAX_MATCHES_PER_FILE {
                        break;
                    }
                }
            }

            if !matches.is_empty() {
                let name = path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                results.push(ContentSearchResult {
                    path: path.to_string_lossy().to_string(),
                    name,
                    matches,
                });

                if results.len() >= MAX_FILES {
                    break;
                }
            }
        }

        if results.len() >= MAX_FILES {
            break;
        }
    }

    Ok(results)
}
