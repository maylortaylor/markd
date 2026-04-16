import { AnimatePresence, motion } from 'framer-motion';

import type { FileEntry, HeadingEntry, SidebarView, WorkspaceInfo } from '../../types';

import { FileTree } from './FileTree';
import { OutlinePanel } from './OutlinePanel';
import { SearchBar } from './SearchBar';
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
  activeWorkspacePath: string | null;
  onOpenWorkspace: (info: WorkspaceInfo) => void;
  onAddWorkspace: () => void;
  onRemoveWorkspace: (workspacePath: string) => void;
  isLoadingFiles: boolean;
}

const viewLabel: Record<SidebarView, string> = {
  files: 'Explorer',
  search: 'Search',
  outline: 'Outline',
  workspaces: 'Workspaces',
};

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
  activeWorkspacePath,
  onOpenWorkspace,
  onAddWorkspace,
  onRemoveWorkspace,
  isLoadingFiles,
}: SidebarProps) {
  const isEmpty = files.length === 0;

  return (
    <div className="[grid-area:sidebar] bg-navy-800 flex flex-col border-r border-navy-700 overflow-hidden">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-text-muted border-b border-navy-700 flex-shrink-0">
        {viewLabel[activeView]}
      </div>
      {/* Scanning indicator — thin animated bar shown while folder scans are in flight */}
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
            />
          ) : activeView === 'outline' ? (
            <OutlinePanel entries={outlineEntries} scrollRef={scrollRef} />
          ) : activeView === 'search' ? (
            <>
              <SearchBar value={searchQuery} onChange={onSearchChange} />
              <div className="flex-1 overflow-y-auto">
                {isEmpty ? (
                  <p className="px-3 py-4 text-xs text-text-muted italic">Open a folder to search files</p>
                ) : (
                  <FileTree
                    entries={files}
                    selectedPath={selectedFile?.path ?? null}
                    searchQuery={searchQuery}
                    onFileSelect={onFileSelect}
                  />
                )}
              </div>
            </>
          ) : (
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
                  <p className="text-xs text-text-muted text-center">Open a folder to get started</p>
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
  );
}
