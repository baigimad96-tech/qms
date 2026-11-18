import React, { useState, useEffect } from 'react';
import {
  BookOpenCheck,
  ClipboardList,
  CircleCheck,
  Check,
  ArrowRight,
  Download,
  RefreshCw,
} from 'lucide-react';
import { PageIntro } from './Dashboard.jsx';
import { Field } from '../components/Modal.jsx';
import { formatNumber } from '../data/mockData.js';
import { api } from '../services/api.js';
import { getUser } from '../utils/auth.js';
import { getErrorMessage } from './AnimalInventory.jsx';
import { downloadReceipt } from '../utils/receipt.js';

export default function HissaBooking({ data, patchData, notify, navigate }) {
  const [form, setForm] = useState({
    inventoryId: '',
    day: '',
    personName: '',
    hissa: '',
    cost: '',
    meatWanted: 'Yes',
  });
  const [success, setSuccess] = useState('');
  const [createdBooking, setCreatedBooking] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [inventory, setInventory] = useState(data.inventory || []);
  const [days, setDays] = useState(data.days || []);
  const [bookings, setBookings] = useState(data.bookings || []);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [invRes, daysRes, bkRes] = await Promise.all([
          api.get('/api/v1/animals').catch(() => null),
          api.get('/api/v1/qurbani-days').catch(() => null),
          api.get('/api/v1/hissa-bookings').catch(() => null),
        ]);

        if (isMounted) {
          if (invRes?.data) {
            const rawInvData = invRes.data.data;
            const rawInv = Array.isArray(rawInvData)
              ? rawInvData
              : Array.isArray(rawInvData?.content)
              ? rawInvData.content
              : Array.isArray(invRes.data)
              ? invRes.data
              : [];
            const normalizedInv = rawInv.map((a) => ({
              ...a,
              id: a.animalId || a.id,
              animalId: a.animalId || a.id,
              availableHissa: a.availableHissa !== undefined ? a.availableHissa : ((a.totalHissa || 0) - (a.bookedHissa || 0)),
            }));
            setInventory(normalizedInv);
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
              dayNumber: d.dayNumber || d.qurbaniDayId,
              capacity: d.totalPerDay !== undefined ? d.totalPerDay : (d.capacity || 100),
              booked: d.bookedPerDay !== undefined ? d.bookedPerDay : (d.booked || 0),
              remaining: d.remaining !== undefined ? d.remaining : Math.max((d.totalPerDay || 100) - (d.bookedPerDay || 0), 0),
            }));
            setDays(normalizedDays);
          }
          if (bkRes?.data) {
            const rawBkData = bkRes.data.data;
            const rawBk = Array.isArray(rawBkData)
              ? rawBkData
              : Array.isArray(rawBkData?.content)
              ? rawBkData.content
              : Array.isArray(bkRes.data)
              ? bkRes.data
              : [];
            setBookings(rawBk);
          }
        }
      } catch (err) {
        console.error('Failed to load booking prerequisite data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, []);

  const selected = inventory.find(
    (x) => String(x.animalId || x.id) === String(form.inventoryId)
  );

  const selectedDay = days.find(
    (x) => String(x.qurbaniDayId || x.id) === String(form.day) || x.name === form.day
  );

  const availableHissa = selected
    ? (selected.availableHissa !== undefined
        ? selected.availableHissa
        : ((selected.totalHissa || 0) - (selected.bookedHissa || 0)))
    : 0;

  const dayRemaining = selectedDay
    ? (selectedDay.remaining !== undefined
        ? selectedDay.remaining
        : ((selectedDay.capacity || selectedDay.totalPerDay || 100) - (selectedDay.booked || selectedDay.bookedPerDay || 0)))
    : 0;

  const currentUser = getUser();
  const adminName = currentUser?.fullName || currentUser?.name || 'Administrator';
  const adminInitials = (adminName || 'AD')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSuccess('');
    const hissa = Number(form.hissa);
    const cost = Number(form.cost);

    if (!selected) {
      return notify('Please select an animal inventory batch.', 'error');
    }
    if (!hissa || hissa < 1 || hissa > availableHissa) {
      return notify(`Booking rejected: insufficient available Hissa (requested ${hissa}, available ${availableHissa}).`, 'error');
    }
    if (!selectedDay || hissa > dayRemaining) {
      return notify(`Booking rejected: insufficient Qurbani day capacity (requested ${hissa}, remaining ${dayRemaining}).`, 'error');
    }
    if (isNaN(cost) || cost < 0) {
      return notify('Please enter a valid cost per Hissa.', 'error');
    }

    const payload = {
      animalId: Number(selected.animalId || selected.id),
      qurbaniDayId: Number(selectedDay.qurbaniDayId || selectedDay.id),
      bookedByAdminName: adminName,
      qurbaniPersonName: form.personName.trim(),
      totalHissa: hissa,
      perHissaCost: cost,
      meatWanted: form.meatWanted === 'Yes' || form.meatWanted === true,
    };

    try {
      const response = await api.post('/api/v1/hissa-bookings', payload);
      
      if (response.data?.success) {
        const newBooking = response.data.data;
        const receiptNo = newBooking.receiptNumber || `ID: ${newBooking.hissaBookingId || newBooking.id}`;
        setCreatedBooking(newBooking);
        setSuccess(`Booking ${receiptNo} confirmed for ${form.personName}.`);
        notify(`Booking ${receiptNo} created successfully!`, 'success');
        
        setForm({
          inventoryId: '',
          day: '',
          personName: '',
          hissa: '',
          cost: '',
          meatWanted: 'Yes',
        });
        
        setBookings((prev) => [...prev, newBooking]);
        setInventory((prev) =>
          prev.map((x) =>
            String(x.animalId || x.id) === String(selected.animalId || selected.id)
              ? {
                  ...x,
                  bookedHissa: (x.bookedHissa || 0) + hissa,
                  availableHissa: Math.max(availableHissa - hissa, 0),
                }
              : x
          )
        );
        setDays((prev) =>
          prev.map((d) =>
            String(d.qurbaniDayId || d.id) === String(selectedDay.qurbaniDayId || selectedDay.id)
              ? {
                  ...d,
                  booked: (d.booked || d.bookedPerDay || 0) + hissa,
                  bookedPerDay: (d.bookedPerDay || 0) + hissa,
                  remaining: Math.max(dayRemaining - hissa, 0),
                }
              : d
          )
        );
      } else {
        notify(response.data?.message || 'Failed to create booking.', 'error');
      }
    } catch (error) {
      const errMsg = getErrorMessage(error, 'Failed to create booking. Server might be down or token expired.');
      notify(errMsg, 'error');
    }
  };

  const handleDownloadReceipt = async (booking) => {
    if (!booking) return;
    const targetId = booking.hissaBookingId || booking.id;
    try {
      setIsDownloading(true);
      notify?.(`Generating PDF receipt for #${booking.receiptNumber || targetId}...`, 'info');
      const filename = await downloadReceipt(booking);
      notify?.(`Receipt ${filename} downloaded successfully!`, 'success');
    } catch (err) {
      console.error('Failed to download receipt:', err);
      notify?.(err.message || 'Failed to download PDF receipt.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const calculatedTotal = form.hissa && form.cost && Number(form.hissa) > 0 && Number(form.cost) > 0
    ? Number(form.hissa) * Number(form.cost)
    : 0;

  return (
    <div>
      <PageIntro
        eyebrow="Hissa booking"
        title="Create a new booking"
        description="Record the person, protect the Hissa and leave a clean trail for the team."
        icon={BookOpenCheck}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="card-surface rounded-2xl p-5 sm:p-8">
          <div className="mb-7 flex items-center gap-3 border-b border-[#eee8dc] pb-5 dark:border-[#1e493b]">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e1efe8] text-[#246b59] dark:bg-[#163328] dark:text-[#52c99a]">
              <ClipboardList size={19} />
            </div>
            <div>
              <h3 className="font-display text-lg font-extrabold text-[#183f35] dark:text-[#edf6f2]">
                Booking details
              </h3>
              <p className="text-xs text-[#7b867e] dark:text-[#92b1a3]">All fields are required unless noted.</p>
            </div>
          </div>
          {success && (
            <div
              data-testid="status-booking-success"
              className="mb-6 flex flex-col gap-3 rounded-xl border border-[#b9d9c4] bg-[#edf8ef] p-4 text-sm text-[#246b59] dark:border-[#225744] dark:bg-[#132c22] dark:text-[#52c99a] sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <CircleCheck size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">{success}</p>
                  <button
                    data-testid="button-view-created-booking"
                    onClick={() => navigate('/bookings')}
                    className="mt-0.5 inline-block text-xs font-bold underline hover:opacity-80"
                  >
                    View all bookings &rarr;
                  </button>
                </div>
              </div>
              {createdBooking && (
                <button
                  type="button"
                  data-testid="button-download-created-receipt"
                  onClick={() => handleDownloadReceipt(createdBooking)}
                  disabled={isDownloading}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#246b59]/30 bg-white/80 px-3.5 py-2 text-xs font-bold text-[#183f35] shadow-sm transition hover:bg-white dark:border-[#52c99a]/30 dark:bg-[#142f26] dark:text-[#edf6f2] dark:hover:bg-[#1a3d31] disabled:opacity-50"
                >
                  {isDownloading ? (
                    <RefreshCw size={14} className="animate-spin text-[#246b59] dark:text-[#52c99a]" />
                  ) : (
                    <Download size={14} />
                  )}
                  <span>{isDownloading ? 'Generating...' : 'Download PDF Receipt'}</span>
                </button>
              )}
            </div>
          )}
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Select Animal inventory">
                <select
                  data-testid="select-inventory"
                  className="input"
                  value={form.inventoryId}
                  onChange={(e) => set('inventoryId', e.target.value)}
                  required
                >
                  <option value="">Choose an animal batch</option>
                  {inventory.map((x) => {
                    const avail = x.availableHissa !== undefined
                      ? x.availableHissa
                      : ((x.totalHissa || 0) - (x.bookedHissa || 0));
                    return (
                      <option key={x.animalId || x.id} value={x.animalId || x.id}>
                        {x.animalType || 'Batch'} #{x.animalId || x.id} ({x.batchYear || 'N/A'}) · {formatNumber(avail)} Hissa available
                      </option>
                    );
                  })}
                </select>
              </Field>
              <Field label="Select Qurbani day">
                <select
                  data-testid="select-day"
                  className="input"
                  value={form.day}
                  onChange={(e) => set('day', e.target.value)}
                  required
                >
                  <option value="">Choose a day</option>
                  {days.map((x) => {
                    const rem = x.remaining !== undefined
                      ? x.remaining
                      : ((x.capacity || x.totalPerDay || 100) - (x.booked || 0));
                    return (
                      <option key={x.qurbaniDayId || x.id} value={x.qurbaniDayId || x.id}>
                        {x.name} · {formatNumber(rem)} remaining
                      </option>
                    );
                  })}
                </select>
              </Field>
            </div>
            <Field label="Qurbani person name">
              <input
                data-testid="input-person-name"
                className="input"
                value={form.personName}
                onChange={(e) => set('personName', e.target.value)}
                placeholder="e.g. Family name or organization"
                required
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Number of Hissa">
                <input
                  data-testid="input-booking-hissa"
                  className="input"
                  type="number"
                  min="1"
                  max={availableHissa || undefined}
                  value={form.hissa}
                  onChange={(e) => set('hissa', e.target.value)}
                  placeholder="0"
                  required
                />
              </Field>
              <Field label="Cost per Hissa (₹)">
                <input
                  data-testid="input-booking-cost"
                  className="input"
                  type="number"
                  min="0"
                  value={form.cost}
                  onChange={(e) => set('cost', e.target.value)}
                  placeholder="e.g. 15000"
                  required
                />
                {calculatedTotal > 0 && (
                  <p className="mt-1 text-xs text-[#246b59] dark:text-[#52c99a]">
                    Total calculated: ₹{formatNumber(calculatedTotal)} ({form.hissa} hissa × ₹{formatNumber(form.cost)})
                  </p>
                )}
              </Field>
            </div>
            <Field label="Meat wanted">
              <div className="grid grid-cols-2 gap-3">
                {['Yes', 'No'].map((choice) => (
                  <button
                    data-testid={`button-meat-${choice.toLowerCase()}`}
                    type="button"
                    key={choice}
                    onClick={() => set('meatWanted', choice)}
                    className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${
                      form.meatWanted === choice
                        ? 'border-[#246b59] bg-[#e4f0e8] text-[#246b59] dark:border-[#52c99a] dark:bg-[#16382b] dark:text-[#52c99a]'
                        : 'border-[#ded8ca] bg-[#fffdf8] text-[#7b867e] hover:border-[#a9bcb0] dark:border-[#1e493b] dark:bg-[#11241e] dark:text-[#92b1a3]'
                    }`}
                  >
                    {form.meatWanted === choice && <Check size={15} className="mr-2 inline" />}
                    {choice}
                  </button>
                ))}
              </div>
            </Field>
            <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                data-testid="button-cancel-booking"
                onClick={() => navigate('/bookings')}
                className="btn-secondary justify-center"
              >
                Cancel
              </button>
              <button
                data-testid="button-submit-booking"
                className="btn-primary justify-center"
                type="submit"
              >
                Confirm booking <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </section>
        <aside className="space-y-4">
          <div className="card-surface rounded-2xl p-5">
            <p className="kicker">Booked by admin</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-[#e3a84b] text-sm font-extrabold text-[#183f35]">
                {adminInitials}
              </div>
              <div>
                <p className="font-bold text-[#315246] dark:text-[#edf6f2]">{adminName}</p>
                <p className="text-xs text-[#7b867e] dark:text-[#92b1a3]">Administrator</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-[#1f5548] p-5 text-[#f9f4e9]">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#e6b65b]">Live check</p>
            <h3 className="mt-2 font-display text-lg font-extrabold">Before you confirm</h3>
            <div className="mt-4 space-y-3 text-sm text-[#c6d9d0]">
              <div className="flex justify-between gap-3">
                <span>Inventory available</span>
                <strong className="text-[#f9f4e9]">
                  {selected ? `${formatNumber(availableHissa)} Hissa` : '—'}
                </strong>
              </div>
              <div className="flex justify-between gap-3">
                <span>Day remaining</span>
                <strong className="text-[#f9f4e9]">
                  {selectedDay ? `${formatNumber(dayRemaining)} Hissa` : '—'}
                </strong>
              </div>
              <div className="flex justify-between gap-3">
                <span>Animal type</span>
                <strong className="text-[#f9f4e9]">{selected?.animalType || '—'}</strong>
              </div>
              {calculatedTotal > 0 && (
                <div className="flex justify-between gap-3 border-t border-[#2e7464] pt-2 font-semibold">
                  <span className="text-[#e6b65b]">Total Amount</span>
                  <strong className="text-[#e6b65b]">₹{formatNumber(calculatedTotal)}</strong>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
