import { useEffect, useRef, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';

import type { ContentSearchResult, FileEntry } from '../../types';
import { searchContent } from '../../lib/tauri-commands';

interface SearchResultsPanelProps {
  query: string;
  folders: string[];
  selectedPath: string | null;
  onFileSelect: (file: FileEntry) => void;
  /** Called when the user clicks a specific match snippet (not the file header). */
  onMatchSelect: (file: FileEntry, lineText: string) => void;
}

/** Wrap every occurrence of `query` in the snippet with a <mark> span. */
function HighlightedLine({ text, query }: { text: string; query: string }) {
  if (!query) return <span>{text}</span>;
  const lower = text.toLowerCase();
  const lowerQ = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let idx = lower.indexOf(lowerQ);
  while (idx !== -1) {
    if (idx > cursor) parts.push(<span key={cursor}>{text.slice(cursor, idx)}</span>);
    parts.push(
      <mark key={idx} className="bg-yellow-400/30 text-yellow-200 rounded-sm px-px">
        {text.slice(idx, idx + query.length)}
      </mark>,
    );
    cursor = idx + query.length;
    idx = lower.indexOf(lowerQ, cursor);
  }
  if (cursor < text.length) parts.push(<span key={cursor}>{text.slice(cursor)}</span>);
  return <>{parts}</>;
}

export function SearchResultsPanel({
  query,
  folders,
  selectedPath,
  onFileSelect,
  onMatchSelect,
}: SearchResultsPanelProps) {
  const [results, setResults] = useState<ContentSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      void searchContent(q, folders)
        .then((r) => {
          setResults(r);
          setLoading(false);
        })
        .catch((err: unknown) => {
          console.error('search_content failed:', err);
          setLoading(false);
        });
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, folders.join('|')]);

  if (!query.trim()) {
    return (
      <p className="px-3 py-3 text-xs text-text-muted italic">Type to search file contents…</p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-3 text-xs text-text-muted">
        <Loader2 size={12} className="animate-spin" />
        Searching…
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <p className="px-3 py-3 text-xs text-text-muted italic">
        No results for &ldquo;{query}&rdquo;
      </p>
    );
  }

  return (
    <div className="py-1 flex flex-col gap-0.5">
      <p className="px-3 py-1 text-[10px] text-text-muted">
        {results.length} file{results.length !== 1 ? 's' : ''}
      </p>
      {results.map((result) => {
        const isSelected = result.path === selectedPath;
        const entry: FileEntry = { path: result.path, name: result.name, is_dir: false, children: [] };
        return (
          <div key={result.path} className="flex flex-col">
            {/* File header */}
            <button
              className={`flex items-center gap-1.5 px-3 py-1 text-left transition-colors ${
                isSelected ? 'bg-navy-700 text-text-primary' : 'hover:bg-navy-700/60 text-text-secondary'
              }`}
              onClick={() => onFileSelect(entry)}
              aria-current={isSelected ? true : undefined}
            >
              <FileText size={13} className="flex-shrink-0 text-text-muted" aria-hidden="true" />
              <span className="text-sm font-medium truncate">{result.name}</span>
            </button>

            {/* Match snippets */}
            {result.matches.map((match, i) => (
              <button
                key={i}
                className="flex items-start gap-2 pl-7 pr-3 py-0.5 text-left hover:bg-navy-700/40 transition-colors group"
                onClick={() => onMatchSelect(entry, match.text)}
                title={match.text}
              >
                <span className="text-[10px] text-text-muted/60 flex-shrink-0 mt-0.5 font-mono w-6 text-right">
                  {match.line_num}
                </span>
                <span className="text-xs text-text-muted group-hover:text-text-secondary truncate transition-colors">
                  <HighlightedLine text={match.text} query={query} />
                </span>
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
