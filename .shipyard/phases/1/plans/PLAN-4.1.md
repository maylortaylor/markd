# Plan 4.1: CI Pipeline, README, SECURITY.md, and LICENSE

---
phase: 1-foundation
plan: "4.1"
wave: 4
dependencies: ["3.1"]
must_haves:
  - GitHub Actions CI workflow that runs lint, test, type check on push/PR
  - README with project description, dev setup, privacy promise, and license link
  - SECURITY.md with vulnerability reporting instructions
  - MIT LICENSE file
files_touched:
  - .github/workflows/ci.yml
  - README.md
  - SECURITY.md
  - LICENSE
tdd: false
risk: low
---

## Context

This plan adds the CI pipeline and project documentation files. These are independent of the test files themselves (Plan 4.2 writes the actual tests) -- the CI pipeline runs whatever tests exist. Having CI configured means that once tests land, they will be automatically validated on every push.

Risk is low. GitHub Actions YAML is straightforward, and the documentation files are static content.

This plan touches `.github/`, `README.md`, `SECURITY.md`, `LICENSE`. Plan 4.2 touches `src/` and `src-tauri/src/` test files. No file overlap -- they can execute in parallel.

## Dependencies

- **Plan 3.1** (Wave 3): Full integration must be complete so CI can run meaningful lint, typecheck, and test commands against a compilable project.

## Tasks

### Task 1: Create GitHub Actions CI workflow

**Files:**
- `.github/workflows/ci.yml`

**Action:** create

**Description:**

Create `.github/workflows/ci.yml` that runs on push to `develop`, `stage`, `main` and on pull requests to those branches. The workflow should:

1. Check out the code
2. Install Rust toolchain (stable) with clippy and rustfmt components
3. Install Node.js 20 with npm cache
4. Install Linux system dependencies for Tauri (webkit2gtk, etc.)
5. Run `npm ci` to install frontend dependencies
6. Run Rust clippy lint: `cd src-tauri && cargo clippy -- -D warnings`
7. Run Rust tests: `cd src-tauri && cargo test`
8. Run TypeScript type check: `npx tsc --noEmit`
9. Run ESLint: `npx eslint src/`
10. Run frontend tests: `npx vitest run`

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
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install Rust toolchain
        uses: dtolnay/rust-toolchain@stable
        with:
          components: clippy, rustfmt

      - name: Rust cache
        uses: swatinem/rust-cache@v2
        with:
          workspaces: src-tauri -> target

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install system dependencies (Linux)
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf

      - name: Install npm dependencies
        run: npm ci

      - name: Rust lint (clippy)
        run: cd src-tauri && cargo clippy -- -D warnings

      - name: Rust tests
        run: cd src-tauri && cargo test

      - name: TypeScript type check
        run: npx tsc --noEmit

      - name: ESLint
        run: npx eslint src/

      - name: Frontend tests
        run: npx vitest run
```

Key details:
- Uses `swatinem/rust-cache@v2` to cache Cargo build artifacts between runs (significant speedup)
- `workspaces` setting for rust-cache points to `src-tauri -> target` since the Rust project is in a subdirectory
- System deps install step is Linux-only; the workflow runs on `ubuntu-latest` only (cross-platform builds are Phase 4)
- `npm ci` (not `npm install`) for reproducible CI builds from lockfile

**Acceptance Criteria:**
- `.github/workflows/ci.yml` exists and is valid YAML
- Workflow triggers on push to `develop`, `stage`, `main` and PRs to those branches
- All six check steps are present: Rust clippy, Rust test, tsc, eslint, vitest
- Rust cache is configured for the `src-tauri` workspace
- Linux system dependencies are installed before any Rust compilation

### Task 2: Write README with dev setup, privacy promise, and features

**Files:**
- `README.md`

**Action:** modify (replace minimal placeholder)

**Description:**

Replace the current single-line `README.md` with a complete project README. Structure:

1. **Title + one-line description**: "Markd -- A privacy-first, cross-platform markdown viewer"
2. **Privacy Promise section**: Bullet list from the design doc -- 100% local, no network, no telemetry, no accounts, filesystem sandboxed, open source verifiable
3. **Features section**: Current Phase 1 features as bullet list -- GFM rendering, syntax highlighting, VS Code-inspired layout, folder picker, file tree with search, dark theme
4. **Development Setup section**:
   - Prerequisites: Rust (stable), Node.js 20+, system deps for Tauri on Linux (`sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`)
   - Clone and install: `git clone`, `npm install`
   - Run dev: `cargo tauri dev`
   - Run tests: `npm run ci:local` (runs typecheck + lint + vitest), `cd src-tauri && cargo test`
5. **Project Structure section**: Brief tree showing `src/` (React frontend), `src-tauri/` (Rust backend), `.github/workflows/` (CI)
6. **Testing section**: How to run `cargo test`, `npm run test`, `npm run ci:local`
7. **License section**: "MIT -- see LICENSE" with link
8. **Security section**: "See SECURITY.md" with link

Do NOT include download links or screenshots (those are Phase 4). Keep it accurate for the current state of the project.

**Acceptance Criteria:**
- `README.md` has all 8 sections listed above
- Privacy promise section matches the design doc claims
- Dev setup instructions are accurate and runnable
- No placeholder or TODO text remains
- No emojis

### Task 3: Create SECURITY.md and LICENSE files

**Files:**
- `SECURITY.md`
- `LICENSE`

**Action:** create

**Description:**

**SECURITY.md** -- Create a security policy file:

```markdown
# Security Policy

