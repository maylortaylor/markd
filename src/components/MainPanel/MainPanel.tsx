import { useEffect, useRef } from 'react';

import { highlightCodeBlocks } from '../../lib/shiki';

import './markdown.css';
import { Minimap } from './Minimap';

interface MainPanelProps {
  content: string | null;
  searchQuery: string;
  scrollRef: React.RefObject<HTMLDivElement>;
}

/** Remove all injected marks and restore plain text nodes. */
function clearMarks(container: HTMLElement) {
  container.querySelectorAll('mark.search-highlight').forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(mark.textContent ?? ''), mark);
    parent.normalize();
  });
}

/** Walk text nodes (skip pre/code) and wrap matches in <mark class="search-highlight">. */
function applyMarks(container: HTMLElement, query: string) {
  clearMarks(container);
  const q = query.trim();
  if (!q) return;

  const lowerQ = q.toLowerCase();
  const qLen = q.length;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      let el = node.parentElement;
      while (el && el !== container) {
        if (el.tagName === 'CODE' || el.tagName === 'PRE') return NodeFilter.FILTER_REJECT;
        el = el.parentElement;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) nodes.push(n as Text);

  for (const node of nodes) {
    const text = node.textContent ?? '';
    const lower = text.toLowerCase();
    const indices: number[] = [];
    let idx = lower.indexOf(lowerQ);
    while (idx !== -1) { indices.push(idx); idx = lower.indexOf(lowerQ, idx + qLen); }
    if (!indices.length) continue;

    const frag = document.createDocumentFragment();
    let cursor = 0;
    for (const start of indices) {
      if (start > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, start)));
      const mark = document.createElement('mark');
      mark.className = 'search-highlight';
      mark.textContent = text.slice(start, start + qLen);
      frag.appendChild(mark);
      cursor = start + qLen;
    }
    if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));
    node.parentNode?.replaceChild(frag, node);
  }
}

export function MainPanel({ content, searchQuery, scrollRef }: MainPanelProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  // Ref so async Shiki callback always reads latest query without stale closure
  const searchQueryRef = useRef(searchQuery);
  useEffect(() => { searchQueryRef.current = searchQuery; });

  // When a new file loads: run Shiki THEN inject marks so they're never overwritten.
  useEffect(() => {
    if (!contentRef.current || !content) return;
    let cancelled = false;
    void highlightCodeBlocks(contentRef.current).then(() => {
      if (!cancelled && contentRef.current) {
        applyMarks(contentRef.current, searchQueryRef.current);
      }
    });
    return () => { cancelled = true; };
  }, [content]);

  // When only the query changes (same file): re-apply marks directly — Shiki already ran.
  useEffect(() => {
    if (!contentRef.current) return;
    applyMarks(contentRef.current, searchQuery);
  }, [searchQuery]);

  // Inject stable heading IDs so OutlinePanel can scroll to them.
  useEffect(() => {
    if (!contentRef.current || !content) return;
    const headings = contentRef.current.querySelectorAll('h1,h2,h3,h4,h5,h6');
    headings.forEach((el, i) => { el.id = `heading-${i}`; });
  }, [content]);

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
              Trusted pipeline: local file -> Rust parser -> HTML string -> highlight injection -> render.
              Search highlights (<mark class="search-highlight">) are injected via DOMParser
              in a sandboxed document before being passed here — no script execution risk.
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
