# Review 5.1: Maritime Restyle + Document Outline + VS Code Minimap

**Scope:** Stage 1 Spec Compliance only (as requested)
**Date:** 2026-04-13

---

## Pre-Check: Prior Findings

The only prior review file touching this implementation scope is a separate phase's
review (REVIEW-4.1 covered CI/README/SECURITY). No recurring patterns from earlier
phases apply here.

---

## Stage 1: Spec Compliance

**Verdict: PASS**

Every task across all five waves was implemented as specified. Details follow.

---

### Wave 1 — Dependencies + Theme

#### Task: Install framer-motion@^11 and lucide-react
- Status: PASS
- Evidence: `/Users/matttaylor/Documents/_dev/maylortaylor/markd/package.json` lines 23–24 show `"framer-motion": "^11.18.2"` and `"lucide-react": "^1.8.0"` in `dependencies`.

#### Task: `@theme` block with all 10 navy/ocean tokens
- Status: PASS
- Evidence: `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/index.css` lines 3–15. All ten tokens are present with the exact hex values specified: navy-900 `#0a1628`, navy-800 `#111d35`, navy-700 `#1a2a4a`, navy-600 `#243556`, navy-500 `#2e4063`, ocean-400 `#3b82f6`, ocean-500 `#2563eb`, ocean-300 `#93c5fd`, text-primary `#e2e8f0`, text-secondary `#94a3b8`, text-muted `#64748b`.

#### Task: Body reset (background navy-900, color text-primary) and custom scrollbar CSS
- Status: PASS
- Evidence: `src/index.css` lines 17–38. Body sets `background-color: var(--color-navy-900)` and `color: var(--color-text-primary)`. Full webkit scrollbar rules present including track, thumb, and hover state.

---

### Wave 2 — ActivityBar / Sidebar / FileTree / SearchBar

#### Task: ActivityBar — Lucide icons, 3 buttons, Tailwind only, active indicator left edge span
- Status: PASS
- Evidence: `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/components/ActivityBar/ActivityBar.tsx` lines 1–66. Imports `Files`, `ListTree`, `Search` from `lucide-react`. Three `IconButton` instances for `files`, `search`, `outline`. Active indicator is `<span className="absolute left-0 top-2 bottom-2 w-0.5 bg-ocean-400 rounded-r" />` (line 29). No CSS module import present.

#### Task: Sidebar — Tailwind, AnimatePresence mode="wait", OutlinePanel case, no CSS module
- Status: PASS
- Evidence: `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/components/Sidebar/Sidebar.tsx` lines 44–108. `AnimatePresence mode="wait" initial={false}` wraps a keyed `motion.div` (key=`activeView`). `activeView === 'outline'` renders `<OutlinePanel>`. No CSS module import.

#### Task: FileTree — Lucide icons, Framer Motion AnimatePresence height 0→auto, Tailwind, no CSS module
- Status: PASS
- Evidence: `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/components/Sidebar/FileTree.tsx`. Imports `ChevronRight`, `ChevronDown`, `Folder`, `FolderOpen`, `FileText` from `lucide-react` (line 4). `AnimatePresence initial={false}` wrapping `motion.div` with `initial={{ height: 0, opacity: 0 }}` → `animate={{ height: 'auto', opacity: 1 }}` (lines 54–64). No CSS module import.

#### Task: SearchBar — Tailwind-only input, no CSS module
- Status: PASS
- Evidence: `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/components/Sidebar/SearchBar.tsx`. Single Tailwind-styled `<input>`. No CSS module import.

#### Task: Delete ActivityBar.module.css, Sidebar.module.css, FileTree.module.css, SearchBar.module.css
- Status: PASS
- Evidence: Glob search for `**/*.module.css` in `src/` returned no results.

---

### Wave 3 — MainPanel / StatusBar / App grid / markdown.css

#### Task: MainPanel — flex row, scroll area + minimap slot w-20, scrollRef, heading ID injection
- Status: PASS
- Evidence: `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/components/MainPanel/MainPanel.tsx`. `flex flex-row overflow-hidden` on the `<main>` element (line 33). `scrollRef` ref on the scroll div (line 41). `useEffect` injecting `heading-${i}` IDs on headings (lines 24–30). Minimap slot is a `div className="w-20 ..."` (line 55). No CSS module import.

