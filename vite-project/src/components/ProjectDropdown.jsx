import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function ProjectDropdown({
  value,
  onChange,
  options = [],
  icon: Icon,
  testId,
  className = '',
  menuClassName = '',
  buttonClassName = '',
  fitOptions = false,
  placeholder,
  placeholderValue = 'All',
  align = 'auto',
  disabled = false,
  title,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState('left');
  const [menuStyle, setMenuStyle] = useState({});
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const updatePlacement = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const isMobile = viewportWidth < 640;
    const margin = isMobile ? 12 : 16;
    const maxMenuWidth = Math.min(viewportWidth - margin * 2, 420);

    if (align === 'right') {
      setPlacement('right');
      setMenuStyle({ maxWidth: `${maxMenuWidth}px` });
      return;
    }
    if (align === 'left') {
      setPlacement('left');
      setMenuStyle({ maxWidth: `${maxMenuWidth}px` });
      return;
    }

    const menuEl = menuRef.current;
    const menuWidth = menuEl && menuEl.offsetWidth > 0 ? menuEl.offsetWidth : 300;

    const fitsLeft = rect.left + menuWidth <= viewportWidth - margin;
    const fitsRight = rect.right - menuWidth >= margin;

    if (!isMobile) {
      if (fitsLeft) {
        setPlacement('left');
        setMenuStyle({ maxWidth: `${maxMenuWidth}px` });
      } else if (fitsRight || rect.right > viewportWidth / 2) {
        setPlacement('right');
        setMenuStyle({ maxWidth: `${maxMenuWidth}px` });
      } else {
        setPlacement('left');
        setMenuStyle({ maxWidth: `${maxMenuWidth}px` });
      }
    } else {
      // Mobile positioning: dynamically clamp menu horizontally to stay within viewport
      const minLeft = margin;
      const maxLeft = Math.max(margin, viewportWidth - menuWidth - margin);
      const clampedLeft = Math.max(minLeft, Math.min(rect.left, maxLeft));
      const relativeOffset = Math.round(clampedLeft - rect.left);

      setPlacement('custom');
      setMenuStyle({
        left: `${relativeOffset}px`,
        right: 'auto',
        maxWidth: `${maxMenuWidth}px`,
      });
    }
  }, [align]);

  useEffect(() => {
    if (!isOpen) return;

    // Run placement update on next animation frame to measure rendered menu width accurately
    const rafId = requestAnimationFrame(updatePlacement);

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
    const handleResizeOrScroll = () => {
      updatePlacement();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll);
    };
  }, [isOpen, updatePlacement]);

  const displayLabel =
    value === placeholderValue && placeholder ? placeholder : value;

  return (
    <div ref={containerRef} className={`relative inline-block max-w-full min-w-0 ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-disabled={disabled}
        data-testid={testId}
        onClick={() => {
          if (disabled) return;
          if (!isOpen) {
            updatePlacement();
            setIsOpen(true);
          } else {
            setIsOpen(false);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title={title || (typeof displayLabel === 'string' ? displayLabel : undefined)}
        className={`flex h-10 items-center justify-between gap-2.5 rounded-xl border px-3 text-xs font-semibold transition-all duration-200 outline-none select-none ${
          disabled
            ? 'border-[#ded8ca] bg-[#f5f1e8]/70 text-[#8a948e] cursor-not-allowed opacity-60 dark:border-[#21473a] dark:bg-[#122820]/40 dark:text-[#698d80]'
            : isOpen
            ? 'border-[#246b59] ring-2 ring-[#e3a84b]/20 bg-white dark:bg-[#152e25] dark:border-[#4ade80] text-[#183f35] dark:text-[#edf6f2]'
            : 'border-[#ded8ca] bg-[#faf6ed] hover:bg-white hover:border-[#b8c9c0] text-[#183f35] dark:border-[#21473a] dark:bg-[#122820] dark:text-[#edf6f2] dark:hover:bg-[#173329] dark:hover:border-[#2a5d4c]'
        } w-auto min-w-0 sm:min-w-[140px] max-w-[min(100%,250px)] sm:max-w-[340px] ${buttonClassName}`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          {Icon && (
            <Icon
              size={14}
              className={`shrink-0 ${disabled ? 'text-[#8a948e] dark:text-[#698d80]' : 'text-[#246b59] dark:text-[#4ade80]'}`}
            />
          )}
          <span
            className="truncate block min-w-0"
            title={typeof displayLabel === 'string' ? displayLabel : undefined}
          >
            {displayLabel}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform duration-200 ${
            disabled
              ? 'text-[#a5b0a9] dark:text-[#527065]'
              : isOpen
              ? 'rotate-180 text-[#246b59] dark:text-[#4ade80]'
              : 'text-[#7b867e] dark:text-[#8ba79b]'
          }`}
        />
      </button>

      {isOpen && !disabled && (
        <div
          ref={menuRef}
          role="listbox"
          style={menuStyle}
          className={`absolute ${
            placement === 'right'
              ? 'right-0'
              : placement === 'custom'
              ? ''
              : 'left-0'
          } top-full z-50 mt-1.5 w-max min-w-full sm:min-w-[280px] max-w-[calc(100vw-1.5rem)] sm:max-w-md max-h-60 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] rounded-xl border border-[#ded8ca] bg-[#fffdfa] p-1.5 shadow-xl backdrop-blur-md dark:border-[#244f40] dark:bg-[#0f241d] animate-in fade-in-0 zoom-in-95 duration-150 ${menuClassName}`}
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
                title={typeof opt === 'string' ? opt : undefined}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-xs transition-colors duration-150 ${
                  isSelected
                    ? 'bg-[#e4efe7] font-bold text-[#246b59] dark:bg-[#193a2f] dark:text-[#4ade80]'
                    : 'font-medium text-[#315246] hover:bg-[#f3ede1] dark:text-[#d7e9e0] dark:hover:bg-[#163329]'
                }`}
              >
                <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] leading-snug">
                  {opt}
                </span>
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
