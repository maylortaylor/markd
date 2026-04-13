import { codeToHtml, type BundledLanguage } from 'shiki';

// Maps markdown fence identifiers to valid shiki BundledLanguage IDs.
// 'bash'/'sh'/'shell' all alias to 'shellscript' in shiki v1.
const LANGUAGE_ALIASES: Record<string, BundledLanguage> = {
  bash: 'shellscript',
  sh: 'shellscript',
  shell: 'shellscript',
};

const SUPPORTED_LANGUAGES = new Set<BundledLanguage>([
  'javascript',
  'typescript',
  'python',
  'rust',
  'go',
  'java',
  'json',
  'yaml',
  'shellscript',
  'html',
  'css',
  'markdown',
  'sql',
  'toml',
  'xml',
  'c',
  'cpp',
]);

/**
 * Find all <pre><code class="language-X"> blocks in a container
 * and replace them with shiki-highlighted HTML.
 * Unknown languages are left as-is.
 */
export async function highlightCodeBlocks(container: HTMLElement): Promise<void> {
  const codeBlocks = container.querySelectorAll('pre code[class*="language-"]');

  for (const block of codeBlocks) {
    const langMatch = block.className.match(/language-(\w+)/);
    const rawLang = langMatch?.[1] ?? '';
    const code = block.textContent ?? '';

    // Resolve alias first, then check if supported
    const resolved = LANGUAGE_ALIASES[rawLang] ?? (rawLang as BundledLanguage);
    if (!SUPPORTED_LANGUAGES.has(resolved)) {
      // Leave block as-is for unknown languages
      continue;
    }

    try {
      const highlighted = await codeToHtml(code, {
        lang: resolved,
        theme: 'one-dark-pro',
      });
      if (block.parentElement) {
        block.parentElement.outerHTML = highlighted;
      }
    } catch {
      // Leave block as-is if highlighting fails
    }
  }
}
