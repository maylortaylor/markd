import { useMemo, useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen } from 'lucide-react';

import type { FileEntry } from '../../types';

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
  const paddingLeft = 8 + depth * 16;

  if (entry.is_dir) {
    return (
      <>
        <button
          className="w-full flex items-center gap-1.5 py-0.5 cursor-pointer hover:bg-navy-700 rounded text-sm text-text-secondary transition-colors"
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => onToggle(entry.path)}
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${entry.name}`}
        >
          <span className="text-text-muted flex-shrink-0" aria-hidden="true">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <span className="text-ocean-400 flex-shrink-0" aria-hidden="true">
            {isExpanded ? <FolderOpen size={15} /> : <Folder size={15} />}
          </span>
          <span className="truncate">{entry.name}</span>
        </button>
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="ml-3 pl-2 border-l border-navy-700">
                {entry.children.map((child) => (
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <button
      className={`w-full flex items-center gap-1.5 py-0.5 rounded text-sm transition-colors ${isSelected ? 'bg-navy-700 text-text-primary' : 'text-text-secondary hover:bg-navy-700 hover:text-text-primary'}`}
      style={{ paddingLeft: `${paddingLeft}px` }}
      onClick={() => onFileSelect(entry)}
      aria-label={entry.name}
      aria-current={isSelected ? true : undefined}
    >
      <span className="text-text-muted flex-shrink-0" aria-hidden="true">
        <FileText size={14} />
      </span>
      <span className="truncate">{entry.name}</span>
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

  const searchResults = useMemo(
    () => (searchQuery.trim() ? flattenSearch(entries, searchQuery) : null),
    [entries, searchQuery],
  );

  if (searchResults !== null) {
    const results = searchResults;
    if (results.length === 0) {
      return (
        <p className="px-3 py-3 text-xs text-text-muted italic">
          No files match &ldquo;{searchQuery}&rdquo;
        </p>
      );
    }
    return (
      <div className="py-1">
        {results.map((file) => (
          <button
            key={file.path}
            className={`w-full flex items-center gap-1.5 px-2 py-0.5 rounded text-sm transition-colors ${file.path === selectedPath ? 'bg-navy-700 text-text-primary' : 'text-text-secondary hover:bg-navy-700 hover:text-text-primary'}`}
            onClick={() => onFileSelect(file)}
            aria-label={file.name}
            aria-current={file.path === selectedPath ? true : undefined}
          >
            <span className="text-text-muted flex-shrink-0" aria-hidden="true">
              <FileText size={14} />
            </span>
            <span className="truncate">{file.name}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="py-1">
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
