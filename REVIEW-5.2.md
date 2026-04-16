# Review 5.2: Maritime Restyle — Stage 2 Code Quality

**Scope:** Stage 2 Code Quality (Stage 1 previously PASSED in REVIEW-5.1)
**Date:** 2026-04-13
**Files reviewed:**
- `src/App.tsx`
- `src/components/ActivityBar/ActivityBar.tsx`
- `src/components/Sidebar/Sidebar.tsx`
- `src/components/Sidebar/FileTree.tsx`
- `src/components/Sidebar/SearchBar.tsx`
- `src/components/Sidebar/OutlinePanel.tsx`
- `src/components/MainPanel/MainPanel.tsx`
- `src/components/MainPanel/Minimap.tsx`
- `src/components/StatusBar/StatusBar.tsx`
- `src/index.css`
- `src/types/index.ts`

---

## Pre-Check: Prior Findings

Prior ISSUES.md carries open items I-2 (no-explicit-any), S-1
(react-hooks/exhaustive-deps), S-3 (tsconfig mismatch), S-4 (shiki version pin), SEC-2
(HTML sanitization), and SEC-3 (path traversal). None have recurred in the new code
under review. The S-1 absence of `react-hooks/exhaustive-deps` *does* permit one of the
bugs identified below (BLOCKING-2) to exist undetected — that connection is noted in the
finding.

---

## Stage 2: Code Quality

### BLOCKING

#### BLOCKING-1: `useEffect` in `Minimap.tsx` never re-runs when `scrollRef` changes, leaving stale observers after file switch

**File:** `src/components/MainPanel/Minimap.tsx` lines 66–90

The `useEffect` dependency array is `[markdownHtml]`. `scrollRef` is excluded with the
comment "scrollRef is stable". That is correct for the current mount lifetime of
`Minimap`, but the effect captures `scrollRef.current` *at call time* on line 72:

```ts
const scroll = scrollRef.current;
if (!scroll) return () => cancelAnimationFrame(raf);
```

If `scroll` is `null` at the time the effect first fires (a real possibility — see
BLOCKING-2), the early return path returns a cleanup that only cancels the RAF, and
**no scroll listener, ResizeObserver, or MutationObserver is ever registered**. On the
next `markdownHtml` change the effect re-runs, but the *first* render of the minimap
after mount will have no live observers. The minimap draws once, then stops updating
until the user switches files.

**Remediation:** Move the `scroll` capture inside the RAF callback so it resolves after
the frame — at that point the DOM is guaranteed to have committed:

```ts
useEffect(() => {
  const raf = requestAnimationFrame(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;

    drawMinimap();

    const onScroll = () => drawMinimap();
    scroll.addEventListener('scroll', onScroll, { passive: true });

    const ro = new ResizeObserver(() => drawMinimap());
    ro.observe(scroll);

    const mo = new MutationObserver(() => drawMinimap());
    mo.observe(scroll, { childList: true, subtree: true, characterData: true });

    // cleanup returned from RAF callback cannot be used; use a flag
    // Store references so the outer cleanup can reach them.
  });
  // ...
}, [markdownHtml]);
```

Because RAF callbacks cannot return cleanup functions, the cleanest fix is to store
the observers in refs and disconnect them unconditionally in the outer cleanup:

```ts
const roRef = useRef<ResizeObserver | null>(null);
const moRef = useRef<MutationObserver | null>(null);

useEffect(() => {
  let rafId: number;
  rafId = requestAnimationFrame(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    drawMinimap();
    scroll.addEventListener('scroll', drawMinimap, { passive: true });
    roRef.current = new ResizeObserver(drawMinimap);
    roRef.current.observe(scroll);
    moRef.current = new MutationObserver(drawMinimap);
    moRef.current.observe(scroll, { childList: true, subtree: true });
  });
  return () => {
    cancelAnimationFrame(rafId);
    scrollRef.current?.removeEventListener('scroll', drawMinimap);
    roRef.current?.disconnect();
    moRef.current?.disconnect();
  };
}, [markdownHtml]);
```

---

#### BLOCKING-2: Canvas sized from `offsetWidth`/`offsetHeight` at RAF time — both are `0` if the parent container has not been laid out yet

**File:** `src/components/MainPanel/Minimap.tsx` lines 17–19

