# Review 4.1: CI Pipeline, README, SECURITY.md, and LICENSE

**Reviewer:** Code Quality Review
**Date:** 2026-04-13
**Scope:** Quality review only — spec compliance pre-verified.

---

## Stage 1: Spec Compliance

**Verdict:** PASS (pre-verified — not re-checked per instructions)

---

## Stage 2: Code Quality

### Critical

None.

---

### Important

#### I-9: `dtolnay/rust-toolchain` and `swatinem/rust-cache` are not pinned to a SHA
- **File:** `/Users/matttaylor/Documents/_dev/maylortaylor/markd/.github/workflows/ci.yml` lines 18, 23
- **Detail:** Both third-party actions use floating tag references (`@stable` and `@v2`). A tag can be force-pushed by the action owner, meaning a supply-chain compromise could silently replace the action with malicious code that runs with the repo's secrets. This is a well-documented GitHub Actions supply-chain attack vector. `actions/checkout@v4` and `actions/setup-node@v4` face the same issue, though they are first-party (lower risk) and v4 is a major-version floating tag rather than an alias like `@stable`. The `@stable` alias on `dtolnay/rust-toolchain` is particularly broad — it tracks whatever the maintainer designates as stable at any point.
- **Remediation:** Pin all third-party actions to a full commit SHA. For example:
  ```yaml
  uses: dtolnay/rust-toolchain@b3b07ba8eefc0b3e9c28afe316b2cdbbfcbc5eda  # stable as of 2026-04
  uses: swatinem/rust-cache@9bdad043e88c75890e36ad3bbc8d27f0090dd609    # v2.7.8
  ```
  Add a comment with the human-readable tag so intent is clear. Tools like Dependabot's `github-actions` ecosystem or `pinact` can automate SHA pinning and keep them current.

#### I-10: `cargo fmt --check` step is present in the workflow but absent from the README Testing section
- **File:** `/Users/matttaylor/Documents/_dev/maylortaylor/markd/.github/workflows/ci.yml` line 42 vs `/Users/matttaylor/Documents/_dev/maylortaylor/markd/README.md` lines 62–70
- **Detail:** The CI workflow runs `cargo fmt --check` as a distinct step before clippy. The README's Testing section lists `cargo test` and `cargo clippy` as the Rust commands a contributor should run locally, but omits `cargo fmt --check`. A contributor who follows only the README will experience a CI failure on the fmt step that they could not have anticipated.
- **Remediation:** Add `cd src-tauri && cargo fmt --check` to the Rust section of the README Testing block, before the clippy line:
  ```bash
  # Rust: format check
  cd src-tauri && cargo fmt --check

  # Rust: lint
  cd src-tauri && cargo clippy -- -D warnings

  # Rust: unit tests
  cd src-tauri && cargo test
  ```

#### I-11: README Project Structure tree omits `src/test/` and component subdirectories that exist on disk
- **File:** `/Users/matttaylor/Documents/_dev/maylortaylor/markd/README.md` lines 48–58
- **Detail:** The documented tree shows `src/components/`, `src/lib/`, and `src/types/` as the only subdirectories of `src/`. The actual layout on disk also contains `src/test/` (holding `setup.ts`). Additionally, the components directory contains named subdirectories — `ActivityBar/`, `MainPanel/`, `Sidebar/`, `StatusBar/` — and the tree's flat `components/` entry gives no indication of this structure. A new contributor following the tree to navigate the codebase will be confused when they encounter the test setup file or the component subdirectory layout.
- **Remediation:** Expand the tree to reflect the real layout:
  ```
  src/
  ├── components/
  │   ├── ActivityBar/
  │   ├── MainPanel/
  │   ├── Sidebar/
  │   └── StatusBar/
  ├── lib/                # Tauri command wrappers, utilities
  ├── types/              # Shared TypeScript types
  └── test/               # Vitest setup
  ```
  The `src-tauri/` entry should also show `src/commands/` alongside `src/types.rs`, since the commands subdirectory is the primary extension point and is documented in the PLAN.

