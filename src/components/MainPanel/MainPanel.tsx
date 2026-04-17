import { useEffect, useRef } from 'react';

import { highlightCodeBlocks } from '../../lib/shiki';

import './markdown.css';
import { Minimap } from './Minimap';

interface MainPanelProps {
  content: string | null;
  searchQuery: string;
  /** When set, scroll to the mark whose surrounding text best matches this string. */
  scrollToText: string | null;
  /** Called once scroll has been dispatched so the parent can clear the target. */
  onScrollComplete: () => void;
  scrollRef: React.RefObject<HTMLDivElement>;
}

/** Remove all injected marks and restore plain text. */
function clearMarks(container: HTMLElement) {
  container.querySelectorAll('mark.search-highlight').forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(mark.textContent ?? ''), mark);
    parent.normalize();
  });
}

/**
 * Walk ALL text nodes (including inside <pre>/<code> so code-block matches are
 * highlighted too) and wrap occurrences of `query` in <mark class="search-highlight">.
 * Shiki-highlighted spans are individual tokens, so intra-token matches work fine;
 * cross-token matches are silently skipped.
 */
function applyMarks(container: HTMLElement, query: string) {
  clearMarks(container);
  const q = query.trim();
  if (!q) return;

  const lowerQ = q.toLowerCase();
  const qLen = q.length;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);

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

/** Scroll the nearest matching mark into view inside the scroll container. */
function scrollToMark(scroll: HTMLElement, targetText: string) {
  const marks = Array.from(scroll.querySelectorAll<HTMLElement>('mark.search-highlight'));
  if (!marks.length) return;

  const lower = targetText.toLowerCase().slice(0, 100);
  const best =
    marks.find((m) => {
      const block = m.closest('p,li,h1,h2,h3,h4,h5,h6,td,blockquote,pre,div');
      return (block?.textContent ?? '').toLowerCase().includes(lower);
    }) ?? marks[0];

  best.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function MainPanel({
  content,
  searchQuery,
  scrollToText,
  onScrollComplete,
  scrollRef,
}: MainPanelProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Refs so async Shiki callbacks always read latest values without stale closures
  const searchQueryRef = useRef(searchQuery);
  const scrollToTextRef = useRef(scrollToText);
  const onScrollCompleteRef = useRef(onScrollComplete);
  useEffect(() => { searchQueryRef.current = searchQuery; });
  useEffect(() => { scrollToTextRef.current = scrollToText; });
  useEffect(() => { onScrollCompleteRef.current = onScrollComplete; });

  // When a new file loads: run Shiki THEN inject marks so they're never overwritten.
  // Scroll to the pending target (if any) immediately after marks are applied.
  useEffect(() => {
    if (!contentRef.current || !content) return;
    let cancelled = false;
    void highlightCodeBlocks(contentRef.current).then(() => {
      if (cancelled || !contentRef.current || !scrollRef.current) return;
      applyMarks(contentRef.current, searchQueryRef.current);
      const target = scrollToTextRef.current;
      if (target) {
        scrollToMark(scrollRef.current, target);
        onScrollCompleteRef.current();
      }
    });
    return () => { cancelled = true; };
  }, [content]); // eslint-disable-line react-hooks/exhaustive-deps

  // When only the query changes (same file open): re-apply marks — Shiki already ran.
  useEffect(() => {
    if (!contentRef.current || !scrollRef.current) return;
    applyMarks(contentRef.current, searchQuery);
    const target = scrollToTextRef.current;
    if (target) {
      scrollToMark(scrollRef.current, target);
      onScrollCompleteRef.current();
    }
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

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
              Security note: HTML is exclusively from the Rust/pulldown-cmark pipeline.
              Trusted chain: local file → Rust parser → HTML string → render.
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
