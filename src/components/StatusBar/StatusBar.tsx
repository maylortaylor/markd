import styles from './StatusBar.module.css';

interface StatusBarProps {
  folderPath: string | null;
  fileCount: number;
}

export function StatusBar({ folderPath, fileCount }: StatusBarProps) {
  return (
    <div className={styles.statusBar} role="status" aria-live="polite">
      <span className={styles.folderPath}>
        {folderPath ?? 'No folder open'}
      </span>
      {folderPath !== null && (
        <span className={styles.fileCount}>
          {fileCount} {fileCount === 1 ? 'file' : 'files'}
        </span>
      )}
    </div>
  );
}
