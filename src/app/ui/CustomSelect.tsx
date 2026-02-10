import React from 'react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  disabled = false,
}) => {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  React.useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        className={`w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-sm text-[var(--text)] flex items-center justify-between gap-3 transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[var(--accent)] cursor-pointer'
        } ${open ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/20' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-[var(--muted)] transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M5.5 7.5a1 1 0 0 1 1.5 0L10 10.5l3-3a1 1 0 1 1 1.5 1.5l-3.75 3.75a1 1 0 0 1-1.5 0L5.5 9a1 1 0 0 1 0-1.5z" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-[10001] mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
            {options.length === 0 ? (
              <div className="px-4 py-3 text-xs text-[var(--muted)] italic">No options available</div>
            ) : (
              options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`w-full px-4 py-2.5 text-sm text-left transition-colors flex items-center justify-between group ${
                    value === opt.value
                      ? 'bg-[var(--accent)] text-white font-bold'
                      : 'text-[var(--text)] hover:bg-[var(--surface)]'
                  }`}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{opt.label}</span>
                  {value === opt.value && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
