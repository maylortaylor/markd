import { useEffect, useRef } from 'react';

import { highlightCodeBlocks } from '../../lib/shiki';

import './markdown.css';
import styles from './MainPanel.module.css';

interface MainPanelProps {
  content: string | null;
  fileName: string | null;
}

export function MainPanel({ content, fileName: _fileName }: MainPanelProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current && content) {
      void highlightCodeBlocks(contentRef.current);
    }
  }, [content]);

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
            (script-src 'self') prevents injected scripts from executing.
            Trusted pipeline: local file -> Rust parser -> HTML string -> render.
          */}
          <div
            ref={contentRef}
            className={`${styles.contentWrapper} markdown-body`}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      )}
    </main>
  );
}
