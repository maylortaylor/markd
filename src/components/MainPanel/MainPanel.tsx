import { useEffect, useRef } from 'react';

import { highlightCodeBlocks } from '../../lib/shiki';

import './markdown.css';
import { Minimap } from './Minimap';

interface MainPanelProps {
  content: string | null;
  searchQuery?: string;
  scrollRef: React.RefObject<HTMLDivElement>;
}

/**
 * Walks all text nodes inside `container` and wraps occurrences of `query`
 * in `<mark class="search-highlight">` elements.
 * Clears any existing marks first so re-runs are idempotent.
 */
function applySearchHighlights(container: HTMLElement, query: string) {
  // Remove existing highlights, restoring plain text
  container.querySelectorAll('mark.search-highlight').forEach((mark) => {
    const parent = mark.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(mark.textContent ?? ''), mark);
      parent.normalize();
    }
  });

  if (!query.trim()) return;

  const lowerQuery = query.toLowerCase();
  const qLen = query.length;

  // Collect text nodes (skip <code> blocks to avoid mangling syntax highlighting)
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      // Skip text inside <code> and <pre> — syntax highlighting owns that DOM
      let el = node.parentElement;
      while (el && el !== container) {
        if (el.tagName === 'CODE' || el.tagName === 'PRE') return NodeFilter.FILTER_REJECT;
        el = el.parentElement;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) textNodes.push(n as Text);

  for (const textNode of textNodes) {
    const text = textNode.textContent ?? '';
    const lower = text.toLowerCase();
    const indices: number[] = [];
    let idx = lower.indexOf(lowerQuery);
    while (idx !== -1) {
      indices.push(idx);
      idx = lower.indexOf(lowerQuery, idx + qLen);
    }
    if (indices.length === 0) continue;

    const fragment = document.createDocumentFragment();
    let cursor = 0;
    for (const start of indices) {
      if (start > cursor) fragment.appendChild(document.createTextNode(text.slice(cursor, start)));
      const mark = document.createElement('mark');
      mark.className = 'search-highlight';
      mark.textContent = text.slice(start, start + qLen);
      fragment.appendChild(mark);
      cursor = start + qLen;
    }
    if (cursor < text.length) fragment.appendChild(document.createTextNode(text.slice(cursor)));
    textNode.parentNode?.replaceChild(fragment, textNode);
  }
}

export function MainPanel({ content, searchQuery = '', scrollRef }: MainPanelProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current && content) {
      void highlightCodeBlocks(contentRef.current);
    }
  }, [content]);

  // Inject stable heading IDs so OutlinePanel can scroll to them
  useEffect(() => {
    if (!contentRef.current || !content) return;
    const headings = contentRef.current.querySelectorAll('h1,h2,h3,h4,h5,h6');
    headings.forEach((el, i) => {
      el.id = `heading-${i}`;
    });
  }, [content]);

  // Apply / remove search highlights whenever query or content changes.
  // Runs after the content useEffects so heading IDs and code highlights are already set.
  useEffect(() => {
    if (!contentRef.current) return;
    applySearchHighlights(contentRef.current, searchQuery);
  }, [content, searchQuery]);

  return (
    <main className="[grid-area:main] bg-navy-900 flex flex-row overflow-hidden" aria-label="Content panel">
      {content === null ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center">
          <p className="text-2xl font-semibold text-text-primary tracking-wide">Markd</p>
          <p className="text-sm text-text-muted">Select a folder and click a file to view it</p>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-10 py-8">
            {/*
              Security note: HTML rendered here comes exclusively from the Rust backend
              parsing local markdown files via pulldown-cmark. No network content is loaded
              (Tauri CSP and capabilities deny all network access). The Tauri CSP
              (script-src 'self') prevents injected scripts from executing.
              Trusted pipeline: local file -> Rust parser -> HTML string -> render.
            */}
            <div
              ref={contentRef}
              className="markdown-body max-w-3xl"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
          <div className="w-20 bg-navy-800 flex-shrink-0 relative border-l border-navy-700">
            <Minimap scrollRef={scrollRef} markdownHtml={content} />
          </div>
        </>
      )}
    </main>
  );
}
