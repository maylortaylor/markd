import { useEffect, useRef } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

export function SearchBar({ value, onChange, autoFocus }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <div className="px-3 py-2">
      <input
        ref={inputRef}
        type="text"
        data-search-input
        className="w-full bg-navy-700 border border-navy-600 rounded px-2 py-1 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-ocean-400 transition-colors"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search files..."
        aria-label="Search files"
      />
    </div>
  );
}
