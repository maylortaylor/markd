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

// ── Compact search tree ───────────────────────────────────────────────────────
// Separate renderer used only during search. Folders are condensed into
// tiny muted labels so files dominate the visual hierarchy.

interface CompactNodeProps {
  entry: FileEntry;
  depth: number;
  selectedPath: string | null;
  onFileSelect: (file: FileEntry) => void;
}

function CompactNode({ entry, depth, selectedPath, onFileSelect }: CompactNodeProps) {
  // 4px base + 8px per level (half the normal tree)
  const paddingLeft = 4 + depth * 8;

  if (entry.is_dir) {
    return (
      <div>
        {/* Folder label — not interactive, always expanded */}
        <div
          className="flex items-center gap-1 py-px overflow-hidden"
          style={{ paddingLeft: `${paddingLeft}px` }}
          aria-label={entry.name}
        >
          <Folder size={11} className="flex-shrink-0 text-ocean-400/60" aria-hidden="true" />
          <span className="text-[10px] text-text-muted truncate leading-none">{entry.name}</span>
        </div>
        <div>
          {entry.children.map((child) => (
            <CompactNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onFileSelect={onFileSelect}
            />
          ))}
        </div>
      </div>
    );
  }

  const isSelected = entry.path === selectedPath;
  return (
    <button
      className={`w-full flex items-center gap-1.5 py-0.5 rounded text-sm transition-colors ${
        isSelected ? 'bg-navy-700 text-text-primary' : 'text-text-secondary hover:bg-navy-700 hover:text-text-primary'
      }`}
      style={{ paddingLeft: `${paddingLeft + 4}px` }}
      onClick={() => onFileSelect(entry)}
      aria-label={entry.name}
      aria-current={isSelected ? true : undefined}
    >
      <FileText size={13} className="flex-shrink-0 text-text-muted" aria-hidden="true" />
      <span className="truncate">{entry.name}</span>
    </button>
  );
}

/**
 * Recursively prune the tree to only entries that match the query or are
 * folders that contain at least one matching descendant.
 * Returns null if nothing matches (so the caller can show an empty state).
 */
function filterTree(entries: FileEntry[], lowerQuery: string): FileEntry[] {
  const result: FileEntry[] = [];
  for (const entry of entries) {
    if (entry.is_dir) {
      const filteredChildren = filterTree(entry.children, lowerQuery);
      if (filteredChildren.length > 0) {
        result.push({ ...entry, children: filteredChildren });
      }
    } else if (entry.name.toLowerCase().includes(lowerQuery)) {
      result.push(entry);
    }
  }
  return result;
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

  // When searching: prune the tree and auto-expand all surviving folders
  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    return filterTree(entries, q);
  }, [entries, searchQuery]);

  if (filteredEntries !== null) {
    if (filteredEntries.length === 0) {
      return (
        <p className="px-3 py-3 text-xs text-text-muted italic">
          No files match &ldquo;{searchQuery}&rdquo;
        </p>
      );
    }
    // Compact view: folders are tiny muted labels, files are full-size
    return (
      <div className="py-1">
        {filteredEntries.map((entry) => (
          <CompactNode
            key={entry.path}
            entry={entry}
            depth={0}
            selectedPath={selectedPath}
            onFileSelect={onFileSelect}
          />
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
