import React from 'react';
import { useTheme } from '../context/ThemeContext.jsx';

export const STANDARD_STAT_VALUE_FONT_SIZE = 'text-xl sm:text-2xl xl:text-xl 2xl:text-2xl';

export function getConsistentFontSize(values = []) {
  if (!values || !values.length) return STANDARD_STAT_VALUE_FONT_SIZE;

  const maxLen = Math.max(
    ...values.map((v) => {
      if (v === null || v === undefined) return 0;
      return String(v).trim().length;
    })
  );

  // Scaled down uniformly across the group only for extreme lengths
  if (maxLen > 18) {
    return 'text-base sm:text-lg xl:text-base 2xl:text-lg';
  }
  return STANDARD_STAT_VALUE_FONT_SIZE;
}

export function getValueFontSize(value) {
  if (value === null || value === undefined) return STANDARD_STAT_VALUE_FONT_SIZE;
  const str = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  const len = str.length;

  if (len > 18) return 'text-base sm:text-lg xl:text-base 2xl:text-lg';
  return STANDARD_STAT_VALUE_FONT_SIZE;
}

export default function StatCard({ label, value, sub, icon: Icon, color, delay, onClick, valueClassName }) {
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
            className={`mt-2 font-display font-extrabold tracking-[-.045em] tabular-nums text-[#183f35] dark:text-[#edf6f2] truncate leading-tight ${
              valueClassName || getValueFontSize(value)
            }`}
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