```ts
const w = canvas.offsetWidth;
const h = canvas.offsetHeight;
if (w === 0 || h === 0) return;
```

The guard exists, but it means `drawMinimap` exits silently the first time it is called
if the browser has not yet computed layout for the `w-20` container. A single RAF is not
guaranteed to be enough for layout to complete — particularly on first mount in a
Tauri/Electron-style webview where the initial render can be slower than in a browser. If
`w === 0` the function returns without registering the RAF-deferred logic from BLOCKING-1
(because `drawMinimap` is called *inside* the RAF callback — the early return prevents
nothing in the current code, but once BLOCKING-1 is fixed the guard becomes critical).

The deeper problem is that the canvas element itself uses `className="absolute inset-0
w-full h-full"` — CSS `inset-0` requires the parent to be `position: relative` and to
have an explicit height. The parent (`div className="w-20 bg-navy-800 ... relative"` in
`MainPanel.tsx` line 55) is `relative` but gets its height from the flex container, which
in turn depends on the grid row. If any flex/grid ancestor mis-sizes, `offsetHeight` is 0.

**Remediation:** Replace the one-shot RAF with a `ResizeObserver` on the canvas element
itself, which fires reliably once the element has a non-zero layout size:

```ts
useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const ro = new ResizeObserver(() => {
    if (canvas.offsetWidth > 0 && canvas.offsetHeight > 0) drawMinimap();
  });
  ro.observe(canvas);
  return () => ro.disconnect();
}, [markdownHtml]);
```

This replaces the initial RAF draw. The scroll/mutation observers from BLOCKING-1 can
remain as a separate effect keyed on `markdownHtml`.

---

#### BLOCKING-3: `OutlinePanel` scrolls using IDs that only exist in `MainPanel`'s DOM — broken when the document is not mounted

**File:** `src/components/Sidebar/OutlinePanel.tsx` line 11

```ts
document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
```

The heading IDs (`heading-0`, `heading-1`, etc.) are injected by `MainPanel`'s second
`useEffect` (lines 24–29 of `MainPanel.tsx`). There is a timing window between when
`outlineEntries` is computed in `App.tsx` (which runs synchronously in `useMemo` from
`markdownHtml`) and when `MainPanel`'s `useEffect` has actually run and injected the IDs
into the DOM. If the user opens the Outline panel and clicks a heading *before* the DOM
effect has committed, `document.getElementById(id)` returns `null` and the click silently
does nothing.

More structurally: `OutlinePanel` reaches outside its subtree and into a sibling
component's DOM via a global `document.getElementById` call. This is an architectural
coupling that makes both components harder to reason about and test in isolation.

**Remediation:** Pass the `scrollRef` from `App.tsx` down to `OutlinePanel` (via
`Sidebar` → `OutlinePanel`) so the scroll target is explicit. Then scroll by querying
within `scrollRef.current`:

```ts
// OutlinePanel.tsx
function scrollTo(id: string) {
  scrollRef.current?.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
```

This makes the dependency explicit, narrows the DOM query scope, and eliminates the
timing issue because `scrollRef` is the same ref that `MainPanel` holds — once the DOM
effect has run, the element is queryable through the ref.

---

### IMPORTANT

#### IMPORTANT-1: `drawMinimap` is recreated on every render but referenced in the `useEffect` closure — `react-hooks/exhaustive-deps` would flag this

**File:** `src/components/MainPanel/Minimap.tsx` lines 11–64, 66–90

`drawMinimap` is a plain function defined inside the component body. It is re-created on
every render. The `useEffect` dependency array is `[markdownHtml]` with the comment
"drawMinimap is redefined each render; scrollRef is stable". This is a conscious choice
to avoid adding `drawMinimap` to deps (which would cause the effect to re-run every
render), but it means the effect always closes over a stale version of `drawMinimap` from
the render in which the effect last ran.

In the current code `drawMinimap` only reads `canvasRef.current` and `scrollRef.current`
(both stable refs) plus `window.devicePixelRatio` (stable), so the stale closure does not
cause a visible bug today. However, S-1 from ISSUES.md (no `react-hooks/exhaustive-deps`)
means this will not be caught automatically if `drawMinimap` gains a dependency on a
state variable in the future.

