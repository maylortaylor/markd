interface StatusBarProps {
  folderPath: string | null;
  fileCount: number;
}

export function StatusBar({ folderPath, fileCount }: StatusBarProps) {
  return (
    <div
      className="[grid-area:statusbar] bg-ocean-500 flex items-center px-3 gap-4 text-xs text-white"
      role="status"
      aria-live="polite"
    >
      <span className="truncate">{folderPath ?? 'No folder open'}</span>
      {folderPath !== null && (
        <span className="flex-shrink-0">
          {fileCount} {fileCount === 1 ? 'file' : 'files'}
        </span>
      )}
    </div>
  );
}
