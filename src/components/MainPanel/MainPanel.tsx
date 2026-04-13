import styles from './MainPanel.module.css';

interface MainPanelProps {
  content: string | null;
  fileName: string | null;
  // Wired to Tauri command result in Wave 3
  onContentChange: (html: string | null) => void;
}

export function MainPanel({ content, fileName: _fileName, onContentChange: _onContentChange }: MainPanelProps) {
  return (
    <main className={styles.mainPanel} aria-label="Content panel">
      {content === null ? (
        <div className={styles.emptyState}>
          <p className={styles.appName}>Markd</p>
          <p className={styles.emptyHint}>Select a folder and click a file to view it</p>
        </div>
      ) : (
        <div className={styles.scrollContainer}>
          {/*
            Security note: HTML rendered here comes exclusively from the Rust backend
            parsing local markdown files via pulldown-cmark. No network content is loaded
            (Tauri CSP and capabilities deny all network access). The Tauri CSP
            (script-src 'self') prevents any injected scripts from executing.
            Trusted pipeline: local file -> Rust parser -> HTML string -> render.
          */}
          <div
            className={`${styles.contentWrapper} markdown-body`}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      )}
    </main>
  );
}
