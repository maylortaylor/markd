# Plan 1.1: Tauri v2 Project Scaffold

---
phase: 1-foundation
plan: "1.1"
wave: 1
dependencies: []
must_haves:
  - Tauri v2 project with React + TypeScript + Vite template
  - Tailwind CSS with @tailwindcss/vite plugin
  - ESLint + Vitest configured
  - All Rust and frontend dependencies declared
  - Tauri security config (no network, scoped filesystem)
  - Project compiles and launches a blank window
files_touched:
  - package.json
  - vite.config.ts
  - tsconfig.json
  - tsconfig.node.json
  - index.html
  - src/main.tsx
  - src/App.tsx
  - src/index.css
  - src/vite-env.d.ts
  - src-tauri/Cargo.toml
  - src-tauri/src/main.rs
  - src-tauri/src/lib.rs
  - src-tauri/tauri.conf.json
  - src-tauri/capabilities/default.json
  - src-tauri/build.rs
  - eslint.config.js
  - vitest.config.ts
  - .gitignore
tdd: false
risk: medium
---

## Context

This is the foundational plan for the entire project. Nothing else can be built until a working Tauri v2 scaffold exists with the correct dependencies, build tooling, and security configuration. This plan produces a compilable, launchable Tauri app with a blank React frontend, Tailwind CSS ready, ESLint configured, Vitest configured, and all Rust/frontend dependencies declared.

Risk is medium because Tauri v2 scaffolding involves coordinating Rust toolchain, Node.js toolchain, system dependencies (webkit2gtk on Linux), and plugin registration. If versions conflict, this blocks everything.

## Dependencies

None -- this is Wave 1.

## Tasks

### Task 1: Scaffold Tauri v2 project and install all dependencies

**Files:**
- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `tsconfig.node.json`
- `index.html`
- `src/main.tsx`
- `src/App.tsx`
- `src/index.css`
- `src/vite-env.d.ts`
- `src-tauri/Cargo.toml`
- `src-tauri/src/main.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tauri.conf.json`
- `src-tauri/capabilities/default.json`
- `src-tauri/build.rs`
- `.gitignore`

**Action:** create

**Description:**

Run the Tauri v2 scaffold command from the project root:

```bash
cd /Users/matttaylor/Documents/_dev/maylortaylor/markd
npm create tauri-app@latest . -- --template react-ts
```

If the scaffold tool does not support `.` as the target (current directory), scaffold into a temp directory and move files into the project root, preserving the existing `.shipyard/`, `docs/`, `README.md`, and `.gitignore`.

After scaffolding, install the additional frontend dependencies:

```bash
npm install @tauri-apps/plugin-dialog shiki
npm install -D tailwindcss @tailwindcss/vite vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event eslint @eslint/js typescript-eslint @types/react @types/react-dom
```

