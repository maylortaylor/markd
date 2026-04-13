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

export type SidebarView = 'files' | 'search' | 'outline';
