/**
 * Parse the markdown HTML string, walk its text nodes (skipping <code>/<pre>),
 * and wrap every occurrence of `query` in <mark class="search-highlight">.
 * Returns the original string unchanged when query is empty.
 *
 * Using DOMParser (not regex) so we don't corrupt HTML tags.
 */
export function injectSearchHighlights(html: string, query: string): string {
  const q = query.trim();
  if (!q || !html) return html;

  const lowerQ = q.toLowerCase();
  const qLen = q.length;

  const doc = new DOMParser().parseFromString(html, 'text/html');

  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      // Skip text inside code blocks — shiki owns that DOM
      let el = node.parentElement;
      while (el && el !== doc.body) {
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
    let idx = lower.indexOf(lowerQ);
    while (idx !== -1) {
      indices.push(idx);
      idx = lower.indexOf(lowerQ, idx + qLen);
    }
    if (indices.length === 0) continue;

    const frag = doc.createDocumentFragment();
    let cursor = 0;
    for (const start of indices) {
      if (start > cursor) frag.appendChild(doc.createTextNode(text.slice(cursor, start)));
      const mark = doc.createElement('mark');
      mark.className = 'search-highlight';
      mark.textContent = text.slice(start, start + qLen);
      frag.appendChild(mark);
      cursor = start + qLen;
    }
    if (cursor < text.length) frag.appendChild(doc.createTextNode(text.slice(cursor)));
    textNode.parentNode?.replaceChild(frag, textNode);
  }

  return doc.body.innerHTML;
}
