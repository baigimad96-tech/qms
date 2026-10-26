import React, { useState, useEffect, useMemo } from 'react';
import { Users, ShieldCheck, Eye, EyeOff, Pencil, AlertTriangle, Search, X } from 'lucide-react';
import { PageIntro } from './Dashboard.jsx';
import Modal, { ModalActions, Field } from '../components/Modal.jsx';
import { TableScroll, Th, Td, IconButton } from '../components/Table.jsx';
import { formatDateTime } from '../data/mockData.js';
import { api } from '../services/api.js';
import { suggestEmail } from '../utils/emailTypo.js';
import { sanitizeIndianPhone, formatIndianPhone } from '../utils/phone.js';
import { formatToTitleCase } from '../utils/text.js';

export function AdminModal({ admin, onClose, onSave, apiError, fieldErrors, isSaving }) {
  const [form, setForm] = useState({
    fullName: admin?.fullName ? formatToTitleCase(admin.fullName) : '',
    email: admin?.email || '',
    phoneNumber: sanitizeIndianPhone(admin?.phoneNumber || ''),
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailSuggestion, setEmailSuggestion] = useState(() => suggestEmail(admin?.email || ''));
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    if (admin) {
      const formatted = formatToTitleCase(admin.fullName || '');
      setForm({
        fullName: formatted,
        email: admin.email || '',
        phoneNumber: sanitizeIndianPhone(admin.phoneNumber || ''),
        password: '',
      });
      setNameError('');
      setPhoneError('');
      const typo = suggestEmail(admin.email || '');
      setEmailSuggestion(typo);
      setEmailError(typo ? `Invalid email domain. Did you mean ${typo}? Please correct your email domain.` : '');
    }
  }, [admin]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleNameChange = (e) => {
    const val = e.target.value;
    set('fullName', val);
    if (val && !/^[a-zA-Z\s]*$/.test(val)) {
      setNameError('Please enter a valid name using letters only.');
    } else {
      setNameError('');
    }
  };

  const handleNameBlur = () => {
    if (form.fullName) {
      set('fullName', formatToTitleCase(form.fullName));
    }
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    set('email', val);
    const suggestion = suggestEmail(val);
    setEmailSuggestion(suggestion);
    if (suggestion) {
      setEmailError(`Did you mean ${suggestion}? Please correct your email domain.`);
    } else {
      setEmailError('');
    }
  };

  const handleApplyEmailSuggestion = () => {
    if (emailSuggestion) {
      set('email', emailSuggestion);
      setEmailSuggestion(null);
      setEmailError('');
    }
  };

  const handlePhoneChange = (e) => {
    // Strip all non-numeric characters and handle pasted 12-digit numbers with country code
    let numericOnly = e.target.value.replace(/\D/g, '');
    if (numericOnly.length === 12 && numericOnly.startsWith('91')) {
      numericOnly = numericOnly.slice(2);
    } else if (numericOnly.length === 11 && numericOnly.startsWith('0')) {
      numericOnly = numericOnly.slice(1);
    }
    numericOnly = numericOnly.slice(0, 10);
    setPhoneError('');
    set('phoneNumber', numericOnly);
  };

  const handlePhoneKeyDown = (e) => {
    // Allow navigational and control keys
    if (
      ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    // Block any key that is not a number (0-9)
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      return;
    }
    // Block if already 10 digits and no text is selected
    if (form.phoneNumber.length >= 10 && e.target.selectionStart === e.target.selectionEnd) {
      e.preventDefault();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const formattedName = formatToTitleCase(form.fullName || '');
    if (!formattedName) {
      setNameError('Full name is required.');
      return;
    }
    if (!/^[a-zA-Z\s]+$/.test(formattedName)) {
      setNameError('Please enter a valid name using letters only.');
      return;
    }
    setNameError('');
    set('fullName', formattedName);

    const emailToValidate = (form.email || '').trim().toLowerCase();
    if (!emailToValidate) {
      setEmailError('Email address is required.');
      return;
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(emailToValidate)) {
      setEmailError('Please enter a valid email address (e.g. name@example.com).');
      return;
    }
    const suggestion = suggestEmail(emailToValidate);
    if (suggestion) {
      setEmailSuggestion(suggestion);
      setEmailError(`Invalid email domain. Did you mean ${suggestion}? Please correct the domain typo.`);
      return;
    }
    setEmailError('');

    const phone = (form.phoneNumber || '').trim();
    if (!phone) {
      setPhoneError('Phone number is required.');
      return;
    }
    if (!/^\d+$/.test(phone)) {
      setPhoneError('Phone number must contain only numbers.');
      return;
    }
    if (phone.length !== 10) {
      setPhoneError('Phone number must be a 10-digit mobile number.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setPhoneError('Phone number must be a valid Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }
    setPhoneError('');

    onSave({ ...form, fullName: formattedName, email: emailToValidate }, admin);
  };

  return (
    <Modal
      title={admin ? 'Edit Admin' : 'Add Admin'}
      description="One user type keeps this workspace simple: Admin."
      onClose={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {apiError && (
          <div className="rounded-xl border border-[#efb7ae] bg-[#fff3f0] px-4 py-3 text-sm text-[#a63f32]">
            {apiError}
          </div>
        )}
        <Field label="Full Name">
          <input
            data-testid="input-admin-name"
            className={`input ${nameError || fieldErrors?.fullName ? '!border-[#dc2626] !ring-[#dc2626]/20' : ''}`}
            value={form.fullName}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            placeholder="e.g. Mohd Uzair"
            required
            disabled={isSaving}
          />
          {(nameError || fieldErrors?.fullName) && (
            <p className="mt-1 text-sm text-[#a63f32]">
              {nameError || fieldErrors?.fullName}
            </p>
          )}
        </Field>
        <Field label="Email">
          <input
            data-testid="input-admin-email"
            className={`input ${emailSuggestion || emailError || fieldErrors?.email ? 'border-amber-400 focus:border-amber-500 dark:border-amber-500/70' : ''}`}
            type="email"
            value={form.email}
            onChange={handleEmailChange}
            placeholder="e.g. name@gmail.com"
            required
            disabled={isSaving}
          />
          {emailSuggestion && (
            <div
              data-testid="warning-email-typo"
              className="mt-1.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200 animate-in fade-in"
            >
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  Did you mean{' '}
                  <button
                    type="button"
                    onClick={handleApplyEmailSuggestion}
                    className="font-bold underline decoration-amber-600 hover:text-amber-950 dark:hover:text-white"
                  >
                    {emailSuggestion}
                  </button>
                  ?
                </span>
              </div>
              <button
                type="button"
                onClick={handleApplyEmailSuggestion}
                className="rounded-md bg-amber-200/90 px-2.5 py-0.5 text-[11px] font-bold text-amber-950 transition hover:bg-amber-300 dark:bg-amber-800 dark:text-amber-100 dark:hover:bg-amber-700"
              >
                Fix typo
              </button>
            </div>
          )}
          {(emailError || fieldErrors?.email) && (
            <p className="mt-1 text-sm text-[#a63f32]">{emailError || fieldErrors?.email}</p>
          )}
        </Field>
        {!admin && (
          <Field label="Password">
            <div className="relative">
              <input
                data-testid="input-admin-password"
                className={`input pr-10 ${fieldErrors?.password ? '!border-[#dc2626] !ring-[#dc2626]/20' : ''}`}
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="••••••••"
                required
                disabled={isSaving}
              />
              <button
                type="button"
                data-testid="button-toggle-admin-password"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a948e] transition hover:text-[#183f35] dark:hover:text-[#edf6f2]"
                disabled={isSaving}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors?.password && <p className="mt-1 text-sm text-[#a63f32]">{fieldErrors.password}</p>}
          </Field>
        )}
        <Field label="Phone Number">
          <div className="flex">
            <span className="inline-flex items-center rounded-l-xl border border-r-0 border-[#d8d0c0] bg-[#f0ebd9] px-3.5 text-xs font-bold text-[#183f35] select-none dark:border-[#22483d] dark:bg-[#152e25] dark:text-[#edf6f2] sm:text-sm">
              +91
            </span>
            <input
              data-testid="input-admin-phone"
              className={`input !rounded-l-none ${phoneError || fieldErrors?.phoneNumber ? '!border-[#dc2626] !ring-[#dc2626]/20' : ''}`}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              placeholder="9876543210"
              value={form.phoneNumber}
              onKeyDown={handlePhoneKeyDown}
              onChange={handlePhoneChange}
              required
              disabled={isSaving}
            />
          </div>
          {(phoneError || fieldErrors?.phoneNumber) && (
            <p className="mt-1 text-sm text-[#a63f32]">
              {phoneError || fieldErrors?.phoneNumber}
            </p>
          )}
        </Field>
        <ModalActions onClose={onClose} submitLabel={isSaving ? 'Saving...' : (admin ? 'Save Changes' : 'Add Admin')} />
      </form>
    </Modal>
  );
}

export function AdminView({ adminId, onClose, notify }) {
  const [admin, setAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const res = await api.get(`/api/v1/admins/${adminId}`);
        if (res.data?.success) {
          setAdmin(res.data.data);
        }
      } catch (err) {
        notify(err.response?.data?.message || 'Failed to load admin details', 'error');
        onClose();
      } finally {
        setIsLoading(false);
      }
    };
    fetchAdmin();
  }, [adminId, onClose, notify]);

  if (isLoading || !admin) {
    return (
      <Modal title="Loading..." description="Fetching admin profile..." onClose={onClose}>
        <div className="p-4 text-center text-[#7b867e]">Loading details...</div>
        <ModalActions onClose={onClose} submitLabel="Close" cancel={false} />
      </Modal>
    );
  }

  const displayName = formatToTitleCase(admin.fullName);

  const fields = [
    ['Email', admin.email],
    ['Phone Number', formatIndianPhone(admin.phoneNumber)],
    ['Created At', admin.createdAt ? formatDateTime(admin.createdAt) : 'N/A'],
    ['User type', 'Admin'],
  ];

  return (
    <Modal title={displayName} description="Admin Profile" onClose={onClose}>
      <div className="space-y-3">
        {fields.map(([label, value]) => (
          <div key={label} className="soft-inset rounded-xl p-4">
            <p className="text-xs text-[#78847c]">{label}</p>
            <p className="mt-1 font-bold text-[#315246]">{value}</p>
          </div>
        ))}
      </div>
      <ModalActions onClose={onClose} submitLabel="Close" cancel={false} />
    </Modal>
  );
}

