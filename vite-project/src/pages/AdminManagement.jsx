import React, { useState, useEffect } from 'react';
import { Users, ShieldCheck, Eye, Pencil, AlertTriangle } from 'lucide-react';
import { PageIntro } from './Dashboard.jsx';
import Modal, { ModalActions, Field } from '../components/Modal.jsx';
import { TableScroll, Th, Td, IconButton } from '../components/Table.jsx';
import { formatDateTime } from '../data/mockData.js';
import { api } from '../services/api.js';
import { suggestEmail } from '../utils/emailTypo.js';

export function AdminModal({ admin, onClose, onSave, apiError, fieldErrors, isSaving }) {
  const [form, setForm] = useState({
    fullName: admin?.fullName || '',
    email: admin?.email || '',
    phoneNumber: admin?.phoneNumber || '',
    password: '',
  });
  const [phoneError, setPhoneError] = useState('');
  const [emailSuggestion, setEmailSuggestion] = useState(() => suggestEmail(admin?.email || ''));
  const [emailError, setEmailError] = useState('');
  const [dismissedSuggestion, setDismissedSuggestion] = useState('');

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleEmailChange = (e) => {
    const val = e.target.value;
    set('email', val);
    setEmailError('');
    const suggestion = suggestEmail(val);
    setEmailSuggestion(suggestion);
    if (suggestion !== dismissedSuggestion) {
      setDismissedSuggestion('');
    }
  };

  const handleApplyEmailSuggestion = () => {
    if (emailSuggestion) {
      set('email', emailSuggestion);
      setEmailSuggestion(null);
      setEmailError('');
      setDismissedSuggestion('');
    }
  };

  const handleDismissEmailSuggestion = () => {
    setDismissedSuggestion(emailSuggestion);
    setEmailError('');
  };

  const handlePhoneChange = (e) => {
    // Only accept numeric digits (0-9) - strip any alphabets or non-numeric characters
    const numericOnly = e.target.value.replace(/\D/g, '');
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
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.phoneNumber || !/^\d+$/.test(form.phoneNumber)) {
      setPhoneError('Phone number must contain only numbers.');
      return;
    }
    if (form.phoneNumber.length < 10) {
      setPhoneError('Phone number must be at least 10 digits.');
      return;
    }
    setPhoneError('');

    // Check for email domain typos before allowing submission
    const suggestion = suggestEmail(form.email);
    if (suggestion && dismissedSuggestion !== suggestion) {
      setEmailSuggestion(suggestion);
      setEmailError(`Did you mean ${suggestion}? Please correct your email domain.`);
      return;
    }
    setEmailError('');

    onSave(form, admin);
  };

  return (
    <Modal
      title={admin ? 'Edit admin' : 'Add admin'}
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
            className="input"
            value={form.fullName}
            onChange={(e) => set('fullName', e.target.value)}
            required
            disabled={isSaving}
          />
          {fieldErrors?.fullName && <p className="mt-1 text-sm text-[#a63f32]">{fieldErrors.fullName}</p>}
        </Field>
        <Field label="Email">
          <input
            data-testid="input-admin-email"
            className={`input ${emailSuggestion && dismissedSuggestion !== emailSuggestion ? 'border-amber-400 focus:border-amber-500 dark:border-amber-500/70' : ''}`}
            type="email"
            value={form.email}
            onChange={handleEmailChange}
            required
            disabled={isSaving}
          />
          {emailSuggestion && dismissedSuggestion !== emailSuggestion && (
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
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleApplyEmailSuggestion}
                  className="rounded-md bg-amber-200/90 px-2 py-0.5 text-[11px] font-bold text-amber-950 transition hover:bg-amber-300 dark:bg-amber-800 dark:text-amber-100 dark:hover:bg-amber-700"
                >
                  Fix typo
                </button>
                <button
                  type="button"
                  onClick={handleDismissEmailSuggestion}
                  className="text-[11px] font-medium text-amber-800/80 hover:text-amber-950 dark:text-amber-300/80 dark:hover:text-white"
                  title="Keep entered email"
                >
                  Keep as is
                </button>
              </div>
            </div>
          )}
          {(emailError || fieldErrors?.email) && (
            <p className="mt-1 text-sm text-[#a63f32]">{emailError || fieldErrors?.email}</p>
          )}
        </Field>
        {!admin && (
          <Field label="Password">
            <input
              data-testid="input-admin-password"
              className="input"
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              required
              disabled={isSaving}
            />
            {fieldErrors?.password && <p className="mt-1 text-sm text-[#a63f32]">{fieldErrors.password}</p>}
          </Field>
        )}
        <Field label="Phone Number">
          <input
            data-testid="input-admin-phone"
            className="input"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={15}
            placeholder="e.g. 9876543210"
            value={form.phoneNumber}
            onKeyDown={handlePhoneKeyDown}
            onChange={handlePhoneChange}
            required
            disabled={isSaving}
          />
          {(phoneError || fieldErrors?.phoneNumber) && (
            <p className="mt-1 text-sm text-[#a63f32]">
              {phoneError || fieldErrors?.phoneNumber}
            </p>
          )}
        </Field>
        <ModalActions onClose={onClose} submitLabel={isSaving ? 'Saving...' : (admin ? 'Save changes' : 'Add admin')} />
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

  const fields = [
    ['Email', admin.email],
    ['Phone Number', admin.phoneNumber],
    ['Created At', admin.createdAt ? formatDateTime(admin.createdAt) : 'N/A'],
    ['User type', 'Admin'],
  ];

  return (
    <Modal title={admin.fullName} description="Admin profile" onClose={onClose}>
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

export default function AdminManagement({ notify }) {
  const [modal, setModal] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [apiError, setApiError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const fetchAdmins = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/api/v1/admins');
      if (res.data?.success) {
        setAdmins(res.data.data || []);
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
    setIsSaving(true);

    const payload = {
      fullName: form.fullName,
      email: form.email,
      phoneNumber: form.phoneNumber,
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
              prev.map((a) => (a.userId === existing.userId ? returnedAdmin : a))
            );
          } else {
            setAdmins((prev) =>
              prev.map((a) => (a.userId === existing.userId ? { ...a, ...payload } : a))
            );
          }
          notify('Admin details updated.');
        } else {
          if (returnedAdmin) {
            setAdmins((prev) => [...prev, returnedAdmin]);
          }
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

  return (
    <div>
      <PageIntro
        eyebrow="Workspace access"
        title="Admin management"
        description="Keep the small operations team directory current. All users in this workspace are Admins."
        action={openAddModal}
        actionLabel="Add admin"
        icon={Users}
      />
      <section className="card-surface rounded-2xl p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="kicker">Workspace admins</p>
            <h3 className="mt-1 font-display text-xl font-extrabold text-[#183f35]">
              {isLoading ? 'Loading...' : `${admins.length} administrators`}
            </h3>
          </div>
          <ShieldCheck size={21} className="text-[#246b59]" />
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
              {admins.map((admin) => (
                <tr key={admin.userId} className="border-t border-[#eee8dc]">
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-[#e3a84b] text-xs font-extrabold text-[#183f35]">
                        {admin.fullName
                          ? admin.fullName
                              .trim()
                              .split(/\s+/)
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()
                          : 'A'}
                      </div>
                      <span className="font-bold text-[#315246]">{admin.fullName}</span>
                    </div>
                  </Td>
                  <Td>{admin.email}</Td>
                  <Td>{admin.phoneNumber}</Td>
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
              ))}
              {admins.length === 0 && !isLoading && (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-[#7b867e]">
                    No administrators found.
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
