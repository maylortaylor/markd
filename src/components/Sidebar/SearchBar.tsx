interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search files..."
      aria-label="Search files"
      style={{
        width: '100%',
        backgroundColor: '#3c3c3c',
        border: '1px solid #3c3c3c',
        color: '#cccccc',
        padding: '4px 8px',
        fontSize: '13px',
        outline: 'none',
        borderRadius: '2px',
        boxSizing: 'border-box',
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = '#007acc';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = '#3c3c3c';
      }}
    />
  );
}
