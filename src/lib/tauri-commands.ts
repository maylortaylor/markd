import { invoke } from '@tauri-apps/api/core';

import type { FileEntry, WorkspaceInfo } from '../types';

/**
 * Scan a directory recursively for .md files and return a tree structure.
 */
export async function listFiles(path: string): Promise<FileEntry[]> {
  return invoke<FileEntry[]>('list_files', { path });
}

/**
 * Read the raw text content of a .md file.
 */
export async function readFile(path: string): Promise<string> {
  return invoke<string>('read_file', { path });
}

/**
 * Parse markdown content into HTML with GFM extensions.
 */
export async function parseMarkdown(content: string): Promise<string> {
  return invoke<string>('parse_markdown', { content });
}

// ── Workspace favorites ───────────────────────────────────────────────────────

/**
 * Return all favorited workspaces (parsed from their .code-workspace files).
 * Workspaces whose files no longer exist on disk are silently omitted.
 */
export async function getFavorites(): Promise<WorkspaceInfo[]> {
  return invoke<WorkspaceInfo[]>('get_favorites');
}

/**
 * Add a .code-workspace file path to the persisted favorites list.
 */
export async function addFavorite(workspacePath: string): Promise<void> {
  return invoke<void>('add_favorite', { workspacePath });
}

/**
 * Remove a .code-workspace file path from the persisted favorites list.
 */
export async function removeFavorite(workspacePath: string): Promise<void> {
  return invoke<void>('remove_favorite', { workspacePath });
}

/**
 * Parse a single .code-workspace file and return its info.
 */
export async function readWorkspace(workspacePath: string): Promise<WorkspaceInfo> {
  return invoke<WorkspaceInfo>('read_workspace', { workspacePath });
}

/**
 * Save an updated folder list back to a .code-workspace file.
 * Preserves other keys (settings, extensions) but strips JSONC comments.
 */
export async function saveWorkspace(workspacePath: string, folders: string[]): Promise<void> {
  return invoke<void>('save_workspace', { workspacePath, folders });
}

// ── File watching ─────────────────────────────────────────────────────────────

/**
 * Watch .code-workspace config files for external edits.
 * Emits "markd://config-changed" Tauri event on any change.
 */
export async function watchWorkspaceConfigs(paths: string[]): Promise<void> {
  return invoke<void>('watch_workspace_configs', { paths });
}

/**
 * Watch open workspace root folders for .md file changes (recursive).
 * Emits "markd://folder-changed" Tauri event with changed paths.
 */
export async function watchWorkspaceFolders(paths: string[]): Promise<void> {
  return invoke<void>('watch_workspace_folders', { paths });
}

/** Stop all active watchers. */
export async function stopWatching(): Promise<void> {
  return invoke<void>('stop_watching');
}
