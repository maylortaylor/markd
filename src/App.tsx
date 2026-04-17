import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';

import { ActivityBar } from './components/ActivityBar/ActivityBar';
import { Breadcrumb } from './components/MainPanel/Breadcrumb';
import { MainPanel } from './components/MainPanel/MainPanel';
import { Sidebar } from './components/Sidebar/Sidebar';
import { StatusBar } from './components/StatusBar/StatusBar';
import {
  listFiles,
  readFile,
  parseMarkdown,
  getFavorites,
  addFavorite,
  removeFavorite,
  watchWorkspaceConfigs,
  watchWorkspaceFolders,
} from './lib/tauri-commands';
import type {
  BottomView,
  FileEntry,
  HeadingEntry,
  RecentFile,
  SidebarView,
  WorkspaceInfo,
} from './types';

// ── Constants ─────────────────────────────────────────────────────────────────

const RECENT_KEY = 'markd:recent';
const MAX_RECENT = 20;

// ── Helpers ───────────────────────────────────────────────────────────────────

function countFiles(entries: FileEntry[]): number {
  return entries.reduce(
    (count, entry) => count + (entry.is_dir ? countFiles(entry.children) : 1),
    0,
  );
}

function folderName(fp: string): string {
  return fp.split('/').filter(Boolean).pop() ?? fp;
}

function loadRecentFromStorage(): RecentFile[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as RecentFile[];
  } catch {
    return [];
  }
}

function saveRecentToStorage(files: RecentFile[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(files));
}

function pushRecent(file: FileEntry, workspace: WorkspaceInfo | null): RecentFile[] {
  const entry: RecentFile = {
    path: file.path,
    name: file.name,
    workspaceName: workspace?.name ?? null,
    openedAt: Date.now(),
  };
  const deduped = loadRecentFromStorage().filter((r) => r.path !== file.path);
  const next = [entry, ...deduped].slice(0, MAX_RECENT);
  saveRecentToStorage(next);
  return next;
}

// Build breadcrumb segments from the selected file + current context
function buildBreadcrumbs(
  selectedFile: FileEntry | null,
  activeWorkspace: WorkspaceInfo | null,
  singleFolderPath: string | null,
): string[] {
  if (!selectedFile) return [];

  if (activeWorkspace) {
    const root = activeWorkspace.folders.find((f) => selectedFile.path.startsWith(f));
    if (root) {
      const rootSeg = folderName(root);
      const relative = selectedFile.path.slice(root.length).split('/').filter(Boolean);
      return [activeWorkspace.name, rootSeg, ...relative];
    }
    return [activeWorkspace.name, selectedFile.name];
  }

  if (singleFolderPath) {
    const rootSeg = folderName(singleFolderPath);
    const relative = selectedFile.path.slice(singleFolderPath.length).split('/').filter(Boolean);
    return [rootSeg, ...relative];
  }

  return [selectedFile.name];
}

// ── Component ─────────────────────────────────────────────────────────────────

