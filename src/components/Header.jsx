import React from 'react';
import { Menu, Sun, Moon, LogOut } from 'lucide-react';
import { getUser } from '../utils/auth.js';
import { useTheme } from '../context/ThemeContext.jsx';

export default function Header({ currentLabel, setMobileNav, logout }) {
  const user = getUser();
  const userName = user?.fullName || 'System Administrator';
  const userInitials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'SA';
  const { toggleTheme, isDark } = useTheme();

  return (
    <header className="sticky top-0 z-20 flex h-[84px] items-center justify-between border-b border-[#ded8ca] bg-[#f7f3e9]/90 px-4 backdrop-blur sm:px-6 lg:px-10 dark:border-[#1e4235] dark:bg-[#0e221b]/90">
      <div className="flex min-w-0 items-center gap-3">
        <button
          aria-label="Open navigation"
          data-testid="button-mobile-menu"
          className="focus-ring rounded-lg p-2 text-[#426257] hover:bg-[#e8e2d6] md:hidden dark:text-[#88baa6] dark:hover:bg-[#18362d]"
          onClick={() => setMobileNav(true)}
        >
          <Menu size={21} />
        </button>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-[.15em] text-[#9b7a3a] dark:text-[#eab65a]">
            2026 Qurbani season
          </p>
          <h1 className="truncate font-display text-xl font-extrabold tracking-[-.035em] text-[#183f35] sm:text-2xl dark:text-[#edf6f2]">
            {currentLabel || 'Workspace'}
          </h1>
        </div>
      </div>
      <div className="ml-4 flex items-center gap-3 sm:gap-4">
        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          data-testid="button-theme-toggle"
          className="group relative flex h-10 items-center gap-2 rounded-xl border border-[#d8d0c0] bg-[#f0ebd9]/80 px-3 text-xs font-bold text-[#183f35] transition-all hover:bg-[#e6dfcb] hover:shadow-sm dark:border-[#22483d] dark:bg-[#152e25] dark:text-[#edf6f2] dark:hover:bg-[#1c3c30]"
        >
          {isDark ? (
            <>
              <Sun size={17} className="text-[#f5be4b] transition-transform duration-300 group-hover:rotate-45" />
              {/* <span className="hidden sm:inline">Light</span> */}
            </>
          ) : (
            <>
              <Moon size={17} className="text-[#2b594b] transition-transform duration-300 group-hover:-rotate-12" />
              {/* <span className="hidden sm:inline">Dark</span> */}
            </>
          )}
        </button>

        <div className="hidden text-right sm:block">
          <p className="text-sm font-bold text-[#183f35] dark:text-[#edf6f2]">{userName}</p>
          <p className="text-xs text-[#738078] dark:text-[#9ab5a8]">Administrator</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-full border-2 border-[#f1c976] bg-[#e3a84b] text-sm font-extrabold text-[#183f35] shadow-sm">
          {userInitials}
        </div>

        {logout && (
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            data-testid="button-header-logout"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d8d0c0] bg-[#f0ebd9]/80 text-[#7a483a] transition-all hover:border-[#f3a69b] hover:bg-[#fff0ed] hover:text-[#c53030] dark:border-[#22483d] dark:bg-[#152e25] dark:text-[#fca5a5] dark:hover:border-[#7f1d1d] dark:hover:bg-[#2b1614]"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
