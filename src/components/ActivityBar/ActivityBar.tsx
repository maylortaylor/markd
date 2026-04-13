import type { SidebarView } from '../../types';

import styles from './ActivityBar.module.css';

interface ActivityBarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
}

const FilesIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {
  return (
    <div className={styles.activityBar} role="tablist" aria-label="Views">
      <button
        className={`${styles.iconButton} ${activeView === 'files' ? styles.active : ''}`}
        role="tab"
        aria-selected={activeView === 'files'}
        aria-label="File Explorer"
        onClick={() => onViewChange('files')}
      >
        <FilesIcon />
      </button>
      <button
        className={`${styles.iconButton} ${activeView === 'search' ? styles.active : ''}`}
        role="tab"
        aria-selected={activeView === 'search'}
        aria-label="Search"
        onClick={() => onViewChange('search')}
      >
        <SearchIcon />
      </button>
    </div>
  );
}
