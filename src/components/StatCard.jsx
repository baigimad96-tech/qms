import React from 'react';
import { useTheme } from '../context/ThemeContext.jsx';

export default function StatCard({ label, value, sub, icon: Icon, color, delay }) {
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
    <div className={`card-surface fade-up delay-${Math.min(delay + 1, 3)} rounded-2xl p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-[#7b867e] dark:text-[#92b1a3]">{label}</p>
          <p
            data-testid={testId}
            className="mt-2 font-display text-3xl font-extrabold tracking-[-.045em] text-[#183f35] dark:text-[#edf6f2]"
          >
            {value}
          </p>
        </div>
        <div
          className="grid h-10 w-10 place-items-center rounded-xl transition-colors duration-200"
          style={{ background: colors[color][0], color: colors[color][1] }}
        >
          <Icon size={19} />
        </div>
      </div>
      <p className="mt-4 text-xs text-[#7b867e] dark:text-[#8ba79b]">{sub}</p>
    </div>
  );
}
