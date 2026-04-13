import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';

import { ActivityBar } from './components/ActivityBar/ActivityBar';
import { MainPanel } from './components/MainPanel/MainPanel';
import { Sidebar } from './components/Sidebar/Sidebar';
import { StatusBar } from './components/StatusBar/StatusBar';
import { listFiles, readFile, parseMarkdown } from './lib/tauri-commands';
import type { FileEntry, SidebarView } from './types';

import styles from './App.module.css';

function countFiles(entries: FileEntry[]): number {
  return entries.reduce(
    (count, entry) => count + (entry.is_dir ? countFiles(entry.children) : 1),
    0,
  );
}

function App() {
  const [sidebarView, setSidebarView] = useState<SidebarView>('files');
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [markdownHtml, setMarkdownHtml] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

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
        setSelectedFile(null);
        setMarkdownHtml(null);
        setSearchQuery('');
      }
    } catch (err) {
      console.error('Failed to open folder:', err);
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
    <div className={styles.layout}>
      <ActivityBar activeView={sidebarView} onViewChange={setSidebarView} />
      <Sidebar
        activeView={sidebarView}
        files={files}
        selectedFile={selectedFile}
        onFileSelect={selectFile}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenFolder={() => { void openFolder(); }}
      />
      <MainPanel
        content={markdownHtml}
        fileName={selectedFile?.name ?? null}
      />
      <StatusBar
        folderPath={folderPath}
        fileCount={countFiles(files)}
      />
    </div>
  );
}

export default App;