function App() {
  const [sidebarView, setSidebarView] = useState<SidebarView>('files');
  const [bottomView, setBottomView] = useState<BottomView>('outline');
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [markdownHtml, setMarkdownHtml] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [favorites, setFavorites] = useState<WorkspaceInfo[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceInfo | null>(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(loadRecentFromStorage);

  const scrollRef = useRef<HTMLDivElement>(null);
  const folderCache = useRef<Map<string, FileEntry[]>>(new Map());
  // Refs so watch callbacks always see current values without re-registering
  const activeWorkspaceRef = useRef<WorkspaceInfo | null>(null);
  const filesRef = useRef<FileEntry[]>([]);

  useEffect(() => { activeWorkspaceRef.current = activeWorkspace; }, [activeWorkspace]);
  useEffect(() => { filesRef.current = files; }, [files]);

  const fileCount = useMemo(() => countFiles(files), [files]);

  const outlineEntries = useMemo<HeadingEntry[]>(() => {
    if (!markdownHtml) return [];
    const doc = new DOMParser().parseFromString(markdownHtml, 'text/html');
    return Array.from(doc.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((el, i) => ({
      id: `heading-${i}`,
      text: el.textContent ?? '',
      level: parseInt(el.tagName[1], 10),
    }));
  }, [markdownHtml]);

  const breadcrumbSegments = useMemo(
    () => buildBreadcrumbs(selectedFile, activeWorkspace, folderPath),
    [selectedFile, activeWorkspace, folderPath],
  );

  // ── Boot ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    getFavorites()
      .then(setFavorites)
      .catch((err: unknown) => console.error('Failed to load favorites:', err));
  }, []);

  // ── File watching: .code-workspace config files ─────────────────────────────
  // Re-registers whenever the set of favorited workspace paths changes.
  // The Rust backend emits "markd://config-changed" when any watched file changes.

  useEffect(() => {
    const paths = favorites.map((f) => f.path);
    void watchWorkspaceConfigs(paths).catch((e: unknown) =>
      console.error('watch_workspace_configs failed:', e),
    );

    const unlisten = listen<void>('markd://config-changed', () => {
      void getFavorites().then((updated) => {
        setFavorites(updated);

        const active = activeWorkspaceRef.current;
        if (!active) return;
        const refreshed = updated.find((w) => w.path === active.path);
        if (!refreshed) return;

        // Evict cache only for folders removed from the workspace
        active.folders
          .filter((f) => !refreshed.folders.includes(f))
          .forEach((f) => folderCache.current.delete(f));

        const cache = folderCache.current;
        const newRoots: FileEntry[] = refreshed.folders.map((fp) => ({
          name: folderName(fp),
          path: fp,
          is_dir: true,
          children: cache.get(fp) ?? [],
        }));
        setActiveWorkspace(refreshed);
        setFiles(newRoots);

        const uncached = refreshed.folders.filter((fp) => !cache.has(fp));
        if (uncached.length > 0) {
          setIsLoadingFiles(true);
          void Promise.all(
            refreshed.folders.map(async (fp, i) => {
              if (cache.has(fp)) return;
              try {
                const children = await listFiles(fp);
                cache.set(fp, children);
                newRoots[i] = { ...newRoots[i], children };
                setFiles([...newRoots]);
              } catch (err) {
                console.error(`Failed to scan new folder ${fp}:`, err);
              }
            }),
          ).then(() => setIsLoadingFiles(false));
        }
      });
    });

    return () => { void unlisten.then((fn) => fn()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites.map((f) => f.path).join('|')]);

  // ── File watching: open workspace folders ────────────────────────────────────
  // Rust emits "markd://folder-changed" when any .md file is created/modified/removed.
  // Frontend debounces 800ms then re-scans affected roots.

  useEffect(() => {
    const roots = activeWorkspace?.folders ?? [];
    void watchWorkspaceFolders(roots).catch((e: unknown) =>
      console.error('watch_workspace_folders failed:', e),
    );

    let debounce: ReturnType<typeof setTimeout>;
    const unlisten = listen<string[]>('markd://folder-changed', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        roots.forEach((fp) => folderCache.current.delete(fp));
        void Promise.all(
          roots.map(async (fp, i) => {
            try {
              const children = await listFiles(fp);
              folderCache.current.set(fp, children);
              setFiles((prev) => {
                const next = [...prev];
                if (next[i]) next[i] = { ...next[i], children };
                return next;
              });
            } catch (err) {
              console.error(`Watch rescan failed for ${fp}:`, err);
            }
          }),
        );
      }, 800);
    });

    return () => {
      clearTimeout(debounce);
      void unlisten.then((fn) => fn());
    };
  }, [activeWorkspace?.path]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function openFolder() {
    try {
      const selected = await open({ directory: true, multiple: false, title: 'Select a folder' });
      if (typeof selected === 'string') {
        const tree = await listFiles(selected);
        setFolderPath(selected);
        setFiles(tree);
        setActiveWorkspace(null);
        setSelectedFile(null);
        setMarkdownHtml(null);
        setSearchQuery('');
      }
    } catch (err) {
      console.error('Failed to open folder:', err);
    }
  }

  async function openWorkspace(info: WorkspaceInfo) {
    const cache = folderCache.current;
    const initial: FileEntry[] = info.folders.map((fp) => ({
      name: folderName(fp),
      path: fp,
      is_dir: true,
      children: cache.get(fp) ?? [],
    }));
    const uncached = info.folders.filter((fp) => !cache.has(fp));

    flushSync(() => {
      setActiveWorkspace(info);
      setFolderPath(info.path);
      setFiles(initial);
      setSelectedFile(null);
      setMarkdownHtml(null);
      setSearchQuery('');
      setSidebarView('files');
      setIsLoadingFiles(uncached.length > 0);
    });

    if (uncached.length === 0) return;

    const results = [...initial];
    await Promise.all(
      info.folders.map(async (fp, i) => {
        if (cache.has(fp)) return;
        try {
          const children = await listFiles(fp);
          cache.set(fp, children);
          results[i] = { ...results[i], children };
          setFiles([...results]);
        } catch (err) {
          console.error(`Failed to scan folder ${fp}:`, err);
        }
      }),
    );
    setIsLoadingFiles(false);
  }

  async function addWorkspace() {
    try {
      const selected = await open({
        directory: false,
        multiple: false,
        title: 'Select a workspace file',
        filters: [{ name: 'VSCode Workspace', extensions: ['code-workspace'] }],
      });
      if (typeof selected === 'string') {
        await addFavorite(selected);
        setFavorites(await getFavorites());
      }
    } catch (err) {
      console.error('Failed to add workspace:', err);
    }
  }

  async function removeWorkspace(workspacePath: string) {
    try {
      await removeFavorite(workspacePath);
      const ws = favorites.find((f) => f.path === workspacePath);
      ws?.folders.forEach((fp) => folderCache.current.delete(fp));
      setFavorites(await getFavorites());
      if (activeWorkspace?.path === workspacePath) {
        setActiveWorkspace(null);
        setFolderPath(null);
        setFiles([]);
        setSelectedFile(null);
        setMarkdownHtml(null);
      }
    } catch (err) {
      console.error('Failed to remove workspace:', err);
    }
  }

  async function selectFile(file: FileEntry) {
    try {
      const raw = await readFile(file.path);
      const html = await parseMarkdown(raw);
      setSelectedFile(file);
      // SECURITY: html is Tauri/Rust-parsed output only — see MainPanel trust-chain comment
      setMarkdownHtml(html);
      setRecentFiles(pushRecent(file, activeWorkspaceRef.current));
    } catch (err) {
      console.error('Failed to load file:', err);
    }
  }

  async function openRecentFile(recent: RecentFile) {
    try {
      const raw = await readFile(recent.path);
      const html = await parseMarkdown(raw);
      const entry: FileEntry = { path: recent.path, name: recent.name, is_dir: false, children: [] };
      setSelectedFile(entry);
      setMarkdownHtml(html);
      setRecentFiles(pushRecent(entry, activeWorkspaceRef.current));
    } catch (err) {
      console.error('Failed to open recent file:', err);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="h-screen w-screen grid overflow-hidden"
      style={{
        gridTemplate:
          '"activitybar sidebar breadcrumb" auto "activitybar sidebar main" 1fr "activitybar sidebar statusbar" 24px / 48px 260px 1fr',
      }}
    >
      <ActivityBar
        activeView={sidebarView}
        onViewChange={setSidebarView}
        bottomView={bottomView}
        onBottomViewChange={setBottomView}
      />
      <Sidebar
        activeView={sidebarView}
        files={files}
        selectedFile={selectedFile}
        onFileSelect={selectFile}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenFolder={() => { void openFolder(); }}
        outlineEntries={outlineEntries}
        scrollRef={scrollRef}
        favorites={favorites}
        activeWorkspacePath={activeWorkspace?.path ?? null}
        onOpenWorkspace={(info) => { void openWorkspace(info); }}
        onAddWorkspace={() => { void addWorkspace(); }}
        onRemoveWorkspace={(path) => { void removeWorkspace(path); }}
        isLoadingFiles={isLoadingFiles}
        bottomView={bottomView}
        recentFiles={recentFiles}
        onOpenRecentFile={(f) => { void openRecentFile(f); }}
      />
      <Breadcrumb segments={breadcrumbSegments} />
      <MainPanel content={markdownHtml} scrollRef={scrollRef} />
      <StatusBar folderPath={folderPath} fileCount={fileCount} />
    </div>
  );
}

export default App;
