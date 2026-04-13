import { useState } from 'react';

import { ActivityBar } from './components/ActivityBar/ActivityBar';
import { MainPanel } from './components/MainPanel/MainPanel';
import { Sidebar } from './components/Sidebar/Sidebar';
import { StatusBar } from './components/StatusBar/StatusBar';
import type { FileEntry, SidebarView } from './types';

import styles from './App.module.css';

function App() {
  const [sidebarView, setSidebarView] = useState<SidebarView>('files');
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [markdownHtml, setMarkdownHtml] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const countFiles = (entries: FileEntry[]): number =>
    entries.reduce((c, e) => c + (e.is_dir ? countFiles(e.children) : 1), 0);

  return (
    <div className={styles.layout}>
      <ActivityBar activeView={sidebarView} onViewChange={setSidebarView} />
      <Sidebar
        activeView={sidebarView}
        files={files}
        selectedFile={selectedFile}
        onFileSelect={setSelectedFile}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenFolder={() => {
          // Wired to Tauri commands in Wave 3
          setFolderPath(null);
          setFiles([]);
        }}
      />
      <MainPanel
        content={markdownHtml}
        fileName={selectedFile?.name ?? null}
        onContentChange={setMarkdownHtml}
      />
      <StatusBar
        folderPath={folderPath}
        fileCount={countFiles(files)}
      />
    </div>
  );
}

export default App;
