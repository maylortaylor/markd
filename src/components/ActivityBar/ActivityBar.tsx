import type { ReactNode } from 'react';

import { Clock, Files, Heart, Search } from 'lucide-react';

import type { BottomView, SidebarView } from '../../types';

interface ActivityBarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  bottomView: BottomView;
  onBottomViewChange: (view: BottomView) => void;
}

interface IconButtonProps {
  isActive: boolean;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

function IconButton({ isActive, label, icon, onClick }: IconButtonProps) {
  return (
    <button
      className={`relative w-10 h-10 flex items-center justify-center rounded cursor-pointer transition-colors hover:bg-navy-700 ${isActive ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
      role="tab"
      aria-selected={isActive}
      aria-label={label}
      onClick={onClick}
    >
      {isActive && (
        <span aria-hidden="true" className="absolute left-0 top-2 bottom-2 w-0.5 bg-ocean-400 rounded-r" />
      )}
      {icon}
    </button>
  );
}

export function ActivityBar({ activeView, onViewChange, bottomView, onBottomViewChange }: ActivityBarProps) {
  return (
    <div
      className="[grid-area:activitybar] bg-navy-800 flex flex-col items-center pt-1 border-r border-navy-700"
      role="tablist"
      aria-label="Views"
    >
      {/* Top pane controls */}
      <IconButton
        isActive={activeView === 'workspaces'}
        label="Favorite Workspaces"
        icon={<Heart size={20} />}
        onClick={() => onViewChange('workspaces')}
      />
      <IconButton
        isActive={activeView === 'files'}
        label="File Explorer"
        icon={<Files size={20} />}
        onClick={() => onViewChange('files')}
      />
      <IconButton
        isActive={activeView === 'search'}
        label="Search"
        icon={<Search size={20} />}
        onClick={() => onViewChange('search')}
      />

      {/* Bottom pane controls — pinned to bottom, visually separated */}
      <div className="mt-auto pb-1 border-t border-navy-700 pt-1 w-full flex flex-col items-center">
        <IconButton
          isActive={bottomView === 'recent'}
          label="Recent Files"
          icon={<Clock size={20} />}
          onClick={() => onBottomViewChange(bottomView === 'recent' ? 'outline' : 'recent')}
        />
      </div>
    </div>
  );
}
