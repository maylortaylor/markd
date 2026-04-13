import { useState } from 'react';

import type { FileEntry } from '../../types';

import styles from './FileTree.module.css';

interface FileTreeProps {
  entries: FileEntry[];
  selectedPath: string | null;
  searchQuery: string;
  onFileSelect: (file: FileEntry) => void;
}

interface FileTreeNodeProps {
  entry: FileEntry;
  depth: number;
  selectedPath: string | null;
  onFileSelect: (file: FileEntry) => void;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
}

function FileTreeNode({
  entry,
  depth,
  selectedPath,
  onFileSelect,
  expandedPaths,
  onToggle,
}: FileTreeNodeProps) {
  const isExpanded = expandedPaths.has(entry.path);
  const isSelected = entry.path === selectedPath;
  const indent = depth * 16;

  if (entry.is_dir) {
    return (
      <>
        <button
          className={styles.dirRow}
          style={{ paddingLeft: `${8 + indent}px` }}
          onClick={() => onToggle(entry.path)}
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${entry.name}`}
        >
          <span className={styles.chevron} aria-hidden="true">{isExpanded ? '▾' : '▸'}</span>
          <span className={styles.icon} aria-hidden="true">📁</span>
          <span className={styles.name}>{entry.name}</span>
        </button>
        {isExpanded &&
          entry.children.map((child) => (
            <FileTreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onFileSelect={onFileSelect}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
            />
          ))}
      </>
    );
  }

  return (
    <button
      className={`${styles.fileRow} ${isSelected ? styles.selected : ''}`}
      style={{ paddingLeft: `${8 + indent}px` }}
      onClick={() => onFileSelect(entry)}
      aria-label={entry.name}
      aria-current={isSelected ? 'true' : undefined}
    >
      <span className={styles.icon} aria-hidden="true">📄</span>
      <span className={styles.name}>{entry.name}</span>
    </button>
  );
}

function flattenSearch(entries: FileEntry[], query: string): FileEntry[] {
  const results: FileEntry[] = [];
  const lowerQuery = query.toLowerCase();

  function walk(items: FileEntry[]) {
    for (const item of items) {
      if (item.is_dir) {
        walk(item.children);
      } else if (item.name.toLowerCase().includes(lowerQuery)) {
        results.push(item);
      }
    }
  }

  walk(entries);
  return results;
}

export function FileTree({
  entries,
  selectedPath,
  searchQuery,
  onFileSelect,
}: FileTreeProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const togglePath = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  if (searchQuery.trim()) {
    const results = flattenSearch(entries, searchQuery);
    if (results.length === 0) {
      return <p className={styles.emptySearch}>No files match &ldquo;{searchQuery}&rdquo;</p>;
    }
    return (
      <div className={styles.tree}>
        {results.map((file) => (
          <button
            key={file.path}
            className={`${styles.fileRow} ${file.path === selectedPath ? styles.selected : ''}`}
            style={{ paddingLeft: '8px' }}
            onClick={() => onFileSelect(file)}
            aria-label={file.name}
            aria-current={file.path === selectedPath ? 'true' : undefined}
          >
            <span className={styles.icon}>📄</span>
            <span className={styles.name}>{file.name}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.tree}>
      {entries.map((entry) => (
        <FileTreeNode
          key={entry.path}
          entry={entry}
          depth={0}
          selectedPath={selectedPath}
          onFileSelect={onFileSelect}
          expandedPaths={expandedPaths}
          onToggle={togglePath}
        />
      ))}
    </div>
  );
}
