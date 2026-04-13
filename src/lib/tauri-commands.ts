import { invoke } from '@tauri-apps/api/core';

import type { FileEntry } from '../types';

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
