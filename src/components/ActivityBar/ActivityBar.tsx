import type { ReactNode } from 'react';

import { Files, ListTree, Search } from 'lucide-react';

import type { SidebarView } from '../../types';

interface ActivityBarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
}

interface IconButtonProps {
  view: SidebarView;
  activeView: SidebarView;
  label: string;
  icon: ReactNode;
  onViewChange: (view: SidebarView) => void;
}

function IconButton({ view, activeView, label, icon, onViewChange }: IconButtonProps) {
  const isActive = activeView === view;
  return (
    <button
      className={`relative w-10 h-10 flex items-center justify-center rounded cursor-pointer transition-colors hover:bg-navy-700 ${isActive ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
      role="tab"
      aria-selected={isActive}
      aria-label={label}
      onClick={() => onViewChange(view)}
    >
      {isActive && (
        <span aria-hidden="true" className="absolute left-0 top-2 bottom-2 w-0.5 bg-ocean-400 rounded-r" />
      )}
      {icon}
    </button>
  );
}

export function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {
  return (
    <div
      className="[grid-area:activitybar] bg-navy-800 flex flex-col items-center pt-1 border-r border-navy-700"
      role="tablist"
      aria-label="Views"
    >
      <IconButton
        view="files"
        activeView={activeView}
        label="File Explorer"
        icon={<Files size={20} />}
        onViewChange={onViewChange}
      />
      <IconButton
        view="search"
        activeView={activeView}
        label="Search"
        icon={<Search size={20} />}
        onViewChange={onViewChange}
      />
      <IconButton
        view="outline"
        activeView={activeView}
        label="Document Outline"
        icon={<ListTree size={20} />}
        onViewChange={onViewChange}
      />
    </div>
  );
}
