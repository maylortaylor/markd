import { motion } from 'framer-motion';

import type { HeadingEntry } from '../../types';

interface OutlinePanelProps {
  entries: HeadingEntry[];
  scrollRef: React.RefObject<HTMLDivElement>;
}

export function OutlinePanel({ entries, scrollRef }: OutlinePanelProps) {
  function scrollTo(id: string) {
    scrollRef.current
      ?.querySelector(`#${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (entries.length === 0) {
    return (
      <p className="px-3 py-4 text-xs text-text-muted italic">
        No headings found
      </p>
    );
  }

  return (
    <ul className="py-1 overflow-y-auto flex-1 list-none">
      {entries.map((entry, i) => (
        <motion.li
          key={entry.id}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03, duration: 0.15 }}
        >
          <button
            onClick={() => scrollTo(entry.id)}
            className="w-full text-left py-0.5 text-sm text-text-secondary hover:text-text-primary hover:bg-navy-700 rounded transition-colors flex items-center gap-1.5"
            style={{ paddingLeft: `${(entry.level - 1) * 10 + 8}px` }}
            aria-label={`${entry.text} (H${entry.level})`}
            title={entry.text}
          >
            <span className="text-ocean-400 text-xs font-mono flex-shrink-0">
              H{entry.level}
            </span>
            <span className="truncate">{entry.text}</span>
          </button>
        </motion.li>
      ))}
    </ul>
  );
}
