# Phase 1: Research Findings

> Note: Web search unavailable in this environment. Findings based on established documentation
> for these stable libraries. Version numbers should be verified at build time.

---

## 1. Tauri v2 Scaffolding

**Create project command:**
```bash
npm create tauri-app@latest markd -- --template react-ts
# Or with Cargo:
cargo install create-tauri-app
cargo create-tauri-app markd --template react-ts
```

**Default project structure (Tauri v2 + React + TS + Vite):**
```
markd/
├── src/                    # React frontend
│   ├── App.tsx
│   ├── App.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs         # Entry point (don't touch — Tauri generated)
│   │   └── lib.rs          # Your Tauri commands go here
│   ├── Cargo.toml
│   ├── tauri.conf.json     # App config (window, security, etc.)
│   ├── capabilities/       # Tauri v2 capability files (permissions)
│   │   └── default.json
│   ├── icons/
│   └── build.rs
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

**Key Tauri v2 APIs needed:**

- `tauri::command` — Define Rust functions callable from frontend via `invoke()`
- `tauri-plugin-dialog` — Native folder picker dialog
- `tauri-plugin-fs` — Filesystem read access (with scoped permissions)
- `tauri::Emitter` / `tauri::Listener` — Event system for Rust→frontend communication (needed for file watcher in Phase 2)

**Tauri v2 command pattern:**
```rust
#[tauri::command]
fn list_files(path: String) -> Result<Vec<FileEntry>, String> {
    // scan directory, return file tree
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    // read and parse markdown file
}
```

**Frontend invocation:**
```typescript
import { invoke } from '@tauri-apps/api/core';

const files = await invoke<FileEntry[]>('list_files', { path: '/some/folder' });
const html = await invoke<string>('read_file', { path: '/some/folder/README.md' });
```

---

## 2. pulldown-cmark

**Crate:** `pulldown-cmark` (latest stable ~0.12.x as of early 2025)

**GFM extensions:** Enable via `Options` bitflags:
```rust
use pulldown_cmark::{html, Options, Parser};

let options = Options::ENABLE_GFM
    | Options::ENABLE_TABLES
    | Options::ENABLE_STRIKETHROUGH
    | Options::ENABLE_TASKLISTS;

let parser = Parser::new_ext(&markdown_input, options);
let mut html_output = String::new();
html::push_html(&mut html_output, parser);
```

**GFM support includes:**
- Tables (pipe syntax)
- Strikethrough (`~~text~~`)
- Task lists (`- [x]` / `- [ ]`)
- Autolinks (URLs auto-linked)
- Footnotes (with `ENABLE_FOOTNOTES`)

**Cargo.toml dependency:**
```toml
[dependencies]
pulldown-cmark = { version = "0.12", features = ["simd"] }
```

The `simd` feature enables SIMD-accelerated parsing for better performance on large files.

**Key consideration for shiki integration:**
pulldown-cmark outputs `<pre><code class="language-rust">...</code></pre>` for fenced code blocks. The `class="language-X"` attribute is what shiki uses to determine the language. This means:
- Rust sends HTML with `<pre><code class="language-X">` blocks
- Frontend detects these blocks and runs shiki on the code content
- shiki replaces the plain `<code>` with syntax-highlighted HTML

---

## 3. shiki (Syntax Highlighting)

**Package:** `shiki` (latest stable ~1.x)

**React integration approach for pre-rendered HTML:**

Since Rust sends HTML strings (not raw markdown), we need a post-processing approach:

**Option A: DOM post-processing (recommended for our case)**
```typescript
import { codeToHtml } from 'shiki';

