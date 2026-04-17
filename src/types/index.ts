export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  children: FileEntry[];
}

export interface HeadingEntry {
  id: string;
  text: string;
  level: number;
}

export interface WorkspaceInfo {
  /** Display name derived from the filename (without extension) */
  name: string;
  /** Absolute path to the .code-workspace file */
  path: string;
  /** Resolved absolute paths of the folders listed in the workspace */
  folders: string[];
}

export interface MatchLine {
  line_num: number;
  text: string;
}

export interface ContentSearchResult {
  path: string;
  name: string;
  matches: MatchLine[];
}

export type SidebarView = 'files' | 'search' | 'workspaces';

export type BottomView = 'outline' | 'recent';

export interface RecentFile {
  path: string;
  name: string;
  workspaceName: string | null;
  /** Top-level root folder name (e.g. "my-project") */
  folderName: string | null;
  openedAt: number; // ms timestamp
}
