import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  User,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { PageIntro } from './Dashboard.jsx';
import Modal, { ModalActions, Field } from '../components/Modal.jsx';
import { TableScroll, Th, Td, IconButton } from '../components/Table.jsx';
import { formatDateTime } from '../data/mockData.js';
import { sanitizeIndianPhone, formatIndianPhone } from '../utils/phone.js';
import {
  getCollectionCentres,
  createCollectionCentre,
  updateCollectionCentre,
  deleteCollectionCentre,
} from '../services/collectionCentreApi.js';

const validateCentreForm = (form) => {
  const errors = {};

  // 1. Centre Name
  const name = (form.name || '').trim();
  if (!name) {
    errors.name = 'Collection centre name is required.';
  } else if (name.length < 3) {
    errors.name = 'Centre name must be at least 3 characters.';
  } else if (name.length > 80) {
    errors.name = 'Centre name cannot exceed 80 characters.';
  } else if (!/^[a-zA-Z0-9]/.test(name)) {
    errors.name = 'Centre name must start with a letter or number.';
  } else if (!/[a-zA-Z]/.test(name)) {
    errors.name = 'Centre name must contain at least one letter.';
  } else if (!/^[a-zA-Z0-9][a-zA-Z0-9\s.,'()&-]*$/.test(name)) {
    errors.name = 'Centre name contains invalid characters.';
  }

  // 2. Location / Physical Address
  const location = (form.location || '').trim();
  if (!location) {
    errors.location = 'Location / physical address is required.';
  } else if (location.length < 4) {
    errors.location = 'Location must be at least 4 characters.';
  } else if (location.length > 150) {
    errors.location = 'Location cannot exceed 150 characters.';
  } else if (!/^[a-zA-Z0-9]/.test(location)) {
    errors.location = 'Location must start with a letter or number.';
  } else if (!/[a-zA-Z]/.test(location)) {
    errors.location = 'Location must contain letters (e.g. street or area name).';
  } else if (!/^[a-zA-Z0-9][a-zA-Z0-9\s,./#()&' -]*$/.test(location)) {
    errors.location = 'Location contains invalid characters.';
  }

  // 3. Contact Person
  const contactPerson = (form.contactPerson || '').trim();
  if (!contactPerson) {
    errors.contactPerson = 'Contact person name is required.';
  } else if (contactPerson.length < 2) {
    errors.contactPerson = 'Contact person name must be at least 2 characters.';
  } else if (contactPerson.length > 60) {
    errors.contactPerson = 'Contact person name cannot exceed 60 characters.';
  } else if (!/^[a-zA-Z]/.test(contactPerson)) {
    errors.contactPerson = 'Contact person name must start with a letter.';
  } else if (!/^[a-zA-Z][a-zA-Z\s.'-]*$/.test(contactPerson)) {
    errors.contactPerson = 'Contact person name must only contain letters, spaces, and dots/hyphens.';
  }

  // 4. Contact Number
  const rawPhone = (form.contactNumber || '').trim();
  const cleanPhone = sanitizeIndianPhone(rawPhone);
  if (!rawPhone) {
    errors.contactNumber = 'Contact phone number is required.';
  } else if (cleanPhone.length !== 10) {
    errors.contactNumber = 'Contact number must be a 10-digit mobile number.';
  } else if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    errors.contactNumber = 'Mobile number must start with 6, 7, 8, or 9.';
  }

  return errors;
};

const getCentreLocation = (c) => {
  if (!c || typeof c !== 'object') return '';
  return (
    c.location ||
    c.address ||
    c.centreAddress ||
    c.centerAddress ||
    c.locationAddress ||
    c.centreLocation ||
    c.centerLocation ||
    c.city ||
    c.area ||
    ''
  ).trim();
};

const getCentreContactPerson = (c) => {
  if (!c || typeof c !== 'object') return '';
  return (
    c.contactPerson ||
    c.contactPersonName ||
    c.contactName ||
    c.personName ||
    c.incharge ||
    c.inCharge ||
    c.manager ||
    c.contact_person ||
    ''
  ).trim();
};

const getCentreContactNumber = (c) => {
  if (!c || typeof c !== 'object') return '';
  return (
    c.contactNumber ||
    c.contactPhone ||
    c.phoneNumber ||
    c.phone ||
    c.contact_number ||
    ''
  ).trim();
};

const normalizeCentre = (c) => {
  if (!c || typeof c !== 'object') return c;
  const id = c.collectionCentreId ?? c.id ?? c.centreId ?? c.centerId;
  const loc = getCentreLocation(c);
  const cp = getCentreContactPerson(c);
  const cn = getCentreContactNumber(c);
  return {
    ...c,
    collectionCentreId: id,
    id,
    name: c.name || c.centreName || c.centerName || '',
    location: loc,
    address: loc,
    centreAddress: loc,
    contactPerson: cp,
    contactPersonName: cp,
    contactName: cp,
    contactNumber: cn,
    phoneNumber: cn,
    isActive: c.isActive !== false && c.is_active !== false && c.active !== false,
  };
};

export function CollectionCentreModal({ centre, onClose, onSave, isSaving, apiError }) {
  const isEdit = Boolean(centre);
  const [form, setForm] = useState({
    name: centre?.name || centre?.centreName || '',
    location: getCentreLocation(centre),
    contactPerson: getCentreContactPerson(centre),
    contactNumber: sanitizeIndianPhone(getCentreContactNumber(centre)),
    isActive: centre ? (centre.isActive !== false && centre.is_active !== false) : true,
  });
  const [errors, setErrors] = useState({});

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handlePhoneChange = (e) => {
    let numericOnly = e.target.value.replace(/\D/g, '');
    if (numericOnly.length === 12 && numericOnly.startsWith('91')) {
      numericOnly = numericOnly.slice(2);
    } else if (numericOnly.length === 11 && numericOnly.startsWith('0')) {
      numericOnly = numericOnly.slice(1);
    }
    numericOnly = numericOnly.slice(0, 10);
    set('contactNumber', numericOnly);
  };

  const handlePhoneKeyDown = (e) => {
    if (
      ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      return;
    }
    if (form.contactNumber.length >= 10 && e.target.selectionStart === e.target.selectionEnd) {
      e.preventDefault();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateCentreForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    const trimmedName = form.name.trim();
    const loc = form.location.trim();
    const cp = form.contactPerson.trim();
    const cleanPhone = sanitizeIndianPhone(form.contactNumber.trim());

    onSave({
      name: trimmedName,
      // Provide both primary and backend alias keys so whatever DTO the server uses is satisfied
      location: loc,
      address: loc,
      centreAddress: loc,
      locationAddress: loc,
      contactPerson: cp,
      contactPersonName: cp,
      contactName: cp,
      contactNumber: cleanPhone,
      phoneNumber: cleanPhone,
      isActive: Boolean(form.isActive),
    });
  };

  return (
    <Modal
      title={isEdit ? 'Edit Collection Centre' : 'Add Collection Centre'}
      description={
        isEdit
          ? 'Update collection centre details, contact info and operational status.'
          : 'Configure a new physical meat collection and distribution centre.'
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {apiError && (
          <div className="rounded-xl border border-[#efb7ae] bg-[#fff3f0] p-3.5 text-xs font-semibold text-[#a63f32] dark:border-[#5d2520] dark:bg-[#331614] dark:text-[#fca5a5] flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        <Field label="Centre Name *">
          <input
            type="text"
            data-testid="input-centre-name"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Enter centre name (e.g. North Zone Distribution Center)"
            className={`input ${errors.name ? '!border-[#dc2626] !ring-[#dc2626]/20' : ''}`}
            required
            autoFocus
          />
          {errors.name && (
            <p data-testid="error-centre-name" className="mt-1 text-xs text-[#dc2626] flex items-center gap-1 font-medium">
              <AlertTriangle size={12} className="shrink-0" />
              <span>{errors.name}</span>
            </p>
          )}
        </Field>

        <Field label="Location / Physical Address *">
          <input
            type="text"
            data-testid="input-centre-location"
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            placeholder="Enter address or landmark (e.g. Near Jama Masjid, Main Road)"
            className={`input ${errors.location ? '!border-[#dc2626] !ring-[#dc2626]/20' : ''}`}
            required
          />
          {errors.location && (
            <p data-testid="error-centre-location" className="mt-1 text-xs text-[#dc2626] flex items-center gap-1 font-medium">
              <AlertTriangle size={12} className="shrink-0" />
              <span>{errors.location}</span>
            </p>
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact Person *">
            <input
              type="text"
              data-testid="input-centre-contact-person"
              value={form.contactPerson}
              onChange={(e) => set('contactPerson', e.target.value)}
              placeholder="Enter contact person name"
              className={`input ${errors.contactPerson ? '!border-[#dc2626] !ring-[#dc2626]/20' : ''}`}
              required
            />
            {errors.contactPerson && (
              <p data-testid="error-centre-contact-person" className="mt-1 text-xs text-[#dc2626] flex items-center gap-1 font-medium">
                <AlertTriangle size={12} className="shrink-0" />
                <span>{errors.contactPerson}</span>
              </p>
            )}
          </Field>

          <Field label="Contact Number *">
            <div className="flex">
              <span className="inline-flex items-center rounded-l-xl border border-r-0 border-[#d8d0c0] bg-[#f0ebd9] px-3.5 text-xs font-bold text-[#183f35] select-none dark:border-[#22483d] dark:bg-[#152e25] dark:text-[#edf6f2] sm:text-sm">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                data-testid="input-centre-contact-number"
                value={form.contactNumber}
                onKeyDown={handlePhoneKeyDown}
                onChange={handlePhoneChange}
                placeholder="Enter contact number"
                className={`input !rounded-l-none ${errors.contactNumber ? '!border-[#dc2626] !ring-[#dc2626]/20' : ''}`}
                required
              />
            </div>
            {errors.contactNumber && (
              <p data-testid="error-centre-contact-number" className="mt-1 text-xs text-[#dc2626] flex items-center gap-1 font-medium">
                <AlertTriangle size={12} className="shrink-0" />
                <span>{errors.contactNumber}</span>
              </p>
            )}
          </Field>
        </div>

        <Field label="Operational Status">
          <label className="flex items-center gap-3 cursor-pointer select-none rounded-xl border border-[#ded8ca] bg-[#faf6ed] p-3 text-sm transition hover:bg-white dark:border-[#21473a] dark:bg-[#122820] dark:hover:bg-[#163328]">
            <input
              type="checkbox"
              data-testid="checkbox-centre-active"
              checked={form.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
              className="h-4 w-4 rounded border-[#246b59] text-[#246b59] focus:ring-[#246b59]"
            />
            <div>
              <span className="font-semibold text-[#183f35] dark:text-[#edf6f2]">
                Active Distribution Centre
              </span>
              <p className="text-xs text-[#78847c] dark:text-[#92b1a3]">
                When active, this centre appears in the Hissa Booking centre selection dropdown.
              </p>
            </div>
          </label>
        </Field>

        <ModalActions
          onClose={onClose}
          submitLabel={isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Centre'}
          disabled={isSaving}
        />
      </form>
    </Modal>
  );
}

export function DeleteCentreModal({ centre, onClose, onConfirm, isDeleting }) {
  if (!centre) return null;

  return (
    <Modal
      title="Delete Collection Centre"
      description="This action requires caution."
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-[#efb7ae] bg-[#fff3f0] p-4 text-sm text-[#a63f32] dark:border-[#5d2520] dark:bg-[#331614] dark:text-[#fca5a5] flex items-start gap-3">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <p className="font-bold">Are you sure you want to delete this centre?</p>
            <p className="mt-1 text-[#a63f32]/90 dark:text-[#fca5a5]/90">
              You are about to delete <strong>{centre.name}</strong>. If this centre has existing bookings associated with it, the deletion will be rejected by the system.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            data-testid="button-cancel-delete-centre"
            onClick={onClose}
            disabled={isDeleting}
            className="btn-secondary justify-center text-xs sm:text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="button-confirm-delete-centre"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-transparent bg-[#dc2626] px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition hover:bg-[#b91c1c] disabled:opacity-50 dark:bg-[#ef4444] dark:hover:bg-[#dc2626]"
          >
            {isDeleting ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 size={14} />
                <span>Delete Centre</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function CollectionCentres({ data, patchData, notify }) {
  const [centres, setCentres] = useState(data.collectionCentres || []);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Active' | 'Inactive'
  const [modal, setModal] = useState(null); // { type: 'create' | 'edit' | 'delete', item: centre }
  const [apiError, setApiError] = useState(null);

  const loadCentres = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const serverCentres = await getCollectionCentres();
      if (Array.isArray(serverCentres) && serverCentres.length > 0) {
        // Enriched with local cached values if server dropped location/contactPerson
        const localCentres = Array.isArray(data?.collectionCentres) ? data.collectionCentres : [];
        const merged = serverCentres.map((sc) => {
          const norm = normalizeCentre(sc);
          const localMatch = localCentres.find(
            (lc) => String(lc.collectionCentreId || lc.id) === String(norm.collectionCentreId || norm.id)
          );
          return normalizeCentre({
            ...norm,
            location: norm.location || getCentreLocation(localMatch),
            address: norm.location || getCentreLocation(localMatch),
            contactPerson: norm.contactPerson || getCentreContactPerson(localMatch),
            contactPersonName: norm.contactPerson || getCentreContactPerson(localMatch),
            contactNumber: norm.contactNumber || getCentreContactNumber(localMatch),
          });
        });

        setCentres(merged);
        patchData?.((prev) => ({
          ...prev,
          collectionCentres: merged,
        }));
      } else if (data.collectionCentres?.length > 0) {
        setCentres(data.collectionCentres.map(normalizeCentre));
      }
    } catch (err) {
      console.warn('Collection centres load note (using fallback):', err);
      if (data.collectionCentres?.length > 0) {
        setCentres(data.collectionCentres.map(normalizeCentre));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCentres();
  }, []);

  const handleSave = async (payload) => {
    setIsSaving(true);
    setApiError(null);
    try {
      const loc = getCentreLocation(payload);
      const cp = getCentreContactPerson(payload);
      const cn = getCentreContactNumber(payload);

      if (modal?.type === 'edit') {
        const id = modal.item.collectionCentreId || modal.item.id;
        let updated = null;
        try {
          updated = await updateCollectionCentre(id, payload);
        } catch (apiErr) {
          console.warn('Backend update note:', apiErr);
          throw apiErr;
        }

        const resolved = normalizeCentre({
          ...modal.item,
          ...payload,
          ...(updated && typeof updated === 'object' ? updated : {}),
          location: loc || getCentreLocation(updated) || getCentreLocation(modal.item),
          address: loc || getCentreLocation(updated) || getCentreLocation(modal.item),
          contactPerson: cp || getCentreContactPerson(updated) || getCentreContactPerson(modal.item),
          contactPersonName: cp || getCentreContactPerson(updated) || getCentreContactPerson(modal.item),
          contactNumber: cn || getCentreContactNumber(updated) || getCentreContactNumber(modal.item),
          updatedAt: new Date().toISOString(),
        });

        setCentres((prev) =>
          prev.map((c) => (String(c.collectionCentreId || c.id) === String(id) ? resolved : c))
        );
        patchData?.((prev) => ({
          ...prev,
          collectionCentres: (prev?.collectionCentres || []).map((c) =>
            String(c.collectionCentreId || c.id) === String(id) ? resolved : c
          ),
        }));
        notify?.(`Collection centre "${payload.name}" updated successfully!`, 'success');
      } else {
        let created = null;
        try {
          created = await createCollectionCentre(payload);
        } catch (apiErr) {
          console.warn('Backend create note:', apiErr);
          throw apiErr;
        }

        const newId = created?.collectionCentreId || created?.id || Date.now();
        const resolved = normalizeCentre({
          ...payload,
          ...(created && typeof created === 'object' ? created : {}),
          collectionCentreId: newId,
          id: newId,
          location: loc || getCentreLocation(created),
          address: loc || getCentreLocation(created),
          contactPerson: cp || getCentreContactPerson(created),
          contactPersonName: cp || getCentreContactPerson(created),
          contactNumber: cn || getCentreContactNumber(created),
          createdAt: created?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        setCentres((prev) => [resolved, ...prev]);
        patchData?.((prev) => ({
          ...prev,
          collectionCentres: [resolved, ...(prev?.collectionCentres || [])],
        }));
        notify?.(`Collection centre "${payload.name}" created successfully!`, 'success');
      }
      setModal(null);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.response?.status === 409
          ? 'A collection centre with this name already exists.'
          : err.message || 'Failed to save collection centre.');
      setApiError(msg);
      notify?.(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!modal?.item) return;
    const id = modal.item.collectionCentreId || modal.item.id;
    setIsDeleting(true);
    try {
      await deleteCollectionCentre(id);
      setCentres((prev) =>
        prev.filter((c) => String(c.collectionCentreId || c.id) !== String(id))
      );
      patchData?.((prev) => ({
        ...prev,
        collectionCentres: (prev?.collectionCentres || []).filter(
          (c) => String(c.collectionCentreId || c.id) !== String(id)
        ),
      }));
      notify?.(`Collection centre "${modal.item.name}" deleted successfully.`, 'success');
      setModal(null);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.response?.status === 400
          ? 'Cannot delete collection centre because it is linked to existing bookings.'
          : err.message || 'Failed to delete collection centre.');
      notify?.(msg, 'error');
      setModal(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Metrics
  const activeCount = useMemo(
    () => centres.filter((c) => c.isActive !== false).length,
    [centres]
  );
  const inactiveCount = centres.length - activeCount;

  // Filtered centres
  const filteredCentres = useMemo(() => {
    return centres.filter((c) => {
      const q = searchQuery.trim().toLowerCase();
      const loc = getCentreLocation(c).toLowerCase();
      const person = getCentreContactPerson(c).toLowerCase();
      const num = getCentreContactNumber(c).toLowerCase();
      const name = (c.name || '').toLowerCase();

      const matchesSearch =
        !q ||
        name.includes(q) ||
        loc.includes(q) ||
        person.includes(q) ||
        num.includes(q);

      const isActive = c.isActive !== false;
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && isActive) ||
        (statusFilter === 'Inactive' && !isActive);

      return matchesSearch && matchesStatus;
    });
  }, [centres, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Distribution & Logistics"
        title="Collection centres"
        description="Configure and manage physical Qurbani meat collection and distribution centres across your operational zones."
        action={() => {
          setApiError(null);
          setModal({ type: 'create', item: null });
        }}
        actionLabel="Add collection centre"
        icon={Building2}
      />

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-surface rounded-2xl p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="kicker">Total Centres</p>
            <h3 className="mt-1 font-display text-2xl font-extrabold text-[#183f35] dark:text-[#edf6f2]">
              {centres.length}
            </h3>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e1efe8] text-[#246b59] dark:bg-[#163328] dark:text-[#52c99a]">
            <Building2 size={20} />
          </div>
        </div>

        <div className="card-surface rounded-2xl p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="kicker">Active Distribution Points</p>
            <h3 className="mt-1 font-display text-2xl font-extrabold text-[#246b59] dark:text-[#52c99a]">
              {activeCount}
            </h3>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf8ef] text-[#246b59] dark:bg-[#132c22] dark:text-[#52c99a]">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="card-surface rounded-2xl p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="kicker">Standby / Inactive</p>
            <h3 className="mt-1 font-display text-2xl font-extrabold text-[#78847c] dark:text-[#92b1a3]">
              {inactiveCount}
            </h3>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#f0ebd9] text-[#765820] dark:bg-[#2b2312] dark:text-[#f3c46a]">
            <Layers size={20} />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <section className="card-surface rounded-2xl p-5 sm:p-6 min-w-0">
        {/* Search & Filter Toolbar */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#eee8dc] pb-4 dark:border-[#1e493b]">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a948e] dark:text-[#698d80]"
              />
              <input
                type="text"
                data-testid="input-search-centres"
                placeholder="Search centres by name, location, contact person, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-[#ded8ca] bg-[#faf6ed] pl-10 pr-8 text-xs font-medium !text-[#183f35] placeholder:text-[#8a948e] transition focus:border-[#246b59] focus:bg-white focus:outline-none dark:border-[#21473a] dark:bg-[#122820] dark:text-[#edf6f2] dark:placeholder:text-[#698d80] dark:focus:border-[#4ade80]"
              />
              {searchQuery && (
                <button
                  type="button"
                  data-testid="button-clear-search-centres"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a948e] hover:text-[#183f35] dark:hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 rounded-xl border border-[#ded8ca] bg-[#faf6ed] p-1 dark:border-[#21473a] dark:bg-[#122820]">
              {['All', 'Active', 'Inactive'].map((status) => (
                <button
                  key={status}
                  type="button"
                  data-testid={`filter-status-${status.toLowerCase()}`}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    statusFilter === status
                      ? 'bg-white text-[#183f35] shadow-sm dark:bg-[#1e493b] dark:text-[#edf6f2]'
                      : 'text-[#7b867e] hover:text-[#183f35] dark:text-[#92b1a3] dark:hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            data-testid="button-refresh-centres"
            onClick={loadCentres}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-[#ded8ca] bg-[#faf6ed] px-3 py-2 text-xs font-semibold text-[#183f35] transition hover:bg-white dark:border-[#21473a] dark:bg-[#122820] dark:text-[#edf6f2] dark:hover:bg-[#1e493b]"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Table of Collection Centres */}
        <TableScroll>
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <Th>Centre Name</Th>
                <Th>Location</Th>
                <Th>Contact Person</Th>
                <Th>Contact Number</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-[#78847c] dark:text-[#92b1a3]">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin text-[#246b59] dark:text-[#4ade80]" />
                      <span>Loading collection centres...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCentres.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-[#78847c] dark:text-[#92b1a3]">
                    <div className="space-y-2">
                      <p className="font-semibold text-[#315246] dark:text-[#e0eee6]">
                        {searchQuery || statusFilter !== 'All'
                          ? 'No collection centres match your search or filter'
                          : 'No collection centres configured yet'}
                      </p>
                      <p className="text-xs">
                        {searchQuery || statusFilter !== 'All'
                          ? 'Try adjusting your search terms or status filter.'
                          : 'Click "Add collection centre" to set up your first distribution point.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCentres.map((centre) => {
                  const id = centre.collectionCentreId || centre.id;
                  const isActive = centre.isActive !== false;

                  return (
                    <tr
                      key={id}
                      data-testid={`row-centre-${id}`}
                      className="border-t border-[#eee8dc] dark:border-[#1e493b] hover:bg-[#faf6ed]/50 dark:hover:bg-[#132c22]/50 transition-colors"
                    >
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#e1efe8] text-[#246b59] dark:bg-[#163328] dark:text-[#52c99a] shrink-0">
                            <Building2 size={16} />
                          </div>
                          <div>
                            <span className="font-bold text-[#183f35] dark:text-[#edf6f2] block">
                              {centre.name}
                            </span>
                            <span className="text-[11px] text-[#78847c] dark:text-[#92b1a3]">
                              ID: #{id}
                            </span>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        {getCentreLocation(centre) ? (
                          <div className="flex items-center gap-1.5 text-xs text-[#315246] dark:text-[#d3e3db]">
                            <MapPin size={13} className="text-[#8a948e] shrink-0" />
                            <span>{getCentreLocation(centre)}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#9aa49e] dark:text-[#5d7367]">—</span>
                        )}
                      </Td>
                      <Td>
                        {getCentreContactPerson(centre) ? (
                          <div className="flex items-center gap-1.5 text-xs text-[#315246] dark:text-[#d3e3db]">
                            <User size={13} className="text-[#8a948e] shrink-0" />
                            <span>{getCentreContactPerson(centre)}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#9aa49e] dark:text-[#5d7367]">—</span>
                        )}
                      </Td>
                      <Td>
                        {getCentreContactNumber(centre) ? (
                          <div className="flex items-center gap-1.5 text-xs font-mono text-[#315246] dark:text-[#d3e3db]">
                            <Phone size={13} className="text-[#8a948e] shrink-0" />
                            <span>{formatIndianPhone(getCentreContactNumber(centre))}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#9aa49e] dark:text-[#5d7367]">—</span>
                        )}
                      </Td>
                      <Td>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isActive
                              ? 'bg-[#edf8ef] text-[#246b59] dark:bg-[#132c22] dark:text-[#52c99a]'
                              : 'bg-[#f4efe5] text-[#8a948e] dark:bg-[#1f2f29] dark:text-[#8ba79b]'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isActive ? 'bg-[#246b59] dark:bg-[#52c99a]' : 'bg-[#8a948e]'
                            }`}
                          />
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1">
                          <IconButton
                            label="Edit collection centre"
                            icon={Pencil}
                            onClick={() => {
                              setApiError(null);
                              setModal({ type: 'edit', item: centre });
                            }}
                          />
                          <IconButton
                            label="Delete collection centre"
                            icon={Trash2}
                            onClick={() => {
                              setModal({ type: 'delete', item: centre });
                            }}
                            className="text-[#a63f32] hover:text-[#dc2626] hover:bg-[#fff0ed] dark:text-[#fca5a5] dark:hover:bg-[#331614]"
                          />
                        </div>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </TableScroll>
      </section>

      {/* Create / Edit Modal */}
      {(modal?.type === 'create' || modal?.type === 'edit') && (
        <CollectionCentreModal
          centre={modal.item}
          onClose={() => setModal(null)}
          onSave={handleSave}
          isSaving={isSaving}
          apiError={apiError}
        />
      )}

      {/* Delete Confirmation Modal */}
      {modal?.type === 'delete' && (
        <DeleteCentreModal
          centre={modal.item}
          onClose={() => setModal(null)}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
