import { ChevronRight } from 'lucide-react';

interface BreadcrumbProps {
  segments: string[];
}

export function Breadcrumb({ segments }: BreadcrumbProps) {
  return (
    <div
      className="[grid-area:breadcrumb] bg-navy-800 border-b border-navy-700 px-4 flex items-center gap-0.5 text-xs h-7 overflow-hidden"
      aria-label="File path"
    >
      {segments.length === 0 ? (
        <span className="text-text-muted italic">No file open</span>
      ) : (
        segments.map((seg, i) => {
          const isLast = i === segments.length - 1;
          return (
            <span key={i} className="flex items-center gap-0.5 min-w-0">
              {i > 0 && (
                <ChevronRight size={11} className="text-navy-600 flex-shrink-0" aria-hidden="true" />
              )}
              <span
                className={`truncate ${isLast ? 'text-text-primary font-medium' : 'text-text-muted'}`}
                title={seg}
              >
                {seg}
              </span>
            </span>
          );
        })
      )}
    </div>
  );
}
