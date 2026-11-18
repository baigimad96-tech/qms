import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function ProjectDropdown({
  value,
  onChange,
  options = [],
  icon: Icon,
  testId,
  className = '',
  menuClassName = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-block w-full sm:w-auto ${className}`}>
      <button
        type="button"
        data-testid={testId}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex h-10 w-full sm:min-w-[140px] items-center justify-between gap-2.5 rounded-xl border px-3 text-xs font-semibold transition-all duration-200 outline-none select-none ${
          isOpen
            ? 'border-[#246b59] ring-2 ring-[#e3a84b]/20 bg-white dark:bg-[#152e25] dark:border-[#4ade80]'
            : 'border-[#ded8ca] bg-[#faf6ed] hover:bg-white hover:border-[#b8c9c0] dark:border-[#21473a] dark:bg-[#122820] dark:hover:bg-[#173329] dark:hover:border-[#2a5d4c]'
        } text-[#183f35] dark:text-[#edf6f2]`}
      >
        <span className="flex items-center gap-2 truncate">
          {Icon && (
            <Icon
              size={14}
              className="shrink-0 text-[#246b59] dark:text-[#4ade80]"
            />
          )}
          <span className="truncate">{value}</span>
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-[#7b867e] dark:text-[#8ba79b] transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#246b59] dark:text-[#4ade80]' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={`absolute left-0 top-full z-40 mt-1.5 min-w-[170px] w-full max-h-60 overflow-y-auto rounded-xl border border-[#ded8ca] bg-[#fffdfa] p-1.5 shadow-xl backdrop-blur-md dark:border-[#244f40] dark:bg-[#0f241d] animate-in fade-in-0 zoom-in-95 duration-150 ${menuClassName}`}
        >
          {options.map((opt) => {
            const isSelected = opt === value;
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors duration-150 ${
                  isSelected
                    ? 'bg-[#e4efe7] font-bold text-[#246b59] dark:bg-[#193a2f] dark:text-[#4ade80]'
                    : 'font-medium text-[#315246] hover:bg-[#f3ede1] dark:text-[#d7e9e0] dark:hover:bg-[#163329]'
                }`}
              >
                <span className="truncate">{opt}</span>
                {isSelected && (
                  <Check
                    size={14}
                    className="shrink-0 text-[#246b59] dark:text-[#4ade80]"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
