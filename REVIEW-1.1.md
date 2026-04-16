# REVIEW-1.1 — Tauri v2 Project Scaffold

**Plan:** PLAN-1.1
**Date:** 2026-04-13
**Reviewer verdict:** APPROVE

---

## Pre-Check: Prior Findings

A prior REVIEW-1.1.md existed with one blocking issue: `vitest.config.ts` was missing
`passWithNoTests: true`, causing `npm run test` to exit with code 1 on a clean scaffold.

**Resolution confirmed:** `vitest.config.ts` line 10 now contains `passWithNoTests: true`.
The blocking issue has been addressed.

---

## Stage 1: Spec Compliance

**Verdict:** PASS (confirmed carried forward — Stage 1 passed on builder retry)

---

## Stage 2: Code Quality

### Critical

None.

---

### Important

- **Filesystem capability scope is too narrow for core app functionality** at
  `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src-tauri/capabilities/default.json` lines 13–18.
  - The `fs:allow-read-text-file` and `fs:allow-read-dir` permissions are scoped exclusively
    to `$APPDATA/**`. Markd's stated purpose is a markdown *viewer* — users will open files
    from arbitrary locations on disk (Downloads, Documents, Desktop, etc.). `$APPDATA` is the
    application's own data directory and is not where user documents live. When file-open
    commands are wired up, every attempt to read a user-chosen file outside `$APPDATA` will
    be silently denied by the Tauri runtime.
  - Remediation: Add a `$HOME/**` scope (or at minimum `$DOCUMENT/**` and `$DOWNLOAD/**`)
    alongside `$APPDATA/**`, or use the `fs:scope-home-recursive` preset. The dialog plugin
    handles the user-consent UX, but the fs capability still needs an explicit path scope
    that covers where users actually store markdown files. This should be done before any
    file-reading commands are implemented so the capability model is correct from the start.

- **`@typescript-eslint/no-explicit-any` is absent from the ESLint config** at
  `/Users/matttaylor/Documents/_dev/maylortaylor/markd/eslint.config.js`.
  - `tsconfig.json` enables `strict: true`, which does not prevent `any` casts — it only
    prevents implicit `any` from missing annotations. Explicit `as any` and `: any`
    annotations are still allowed and will go undetected. `typescript-eslint`'s recommended
    config includes this rule, but it is set to `warn` by default, not `error`. Without
    enforcing it, type safety can be silently eroded as the codebase grows.
  - Remediation: Add `'@typescript-eslint/no-explicit-any': 'error'` to the `rules` block
    in `eslint.config.js`. If there are known unavoidable cases, they can be suppressed
    inline with justification.

---

### Suggestions

- **`react-hooks/exhaustive-deps` and `react-hooks/rules-of-hooks` are not configured** in
  `/Users/matttaylor/Documents/_dev/maylortaylor/markd/eslint.config.js`.
  - These rules catch a large class of subtle React bugs (missing effect dependencies,
    hooks called conditionally). They require adding `eslint-plugin-react-hooks` as a dev
    dependency. This is standard practice for any non-trivial React app and worth adding
    before business logic is written.
  - Remediation: `npm install -D eslint-plugin-react-hooks`, then add
    `...reactHooksPlugin.configs['recommended-latest']` (or the flat config equivalent)
    to the `tseslint.config(...)` call.

- **`shiki` version pin is broad** in
  `/Users/matttaylor/Documents/_dev/maylortaylor/markd/package.json` line 24.
  - `"shiki": "^1.0.0"` resolves to the latest 1.x release, which as of April 2026 is
    well into the 1.x series. This is not a blocking concern but `shiki` has had minor
    API surface changes within 1.x. Pinning to `^1.24.0` (or whatever the current latest
    is after `npm install`) captures the intent more precisely and prevents surprise
    breakage if a 1.x release introduces a deprecation.
  - Remediation: After the initial `npm install`, copy the resolved version from
    `package-lock.json` into `package.json` as a more specific lower bound (e.g.
    `^1.24.0`).

- **`vitest` and `@vitejs/plugin-react` versions are mismatched in tooling** in
  `/Users/matttaylor/Documents/_dev/maylortaylor/markd/package.json`.
  - `vite` is `^6.0.3` but `vitest` is `^2.0.0`. Vitest 2.x was designed for Vite 5.x;
    Vitest 3.x targets Vite 6.x. While Vitest 2.x may work with Vite 6 in practice, the
    officially supported pairing is Vitest 3 + Vite 6. Running a mismatched pair can
    produce subtle test environment inconsistencies.
  - Remediation: Upgrade `vitest` and `@vitest/ui` to `^3.0.0` to match the Vite 6
    generation. Verify `npm run test` still passes after the upgrade.

- **`tsconfig.node.json` `lib` target is one version behind its `target`** at
  `/Users/matttaylor/Documents/_dev/maylortaylor/markd/tsconfig.node.json` lines 3–4.
  - `target` is `ES2022` but `lib` is `["ES2023"]`. This is inverted — `lib` should
    match or be lower than `target` (the lib describes what built-ins are available, the
    target describes the emitted syntax). Having `lib` ahead of `target` means TypeScript
    will accept ES2023 built-ins (e.g. `Array.prototype.toSorted`) that the `ES2022`
    target may not emit polyfills for. In a build-tool config file this is low-risk since
    Vite/Node handles execution, but it is semantically inconsistent.
  - Remediation: Align to `"lib": ["ES2022"]` or raise `target` to `"ES2023"` for
    consistency.

- **`src/App.tsx` uses hardcoded colour values** at
  `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/App.tsx` line 3.
  - `bg-[#1e1e1e]` and `text-[#cccccc]` are arbitrary Tailwind values. This is fine for
    a placeholder, but worth replacing with Tailwind CSS variables or a design token
    (`bg-zinc-900 text-zinc-300`) before these values proliferate across components.
    Since this is a scaffold, no action is required now — just worth noting before
    theming decisions compound.

---

## Summary

**Verdict:** APPROVE

The scaffold is solid. All configuration files are present, correctly structured, and
the prior blocking issue (`passWithNoTests: true`) has been resolved. There are no
security holes or broken configurations. The one Important finding about the filesystem
capability scope (`$APPDATA/**` only) should be addressed before any file-reading
commands are implemented — it will cause silent runtime failures otherwise. The ESLint
`no-explicit-any` gap is worth closing now while the config is being actively shaped.
All other findings are suggestions that can be tracked and addressed as the project grows.

Critical: 0 | Important: 2 | Suggestions: 5
