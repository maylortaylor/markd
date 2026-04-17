import { useEffect, useRef, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { FolderOpen, GripVertical, Plus, Save, Trash2, X } from 'lucide-react';

import type { WorkspaceInfo } from '../../types';
import { saveWorkspace } from '../../lib/tauri-commands';

interface WorkspaceEditorModalProps {
  workspace: WorkspaceInfo;
  onClose: () => void;
  onSaved: (updated: WorkspaceInfo) => void;
}

export function WorkspaceEditorModal({ workspace, onClose, onSaved }: WorkspaceEditorModalProps) {
  const [folders, setFolders] = useState<string[]>(workspace.folders);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drag-and-drop state
  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);
  const [dragActive, setDragActive] = useState<number | null>(null);

  // Close on Escape (modal-level, doesn't fight with App-level handler)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function folderLabel(fp: string): string {
    return fp.split('/').filter(Boolean).pop() ?? fp;
  }

  // ── Drag handlers ────────────────────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, index: number) {
    dragIndex.current = index;
    setDragActive(index);
    e.dataTransfer.effectAllowed = 'move';
    // Transparent drag ghost so we can style our own
    const ghost = document.createElement('div');
    ghost.style.position = 'fixed';
    ghost.style.top = '-9999px';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverIndex.current = index;
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    const from = dragIndex.current;
    if (from === null || from === dropIndex) return;
    const next = [...folders];
    const [moved] = next.splice(from, 1);
    next.splice(dropIndex, 0, moved);
    setFolders(next);
    dragIndex.current = null;
    dragOverIndex.current = null;
    setDragActive(null);
  }

  function handleDragEnd() {
    dragIndex.current = null;
    dragOverIndex.current = null;
    setDragActive(null);
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  async function addFolder() {
    try {
      const selected = await open({ directory: true, multiple: false, title: 'Add folder to workspace' });
      if (typeof selected === 'string' && !folders.includes(selected)) {
        setFolders((prev) => [...prev, selected]);
      }
    } catch (err) {
      console.error('Failed to open folder picker:', err);
    }
  }

  function removeFolder(index: number) {
    setFolders((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await saveWorkspace(workspace.path, folders);
      onSaved({ ...workspace, folders });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-navy-800 border border-navy-600 rounded-lg shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-700 flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Edit Workspace</h2>
            <p className="text-xs text-text-muted mt-0.5 truncate max-w-xs">{workspace.name}</p>
          </div>
          <button
            className="text-text-muted hover:text-text-primary transition-colors p-1 rounded"
            aria-label="Close editor"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* Folder list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 min-h-0">
          <p className="text-xs text-text-muted mb-3">
            Drag to reorder · click <Trash2 size={11} className="inline" /> to remove
          </p>

          {folders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-text-muted">
              <FolderOpen size={24} className="opacity-40" />
              <p className="text-xs">No folders. Add one below.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {folders.map((fp, i) => (
                <li
                  key={fp}
                  draggable
                  onDragStart={(e) => handleDragStart(e, i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={(e) => handleDrop(e, i)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded border transition-all ${
                    dragActive === i
                      ? 'opacity-40 border-ocean-400 bg-navy-700'
                      : dragOverIndex.current === i && dragActive !== null && dragActive !== i
                        ? 'border-ocean-400 bg-navy-700/60'
                        : 'border-navy-600 bg-navy-750 hover:border-navy-500'
                  }`}
                >
                  <GripVertical
                    size={14}
                    className="text-text-muted cursor-grab active:cursor-grabbing flex-shrink-0"
                    aria-hidden="true"
                  />
                  <FolderOpen size={14} className="text-ocean-400 flex-shrink-0" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary font-medium truncate">{folderLabel(fp)}</p>
                    <p className="text-xs text-text-muted truncate">{fp}</p>
                  </div>
                  <button
                    className="flex-shrink-0 text-text-muted hover:text-red-400 transition-colors p-0.5 rounded"
                    aria-label={`Remove ${folderLabel(fp)}`}
                    onClick={() => removeFolder(i)}
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add folder */}
        <div className="px-5 py-3 border-t border-navy-700 flex-shrink-0">
          <button
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-ocean-400 transition-colors"
            onClick={() => { void addFolder(); }}
          >
            <Plus size={13} />
            Add folder
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="px-5 py-2 bg-red-900/30 border-t border-red-800 flex-shrink-0">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-navy-700 flex-shrink-0">
          <button
            className="px-4 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors rounded"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-ocean-500 hover:bg-ocean-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
            onClick={() => { void handleSave(); }}
          >
            <Save size={13} />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