Update `src-tauri/Cargo.toml` to add these dependencies under `[dependencies]`:

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
pulldown-cmark = { version = "0.12", features = ["simd"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
walkdir = "2"
```

Update `vite.config.ts` to include the Tailwind plugin:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
}));
```

Replace the contents of `src/index.css` with:

```css
@import 'tailwindcss';
```

Clear out `src/App.tsx` to a minimal component:

```tsx
function App() {
  return (
    <div className="h-screen w-screen bg-[#1e1e1e] text-[#cccccc]">
      <p>Markd</p>
    </div>
  );
}

export default App;
```

Update `src/main.tsx` to be minimal:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Merge the existing `.gitignore` content with Tauri-generated entries. Ensure these are present:

```
node_modules/
target/
dist/
.env
.env.local
*.log
.DS_Store
thumbs.db
src-tauri/gen/
```

**Acceptance Criteria:**
- `package.json` exists with `react`, `react-dom`, `@tauri-apps/api`, `@tauri-apps/plugin-dialog`, `shiki`, `tailwindcss`, `@tailwindcss/vite`, `vitest`, `@testing-library/react`, `eslint` as dependencies or devDependencies
- `src-tauri/Cargo.toml` lists `tauri`, `tauri-plugin-dialog`, `tauri-plugin-fs`, `pulldown-cmark`, `serde`, `serde_json`, `walkdir`
- `vite.config.ts` includes both `react()` and `tailwindcss()` plugins
- `src/index.css` contains `@import 'tailwindcss';`
- `npm install` completes without errors

### Task 2: Configure Tauri security, ESLint, Vitest, and register plugins

**Files:**
- `src-tauri/tauri.conf.json`
- `src-tauri/capabilities/default.json`
- `src-tauri/src/lib.rs`
- `eslint.config.js`
- `vitest.config.ts`
- `package.json` (scripts section)

**Action:** create/modify

**Description:**

**Tauri security config** -- Update `src-tauri/tauri.conf.json` to set CSP and app metadata:

```json
{
  "productName": "Markd",
  "version": "0.0.1",
  "identifier": "com.markd.app",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "title": "Markd",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600
      }
    ],
    "security": {
      "csp": "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'"
    }
  }
}
```

**Capabilities** -- Update `src-tauri/capabilities/default.json`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capabilities for Markd — no network, scoped filesystem",
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

Key security point: No `http:default`, no `shell:default`, no `websocket:default` -- this denies all network access by default.

**Register Tauri plugins** -- Update `src-tauri/src/lib.rs`:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**ESLint config** -- Create `eslint.config.js` (flat config format):

```javascript
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/', 'src-tauri/', 'node_modules/'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
```

**Vitest config** -- Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: true,
  },
});
```

Create `src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom';
```

**Package.json scripts** -- Add/update the scripts section:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src/ --ext .ts,.tsx",
    "typecheck": "tsc --noEmit",
    "ci:local": "npm run typecheck && npm run lint && npm run test"
  }
}
```

**Acceptance Criteria:**
- `src-tauri/capabilities/default.json` contains NO network permissions (`http:`, `websocket:`, `shell:`)
- `src-tauri/src/lib.rs` registers `tauri_plugin_dialog` and `tauri_plugin_fs`
- `eslint.config.js` exists and ignores `dist/`, `src-tauri/`, `node_modules/`
- `vitest.config.ts` exists with jsdom environment and setup file
- `src/test/setup.ts` imports `@testing-library/jest-dom`
- `npm run lint` runs without config errors (warnings from empty project are OK)
- `npm run typecheck` completes successfully

### Task 3: Verify full compilation and launch

**Files:** (no new files -- verification only)

**Action:** verify

**Description:**

Run the full verification sequence to confirm everything compiles and connects:

```bash
cd /Users/matttaylor/Documents/_dev/maylortaylor/markd

# 1. Frontend compiles
npm run build

# 2. Rust compiles (from src-tauri/)
cd src-tauri && cargo check && cd ..

# 3. TypeScript type check passes
npm run typecheck

# 4. ESLint runs without config errors
npm run lint

# 5. Vitest runs (no tests yet, but config is valid)
npm run test || true

# 6. Full Tauri dev build launches (manual check)
# cargo tauri dev
```

If `cargo check` fails due to missing system deps on Linux, install them:
```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

**Acceptance Criteria:**
- `npm run build` exits with code 0
- `cd src-tauri && cargo check` exits with code 0
- `npm run typecheck` exits with code 0
- `npm run lint` exits with code 0 (warnings acceptable)
- `npm run test` exits cleanly (0 tests is OK, config must not error)
- `cargo tauri dev` launches a window showing "Markd" text on a dark background (manual verification)

## Verification

```bash
cd /Users/matttaylor/Documents/_dev/maylortaylor/markd
npm run build && echo "PASS: frontend build" || echo "FAIL: frontend build"
cd src-tauri && cargo check && echo "PASS: rust check" && cd ..  || echo "FAIL: rust check"
npm run typecheck && echo "PASS: typecheck" || echo "FAIL: typecheck"
npm run lint && echo "PASS: lint" || echo "FAIL: lint"
npm run test 2>&1; echo "PASS: vitest config valid"
```