#### I-12: SECURITY.md contact address is a literal placeholder
- **File:** `/Users/matttaylor/Documents/_dev/maylortaylor/markd/SECURITY.md` line 21
- **Detail:** The reporting instructions read `Email: [TO BE ADDED -- maintainer email]`. This is the text that was specified in the plan and accepted as correct by spec compliance, but it is a non-functional placeholder in a live security policy. Any researcher who finds a real vulnerability today has no actionable contact. For a public open-source repository this gap means the responsible disclosure channel is broken from day one.
- **Remediation:** Replace the placeholder with a real contact before the repository is made public (or before any release is tagged). A GitHub private security advisory (`Settings > Security > Advisories`) is a zero-configuration alternative that does not require publishing an email address:
  ```markdown
  2. Open a [GitHub Security Advisory](https://github.com/maylortaylor/markd/security/advisories/new)
  ```

---

### Suggestions

#### S-9: Step ordering in ci.yml puts Rust format/lint/test before TypeScript steps but installs Node before system deps
- **File:** `/Users/matttaylor/Documents/_dev/maylortaylor/markd/.github/workflows/ci.yml` lines 27–39
- **Detail:** The Node.js install step (line 27) precedes the Linux system dependencies install (line 33). Since `npm ci` (line 39) depends only on Node being available, and the system deps are only needed for Rust/Tauri compilation, the current order works. However, the conventional pattern is: OS deps → language toolchains → package installs. Reordering to install system deps immediately after the Rust toolchain (and before the Node.js setup) would make the dependency graph easier to reason about, and would ensure that if system dep installation is ever expanded to affect Node native addons, it runs in the right order.
- **Remediation:** Move the "Install system dependencies (Linux)" step to immediately after "Rust cache" and before "Install Node.js". No functional change required — this is purely an ordering clarity improvement.

#### S-10: README dev setup uses `cargo tauri dev` but the canonical command is `npm run tauri dev`
- **File:** `/Users/matttaylor/Documents/_dev/maylortaylor/markd/README.md` line 44
- **Detail:** The dev command shown is `cargo tauri dev`. Tauri 2 ships its CLI as an npm package (`@tauri-apps/cli`), and the `package.json` scripts expose it as `npm run tauri`. Running `cargo tauri dev` works only when the Tauri CLI is also installed globally via Cargo (`cargo install tauri-cli`), which is not listed as a prerequisite. A developer who runs only `npm install` as instructed — which installs `@tauri-apps/cli` locally — will find that `cargo tauri dev` fails because the cargo binary is not present. The npm-scripts path (`npm run tauri dev`) uses the locally installed CLI and is the more robust instruction.
- **Remediation:** Change the install and run block in the README to:
  ```bash
  git clone https://github.com/maylortaylor/markd.git
  cd markd
  npm install
  npm run tauri dev
  ```

#### S-11: SECURITY.md "Supported Versions" table is uninformative at this stage
- **File:** `/Users/matttaylor/Documents/_dev/maylortaylor/markd/SECURITY.md` lines 27–31
- **Detail:** The table only has a "Latest" row and an "Older" row. Before any release exists, this adds no useful information and could mislead a researcher into thinking versioned releases already exist. The `[TO BE ADDED]` email placeholder immediately above amplifies the impression that this document is not yet ready.
- **Remediation:** Collapse this section to a single sentence until releases exist: "This project has not yet reached a stable release. All development is on the `main` branch. Report vulnerabilities against the current `main` HEAD." Restore the table format when versioned releases are tagged.

#### S-12: README omits `npm run test:coverage` from the Testing section
- **File:** `/Users/matttaylor/Documents/_dev/maylortaylor/markd/README.md` lines 62–70
- **Detail:** `package.json` defines a `test:coverage` script that runs Vitest with coverage reporting. The README Testing section only shows `npm run ci:local` and `npx vitest run` (indirectly via ci:local). A new contributor looking to check coverage before opening a PR has no documented path to do so.
- **Remediation:** Add a coverage line to the Testing section:
  ```bash
  # Frontend: coverage report
  npm run test:coverage
  ```

---

## Summary

**Verdict:** REQUEST CHANGES

Two Important findings should be resolved before this is considered complete. I-10 (README omits the `cargo fmt --check` step) is a practical contributor experience failure — it will cause unexpected CI breakage. I-11 (inaccurate project structure tree) gives new contributors a misleading map of the codebase. I-12 (broken security contact) is a policy gap, though it can be deferred until just before the repository is made public. I-9 (unpinned third-party action SHAs) is a supply-chain hygiene issue worth fixing given that this is a security-sensitive project making a privacy promise to users.

Critical: 0 | Important: 4 | Suggestions: 4
