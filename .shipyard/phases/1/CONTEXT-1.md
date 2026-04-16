# Phase 1: Foundation — Design Decisions

## Markdown Parsing: Rust-side

- `pulldown-cmark` parses markdown to HTML in the Rust backend
- Frontend receives HTML string and renders it
- Single source of truth for parsing, simpler frontend

## Syntax Highlighting: shiki (frontend-side)

- Use shiki (VS Code's syntax highlighter) in the browser
- Theme-aware from day one — easy to swap themes when theming system comes in Phase 3
- Rust sends code blocks as-is in the HTML, frontend enhances with shiki

## Frontend Stack: Vite + React + Tailwind CSS + CSS Modules

- Tauri v2 default scaffold with Vite + React + TypeScript
- Tailwind CSS for utility-first layout and quick styling
- CSS Modules for component-scoped custom styles (important for theming engine later)
- Both work together natively in Vite — no config conflict
