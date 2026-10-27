import React from 'react';
import { Menu, Sun, Moon, LogOut } from 'lucide-react';
import { getUser } from '../utils/auth.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { getActiveSeasonYear } from '../utils/season.js';

export default function Header({ currentLabel, setMobileNav, logout, data }) {
  const user = getUser();
  const userName = user?.fullName || 'System Administrator';
  const userInitials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'SA';
  const { toggleTheme, isDark } = useTheme();

  return (
    <header className="sticky top-0 z-20 flex h-16 sm:h-[84px] items-center justify-between border-b border-[#ded8ca] bg-[#f7f3e9]/90 px-2 sm:px-6 lg:px-10 backdrop-blur dark:border-[#1e4235] dark:bg-[#0e221b]/90">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
        <button
          aria-label="Open navigation"
          data-testid="button-mobile-menu"
          className="focus-ring shrink-0 rounded-lg p-1.5 text-[#426257] hover:bg-[#e8e2d6] sm:p-2 md:hidden dark:text-[#88baa6] dark:hover:bg-[#18362d]"
          onClick={() => setMobileNav(true)}
        >
          <Menu size={19} className="sm:h-[21px] sm:w-[21px]" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="whitespace-nowrap text-[10px] sm:text-xs font-bold uppercase tracking-normal sm:tracking-[.12em] text-[#9b7a3a] dark:text-[#eab65a] leading-tight">
            {getActiveSeasonYear(data)} Qurbani season
          </p>
          <h1 className="truncate font-display text-[15px] sm:text-xl lg:text-2xl font-extrabold tracking-tight text-[#183f35] dark:text-[#edf6f2] leading-tight mt-0.5 sm:mt-1">
            {currentLabel || 'Workspace'}
          </h1>
        </div>
      </div>
      <div className="ml-1 sm:ml-4 flex shrink-0 items-center gap-1 sm:gap-3">
        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          data-testid="button-theme-toggle"
          className="group relative flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border border-[#d8d0c0] bg-[#f0ebd9]/80 text-[#183f35] transition-all hover:bg-[#e6dfcb] hover:shadow-sm dark:border-[#22483d] dark:bg-[#152e25] dark:text-[#edf6f2] dark:hover:bg-[#1c3c30]"
        >
          {isDark ? (
            <Sun size={16} className="text-[#f5be4b] transition-transform duration-300 group-hover:rotate-45 sm:h-[17px] sm:w-[17px]" />
          ) : (
            <Moon size={16} className="text-[#2b594b] transition-transform duration-300 group-hover:-rotate-12 sm:h-[17px] sm:w-[17px]" />
          )}
        </button>

        <div className="hidden text-right sm:block">
          <p className="text-sm font-bold text-[#183f35] dark:text-[#edf6f2]">{userName}</p>
          <p className="text-xs text-[#738078] dark:text-[#9ab5a8]">Administrator</p>
        </div>
        <div className="grid h-8 w-8 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-full border-2 border-[#f1c976] bg-[#e3a84b] text-xs sm:text-sm font-extrabold text-[#183f35] shadow-sm">
          {userInitials}
        </div>

        {logout && (
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            data-testid="button-header-logout"
            className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border border-[#d8d0c0] bg-[#f0ebd9]/80 text-[#7a483a] transition-all hover:border-[#f3a69b] hover:bg-[#fff0ed] hover:text-[#c53030] dark:border-[#22483d] dark:bg-[#152e25] dark:text-[#fca5a5] dark:hover:border-[#7f1d1d] dark:hover:bg-[#2b1614]"
          >
            <LogOut size={15} className="sm:h-4 sm:w-4" />
          </button>
        )}
      </div>
    </header>
  );
}
