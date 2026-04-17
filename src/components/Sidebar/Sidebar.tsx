import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import type { BottomView, FileEntry, HeadingEntry, RecentFile, SidebarView, WorkspaceInfo } from '../../types';

import { FileTree } from './FileTree';
import { OutlinePanel } from './OutlinePanel';
import { RecentFilesPanel } from './RecentFilesPanel';
import { SearchBar } from './SearchBar';
import { SearchResultsPanel } from './SearchResultsPanel';
import { WorkspacesPanel } from './WorkspacesPanel';

interface SidebarProps {
  activeView: SidebarView;
  files: FileEntry[];
  selectedFile: FileEntry | null;
  onFileSelect: (file: FileEntry) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenFolder: () => void;
  outlineEntries: HeadingEntry[];
  scrollRef: React.RefObject<HTMLDivElement>;
  favorites: WorkspaceInfo[];
  searchFolders: string[];
  onMatchSelect: (file: FileEntry, lineText: string) => void;
  activeWorkspacePath: string | null;
  onOpenWorkspace: (info: WorkspaceInfo) => void;
  onAddWorkspace: () => void;
  onRemoveWorkspace: (workspacePath: string) => void;
  onEditWorkspace: (info: WorkspaceInfo) => void;
  isLoadingFiles: boolean;
  bottomView: BottomView;
  recentFiles: RecentFile[];
  onOpenRecentFile: (file: RecentFile) => void;
}

const viewLabel: Record<SidebarView, string> = {
  files: 'Explorer',
  search: 'Search',
  workspaces: 'Workspaces',
};

const MIN_PANE_HEIGHT = 60; // px — smallest either pane can get

export function Sidebar({
  activeView,
  files,
  selectedFile,
  onFileSelect,
  searchQuery,
  onSearchChange,
  onOpenFolder,
  outlineEntries,
  scrollRef,
  favorites,
  searchFolders,
  onMatchSelect,
  activeWorkspacePath,
  onOpenWorkspace,
  onAddWorkspace,
  onRemoveWorkspace,
  onEditWorkspace,
  isLoadingFiles,
  bottomView,
  recentFiles,
  onOpenRecentFile,
}: SidebarProps) {
  const DIVIDER_H = 20; // px — tall enough to grab easily

  const isEmpty = files.length === 0;
  const containerRef = useRef<HTMLDivElement>(null);
  const [topHeight, setTopHeight] = useState<number | null>(null); // null = not yet measured
  const dragging = useRef(false);

  // Set initial split to 60% of container height after first paint
  useEffect(() => {
    if (!containerRef.current) return;
    const h = containerRef.current.getBoundingClientRect().height;
    setTopHeight(Math.round(h * 0.60));
  }, []);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const next = e.clientY - rect.top;
      const max = rect.height - MIN_PANE_HEIGHT - DIVIDER_H;
      setTopHeight(Math.max(MIN_PANE_HEIGHT, Math.min(max, next)));
    }
    function onMouseUp() {
      if (dragging.current) {
        dragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  function startDrag() {
    dragging.current = true;
    // Prevent text selection and cursor flicker while dragging
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }

  return (
    <div
      ref={containerRef}
      className="[grid-area:sidebar] bg-navy-800 flex flex-col border-r border-navy-700 overflow-hidden"
    >
      {/* ── TOP PANE: browser / search / workspaces ── */}
      {/* topHeight is null until measured; hide via flex so the bottom pane fills space */}
      <div
        className="flex flex-col overflow-hidden flex-shrink-0"
        style={topHeight !== null ? { height: topHeight } : { flex: '0 0 75%' }}
      >
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-text-muted border-b border-navy-700 flex-shrink-0">
          {viewLabel[activeView]}
        </div>
        {isLoadingFiles && activeView === 'files' && (
          <div className="h-0.5 w-full bg-navy-700 flex-shrink-0 overflow-hidden">
            <div className="h-full bg-ocean-400 animate-[scan_1.4s_ease-in-out_infinite]" />
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeView}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col flex-1 overflow-hidden"
          >
            {activeView === 'workspaces' ? (
              <WorkspacesPanel
                favorites={favorites}
                activeWorkspacePath={activeWorkspacePath}
                onOpenWorkspace={onOpenWorkspace}
                onAddWorkspace={onAddWorkspace}
                onRemoveWorkspace={onRemoveWorkspace}
                onEditWorkspace={onEditWorkspace}
              />
            ) : activeView === 'search' ? (
              <>
                <SearchBar value={searchQuery} onChange={onSearchChange} autoFocus />
                <div className="flex-1 overflow-y-auto">
                  {isEmpty ? (
                    <p className="px-3 py-4 text-xs text-text-muted italic">
                      Open a folder to search files
                    </p>
                  ) : (
                    <SearchResultsPanel
                      query={searchQuery}
                      folders={searchFolders}
                      selectedPath={selectedFile?.path ?? null}
                      onFileSelect={onFileSelect}
                      onMatchSelect={onMatchSelect}
                    />
                  )}
                </div>
              </>
            ) : (
              /* files view */
              <div className="flex flex-col flex-1 overflow-hidden">
                {isEmpty ? (
                  <div className="flex flex-col items-center justify-center flex-1 gap-3 px-4">
                    <button
                      className="px-4 py-1.5 text-sm bg-ocean-500 hover:bg-ocean-400 text-white rounded transition-colors"
                      aria-label="Open folder"
                      onClick={onOpenFolder}
                    >
                      Open Folder
                    </button>
                    <p className="text-xs text-text-muted text-center">
                      Open a folder to get started
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="px-3 py-2 border-b border-navy-700 flex-shrink-0">
                      <button
                        className="text-xs text-text-muted hover:text-text-secondary transition-colors"
                        aria-label="Open folder"
                        onClick={onOpenFolder}
                      >
                        Open Folder
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      <FileTree
                        entries={files}
                        selectedPath={selectedFile?.path ?? null}
                        searchQuery=""
                        onFileSelect={onFileSelect}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── DRAG DIVIDER ── */}
      <div
        className="group flex-shrink-0 flex items-center justify-center cursor-row-resize bg-navy-750 hover:bg-navy-700 active:bg-ocean-500/20 transition-colors select-none border-y border-navy-700"
        style={{ height: DIVIDER_H }}
        onMouseDown={startDrag}
        aria-label="Resize panes"
        role="separator"
        aria-orientation="horizontal"
      >
        {/* Three dots hint — visually communicates "draggable" */}
        <div className="flex items-center gap-1">
          <div className="w-1 h-1 rounded-full bg-navy-500 group-hover:bg-ocean-400 transition-colors" />
          <div className="w-1 h-1 rounded-full bg-navy-500 group-hover:bg-ocean-400 transition-colors" />
          <div className="w-1 h-1 rounded-full bg-navy-500 group-hover:bg-ocean-400 transition-colors" />
          <div className="w-1 h-1 rounded-full bg-navy-500 group-hover:bg-ocean-400 transition-colors" />
          <div className="w-1 h-1 rounded-full bg-navy-500 group-hover:bg-ocean-400 transition-colors" />
        </div>
      </div>

      {/* ── BOTTOM PANE: outline or recent files ── */}
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-text-muted border-b border-navy-700 flex-shrink-0">
          {bottomView === 'recent' ? 'Recent Files' : 'Outline'}
        </div>
        {bottomView === 'recent' ? (
          <RecentFilesPanel files={recentFiles} onOpenFile={onOpenRecentFile} />
        ) : (
          <OutlinePanel entries={outlineEntries} scrollRef={scrollRef} />
        )}
      </div>
    </div>
  );
}
