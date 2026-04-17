import { useCallback, useEffect, useRef } from 'react';

interface MinimapProps {
  scrollRef: React.RefObject<HTMLDivElement>;
  markdownHtml: string;
}

export function Minimap({ scrollRef, markdownHtml }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const roScrollRef = useRef<ResizeObserver | null>(null);
  const moRef = useRef<MutationObserver | null>(null);
  const roCanvasRef = useRef<ResizeObserver | null>(null);

  const drawMinimap = useCallback(() => {
    const canvas = canvasRef.current;
    const scroll = scrollRef.current;
    if (!canvas || !scroll) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    if (w === 0 || h === 0) return;

    canvas.width = w * dpr;
    canvas.height = h * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#111d35';
    ctx.fillRect(0, 0, w, h);

    const totalH = scroll.scrollHeight;
    if (totalH === 0) return;
    const scale = h / totalH;

    // Draw elements as colored blocks
    const elements = scroll.querySelectorAll('h1,h2,h3,h4,h5,h6,p,pre,ul,ol,blockquote');
    const scrollRect = scroll.getBoundingClientRect();

    elements.forEach((el) => {
      const rect = (el as HTMLElement).getBoundingClientRect();
      const elTop = rect.top - scrollRect.top + scroll.scrollTop;
      const elH = rect.height;

      let color = '#243556'; // default (p)
      const tag = el.tagName.toLowerCase();
      if (/h[1-6]/.test(tag)) color = '#3b82f6';
      else if (tag === 'pre') color = '#1a2a4a';
      else if (tag === 'blockquote') color = '#2563eb';
      else if (tag === 'ul' || tag === 'ol') color = '#1e3050';

      ctx.fillStyle = color;
      ctx.fillRect(2, elTop * scale, w - 4, Math.max(elH * scale, 1));
    });

    // Search highlight bars — bright yellow, drawn on top of content blocks
    const marks = scroll.querySelectorAll<HTMLElement>('mark.search-highlight');
    if (marks.length > 0) {
      ctx.fillStyle = 'rgba(234,179,8,0.85)';
      marks.forEach((mark) => {
        const rect = mark.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return; // not visible yet
        const top = rect.top - scrollRect.top + scroll.scrollTop;
        // Draw a full-width bar at minimum 3px tall so small matches are visible
        ctx.fillRect(0, top * scale, w, Math.max(rect.height * scale, 3));
      });
    }

    // Viewport indicator
    const viewTop = scroll.scrollTop * scale;
    const viewH = (scroll.clientHeight / totalH) * h;
    ctx.fillStyle = 'rgba(59,130,246,0.12)';
    ctx.fillRect(0, viewTop, w, viewH);
    ctx.strokeStyle = 'rgba(59,130,246,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, viewTop + 0.5, w - 1, Math.max(viewH - 1, 0));
  }, []); // reads only stable refs + window globals

  // Wire scroll, mutation, and resize observers inside a RAF so layout has settled
  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      const scroll = scrollRef.current;
      if (!scroll) return;

      drawMinimap();
      scroll.addEventListener('scroll', drawMinimap, { passive: true });

      roScrollRef.current = new ResizeObserver(drawMinimap);
      roScrollRef.current.observe(scroll);

      moRef.current = new MutationObserver(drawMinimap);
      moRef.current.observe(scroll, { childList: true, subtree: true });
    });

    return () => {
      cancelAnimationFrame(rafId);
      const scroll = scrollRef.current;
      scroll?.removeEventListener('scroll', drawMinimap);
      roScrollRef.current?.disconnect();
      moRef.current?.disconnect();
    };
  }, [markdownHtml, drawMinimap, scrollRef]);

  // Canvas ResizeObserver: fires when CSS layout resolves and dimensions become non-zero
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    roCanvasRef.current = new ResizeObserver(() => {
      if (canvas.offsetWidth > 0 && canvas.offsetHeight > 0) {
        drawMinimap();
      }
    });
    roCanvasRef.current.observe(canvas);

    return () => {
      roCanvasRef.current?.disconnect();
    };
  }, [drawMinimap]);

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const scroll = scrollRef.current;
    if (!canvas || !scroll) return;
    const rect = canvas.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const fraction = clickY / rect.height;
    scroll.scrollTop = fraction * scroll.scrollHeight;
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full cursor-pointer"
      onClick={handleClick}
      aria-hidden="true"
    />
  );
}
