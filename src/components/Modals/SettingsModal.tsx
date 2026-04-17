import { useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const SHORTCUTS: Shortcut[] = [
  // Navigation
  { keys: ['⌘', 'B'], description: 'Toggle sidebar', category: 'Navigation' },
  { keys: ['⌘', 'F'], description: 'Focus search', category: 'Navigation' },
  { keys: ['⌘', ','], description: 'Open settings', category: 'Navigation' },
  // Views
  { keys: ['⌘', '1'], description: 'Show Explorer (files)', category: 'Views' },
  { keys: ['⌘', '2'], description: 'Show Search', category: 'Views' },
  { keys: ['⌘', '3'], description: 'Show Workspaces', category: 'Views' },
  // Files
  { keys: ['↑', '↓'], description: 'Navigate files in sidebar', category: 'Files' },
  { keys: ['Enter'], description: 'Open selected file', category: 'Files' },
  // General
  { keys: ['Esc'], description: 'Close modal / clear search', category: 'General' },
];

const CATEGORIES = [...new Set(SHORTCUTS.map((s) => s.category))];

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-navy-800 border border-navy-600 rounded-lg shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Keyboard size={16} className="text-ocean-400" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-text-primary">Settings</h2>
          </div>
          <button
            className="text-text-muted hover:text-text-primary transition-colors p-1 rounded"
            aria-label="Close settings"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          <p className="text-xs text-text-muted mb-5 uppercase tracking-widest font-semibold">
            Keyboard Shortcuts
          </p>

          <div className="flex flex-col gap-6">
            {CATEGORIES.map((category) => (
              <div key={category}>
                <p className="text-xs text-ocean-400 font-medium mb-2">{category}</p>
                <div className="flex flex-col gap-1">
                  {SHORTCUTS.filter((s) => s.category === category).map((shortcut, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-1.5 px-3 rounded hover:bg-navy-700/50 transition-colors"
                    >
                      <span className="text-sm text-text-secondary">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, ki) => (
                          <kbd
                            key={ki}
                            className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded bg-navy-700 border border-navy-500 text-xs font-mono text-text-primary shadow-sm"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-navy-700 flex-shrink-0">
          <p className="text-xs text-text-muted">
            markd — a minimal markdown viewer
          </p>
        </div>
      </div>
    </div>
  );
}