## Privacy Guarantee

Markd is designed to be 100% local. The application:

- Makes zero network calls of any kind
- Collects no telemetry, analytics, or usage data
- Stores no data outside your local machine
- Reads only the folders you explicitly select and the app config directory
- Has no accounts, cloud sync, or sign-in functionality

These guarantees are enforced at the framework level by Tauri's capability-based
permission system. The app's security configuration explicitly denies all network
access (HTTP, WebSocket, fetch) and restricts filesystem access to user-selected
directories and the app config path.

## Reporting a Vulnerability

If you discover a security vulnerability in Markd, please report it responsibly:

1. **Do not open a public GitHub issue** for security vulnerabilities
2. Email: [TO BE ADDED -- maintainer email]
3. Include: description of the vulnerability, steps to reproduce, and potential impact
4. You will receive a response within 72 hours

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | Yes       |
| Older   | No        |

## Scope

Security issues in the following areas are in scope:

- Filesystem access beyond the selected directory
- Network access that bypasses the Tauri capability deny
- Code execution vulnerabilities
- Data leakage to external systems

Issues that are NOT in scope:

- Physical access attacks (if someone has your machine, they have your files)
- Social engineering
- Third-party dependency vulnerabilities (report these upstream, but let us know)
```

**LICENSE** -- Create an MIT license file with year 2026 and copyright holder "Matt Taylor and Markd contributors":

```
MIT License

Copyright (c) 2026 Matt Taylor and Markd contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**Acceptance Criteria:**
- `SECURITY.md` describes the privacy guarantee, vulnerability reporting process, supported versions, and scope
- `LICENSE` is a valid MIT license with correct year and copyright holder
- Both files are plain markdown/text with no syntax errors

## Verification

```bash
cd /Users/matttaylor/Documents/_dev/maylortaylor/markd

# Verify files exist and are non-empty
test -s .github/workflows/ci.yml && echo "PASS: ci.yml exists" || echo "FAIL: ci.yml missing"
test -s README.md && echo "PASS: README.md exists" || echo "FAIL: README.md missing"
test -s SECURITY.md && echo "PASS: SECURITY.md exists" || echo "FAIL: SECURITY.md missing"
test -s LICENSE && echo "PASS: LICENSE exists" || echo "FAIL: LICENSE missing"

# Verify CI YAML is valid (basic check -- GitHub validates on push)
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" 2>/dev/null && echo "PASS: valid YAML" || echo "FAIL: invalid YAML"

# Verify README has key sections
grep -q "Privacy" README.md && echo "PASS: Privacy section" || echo "FAIL: missing Privacy section"
grep -q "Development Setup" README.md && echo "PASS: Dev setup section" || echo "FAIL: missing Dev setup"
grep -q "cargo tauri dev" README.md && echo "PASS: Dev command present" || echo "FAIL: missing dev command"
grep -q "MIT" LICENSE && echo "PASS: MIT license" || echo "FAIL: not MIT"
```