**Remediation:** Wrap `drawMinimap` in `useCallback` with an empty dependency array (it
only reads refs and `window`). This makes the intent explicit and makes the function safe
to include in effect dependency arrays:

```ts
const drawMinimap = useCallback(() => {
  // ... existing body unchanged
}, []); // refs are stable — no deps needed
```

---

#### IMPORTANT-2: `FileTree` depth parameter is reset to `0` for all recursive children — visual indentation breaks for deeply nested trees

**File:** `src/components/Sidebar/FileTree.tsx` line 68

```tsx
<FileTreeNode
  key={child.path}
  entry={child}
  depth={0}          // ← always 0
  selectedPath={selectedPath}
  onFileSelect={onFileSelect}
  expandedPaths={expandedPaths}
  onToggle={onToggle}
/>
```

When a directory is expanded, its children are rendered with `depth={0}` regardless of
how deeply nested they are. Indentation is computed as `8 + depth * 16` (line 34), so
all children of any expanded directory show at the same indent level (`8px`). The visual
nesting is achieved only by the `ml-3 pl-2 border-l` wrapper div (line 63) — but that
wrapper adds 20px per level, while the intent was `depth * 16`. For a 3-level deep tree
the items will visually indent, but the indentation is controlled entirely by CSS margin
nesting rather than the `depth` prop, making the prop misleading and the two systems
inconsistent.

**Remediation:** Either:
1. Remove the `depth` prop entirely and rely solely on the CSS margin nesting (simpler), or
2. Pass `depth={depth + 1}` to recursive children and remove the CSS margin nesting, keeping the prop-driven approach consistent:

```tsx
<FileTreeNode
  key={child.path}
  entry={child}
  depth={depth + 1}   // was: 0
  ...
/>
```

---

#### IMPORTANT-3: `aria-current` on file buttons uses the string `'true'` instead of the valid token `'page'` or `'true'` (boolean attribute misuse)

**File:** `src/components/Sidebar/FileTree.tsx` lines 89, 154

```tsx
aria-current={isSelected ? 'true' : undefined}
```

The `aria-current` attribute accepts an enumerated set of tokens: `page`, `step`, `location`,
`date`, `time`, or the boolean `true`/`false`. The string `'true'` is not a valid
`aria-current` token per the ARIA spec — the boolean `true` maps to the literal string
`"true"` in the DOM but React JSX handles this correctly only when the attribute is typed
as `boolean`. Passing the string `'true'` works in practice on most screen readers but is
technically non-conformant.

For a file selection context, the semantically correct value is `aria-current="true"` (or
omitted) — not `"page"` (which implies URL navigation). The boolean form in JSX is:

**Remediation:**
```tsx
aria-current={isSelected ? true : undefined}
```

---

#### IMPORTANT-4: `OutlinePanel` heading buttons have no `aria-label` — screen reader announces only `H2` prefix, not the heading text

**File:** `src/components/Sidebar/OutlinePanel.tsx` lines 31–41

```tsx
<button
  onClick={() => scrollTo(entry.id)}
  className="..."
  title={entry.text}
>
  <span className="text-ocean-400 text-xs font-mono flex-shrink-0">
    H{entry.level}
  </span>
  <span className="truncate">{entry.text}</span>
</button>
```

The `title` attribute provides a tooltip but is not reliably announced by all screen
reader / browser combinations. Because the button contains two text nodes ("H2" and
the heading text), most screen readers will concatenate them as "H2 My Heading Title"
which is acceptable — but the level indicator is visual decoration that adds noise. A
screen reader user navigating the outline panel benefits from buttons that read as
"My Heading Title, level 2" rather than "H2 My Heading Title".

**Remediation:**
```tsx
<button
  onClick={() => scrollTo(entry.id)}
  aria-label={`${entry.text} (H${entry.level})`}
  className="..."
  title={entry.text}
>
```

---

#### IMPORTANT-5: `flattenSearch` in `FileTree.tsx` is called on every render without memoization — O(N) traversal blocks the render thread on large trees

**File:** `src/components/Sidebar/FileTree.tsx` lines 99–115, 137–138

```ts
if (searchQuery.trim()) {
  const results = flattenSearch(entries, searchQuery);
  ...
}
```

