export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  children: FileEntry[];
}

export interface FolderStats {
  file_count: number;
  folder_path: string;
}

export type SidebarView = 'files' | 'search';
