import React from 'react';
import { Search } from 'lucide-react';

export function TableScroll({ children }) {
  return <div className="table-scroll">{children}</div>;
}

export function Th({ children }) {
  return (
    <th className="whitespace-nowrap pb-3 pr-5 text-[10px] font-bold uppercase tracking-[.13em] text-[#8a948e] dark:text-[#789d8e]">
      {children}
    </th>
  );
}

export function Td({ children, className = '' }) {
  return (
    <td className={`whitespace-nowrap py-4 pr-5 text-[#66766d] dark:text-[#92b1a3] ${className}`}>{children}</td>
  );
}

export function IconButton({ icon: Icon, onClick, label, disabled = false, className = '' }) {
  const testId = `button-${label.toLowerCase().replaceAll(' ', '-')}`;
  return (
    <button
      data-testid={testId}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg p-2 text-[#597267] hover:bg-[#e7f0e9] hover:text-[#246b59] dark:text-[#8ba79b] dark:hover:bg-[#193a2f] dark:hover:text-[#4ade80] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      <Icon size={16} />
    </button>
  );
}

export function EmptyState({ title, description, onAction, actionLabel }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d9cfbc] bg-[#fcfaf4] px-6 py-14 text-center dark:border-[#21473a] dark:bg-[#122820]">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#f4e6c7] text-[#9b6b1e] dark:bg-[#2b2413] dark:text-[#f3c46a]">
        <Search size={21} />
      </div>
      <h4 className="mt-4 font-display text-lg font-extrabold text-[#315246] dark:text-[#edf6f2]">{title}</h4>
      <p className="mt-1 text-sm text-[#7b867e] dark:text-[#92b1a3]">{description}</p>
      {onAction && (
        <button onClick={onAction} className="btn-secondary mt-5">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
