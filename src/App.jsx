import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AlertTriangle, CircleCheck, Info, X } from 'lucide-react';

import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';

import Login from './pages/Login.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AnimalInventory from './pages/AnimalInventory.jsx';
import QurbaniDays from './pages/QurbaniDays.jsx';
import HissaBooking from './pages/HissaBooking.jsx';
import Bookings from './pages/Bookings.jsx';
import AdminManagement from './pages/AdminManagement.jsx';
import AuditLogs from './pages/AuditLogs.jsx';
import ExpenseTracker from './pages/ExpenseTracker.jsx';

import { loadInitialData, persistData } from './data/mockData.js';
import { getAccessToken, clearAuth } from './utils/auth.js';
import { logoutUser } from './services/authApi.js';

function Toast({ message, type, onClose }) {
  return (
    <div className="toast-in fixed bottom-5 right-5 z-[70] flex max-w-sm items-start gap-3 rounded-xl border border-[#31584d] bg-[#183f35] px-4 py-3 text-sm text-[#f8f3e7] shadow-xl">
      <div className={`mt-0.5 ${type === 'error' ? 'text-[#f3a69b]' : type === 'info' ? 'text-[#e6b65b]' : 'text-[#a9dfb6]'}`}>
        {type === 'error' ? (
          <AlertTriangle size={17} />
        ) : type === 'info' ? (
          <Info size={17} />
        ) : (
          <CircleCheck size={17} />
        )}
      </div>
      <span className="leading-5">{message}</span>
      <button aria-label="Close notification" onClick={onClose} className="ml-2 text-[#b9cec3] hover:text-white">
        <X size={15} />
      </button>
    </div>
  );
}

function PageNotFound({ navigate }) {
  return (
    <div className="py-20 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f4e6c7] text-[#9b6b1e]">
        <AlertTriangle size={25} />
      </div>
      <h2 className="mt-5 font-display text-2xl font-extrabold text-[#183f35]">Page not found</h2>
      <button onClick={() => navigate('/dashboard')} className="btn-primary mt-5">
        Return to dashboard
      </button>
    </div>
  );
}

function AppContent() {
  const navigateBase = useNavigate();
  const locationObj = useLocation();
  const location = locationObj.pathname;
  const [data, setData] = useState(loadInitialData);
  const [loggedIn, setLoggedIn] = useState(() => !!getAccessToken());
  const [toast, setToast] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    persistData(data);
  }, [data]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4200);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const navigate = (path) => {
    navigateBase(path);
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const notify = (message, type = 'success') => setToast({ message, type });

  const patchData = (updater) =>
    setData((current) => (typeof updater === 'function' ? updater(current) : updater));

  const logout = async () => {
    try {
      const msg = await logoutUser();
      notify(msg || 'You have been signed out.', 'info');
    } catch (err) {
      notify('You have been signed out.', 'info');
    } finally {
      setLoggedIn(false);
      navigate('/login');
    }
  };

  const isAuthRoute = location === '/login' || location === '/forgot-password' || location === '/reset-password';

  if (!loggedIn || isAuthRoute) {
    if (loggedIn && isAuthRoute) {
      return <Navigate to="/dashboard" replace />;
    }
    if (!loggedIn && !isAuthRoute) {
      return <Navigate to="/login" replace />;
    }
    if (location === '/forgot-password') {
      return <ForgotPassword navigate={navigate} notify={notify} />;
    }
    if (location === '/reset-password') {
      return <ResetPassword navigate={navigate} notify={notify} />;
    }
    return (
      <Login
        navigate={navigate}
        onSuccess={() => {
          setLoggedIn(true);
          navigate('/dashboard');
        }}
      />
    );
  }

  const page = location === '/' ? '/dashboard' : location;

  const getPageTitle = (path) => {
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/inventory' || path === '/animals') return 'Animal Inventory';
    if (path === '/qurbani-days') return 'Qurbani Days';
    if (path === '/new-booking' || path === '/hissa-booking') return 'Hissa Booking';
    if (path === '/bookings' || path.startsWith('/bookings/')) return 'Bookings';
    if (path === '/admins') return 'Admin Management';
    if (path === '/audit-logs') return 'Audit Logs';
    if (path === '/expenses') return 'Expense Tracker';
    return 'Workspace';
  };

  return (
    <div className="app-shell min-h-[100dvh]">
      <div className="flex min-h-[100dvh]">
        <Sidebar
          path={page}
          mobileNav={mobileNav}
          setMobileNav={setMobileNav}
          navigate={navigate}
          logout={logout}
        />
        <main className="min-w-0 flex-1">
          <Header currentLabel={getPageTitle(page)} setMobileNav={setMobileNav} logout={logout} />
          <div className="page-enter mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-10">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard data={data} navigate={navigate} notify={notify} />} />
              <Route path="/inventory" element={<AnimalInventory data={data} patchData={patchData} notify={notify} />} />
              <Route path="/animals" element={<Navigate to="/inventory" replace />} />
              <Route path="/qurbani-days" element={<QurbaniDays data={data} patchData={patchData} notify={notify} />} />
              <Route path="/new-booking" element={<HissaBooking data={data} patchData={patchData} notify={notify} navigate={navigate} />} />
              <Route path="/hissa-booking" element={<Navigate to="/new-booking" replace />} />
              <Route path="/bookings" element={<Bookings data={data} patchData={patchData} notify={notify} navigate={navigate} />} />
              <Route path="/bookings/:id" element={<Bookings data={data} patchData={patchData} notify={notify} navigate={navigate} selectedId={location.split('/')[2]} />} />
              <Route path="/admins" element={<AdminManagement data={data} patchData={patchData} notify={notify} />} />
              <Route path="/audit-logs" element={<AuditLogs data={data} />} />
              <Route path="/expenses" element={<ExpenseTracker data={data} patchData={patchData} notify={notify} />} />
              <Route path="*" element={<PageNotFound navigate={navigate} />} />
            </Routes>
          </div>
        </main>
      </div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
