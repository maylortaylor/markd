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
    let options = Options::ENABLE_TABLES
        | Options::ENABLE_STRIKETHROUGH
        | Options::ENABLE_TASKLISTS
        | Options::ENABLE_SMART_PUNCTUATION;

    let parser = Parser::new_ext(&content, options);
    let mut html_output = String::new();
    html::push_html(&mut html_output, parser);

    Ok(html_output)
}
