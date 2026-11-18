import React, { useState } from 'react';
import {
  LayoutDashboard,
  Box,
  CalendarDays,
  Plus,
  ClipboardList,
  Users,
  Activity,
  ReceiptIndianRupee,
  LogOut,
  RefreshCw,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import JihLogo from './JihLogo.jsx';

export function BrandMark({ light = false }) {
  return (
    <div className={`flex items-center gap-3 ${light ? 'text-[#faf5e9]' : 'text-[#183f35]'}`}>
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e3a84b] text-white shadow-sm p-1.5 overflow-hidden transition-transform duration-200 hover:scale-105">
        <JihLogo className="h-full w-auto text-white" />
      </div>
      <div>
        <div className="font-display text-lg font-extrabold leading-none tracking-[-.04em]">JIH Qurbani</div>
        <div className={`mt-1 text-[10px] font-semibold uppercase tracking-[.18em] ${light ? 'text-[#b4cbc0]' : 'text-[#8b958d]'}`}>
          Management System
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ path, mobileNav, setMobileNav, navigate, logout }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const nav = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Animal Inventory', href: '/inventory', aliasHref: '/animals', icon: Box },
    { label: 'Qurbani Days', href: '/qurbani-days', icon: CalendarDays },
    { label: 'Hissa Booking', href: '/new-booking', aliasHref: '/hissa-booking', icon: Plus },
    { label: 'Bookings', href: '/bookings', icon: ClipboardList },
    { label: 'Admin Management', href: '/admins', icon: Users },
    { label: 'Audit Logs', href: '/audit-logs', icon: Activity },
    { label: 'Expense Tracker', href: '/expenses', icon: ReceiptIndianRupee },
  ];

  const current = nav.find(
    (item) =>
      path === item.href ||
      path === item.aliasHref ||
      (item.href === '/bookings' && path.startsWith('/bookings/'))
  );

  return (
    <>
      <aside
        className={`sidebar-shell fixed inset-y-0 left-0 z-40 flex w-[272px] -translate-x-full flex-col border-r border-[#31584d] transition-transform duration-300 md:sticky md:top-0 md:h-screen md:shrink-0 md:translate-x-0 overflow-y-auto ${
          mobileNav ? 'translate-x-0' : ''
        }`}
      >
        <div className="flex h-[84px] items-center border-b border-[#31584d] px-7">
          <BrandMark light />
        </div>
        <div className="px-5 pb-3 pt-7 text-[10px] font-bold uppercase tracking-[.2em] text-[#88aa9d]">
          Workspace
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = current?.href === item.href;
            const testId = `nav-${item.label.toLowerCase().replaceAll(' ', '-')}`;
            return (
              <button
                data-testid={testId}
                key={item.href}
                onClick={() => navigate(item.href)}
                className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                  active
                    ? 'bg-[#e3a84b] text-[#183f35] shadow-lg shadow-[#102f29]/25'
                    : 'text-[#c4d5cc] hover:bg-[#294f44] hover:text-white'
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                <span>{item.label}</span>
                {active && <ArrowRight size={15} className="ml-auto" />}
              </button>
            );
          })}
        </nav>
        <div className="mx-5 mb-5 rounded-2xl border border-[#376355] bg-[#21483d] p-4">
          <div className="mb-2 flex items-center gap-2 text-[#e7b85f]">
            <Sparkles size={15} />
            <span className="text-xs font-bold">Season pulse</span>
          </div>
          <p className="text-xs leading-5 text-[#bad0c5]">
            Capacity is healthy across all three Qurbani days.
          </p>
        </div>
        <div className="border-t border-[#31584d] p-4">
          <button
            data-testid="button-logout"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[#c4d5cc] transition hover:bg-[#294f44] hover:text-white disabled:opacity-50"
          >
            {isLoggingOut ? (
              <>
                <RefreshCw size={18} className="animate-spin text-[#e3a84b]" />
                <span>Signing out...</span>
              </>
            ) : (
              <>
                <LogOut size={18} />
                <span>Logout</span>
              </>
            )}
          </button>
        </div>
      </aside>
      {mobileNav && (
        <button
          aria-label="Close navigation"
          className="modal-backdrop fixed inset-0 z-30 md:hidden"
          onClick={() => setMobileNav(false)}
        />
      )}
    </>
  );
}
