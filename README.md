# Markd

A privacy-first, cross-platform desktop markdown viewer.

## Privacy Promise

Markd is designed to be 100% local:

- Makes zero network calls of any kind
- Collects no telemetry, analytics, or usage data
- Stores no data outside your local machine
- Reads only the folders you explicitly select and the app config directory
- Has no accounts, cloud sync, or sign-in functionality
- Open source -- all guarantees are verifiable in the code

## Features

- GitHub Flavored Markdown (GFM) rendering: tables, task lists, strikethrough, smart punctuation
- Syntax highlighting with Shiki (one-dark-pro theme)
- VS Code-inspired layout: activity bar, sidebar, main panel, status bar
- Native folder picker
- Collapsible file tree with filename search
- Dark theme

## Development Setup

### Prerequisites

- Rust (stable) -- install via [rustup.rs](https://rustup.rs)
- Node.js 20+
- On Linux, install Tauri system dependencies:

```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

### Install and run

```bash
git clone https://github.com/maylortaylor/markd.git
cd markd
npm install
npm run tauri dev
```

## Project Structure

```
markd/
├── src/                    # React/TypeScript frontend
│   ├── components/
│   │   ├── ActivityBar/
│   │   ├── MainPanel/
│   │   ├── Sidebar/
│   │   └── StatusBar/
│   ├── lib/                # Tauri command wrappers, utilities
│   ├── types/              # Shared TypeScript types
│   └── test/               # Vitest setup
├── src-tauri/              # Rust backend
│   └── src/
│       ├── commands/       # Tauri command handlers
│       └── types.rs        # Shared Rust types
└── .github/workflows/      # CI pipeline
```

## Testing

```bash
# Frontend: type check + lint + vitest
npm run ci:local

# Frontend: test coverage report
npm run test:coverage

# Rust: format check
cd src-tauri && cargo fmt --check

# Rust: lint
cd src-tauri && cargo clippy -- -D warnings

# Rust: unit tests
cd src-tauri && cargo test
```

## License

MIT -- see [LICENSE](LICENSE)

## Security

See [SECURITY.md](SECURITY.md)