// After rendering HTML to DOM, find code blocks and enhance them
async function highlightCodeBlocks(container: HTMLElement) {
  const codeBlocks = container.querySelectorAll('pre code[class*="language-"]');
  for (const block of codeBlocks) {
    const lang = block.className.match(/language-(\w+)/)?.[1] || 'text';
    const code = block.textContent || '';
    const highlighted = await codeToHtml(code, {
      lang,
      theme: 'one-dark-pro', // or any shiki theme
    });
    block.parentElement!.outerHTML = highlighted;
  }
}
```

**Option B: Use `@shikijs/rehype` if we switch to rehype pipeline**
Not applicable here since we're getting pre-rendered HTML from Rust.

**Option C: Process on Rust side before sending to frontend**
Could use `shiki` via a WASM build, but adds complexity. DOM post-processing is simpler.

**Recommendation:** Option A (DOM post-processing). After setting `innerHTML` from Rust-parsed HTML, run `highlightCodeBlocks()` on the container. This keeps shiki theme-aware and easy to swap themes later.

**Bundle size note:** shiki lazy-loads languages and themes. Only loaded languages/themes count toward bundle size. For v1, load ~10 common languages (js, ts, python, rust, go, java, json, yaml, bash, html/css).

**Install:**
```bash
npm install shiki
```

---

## 4. Tailwind CSS + CSS Modules in Vite

**Setup steps:**

```bash
npm install -D tailwindcss @tailwindcss/vite
```

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

**src/index.css (or App.css):**
```css
@import 'tailwindcss';
```

**CSS Modules work out of the box with Vite** — any file named `*.module.css` is automatically treated as a CSS Module:
```typescript
import styles from './Sidebar.module.css';
// styles.sidebar, styles.fileTree, etc.
```

**No conflicts:** Tailwind generates utility classes globally, CSS Modules generate scoped class names. They coexist without issues. Use Tailwind for layout/spacing/colors, CSS Modules for complex component-specific styles.

---

## 5. Tauri v2 Security Config

**Tauri v2 uses a capability-based permission system.**

**capabilities/default.json:**
```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capabilities for Markd",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:default",
    "dialog:allow-open",
    {
      "identifier": "fs:allow-read-text-file",
      "allow": [{ "path": "$APPDATA/**" }]
    },
    {
      "identifier": "fs:allow-read-dir",
      "allow": [{ "path": "$APPDATA/**" }]
    }
  ]
}
```

**Key security points:**
- **No network by default** — Tauri v2 does not grant network access unless `http:default` or similar is explicitly added. If we don't add it, no HTTP/fetch/WebSocket is possible. This is our privacy guarantee.
- **Filesystem scoping** — `fs:allow-read-text-file` and `fs:allow-read-dir` can be scoped to specific paths. For user-selected folders, Tauri's dialog plugin returns paths that are automatically allowed.
- **No shell access** — `shell:default` is not included, so no command execution.

**For user-selected folders:** When the user picks a folder via the dialog, Tauri v2 grants temporary read access to that path. We don't need to pre-configure every possible path.

**tauri.conf.json security section:**
```json
{
  "app": {
    "security": {
      "csp": "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'"
    }
  }
}
```

---

## 6. GitHub Actions CI

**Workflow for lint + test (not full builds):**

```yaml
name: CI
on:
  push:
    branches: [develop, stage, main]
  pull_request:
    branches: [develop, stage, main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          components: clippy, rustfmt

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install system dependencies (for Tauri on Linux)
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf

      - name: Install npm dependencies
        run: npm ci

      - name: Rust lint
        run: cd src-tauri && cargo clippy -- -D warnings

      - name: Rust test
        run: cd src-tauri && cargo test

      - name: TypeScript type check
        run: npx tsc --noEmit

      - name: ESLint
        run: npx eslint src/ --ext .ts,.tsx

      - name: Frontend tests
        run: npx vitest run
```

**Note:** Tauri requires system dependencies on Linux (webkit2gtk, etc.). The `tauri-action` handles this for full builds, but for CI we install them manually.

**For full cross-platform builds (Phase 4):**
```yaml
- uses: tauri-apps/tauri-action@v0
  with:
    tagName: v__VERSION__
    releaseName: 'Markd v__VERSION__'
```

This runs on macOS, Linux, and Windows runners and produces platform-specific installers.

---

## 7. Tauri v2 Folder Picker

**Plugin:** `@tauri-apps/plugin-dialog`

**Install:**
```bash
npm install @tauri-apps/plugin-dialog
# Rust side — add to src-tauri/Cargo.toml:
# tauri-plugin-dialog = "2"
```

**Register in Rust (lib.rs or main.rs):**
```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![list_files, read_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Frontend usage:**
```typescript
import { open } from '@tauri-apps/plugin-dialog';

const folder = await open({
  directory: true,
  multiple: false,
  title: 'Select a folder to view',
});

if (folder) {
  // folder is the selected path string
  const files = await invoke('list_files', { path: folder });
}
```

**Permission:** Add `dialog:allow-open` to capabilities.

---

## Summary: Key Dependencies

### Rust (Cargo.toml)
- `tauri` (v2)
- `tauri-plugin-dialog` (v2)
- `tauri-plugin-fs` (v2)
- `pulldown-cmark` (0.12+, with GFM features)
- `serde` + `serde_json` (serialization)
- `walkdir` (recursive directory scanning)

### Frontend (package.json)
- `@tauri-apps/api` (Tauri v2 JS API)
- `@tauri-apps/plugin-dialog` (folder picker)
- `shiki` (syntax highlighting)
- `react`, `react-dom`
- `tailwindcss`, `@tailwindcss/vite`

### Dev Dependencies
- `vitest`, `@testing-library/react`, `@testing-library/jest-dom`
- `eslint`, `@typescript-eslint/eslint-plugin`
- `typescript`
