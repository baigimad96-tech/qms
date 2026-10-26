import React from 'react';
import { useTheme } from '../context/ThemeContext.jsx';

function getValueFontSize(value) {
  if (value === null || value === undefined) return 'text-xl sm:text-2xl';
  const str = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  const len = str.length;

  if (len > 16) return 'text-xs sm:text-sm';
  if (len > 12) return 'text-sm sm:text-base xl:text-sm';
  if (len > 9) return 'text-base sm:text-lg xl:text-base';
  if (len > 6) return 'text-lg sm:text-xl xl:text-lg';
  return 'text-xl sm:text-2xl xl:text-xl';
}

export default function StatCard({ label, value, sub, icon: Icon, color, delay, onClick }) {
  const { isDark } = useTheme();

  const lightColors = {
    gold: ['#fcf1d8', '#9b6b1e'],
    green: ['#e1efe8', '#246b59'],
    blue: ['#e4eff0', '#34717a'],
    teal: ['#e0eee6', '#3d7259'],
    orange: ['#f9e8dc', '#aa6139'],
  };

  const darkColors = {
    gold: ['#2b2210', '#f3c46a'],
    green: ['#132e24', '#4ade80'],
    blue: ['#132a35', '#38bdf8'],
    teal: ['#122d25', '#2dd4bf'],
    orange: ['#2e1b12', '#fb923c'],
  };

  const colors = isDark ? darkColors : lightColors;
  const testId = `text-stat-${label.toLowerCase().replaceAll(' ', '-')}`;

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`card-surface fade-up delay-${Math.min(delay + 1, 3)} min-w-0 overflow-hidden rounded-2xl p-5 ${
        onClick ? 'cursor-pointer hover:border-[#246b59] hover:shadow-md transition-all active:scale-[0.99]' : ''
      }`}
    >
      <div className="flex min-w-0 items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="text-xs font-semibold text-[#7b867e] dark:text-[#92b1a3] truncate" title={label}>
            {label}
          </p>
          <p
            data-testid={testId}
            title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}
            className={`mt-2 font-display font-extrabold tracking-[-.045em] text-[#183f35] dark:text-[#edf6f2] truncate break-words [overflow-wrap:anywhere] leading-tight ${getValueFontSize(
              value
            )}`}
          >
            {value}
          </p>
        </div>
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors duration-200"
          style={{ background: colors[color]?.[0] || colors.green[0], color: colors[color]?.[1] || colors.green[1] }}
        >
          <Icon size={19} />
        </div>
      </div>
      <p className="mt-4 text-xs text-[#7b867e] dark:text-[#8ba79b] break-words leading-relaxed">{sub}</p>
    </div>
  );
}
