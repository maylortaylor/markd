import { Clock, FileText } from 'lucide-react';

import type { RecentFile } from '../../types';

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

interface RecentFilesPanelProps {
  files: RecentFile[];
  onOpenFile: (file: RecentFile) => void;
}

export function RecentFilesPanel({ files, onOpenFile }: RecentFilesPanelProps) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-8">
        <Clock size={28} className="text-text-muted opacity-40" />
        <p className="text-xs text-text-muted text-center leading-relaxed">
          No recent files yet.
          <br />
          Files you open will appear here.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex-1 overflow-y-auto py-1 list-none">
      {files.map((f) => (
        <li key={f.path}>
          <button
            className="w-full flex items-start gap-2 px-3 py-1.5 hover:bg-navy-700 rounded transition-colors text-left group"
            onClick={() => onOpenFile(f)}
            title={f.path}
          >
            <FileText size={13} className="text-text-muted flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-text-secondary group-hover:text-text-primary truncate transition-colors">
                {f.name}
              </p>
              <p className="text-xs text-text-muted truncate mt-0.5">
                {f.workspaceName ? `${f.workspaceName} · ` : ''}{timeAgo(f.openedAt)}
              </p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
