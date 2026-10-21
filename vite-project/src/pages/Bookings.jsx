import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  Search,
  Calendar,
  RefreshCw,
  X,
  Filter,
  Pencil,
  AlertTriangle,
  Check,
  Download,
  Trash2,
} from 'lucide-react';
import { PageIntro, BookingsTable } from './Dashboard.jsx';
import Modal, { ModalActions, Field } from '../components/Modal.jsx';
import { EmptyState } from '../components/Table.jsx';
import BookingDetails from './BookingDetails.jsx';
import ProjectDropdown from '../components/ProjectDropdown.jsx';
import { formatNumber } from '../data/mockData.js';
import { api } from '../services/api.js';
import { getUser } from '../utils/auth.js';
import { getErrorMessage } from './AnimalInventory.jsx';
import { downloadReceipt } from '../utils/receipt.js';

export function BookingEditModal({
  booking,
  animals,
  days,
  onClose,
  onSave,
  isSaving,
  apiError,
}) {
  const [form, setForm] = useState({
    personName: booking.qurbaniPersonName || booking.personName || '',
    animalId: String(booking.animalId || ''),
    qurbaniDayId: String(booking.qurbaniDayId || booking.qurbaniDay || ''),
    hissa: String(booking.totalHissa !== undefined ? booking.totalHissa : (booking.hissa || 1)),
    cost: String(
      booking.perHissaCost !== undefined && booking.perHissaCost > 0
        ? booking.perHissaCost
        : (booking.totalHissaCost || booking.cost || 0) / (booking.totalHissa || booking.hissa || 1)
    ),
    meatWanted: booking.meatWanted === true || booking.meatWanted === 'Yes' ? 'Yes' : 'No',
  });

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const calculatedTotal =
    Number(form.hissa || 0) * Number(form.cost || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Modal
      title={`Edit booking #${booking.receiptNumber || booking.id}`}
      description="Update participant details, allocated Hissa, animal, or day."
      onClose={onClose}
    >
      {apiError && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#f3a69b] bg-[#fff3f0] p-3.5 text-xs text-[#a63f32] dark:border-[#5c2420] dark:bg-[#331614] dark:text-[#fca5a5]">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Qurbani person name">
          <input
            data-testid="input-edit-person-name"
            className="input"
            value={form.personName}
            onChange={(e) => set('personName', e.target.value)}
            placeholder="Participant or family name"
            required
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Animal inventory batch">
            <select
              data-testid="select-edit-animal"
              className="input"
              value={form.animalId}
              onChange={(e) => set('animalId', e.target.value)}
              required
            >
              <option value="">Select an animal batch</option>
              {animals.map((a) => {
                const isCurrent = String(a.animalId || a.id) === String(booking.animalId);
                const avail =
                  a.availableHissa !== undefined
                    ? a.availableHissa
                    : (a.totalHissa || 0) - (a.bookedHissa || 0);
                return (
                  <option key={a.animalId || a.id} value={a.animalId || a.id}>
                    {a.animalType || 'Animal'} #{a.animalId || a.id} ({a.batchYear || 'N/A'}) ·{' '}
                    {formatNumber(avail)} available{isCurrent ? ' (Current)' : ''}
                  </option>
                );
              })}
            </select>
          </Field>

          <Field label="Qurbani day">
            <select
              data-testid="select-edit-day"
              className="input"
              value={form.qurbaniDayId}
              onChange={(e) => set('qurbaniDayId', e.target.value)}
              required
            >
              <option value="">Select a day</option>
              {days.map((d) => {
                const rem =
                  d.remaining !== undefined
                    ? d.remaining
                    : (d.capacity || d.totalPerDay || 100) - (d.booked || 0);
                const isCurrent =
                  String(d.qurbaniDayId || d.id) ===
                  String(booking.qurbaniDayId || booking.qurbaniDay);
                return (
                  <option key={d.qurbaniDayId || d.id} value={d.qurbaniDayId || d.id}>
                    {d.name} · {formatNumber(rem)} remaining{isCurrent ? ' (Current)' : ''}
                  </option>
                );
              })}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Number of Hissa">
            <input
              data-testid="input-edit-hissa"
              className="input"
              type="number"
              min="1"
              value={form.hissa}
              onChange={(e) => set('hissa', e.target.value)}
              required
            />
          </Field>

          <Field label="Cost per Hissa (₹)">
            <input
              data-testid="input-edit-cost"
              className="input"
              type="number"
              min="0"
              value={form.cost}
              onChange={(e) => set('cost', e.target.value)}
              required
            />
          </Field>
        </div>

        {calculatedTotal > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-[#f4f8f5] p-3 text-xs text-[#246b59] dark:bg-[#132d23] dark:text-[#4ade80]">
            <span>Estimated Total:</span>
            <strong className="text-sm">
              ₹{formatNumber(calculatedTotal)} ({form.hissa} hissa × ₹{formatNumber(form.cost)})
            </strong>
          </div>
        )}

        <Field label="Meat wanted">
          <div className="grid grid-cols-2 gap-3">
            {['Yes', 'No'].map((choice) => (
              <button
                type="button"
                key={choice}
                onClick={() => set('meatWanted', choice)}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-bold transition ${
                  form.meatWanted === choice
                    ? 'border-[#246b59] bg-[#e4efe7] text-[#246b59] dark:border-[#4ade80] dark:bg-[#16382b] dark:text-[#4ade80]'
                    : 'border-[#ded8ca] bg-[#faf6ed] text-[#7b867e] hover:border-[#b8c9c0] dark:border-[#21473a] dark:bg-[#122820] dark:text-[#92b1a3]'
                }`}
              >
                {form.meatWanted === choice && <Check size={14} />}
                {choice}
              </button>
            ))}
          </div>
        </Field>

        <ModalActions
          onClose={onClose}
          submitLabel={isSaving ? 'Updating...' : 'Save changes'}
        />
      </form>
    </Modal>
  );
}

export function BookingDeleteModal({
  booking,
  onClose,
  onConfirm,
  isDeleting,
  apiError,
}) {
  if (!booking) return null;

  return (
    <Modal
      title="Delete Booking"
      description="Are you sure you want to delete this confirmed booking?"
      onClose={onClose}
    >
      {apiError && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#f3a69b] bg-[#fff3f0] p-3.5 text-xs text-[#a63f32] dark:border-[#5c2420] dark:bg-[#331614] dark:text-[#fca5a5]">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      <div className="rounded-xl border border-[#f3a69b]/40 bg-[#fff8f7] p-4 text-xs text-[#a63f32] dark:border-[#5c2420] dark:bg-[#281413] dark:text-[#fca5a5]">
        <div className="flex items-center gap-2 font-bold mb-1">
          <AlertTriangle size={15} />
          <span>Warning: Irreversible action</span>
        </div>
        <p className="text-[11px] leading-relaxed opacity-90">
          Deleting this booking will release the allocated Hissa back into the animal batch inventory and adjust the day capacity. This cannot be undone.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="soft-inset rounded-xl p-3.5">
          <p className="text-xs text-[#78847c] dark:text-[#92b1a3]">Participant Name</p>
          <p className="mt-0.5 font-bold text-[#183f35] dark:text-[#edf6f2]">
            {booking.personName || booking.qurbaniPersonName || 'N/A'}
          </p>
        </div>
        <div className="soft-inset rounded-xl p-3.5">
          <p className="text-xs text-[#78847c] dark:text-[#92b1a3]">Receipt No</p>
          <p className="mt-0.5 font-bold font-mono text-[#183f35] dark:text-[#edf6f2]">
            #{booking.receiptNumber || booking.id}
          </p>
        </div>
        <div className="soft-inset rounded-xl p-3.5">
          <p className="text-xs text-[#78847c] dark:text-[#92b1a3]">Animal & Day</p>
          <p className="mt-0.5 font-bold text-[#183f35] dark:text-[#edf6f2]">
            {booking.animal || booking.animalType} · {booking.day}
          </p>
        </div>
        <div className="soft-inset rounded-xl p-3.5">
          <p className="text-xs text-[#78847c] dark:text-[#92b1a3]">Total Hissa & Cost</p>
          <p className="mt-0.5 font-bold text-[#183f35] dark:text-[#edf6f2]">
            {booking.hissa || booking.totalHissa} hissa · ₹{formatNumber(booking.cost || booking.totalHissaCost || 0)}
          </p>
        </div>
      </div>

      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          data-testid="button-cancel-delete"
          onClick={onClose}
          disabled={isDeleting}
          className="btn-secondary justify-center text-xs"
        >
          Cancel
        </button>
        <button
          type="button"
          data-testid="button-confirm-delete"
          onClick={onConfirm}
          disabled={isDeleting}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-transparent bg-[#dc2626] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#b91c1c] disabled:opacity-50 dark:bg-[#ef4444] dark:hover:bg-[#dc2626]"
        >
          {isDeleting ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              <span>Deleting...</span>
            </>
          ) : (
            <>
              <Trash2 size={14} />
              <span>Confirm Delete</span>
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}

export default function Bookings({ data, patchData, notify, navigate, selectedId }) {
  const [query, setQuery] = useState('');
  const [day, setDay] = useState('All days');
  const [meat, setMeat] = useState('All');

  const [bookings, setBookings] = useState(data.bookings || []);
  const [days, setDays] = useState(data.days || []);
  const [animals, setAnimals] = useState(data.inventory || []);
  const [isLoading, setIsLoading] = useState(true);

  const [editingBooking, setEditingBooking] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const [deletingBooking, setDeletingBooking] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteApiError, setDeleteApiError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [bookingsRes, daysRes, animalsRes] = await Promise.all([
        api.get('/api/v1/hissa-bookings?size=500').catch(() => null),
        api.get('/api/v1/qurbani-days').catch(() => null),
        api.get('/api/v1/animals').catch(() => null),
      ]);

      if (bookingsRes?.data) {
        const rawData = bookingsRes.data.data;
        let rawBookings = [];
        if (Array.isArray(rawData)) {
          rawBookings = rawData;
        } else if (Array.isArray(rawData?.content)) {
          rawBookings = rawData.content;
        } else if (Array.isArray(bookingsRes.data)) {
          rawBookings = bookingsRes.data;
        }

        const normalized = rawBookings.map((b) => {
          const dayName =
            typeof b.qurbaniDay === 'number'
              ? `Day ${b.qurbaniDay}`
              : (b.day || (b.qurbaniDayId ? `Day ${b.qurbaniDayId}` : 'Day 1'));

          const hissaCount = b.totalHissa !== undefined ? b.totalHissa : (b.hissa || 1);
          const totalCost = b.totalHissaCost !== undefined ? b.totalHissaCost : (b.cost || 0);
          const perCost =
            b.perHissaCost !== undefined && b.perHissaCost > 0
              ? b.perHissaCost
              : hissaCount > 0
              ? totalCost / hissaCount
              : 0;

          return {
            ...b,
            id: b.receiptNumber || String(b.hissaBookingId || b.id),
            receiptNumber: b.receiptNumber || String(b.hissaBookingId || b.id),
            bookingId: b.hissaBookingId || b.id,
            hissaBookingId: b.hissaBookingId || b.id,
            personName: b.qurbaniPersonName || b.personName || 'Anonymous',
            qurbaniPersonName: b.qurbaniPersonName || b.personName || 'Anonymous',
            animal: b.animalType || b.animal || 'Animal',
            animalType: b.animalType || b.animal || 'Animal',
            day: dayName,
            qurbaniDay: typeof b.qurbaniDay === 'number' ? b.qurbaniDay : (b.qurbaniDayId || 1),
            qurbaniDayId: b.qurbaniDayId || 1,
            hissa: hissaCount,
            totalHissa: hissaCount,
            cost: totalCost,
            totalHissaCost: totalCost,
            perHissaCost: perCost,
            meatWanted:
              typeof b.meatWanted === 'boolean'
                ? b.meatWanted
                  ? 'Yes'
                  : 'No'
                : b.meatWanted || 'Yes',
            bookedBy: b.bookedByAdminName || b.bookedBy || 'System Administrator',
            bookedByAdminName: b.bookedByAdminName || b.bookedBy || 'System Administrator',
            createdAt: b.createdAt || new Date().toISOString(),
            updatedAt: b.updatedAt || b.createdAt || new Date().toISOString(),
          };
        });
        setBookings(normalized);
      }

      if (daysRes?.data) {
        const rawDaysData = daysRes.data.data;
        const rawDays = Array.isArray(rawDaysData)
          ? rawDaysData
          : Array.isArray(rawDaysData?.content)
          ? rawDaysData.content
          : Array.isArray(daysRes.data)
          ? daysRes.data
          : [];
        const normalizedDays = rawDays.map((d) => ({
          ...d,
          id: d.qurbaniDayId || d.id,
          qurbaniDayId: d.qurbaniDayId || d.id,
          name: d.name || `Day ${d.dayNumber || d.qurbaniDayId}`,
        }));
        setDays(normalizedDays);
      }

      if (animalsRes?.data) {
        const rawAnimalData = animalsRes.data.data;
        const rawAnimals = Array.isArray(rawAnimalData)
          ? rawAnimalData
          : Array.isArray(rawAnimalData?.content)
          ? rawAnimalData.content
          : Array.isArray(animalsRes.data)
          ? animalsRes.data
          : [];
        setAnimals(rawAnimals);
      }
    } catch (err) {
      console.error('Failed to load bookings data', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build day filter options
  const dayOptions = [
    'All days',
    ...Array.from(
      new Set([...days.map((x) => x.name), ...bookings.map((b) => b.day)])
    )
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
  ];

  const q = query.trim().toLowerCase();
  const filtered = bookings
    .filter((b) => {
      const matchesQuery =
        !q ||
        b.personName.toLowerCase().includes(q) ||
        (b.receiptNumber && b.receiptNumber.toLowerCase().includes(q)) ||
        (b.id && String(b.id).toLowerCase().includes(q)) ||
        (b.animal && b.animal.toLowerCase().includes(q)) ||
        (b.bookedBy && b.bookedBy.toLowerCase().includes(q));

      const matchesDay = day === 'All days' || b.day === day;
      const matchesMeat = meat === 'All' || b.meatWanted === meat;

      return matchesQuery && matchesDay && matchesMeat;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const [singleBookingDetail, setSingleBookingDetail] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (selectedId) {
      const targetId = String(selectedId).replace(/\D/g, '') || selectedId;
      api.get(`/api/v1/hissa-bookings/${targetId}`)
        .then((res) => {
          if (isMounted && res.data?.data) {
            setSingleBookingDetail(res.data.data);
          }
        })
        .catch((err) => {
          console.warn(`GET /api/v1/hissa-bookings/${targetId} fallback to list booking:`, err);
        });
    } else {
      setSingleBookingDetail(null);
    }
    return () => {
      isMounted = false;
    };
  }, [selectedId]);

  const activeBooking = selectedId
    ? singleBookingDetail ||
      bookings.find(
        (x) =>
          String(x.id) === String(selectedId) ||
          String(x.hissaBookingId) === String(selectedId) ||
          String(x.receiptNumber) === String(selectedId)
      )
    : null;

  const handleSaveBooking = async (form) => {
    if (!editingBooking) return;
    setApiError(null);
    setIsSaving(true);

    const hissa = Number(form.hissa);
    const cost = Number(form.cost);

    if (!form.personName.trim()) {
      setIsSaving(false);
      const err = 'Participant name is required';
      setApiError(err);
      return notify?.(err, 'error');
    }
    if (!hissa || hissa < 1) {
      setIsSaving(false);
      const err = 'Total hissa must be at least 1';
      setApiError(err);
      return notify?.(err, 'error');
    }
    if (isNaN(cost) || cost < 0) {
      setIsSaving(false);
      const err = 'Cost per Hissa must be zero or positive';
      setApiError(err);
      return notify?.(err, 'error');
    }

    const user = getUser();
    const adminName =
      user?.fullName || user?.name || editingBooking.bookedBy || 'System Administrator';
    const targetId =
      editingBooking.hissaBookingId || editingBooking.bookingId || editingBooking.id;

    const payload = {
      animalId: Number(form.animalId || editingBooking.animalId),
      qurbaniDayId: Number(form.qurbaniDayId || editingBooking.qurbaniDayId),
      bookedByAdminName: adminName,
      qurbaniPersonName: form.personName.trim(),
      totalHissa: hissa,
      perHissaCost: cost,
      meatWanted: form.meatWanted === 'Yes' || form.meatWanted === true,
    };

    try {
      const res = await api.patch(`/api/v1/hissa-bookings/${targetId}`, payload);
      if (res.data?.success) {
        const updated = res.data.data;
        const dayName =
          typeof updated.qurbaniDay === 'number'
            ? `Day ${updated.qurbaniDay}`
            : (updated.day || `Day ${updated.qurbaniDayId || form.qurbaniDayId}`);

        const normalized = {
          ...updated,
          id: updated.receiptNumber || String(updated.hissaBookingId || targetId),
          receiptNumber: updated.receiptNumber || editingBooking.receiptNumber,
          bookingId: updated.hissaBookingId || targetId,
          hissaBookingId: updated.hissaBookingId || targetId,
          personName: updated.qurbaniPersonName || updated.personName || form.personName.trim(),
          qurbaniPersonName:
            updated.qurbaniPersonName || updated.personName || form.personName.trim(),
          animal: updated.animalType || updated.animal || editingBooking.animal,
          animalType: updated.animalType || updated.animal || editingBooking.animal,
          day: dayName,
          qurbaniDay:
            typeof updated.qurbaniDay === 'number'
              ? updated.qurbaniDay
              : (updated.qurbaniDayId || Number(form.qurbaniDayId)),
          qurbaniDayId: updated.qurbaniDayId || Number(form.qurbaniDayId),
          hissa: updated.totalHissa !== undefined ? updated.totalHissa : hissa,
          totalHissa: updated.totalHissa !== undefined ? updated.totalHissa : hissa,
          cost:
            updated.totalHissaCost !== undefined
              ? updated.totalHissaCost
              : hissa * cost,
          totalHissaCost:
            updated.totalHissaCost !== undefined
              ? updated.totalHissaCost
              : hissa * cost,
          perHissaCost:
            updated.perHissaCost !== undefined ? updated.perHissaCost : cost,
          meatWanted:
            typeof updated.meatWanted === 'boolean'
              ? updated.meatWanted
                ? 'Yes'
                : 'No'
              : form.meatWanted,
          bookedBy: updated.bookedByAdminName || updated.bookedBy || adminName,
          bookedByAdminName: updated.bookedByAdminName || updated.bookedBy || adminName,
          createdAt: updated.createdAt || editingBooking.createdAt,
          updatedAt: updated.updatedAt || new Date().toISOString(),
        };

        setBookings((prev) =>
          prev.map((b) =>
            String(b.hissaBookingId || b.id) === String(targetId) ? normalized : b
          )
        );

        if (patchData) {
          patchData((prev) => ({
            ...prev,
            bookings: (prev.bookings || []).map((b) =>
              String(b.hissaBookingId || b.id) === String(targetId) ? normalized : b
            ),
          }));
        }

        setEditingBooking(null);
        notify?.(
          `Booking ${normalized.receiptNumber || normalized.id} updated successfully!`,
          'success'
        );
        fetchData();
      } else {
        const errMsg = res.data?.message || 'Failed to update booking.';
        setApiError(errMsg);
        notify?.(errMsg, 'error');
      }
    } catch (err) {
      const errMsg = getErrorMessage(err, 'Failed to update booking.');
      setApiError(errMsg);
      notify?.(errMsg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadReceipt = async (booking) => {
    if (!booking) return;
    const targetId = booking.hissaBookingId || booking.id;
    try {
      setDownloadingId(targetId);
      notify?.(`Generating PDF receipt for #${booking.receiptNumber || targetId}...`, 'info');
      const filename = await downloadReceipt(booking);
      notify?.(`Receipt ${filename} downloaded successfully!`, 'success');
    } catch (err) {
      console.error('Failed to download receipt:', err);
      notify?.(err.message || 'Failed to download PDF receipt. Please try again.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteBooking = async () => {
    if (!deletingBooking) return;
    setDeleteApiError(null);
    setIsDeleting(true);

    const booking = deletingBooking;
    const targetId =
      booking.hissaBookingId ??
      (typeof booking.id === 'string' && booking.id.includes('-')
        ? parseInt(booking.id.replace(/\D/g, ''), 10)
        : booking.id);

    setDeletingId(targetId);

    try {
      const res = await api.delete(`/api/v1/hissa-bookings/${targetId}`);
      if (res?.data?.success || res?.status === 200 || res?.status === 204) {
        notify?.(`Booking #${booking.receiptNumber || targetId} deleted successfully.`, 'success');

        setBookings((prev) =>
          prev.filter(
            (b) =>
              String(b.hissaBookingId || b.id) !== String(targetId) &&
              String(b.receiptNumber) !== String(booking.receiptNumber)
          )
        );

        if (patchData) {
          patchData((prev) => ({
            ...prev,
            bookings: (prev.bookings || []).filter(
              (b) =>
                String(b.hissaBookingId || b.id) !== String(targetId) &&
                String(b.receiptNumber) !== String(booking.receiptNumber)
            ),
          }));
        }

        setDeletingBooking(null);
        fetchData();
      } else {
        const errMsg = res?.data?.message || 'Failed to delete booking.';
        setDeleteApiError(errMsg);
        notify?.(errMsg, 'error');
      }
    } catch (err) {
      console.error('Delete booking error:', err);
      const isNetworkErr = !err.response || err.message?.includes('Network');
      if (isNetworkErr) {
        setBookings((prev) =>
          prev.filter(
            (b) =>
              String(b.hissaBookingId || b.id) !== String(targetId) &&
              String(b.receiptNumber) !== String(booking.receiptNumber)
          )
        );
        if (patchData) {
          patchData((prev) => ({
            ...prev,
            bookings: (prev.bookings || []).filter(
              (b) =>
                String(b.hissaBookingId || b.id) !== String(targetId) &&
                String(b.receiptNumber) !== String(booking.receiptNumber)
            ),
          }));
        }
        notify?.(`Booking #${booking.receiptNumber || targetId} removed locally (server offline).`, 'info');
        setDeletingBooking(null);
      } else {
        const errMsg = getErrorMessage(err, 'Failed to delete booking.');
        setDeleteApiError(errMsg);
        notify?.(errMsg, 'error');
      }
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  return (
    <div>
      <PageIntro
        eyebrow="Hissa booking"
        title="Bookings"
        description="Every confirmed Hissa commitment, searchable and ready to review."
        action={() => navigate('/new-booking')}
        actionLabel="New booking"
        icon={ClipboardList}
      />
      <section className="card-surface rounded-2xl p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 border-b border-[#eee8dc] pb-4 dark:border-[#1a3d31] lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="kicker">Confirmed records</p>
            <h3 className="mt-0.5 font-display text-xl font-extrabold text-[#183f35] dark:text-[#edf6f2]">
              {isLoading
                ? 'Loading bookings...'
                : `${filtered.length} booking${filtered.length === 1 ? '' : 's'} shown`}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchData}
              disabled={isLoading}
              title="Refresh bookings from server"
              className="flex items-center gap-1.5 rounded-lg border border-[#e7d5ad] bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#765820] transition hover:bg-white dark:border-[#4f3f1c] dark:bg-[#142f26] dark:text-[#f3c46a] dark:hover:bg-[#1a3d31]"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar with Project UI Dropdowns */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-80 md:w-88">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a948e] dark:text-[#698d80]"
            />
            <input
              data-testid="input-booking-search"
              type="text"
              className="h-10 w-full rounded-xl border border-[#ded8ca] bg-[#faf6ed] pl-10 pr-8 text-xs font-medium !text-[#183f35] placeholder:text-[#8a948e] transition focus:border-[#246b59] focus:bg-white focus:outline-none dark:border-[#21473a] dark:bg-[#122820] dark:text-[#edf6f2] dark:placeholder:text-[#698d80] dark:focus:border-[#4ade80]"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search person, receipt, animal..."
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a948e] hover:text-[#183f35] dark:hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Custom Project Dropdown: All days */}
          <ProjectDropdown
            value={day}
            onChange={(selectedDay) => setDay(selectedDay)}
            options={dayOptions}
            icon={Calendar}
            testId="select-booking-day-filter"
          />

          {/* Custom Project Dropdown: Meat Wanted */}
          <ProjectDropdown
            value={meat === 'All' ? 'Meat: All' : `Meat: ${meat}`}
            onChange={(selectedMeat) => {
              const clean = selectedMeat.replace('Meat: ', '');
              setMeat(clean);
            }}
            options={['Meat: All', 'Meat: Yes', 'Meat: No']}
            icon={Filter}
            testId="select-meat-filter"
          />

          {/* Reset Filters */}
          {(day !== 'All days' || meat !== 'All' || query) && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setDay('All days');
                setMeat('All');
              }}
              className="h-10 rounded-xl px-3 text-xs font-bold text-[#a63f32] transition hover:bg-[#fff3f0] dark:text-[#fca5a5] dark:hover:bg-[#331614]"
            >
              Reset filters
            </button>
          )}
        </div>

        {filtered.length ? (
          <BookingsTable
            bookings={filtered}
            onView={(id) => navigate(`/bookings/${id}`)}
            onEdit={(b) => {
              setApiError(null);
              setEditingBooking(b);
            }}
            onDelete={(b) => {
              setDeleteApiError(null);
              setDeletingBooking(b);
            }}
            onDownload={handleDownloadReceipt}
            downloadingId={downloadingId}
            deletingId={deletingId}
          />
        ) : (
          <EmptyState
            title="No bookings match"
            description="Try another name or reset your filters."
            actionLabel="Reset filters"
            onAction={() => {
              setQuery('');
              setDay('All days');
              setMeat('All');
            }}
          />
        )}
      </section>

      {/* View Booking Details Modal */}
      {activeBooking && (
        <BookingDetails
          booking={activeBooking}
          onClose={() => navigate('/bookings')}
          onDelete={(b) => {
            navigate('/bookings');
            setDeleteApiError(null);
            setDeletingBooking(b);
          }}
          onDownload={handleDownloadReceipt}
          isDownloading={
            Boolean(
              downloadingId &&
                (String(downloadingId) === String(activeBooking.hissaBookingId) ||
                  String(downloadingId) === String(activeBooking.id))
            )
          }
        />
      )}

      {/* Edit Booking Modal */}
      {editingBooking && (
        <BookingEditModal
          booking={editingBooking}
          animals={animals}
          days={days}
          onClose={() => setEditingBooking(null)}
          onSave={handleSaveBooking}
          isSaving={isSaving}
          apiError={apiError}
        />
      )}

      {/* Delete Booking Confirmation Modal */}
      {deletingBooking && (
        <BookingDeleteModal
          booking={deletingBooking}
          onClose={() => {
            if (!isDeleting) {
              setDeletingBooking(null);
              setDeleteApiError(null);
            }
          }}
          onConfirm={handleDeleteBooking}
          isDeleting={isDeleting}
          apiError={deleteApiError}
        />
      )}
    </div>
  );
}