#### Task: markdown.css — all colors updated to navy theme
- Status: PASS
- Evidence: `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/components/MainPanel/markdown.css`. Background uses `var(--color-navy-800)` / `var(--color-navy-900)`. Text uses `var(--color-text-primary)` / `var(--color-text-secondary)`. Links use `var(--color-ocean-400)` / `var(--color-ocean-300)`. Borders use `var(--color-navy-700)`. Blockquote has `border-left: 3px solid var(--color-ocean-400)` (line 95). Inline code background is `var(--color-navy-700)` (line 47).

#### Task: StatusBar — bg-ocean-500, no CSS module
- Status: PASS
- Evidence: `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/components/StatusBar/StatusBar.tsx` line 9. Class `bg-ocean-500` present. No CSS module import.

#### Task: App.tsx — inline CSS grid, outlineEntries useMemo via DOMParser, pass to Sidebar, no App.module.css
- Status: PASS
- Evidence: `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/App.tsx`. Grid via `style={{ gridTemplate: '"activitybar sidebar main" 1fr ...' }}` (lines 72–74). `outlineEntries` computed with `useMemo` using `DOMParser` to extract `h1–h6` headings (lines 26–34). Passed as `outlineEntries={outlineEntries}` to `<Sidebar>` (line 84). No App.module.css import.

#### Task: Delete MainPanel.module.css, StatusBar.module.css, App.module.css
- Status: PASS
- Evidence: Same Glob scan — no `.module.css` files exist anywhere under `src/`.

---

### Wave 4 — Types + OutlinePanel wiring

#### Task: types/index.ts — HeadingEntry interface, 'outline' added to SidebarView
- Status: PASS
- Evidence: `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/types/index.ts` lines 8–14. `HeadingEntry` interface with `id: string`, `text: string`, `level: number`. `SidebarView` type includes `'outline'` (line 14).

#### Task: OutlinePanel.tsx — new component, Framer Motion staggered entries, click-scroll, H-level indicator, empty state
- Status: PASS
- Evidence: `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/components/Sidebar/OutlinePanel.tsx`. Framer `motion.li` with `transition={{ delay: i * 0.03 }}` stagger (line 29). Click calls `scrollIntoView` via `document.getElementById(id)` (line 11). Level indicator `H{entry.level}` shown in `font-mono` span (line 37). Empty state returns `"No headings found"` paragraph (lines 14–19).

#### Task: Sidebar.tsx — accept outlineEntries prop, wire OutlinePanel for 'outline'
- Status: PASS
- Evidence: `Sidebar.tsx` line 17 includes `outlineEntries: HeadingEntry[]` in props. Line 54 renders `<OutlinePanel entries={outlineEntries} />` when `activeView === 'outline'`.

---

### Wave 5 — Minimap

#### Task: Minimap.tsx — canvas, DPR-aware, colored blocks per element type, viewport indicator, click-to-scroll, ResizeObserver, MutationObserver, scroll listener
- Status: PASS
- Evidence: `/Users/matttaylor/Documents/_dev/maylortaylor/markd/src/components/MainPanel/Minimap.tsx`. DPR: `const dpr = window.devicePixelRatio || 1` with `canvas.width = w * dpr` / `ctx.scale(dpr, dpr)` (lines 16–26). Element color map: headings `#3b82f6` (ocean-400), `pre` `#1a2a4a` (navy-700), `blockquote` `#2563eb` (ocean-500), `ul/ol` `#1e3050`, `p` `#243556` (navy-600) (lines 46–51). Viewport indicator: `fillStyle 'rgba(59,130,246,0.12)'` + `strokeRect` (lines 57–63). `handleClick` sets `scrollTop` proportionally (lines 92–99). `ResizeObserver` on `scroll` (line 78), `MutationObserver` on `scroll` (lines 81–83), `scroll` event listener (line 75).

#### Task: MainPanel.tsx — wire Minimap replacing placeholder div, pass scrollRef
- Status: PASS
- Evidence: `MainPanel.tsx` line 56 renders `<Minimap scrollRef={scrollRef} markdownHtml={content} />` inside the `w-20` container div.

---

## Summary

**Verdict: APPROVE**

All 20 implementation tasks across Waves 1–5 are correctly implemented and match the spec. All 7 CSS module files have been deleted. The implementation is complete and ready for Stage 2 quality review if desired.

Critical: 0 | Important: 0 | Suggestions: 0
