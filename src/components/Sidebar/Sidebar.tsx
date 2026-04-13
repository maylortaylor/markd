import type { FileEntry, SidebarView } from '../../types';

import { FileTree } from './FileTree';
import { SearchBar } from './SearchBar';

import styles from './Sidebar.module.css';

interface SidebarProps {
  activeView: SidebarView;
  files: FileEntry[];
  selectedFile: FileEntry | null;
  onFileSelect: (file: FileEntry) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenFolder: () => void;
}

export function Sidebar({
  activeView,
  files,
  selectedFile,
  onFileSelect,
  searchQuery,
  onSearchChange,
  onOpenFolder,
}: SidebarProps) {
  const isEmpty = files.length === 0;

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        {activeView === 'files' ? 'EXPLORER' : 'SEARCH'}
      </div>
      {activeView === 'search' && (
        <div className={styles.searchWrapper}>
          <SearchBar value={searchQuery} onChange={onSearchChange} />
        </div>
      )}
      <div className={styles.content}>
        {activeView === 'files' ? (
          isEmpty ? (
            <div className={styles.emptyState}>
              <button
                className={styles.openFolderButton}
                aria-label="Open folder"
                onClick={onOpenFolder}
              >
                Open Folder
              </button>
              <p className={styles.emptyHint}>Open a folder to get started</p>
            </div>
          ) : (
            <>
              <div className={styles.folderActions}>
                <button
                  className={styles.openFolderButton}
                  aria-label="Open folder"
                  onClick={onOpenFolder}
                >
                  Open Folder
                </button>
              </div>
              <FileTree
                entries={files}
                selectedPath={selectedFile?.path ?? null}
                searchQuery=""
                onFileSelect={onFileSelect}
              />
            </>
          )
        ) : (
          isEmpty ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyHint}>Open a folder to search files</p>
            </div>
          ) : (
            <FileTree
              entries={files}
              selectedPath={selectedFile?.path ?? null}
              searchQuery={searchQuery}
              onFileSelect={onFileSelect}
            />
          )
        )}
      </div>
    </div>
  );
}