export const sortAdminsDescending = (adminList = []) => {
  return [...adminList].sort((a, b) => {
    const rawTimeA = a.createdAt || a.created_at || a.createdDate;
    const rawTimeB = b.createdAt || b.created_at || b.createdDate;
    const timeA = rawTimeA ? new Date(rawTimeA).getTime() : 0;
    const timeB = rawTimeB ? new Date(rawTimeB).getTime() : 0;

    if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB && timeA > 0 && timeB > 0) {
      return timeB - timeA;
    }

    const idA = Number(a.userId || a.id) || 0;
    const idB = Number(b.userId || b.id) || 0;
    if (idA !== idB) {
      return idB - idA;
    }

    return 0;
  });
};

export default function AdminManagement({ data, patchData, notify }) {
  const [modal, setModal] = useState(null);
  const [admins, setAdmins] = useState(() => sortAdminsDescending(data?.admins || []));
  const [isLoading, setIsLoading] = useState(!data?.admins?.length);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [apiError, setApiError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const fetchAdmins = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/api/v1/admins');
      if (res.data?.success) {
        const sorted = sortAdminsDescending(res.data.data || []);
        setAdmins(sorted);
        patchData?.((prev) => ({ ...prev, admins: sorted }));
      }
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to fetch admins.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const save = async (form, existing) => {
    setApiError('');
    setFieldErrors({});

    const formattedName = formatToTitleCase(form.fullName || '');
    if (!formattedName || !/^[a-zA-Z\s]+$/.test(formattedName)) {
      setFieldErrors({ fullName: 'Please enter a valid name using letters only.' });
      return;
    }

    const trimmedEmail = (form.email || '').trim().toLowerCase();
    if (!trimmedEmail) {
      setFieldErrors({ email: 'Email address is required.' });
      return;
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      setFieldErrors({ email: 'Please enter a valid email address.' });
      return;
    }
    const emailTypo = suggestEmail(trimmedEmail);
    if (emailTypo) {
      setFieldErrors({ email: `Invalid email domain. Did you mean ${emailTypo}?` });
      return;
    }

    const cleanPhone = sanitizeIndianPhone(form.phoneNumber);
    if (!cleanPhone || cleanPhone.length !== 10) {
      setFieldErrors({ phoneNumber: 'Phone number must be a valid 10-digit mobile number.' });
      return;
    }
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setFieldErrors({ phoneNumber: 'Phone number must be a valid Indian mobile number starting with 6, 7, 8, or 9.' });
      return;
    }

    setIsSaving(true);

    const payload = {
      fullName: formattedName,
      email: trimmedEmail,
      phoneNumber: cleanPhone,
    };
    if (!existing) {
      payload.password = form.password;
    }

    try {
      let res;
      if (existing) {
        res = await api.put(`/api/v1/admins/${existing.userId}`, payload);
      } else {
        res = await api.post('/api/v1/admins', payload);
      }

      if (res.status === 200 || res.status === 201 || res.data?.success) {
        const returnedAdmin = res.data?.data;
        if (existing) {
          if (returnedAdmin) {
            setAdmins((prev) =>
              sortAdminsDescending(
                prev.map((a) => (a.userId === existing.userId ? returnedAdmin : a))
              )
            );
          } else {
            setAdmins((prev) =>
              sortAdminsDescending(
                prev.map((a) => (a.userId === existing.userId ? { ...a, ...payload } : a))
              )
            );
          }
          notify('Admin details updated.');
        } else {
          const newAdmin = returnedAdmin || {
            ...payload,
            userId: Date.now(),
            createdAt: new Date().toISOString(),
          };
          if (!newAdmin.createdAt) {
            newAdmin.createdAt = new Date().toISOString();
          }
          setAdmins((prev) => sortAdminsDescending([newAdmin, ...prev]));
          notify('Admin added to the workspace.');
        }
        setModal(null);

        // Refresh admin list in background
        try {
          await fetchAdmins();
        } catch (fetchErr) {
          console.warn('Background admin refresh failed:', fetchErr);
        }
      }
    } catch (err) {
      const status = err.response?.status;
      const errorData = err.response?.data;
      const message = errorData?.message;

      if (status === 400) {
        if (errorData?.data && typeof errorData.data === 'object' && Object.keys(errorData.data).length > 0) {
          setFieldErrors(errorData.data);
        } else {
          setApiError(message || 'Validation error.');
        }
      } else if (status === 409 || status === 404) {
        setApiError(message || (status === 409 ? 'Duplicate email address.' : 'Admin not found.'));
      } else {
        notify(message || 'Failed to save admin details.', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (admin) => {
    setApiError('');
    setFieldErrors({});
    setModal({ type: 'edit', item: admin });
  };

  const openAddModal = () => {
    setApiError('');
    setFieldErrors({});
    setModal({ type: 'edit', item: null });
  };

  const filteredAdmins = useMemo(() => {
    const list = sortAdminsDescending(admins);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;

    return list.filter((admin) => {
      const name = (admin.fullName || '').toLowerCase();
      const formattedName = formatToTitleCase(admin.fullName || '').toLowerCase();
      const email = (admin.email || '').toLowerCase();
      const phone = (admin.phoneNumber || '').toString().toLowerCase();
      const rawDigits = (admin.phoneNumber || '').replace(/\D/g, '');
      const formattedPhone = formatIndianPhone(admin.phoneNumber || '').toLowerCase();

      return (
        name.includes(q) ||
        formattedName.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        rawDigits.includes(q) ||
        formattedPhone.includes(q)
      );
    });
  }, [admins, searchQuery]);

  return (
    <div>
      <PageIntro
        eyebrow="Workspace access"
        title="Admin Management"
        description="Keep the small operations team directory current. All users in this workspace are Admins."
        action={openAddModal}
        actionLabel="Add Admin"
        icon={Users}
      />
      <section className="card-surface rounded-2xl p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="kicker">Workspace Admins</p>
            <h3 className="mt-1 font-display text-xl font-extrabold text-[#183f35]">
              {isLoading
                ? 'Loading...'
                : searchQuery
                ? `${filteredAdmins.length} of ${admins.length} ${admins.length === 1 ? 'administrator' : 'administrators'}`
                : `${filteredAdmins.length} ${filteredAdmins.length === 1 ? 'administrator' : 'administrators'}`}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex text-xs font-semibold text-[#5a6860] dark:text-[#8ba398]">
              {admins.length} total
            </span>
            <ShieldCheck size={21} className="text-[#246b59]" />
          </div>
        </div>

        {/* Search Toolbar */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-80 md:w-96">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a948e] dark:text-[#698d80]"
            />
            <input
              type="text"
              data-testid="input-search-admins"
              placeholder="Search admin name, email, phone..."
              aria-label="Search admin name, email, phone"
              className="h-10 w-full rounded-xl border border-[#ded8ca] bg-[#faf6ed] pl-10 pr-8 text-xs font-medium !text-[#183f35] placeholder:text-[#8a948e] transition focus:border-[#246b59] focus:bg-white focus:outline-none dark:border-[#21473a] dark:bg-[#122820] dark:text-[#edf6f2] dark:placeholder:text-[#698d80] dark:focus:border-[#4ade80]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                data-testid="button-clear-search-admins"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a948e] hover:text-[#183f35] dark:hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <TableScroll>
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <Th>Full Name</Th>
                <Th>Email</Th>
                <Th>Phone Number</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmins.map((admin) => {
                const displayName = formatToTitleCase(admin.fullName);
                const initials = displayName
                  ? displayName
                      .split(/\s+/)
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : 'A';

                return (
                  <tr key={admin.userId || admin.id} className="border-t border-[#eee8dc]">
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-[#e3a84b] text-xs font-extrabold text-[#183f35]">
                          {initials}
                        </div>
                        <span className="font-bold text-[#315246]">{displayName}</span>
                      </div>
                    </Td>
                    <Td>{admin.email}</Td>
                    <Td>
                      <span className="font-mono text-xs font-semibold text-[#426257] dark:text-[#88baa6]">
                        {formatIndianPhone(admin.phoneNumber)}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex gap-1">
                        <IconButton
                          label="View admin"
                          icon={Eye}
                          onClick={() => setModal({ type: 'view', item: admin })}
                        />
                        <IconButton
                          label="Edit admin"
                          icon={Pencil}
                          onClick={() => openEditModal(admin)}
                        />
                      </div>
                    </Td>
                  </tr>
                );
              })}
              {filteredAdmins.length === 0 && !isLoading && (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-[#7b867e]">
                    {searchQuery ? (
                      <div className="space-y-2">
                        <p>No administrators found matching "{searchQuery}".</p>
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="text-xs font-semibold text-[#246b59] underline hover:text-[#183f35]"
                        >
                          Clear search filter
                        </button>
                      </div>
                    ) : (
                      'No administrators found.'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableScroll>
      </section>
      {modal?.type === 'edit' && (
        <AdminModal
          admin={modal.item}
          onClose={() => setModal(null)}
          onSave={save}
          apiError={apiError}
          fieldErrors={fieldErrors}
          isSaving={isSaving}
        />
      )}
      {modal?.type === 'view' && (
        <AdminView adminId={modal.item.userId} onClose={() => setModal(null)} notify={notify} />
      )}
    </div>
  );
}
