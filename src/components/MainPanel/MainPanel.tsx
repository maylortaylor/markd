import { useEffect, useRef } from 'react';

import { highlightCodeBlocks } from '../../lib/shiki';

import './markdown.css';
import { Minimap } from './Minimap';

interface MainPanelProps {
  content: string | null;
  scrollRef: React.RefObject<HTMLDivElement>;
}

export function MainPanel({ content, scrollRef }: MainPanelProps) {
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
