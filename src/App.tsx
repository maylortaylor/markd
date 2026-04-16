import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { open } from '@tauri-apps/plugin-dialog';

import { ActivityBar } from './components/ActivityBar/ActivityBar';
import { MainPanel } from './components/MainPanel/MainPanel';
import { Sidebar } from './components/Sidebar/Sidebar';
import { StatusBar } from './components/StatusBar/StatusBar';
import { listFiles, readFile, parseMarkdown, getFavorites, addFavorite, removeFavorite } from './lib/tauri-commands';
import type { FileEntry, HeadingEntry, SidebarView, WorkspaceInfo } from './types';

function countFiles(entries: FileEntry[]): number {
  return entries.reduce(
    (count, entry) => count + (entry.is_dir ? countFiles(entry.children) : 1),
    0,
  );
}

function folderName(folderPath: string): string {
  return folderPath.split('/').filter(Boolean).pop() ?? folderPath;
}

function App() {
  const [sidebarView, setSidebarView] = useState<SidebarView>('files');
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [markdownHtml, setMarkdownHtml] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [favorites, setFavorites] = useState<WorkspaceInfo[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceInfo | null>(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Session cache: avoids re-scanning the same folder until the app restarts
  const folderCache = useRef<Map<string, FileEntry[]>>(new Map());
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

  useEffect(() => {
    getFavorites()
      .then(setFavorites)
      .catch((err: unknown) => console.error('Failed to load favorites:', err));
  }, []);

  async function openFolder() {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select a folder to view',
      });
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

    // Seed initial entries from cache where possible — cached folders appear
    // fully populated immediately, uncached ones show as empty placeholders.
    const initial: FileEntry[] = info.folders.map((fp) => ({
      name: folderName(fp),
      path: fp,
      is_dir: true,
      children: cache.get(fp) ?? [],
    }));

    const uncached = info.folders.filter((fp) => !cache.has(fp));

    // flushSync forces React to paint this render synchronously before any
    // async work begins — without it React batches these updates with the
    // microtasks from Promise.all and the UI stays frozen.
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

    if (uncached.length === 0) return; // everything was cached — done

    // Scan uncached folders concurrently, updating each slot as it resolves
    const results = [...initial];
    await Promise.all(
      info.folders.map(async (fp, i) => {
        if (cache.has(fp)) return; // already populated above
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
        const updated = await getFavorites();
        setFavorites(updated);
      }
    } catch (err) {
      console.error('Failed to add workspace:', err);
    }
  }

  async function removeWorkspace(workspacePath: string) {
    try {
      await removeFavorite(workspacePath);
      // Evict all folders that belonged to this workspace from the cache
      const ws = favorites.find((f) => f.path === workspacePath);
      ws?.folders.forEach((fp) => folderCache.current.delete(fp));

      const updated = await getFavorites();
      setFavorites(updated);
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
    } catch (err) {
      console.error('Failed to load file:', err);
    }
  }

  return (
    <div
      className="h-screen w-screen grid overflow-hidden"
      style={{
        gridTemplate: '"activitybar sidebar main" 1fr "activitybar sidebar statusbar" 24px / 48px 260px 1fr',
      }}
    >
      <ActivityBar activeView={sidebarView} onViewChange={setSidebarView} />
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
      />
      <MainPanel
        content={markdownHtml}
        scrollRef={scrollRef}
      />
      <StatusBar
        folderPath={folderPath}
        fileCount={fileCount}
      />
    </div>
  );
}

export default App;
