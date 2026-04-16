import { Folder, Heart, Plus, X } from 'lucide-react';

import type { WorkspaceInfo } from '../../types';

interface WorkspacesPanelProps {
  favorites: WorkspaceInfo[];
  activeWorkspacePath: string | null;
  onOpenWorkspace: (info: WorkspaceInfo) => void;
  onAddWorkspace: () => void;
  onRemoveWorkspace: (workspacePath: string) => void;
}

export function WorkspacesPanel({
  favorites,
  activeWorkspacePath,
  onOpenWorkspace,
  onAddWorkspace,
  onRemoveWorkspace,
}: WorkspacesPanelProps) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="px-3 py-2 border-b border-navy-700 flex-shrink-0 flex items-center justify-between">
        <button
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
          aria-label="Add workspace"
          onClick={onAddWorkspace}
        >
          <Plus size={13} />
          Add Workspace
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-8">
            <Heart size={28} className="text-text-muted opacity-40" />
            <p className="text-xs text-text-muted text-center leading-relaxed">
              No favorite workspaces yet.
              <br />
              Click <strong className="text-text-secondary">Add Workspace</strong> to pick a{' '}
              <code className="text-ocean-400">.code-workspace</code> file.
            </p>
          </div>
        ) : (
          favorites.map((ws) => {
            const isActive = ws.path === activeWorkspacePath;
            return (
              <div
                key={ws.path}
                className={`group relative flex items-start gap-2 px-3 py-2 rounded cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-navy-700 text-text-primary'
                    : 'text-text-secondary hover:bg-navy-700 hover:text-text-primary'
                }`}
                role="button"
                tabIndex={0}
                aria-label={`Open workspace ${ws.name}`}
                aria-pressed={isActive}
                onClick={() => onOpenWorkspace(ws)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onOpenWorkspace(ws);
                }}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-2 bottom-2 w-0.5 bg-ocean-400 rounded-r"
                  />
                )}
                <Heart
                  size={14}
                  className={`flex-shrink-0 mt-0.5 ${isActive ? 'text-ocean-400 fill-ocean-400' : 'text-text-muted'}`}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ws.name}</p>
                  <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                    <Folder size={11} aria-hidden="true" />
                    {ws.folders.length} {ws.folders.length === 1 ? 'folder' : 'folders'}
                  </p>
                </div>
                <button
                  className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary transition-opacity"
                  aria-label={`Remove ${ws.name} from favorites`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveWorkspace(ws.path);
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