`flattenSearch` is called unconditionally during render. For a folder with hundreds of
markdown files the traversal is synchronous and blocks the main thread. There is no
debounce on the search input and no memoization of the results.

**Remediation:** Memoize the result with `useMemo`:

```ts
const searchResults = useMemo(
  () => (searchQuery.trim() ? flattenSearch(entries, searchQuery) : null),
  [entries, searchQuery],
);
```

Then branch on `searchResults !== null` in the render path. This ensures the traversal
only runs when `entries` or `searchQuery` actually changes, not on every parent re-render.

---

### SUGGESTIONS

#### SUGGESTION-1: `countFiles` in `App.tsx` is called inline during render — should be memoized

**File:** `src/App.tsx` line 92

```tsx
<StatusBar
  folderPath={folderPath}
  fileCount={countFiles(files)}
/>
```

`countFiles` recursively traverses the file tree. It runs on every render of `App`,
including renders triggered by `sidebarView` changes, `searchQuery` changes, etc. The
file tree does not change on those renders.

**Remediation:**
```ts
const fileCount = useMemo(() => countFiles(files), [files]);
```

---

#### SUGGESTION-2: `IconButton` in `ActivityBar.tsx` imports `React` implicitly but the `icon` prop type is `React.ReactNode` without a `React` import

**File:** `src/components/ActivityBar/ActivityBar.tsx` lines 1–14

The `icon: React.ReactNode` type reference on line 14 requires `React` to be in scope.
With the new JSX transform (`react/jsx-runtime`) a React import is not needed for JSX,
but a type reference to `React.ReactNode` still requires either `import React from 'react'`
or `import type { ReactNode } from 'react'`. This compiles today only because TypeScript
resolves the global `React` namespace from `@types/react`, but it is an implicit
dependency that could break if global type augmentation changes.

**Remediation:**
```ts
import type { ReactNode } from 'react';
// ...
interface IconButtonProps {
  icon: ReactNode;
  // ...
}
```

---

#### SUGGESTION-3: `Minimap` canvas has both `aria-label` and `aria-hidden="true"` — contradictory attributes

**File:** `src/components/MainPanel/Minimap.tsx` lines 103–109

```tsx
<canvas
  aria-label="Document minimap"
  aria-hidden="true"
/>
```

`aria-hidden="true"` removes the element from the accessibility tree entirely, making
`aria-label` meaningless — the label is never announced. If the minimap is intentionally
decorative (click-to-scroll, no semantic meaning), `aria-hidden="true"` alone is correct.
If it should be reachable by keyboard (it currently is not — there is no `tabIndex`),
then `aria-hidden` should be removed and a `role="img"` or `role="scrollbar"` added.

Given that the minimap is a canvas providing navigation affordance, the right choice is:

**Remediation:** Remove `aria-label` and keep `aria-hidden="true"`. If keyboard
navigation of the minimap is ever desired, add `tabIndex={0}`, a `role`, and handle
keyboard events alongside the mouse click handler.

---

#### SUGGESTION-4: `_fileName` prop in `MainPanel.tsx` is accepted but unused — dead prop

**File:** `src/components/MainPanel/MainPanel.tsx` line 13

```ts
export function MainPanel({ content, fileName: _fileName }: MainPanelProps) {
```

The `_` prefix signals intentional non-use, which is a valid pattern. However, the prop
is included in the public interface of the component, meaning every caller must supply it.
`App.tsx` passes `fileName={selectedFile?.name ?? null}`. If the prop is not yet wired
to anything visible, it should either be implemented (file name in a title bar) or removed
from the interface until it is needed, to keep the public API minimal.

**Remediation:** Remove `fileName` from `MainPanelProps` and the destructuring until the
feature is implemented. Add it back when the breadcrumb/title bar is built.

---

## Summary

**Verdict: REQUEST CHANGES**

Three blocking bugs exist: the Minimap's observer registration silently fails when
`scrollRef.current` is null at RAF time (BLOCKING-1), the canvas size guard exits early
on first paint causing a blank minimap until the next file load (BLOCKING-2), and
OutlinePanel's click-scroll relies on a global `document.getElementById` call that races
with MainPanel's ID-injection effect (BLOCKING-3). All three are correctness issues that
will be reproducible in normal usage.

Critical: 3 | Important: 5 | Suggestions: 4
