import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Layers,
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
import {
  MAX_COST_PER_HISSA,
  MAX_COST_DIGITS,
  MAX_DECIMAL_PLACES,
  MAX_HISSA_COUNT,
  MAX_HISSA_DIGITS,
  MAX_TOTAL_BOOKING_COST,
  MAX_COST_INPUT_LENGTH,
  formatTotalAmount,
} from '../utils/pricing.js';
import { getActiveSeasonYear } from '../utils/season.js';

/**
 * Normalizes any raw booking object (from list API or single GET API) into a
 * consistent, render-safe representation preventing React child crash errors.
 */
export function normalizeBooking(b) {
  if (!b) return null;

  const dayNumber =
    typeof b.qurbaniDay === 'object' && b.qurbaniDay !== null
      ? b.qurbaniDay.dayNumber || b.qurbaniDay.id || 1
      : typeof b.qurbaniDay === 'number'
      ? b.qurbaniDay
      : (b.qurbaniDayId || 1);

  const dayName =
    typeof b.qurbaniDay === 'object' && b.qurbaniDay !== null
      ? `Day ${b.qurbaniDay.dayNumber || b.qurbaniDay.id || 1}`
      : typeof b.qurbaniDay === 'number'
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

  const animalObj = typeof b.animal === 'object' && b.animal !== null ? b.animal : null;
  const animalTypeObj = typeof b.animalType === 'object' && b.animalType !== null ? b.animalType : null;

  const animalName =
    typeof b.animalType === 'string' && b.animalType.trim()
      ? b.animalType.trim()
      : typeof b.animal === 'string' && b.animal.trim()
      ? b.animal.trim()
      : animalObj?.animalType || animalObj?.animal_type || animalObj?.name || animalObj?.type ||
        animalTypeObj?.animalType || animalTypeObj?.animal_type || animalTypeObj?.name || 'Animal';

  const animalId =
    b.animalId || animalObj?.animalId || animalObj?.id || animalTypeObj?.animalId || animalTypeObj?.id || '';

  const bookingId =
    b.hissaBookingId ||
    b.bookingId ||
    (typeof b.id === 'number' ? b.id : null) ||
    (typeof b.receiptNumber === 'string' && b.receiptNumber.includes('-')
      ? parseInt(b.receiptNumber.split('-').pop(), 10)
      : null) ||
    b.id;

  const rawReceipt = b.receiptNumber ? String(b.receiptNumber).replace(/^#/, '') : '';
  const receiptNo =
    rawReceipt ||
    (bookingId ? `QB-2026-${String(bookingId).padStart(6, '0')}` : String(b.id || '').replace(/^#/, ''));

  return {
    ...b,
    id: receiptNo,
    receiptNumber: receiptNo,
    bookingId: bookingId,
    hissaBookingId: bookingId,
    animalId: animalId,
    personName: b.qurbaniPersonName || b.personName || 'Anonymous',
    qurbaniPersonName: b.qurbaniPersonName || b.personName || 'Anonymous',
    animal: animalName,
    animalType: animalName,
    day: dayName,
    qurbaniDay: dayNumber,
    qurbaniDayId: b.qurbaniDayId || dayNumber,
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
    phone: b.phone || b.phoneNumber || b.contactNumber || b.contact || '',
    createdAt: b.createdAt || new Date().toISOString(),
    updatedAt: b.updatedAt || b.createdAt || new Date().toISOString(),
  };
}

export function BookingEditModal({
  booking,
  animals,
  days,
  onClose,
  onSave,
  isSaving,
  apiError,
}) {
  const initialName = booking.qurbaniPersonName || booking.personName || '';
  const initialAnimal = animals.find(
    (a) => String(a.animalId || a.id) === String(booking.animalId)
  );

  const existingPerHissaCost = Number(
    booking.perHissaCost !== undefined && booking.perHissaCost > 0
      ? booking.perHissaCost
      : (booking.totalHissaCost || booking.cost || 0) / (booking.totalHissa || booking.hissa || 1)
  );

  const initialCost = String(
    !isNaN(existingPerHissaCost) && existingPerHissaCost > 0
      ? existingPerHissaCost
      : (booking.perHissaCost || booking.cost || '')
  );

  const [form, setForm] = useState({
    personName: initialName,
    animalId: String(booking.animalId || ''),
    qurbaniDayId: String(booking.qurbaniDayId || booking.qurbaniDay || ''),
    hissa: String(booking.totalHissa !== undefined ? booking.totalHissa : (booking.hissa || 1)),
    cost: initialCost,
    meatWanted: booking.meatWanted === true || booking.meatWanted === 'Yes' ? 'Yes' : 'No',
  });

  const activeSeasonYear = getActiveSeasonYear();

  const eligibleAnimals = useMemo(() => {
    return animals.filter((a) => {
      const isCurrent = String(a.animalId || a.id) === String(booking.animalId);
      return isCurrent || Number(a.batchYear) === Number(activeSeasonYear);
    });
  }, [animals, booking.animalId, activeSeasonYear]);

  const selectedAnimal = useMemo(() => {
    return (
      animals.find((a) => String(a.animalId || a.id) === String(form.animalId)) ||
      initialAnimal
    );
  }, [animals, form.animalId, initialAnimal]);

  const selectedAnimalType = selectedAnimal?.animalType || selectedAnimal?.animal || 'selected animal';

  const validatePersonName = (val) => {
    const trimmed = (val || '').trim();
    if (!trimmed) {
      return 'Participant name is required';
    }
    if (!/^[a-zA-Z\s-]+$/.test(trimmed) || !/[a-zA-Z]/.test(trimmed)) {
      return 'Please enter a valid name containing alphabetical characters, spaces, and hyphens only.';
    }
    return '';
  };

  const [personNameError, setPersonNameError] = useState(() =>
    initialName ? validatePersonName(initialName) : ''
  );
  const [costError, setCostError] = useState('');
  const [hissaError, setHissaError] = useState('');

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handlePersonNameChange = (e) => {
    const val = e.target.value;
    set('personName', val);
    if (!val.trim()) {
      setPersonNameError('Participant name is required');
    } else if (!/^[a-zA-Z\s-]+$/.test(val) || !/[a-zA-Z]/.test(val)) {
      setPersonNameError('Please enter a valid name containing alphabetical characters, spaces, and hyphens only.');
    } else {
      setPersonNameError('');
    }
  };

  const handleAnimalChange = (newAnimalId) => {
    set('animalId', newAnimalId);
  };

  const handleCostKeyDown = (e) => {
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.key === 'Enter' ||
      e.key === 'Escape' ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    if (['e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault();
      setCostError('Scientific notation and signs are not allowed.');
      return;
    }
    if (!/^\d$/.test(e.key) && e.key !== '.') {
      e.preventDefault();
      setCostError('Only numbers and a decimal point are allowed.');
      return;
    }

    const input = e.target;
    const currentVal = String(form.cost || '');
    const start = typeof input?.selectionStart === 'number' ? input.selectionStart : currentVal.length;
    const end = typeof input?.selectionEnd === 'number' ? input.selectionEnd : currentVal.length;
    const selectedText = currentVal.slice(start, end);

    if (e.key === '.') {
      if (currentVal.includes('.') && !selectedText.includes('.')) {
        e.preventDefault();
        setCostError('Only one decimal point is allowed.');
        return;
      }
      return;
    }

    if (/^\d$/.test(e.key)) {
      const nextVal = currentVal.slice(0, start) + e.key + currentVal.slice(end);
      const [wholePart = '', decimalPart] = nextVal.split('.');

      if (wholePart.length > MAX_COST_DIGITS) {
        e.preventDefault();
        setCostError(
          `Cost per Hissa cannot exceed ₹${MAX_COST_PER_HISSA.toLocaleString('en-IN')} (entered amount is out of range or exceeds permitted limit).`
        );
        return;
      }

      if (decimalPart !== undefined && decimalPart.length > MAX_DECIMAL_PLACES) {
        e.preventDefault();
        setCostError('Cost per Hissa cannot have more than 2 decimal places.');
        return;
      }

      const nextNum = Number(nextVal);
      if (!isNaN(nextNum) && nextNum > MAX_COST_PER_HISSA) {
        e.preventDefault();
        setCostError(
          `Cost per Hissa cannot exceed ₹${MAX_COST_PER_HISSA.toLocaleString('en-IN')} (entered amount is out of range or exceeds permitted limit).`
        );
        return;
      }
    }
  };

  const handleCostPaste = (e) => {
    const text = e.clipboardData?.getData('text') || '';
    if (/[eE+-]/.test(text)) {
      e.preventDefault();
      setCostError('Scientific notation and signs are not allowed.');
      return;
    }

    let cleaned = text.replace(/[^\d.]/g, '');
    if (!cleaned) return;

    const parts = cleaned.split('.');
    let whole = parts[0] || '';
    let decimal = parts.length > 1 ? parts.slice(1).join('') : undefined;

    let limitExceeded = false;
    if (whole.length > MAX_COST_DIGITS) {
      whole = whole.slice(0, MAX_COST_DIGITS);
      limitExceeded = true;
    }
    if (decimal !== undefined && decimal.length > MAX_DECIMAL_PLACES) {
      decimal = decimal.slice(0, MAX_DECIMAL_PLACES);
      limitExceeded = true;
    }

    cleaned = decimal !== undefined ? `${whole}.${decimal}` : whole;

    const num = Number(cleaned);
    if (!isNaN(num) && num > MAX_COST_PER_HISSA) {
      limitExceeded = true;
    }

    e.preventDefault();
    set('cost', cleaned);
    validateEnteredCost(cleaned);
    if (limitExceeded) {
      setCostError(
        `Cost per Hissa cannot exceed ₹${MAX_COST_PER_HISSA.toLocaleString('en-IN')} (entered amount is out of range or exceeds permitted limit).`
      );
    }
  };

  const validateEnteredCost = (val) => {
    if (val === '') {
      setCostError('Cost per Hissa is required.');
      return;
    }
    const num = Number(val);
    const [wholePart = '', decimalPart = ''] = val.split('.');

    if (isNaN(num) || !Number.isFinite(num) || num <= 0) {
      setCostError('Please enter a valid positive cost per Hissa.');
    } else if (wholePart.length > MAX_COST_DIGITS || num > MAX_COST_PER_HISSA) {
      setCostError(
        `Cost per Hissa cannot exceed ₹${MAX_COST_PER_HISSA.toLocaleString('en-IN')} (entered amount is out of range or exceeds permitted limit).`
      );
    } else if (decimalPart.length > MAX_DECIMAL_PLACES) {
      setCostError('Cost per Hissa cannot have more than 2 decimal places.');
    } else {
      setCostError('');
    }
  };

  const handleCostChange = (e) => {
    let val = e.target.value.replace(/[^\d.]/g, '');
    const parts = val.split('.');
    let whole = parts[0] || '';
    let decimal = parts.length > 1 ? parts.slice(1).join('') : undefined;

    let limitExceeded = false;
    if (whole.length > MAX_COST_DIGITS) {
      whole = whole.slice(0, MAX_COST_DIGITS);
      limitExceeded = true;
    }
    if (decimal !== undefined && decimal.length > MAX_DECIMAL_PLACES) {
      decimal = decimal.slice(0, MAX_DECIMAL_PLACES);
      limitExceeded = true;
    }

    val = decimal !== undefined ? `${whole}.${decimal}` : whole;

    const num = Number(val);
    if (!isNaN(num) && num > MAX_COST_PER_HISSA) {
      limitExceeded = true;
    }

    set('cost', val);
    validateEnteredCost(val);
    if (limitExceeded) {
      setCostError(
        `Cost per Hissa cannot exceed ₹${MAX_COST_PER_HISSA.toLocaleString('en-IN')} (entered amount is out of range or exceeds permitted limit).`
      );
    }
  };

  const handleHissaKeyDown = (e) => {
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.key === 'Enter' ||
      e.key === 'Escape' ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
      return;
    }
    const input = e.target;
    const currentVal = String(form.hissa || '');
    const start = typeof input?.selectionStart === 'number' ? input.selectionStart : currentVal.length;
    const end = typeof input?.selectionEnd === 'number' ? input.selectionEnd : currentVal.length;
    const nextVal = currentVal.slice(0, start) + e.key + currentVal.slice(end);

    if (nextVal.length > MAX_HISSA_DIGITS || Number(nextVal) > MAX_HISSA_COUNT) {
      e.preventDefault();
      setHissaError(`Total hissa cannot exceed ${MAX_HISSA_COUNT.toLocaleString('en-IN')}.`);
    }
  };

  const handleHissaChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > MAX_HISSA_DIGITS) {
      val = val.slice(0, MAX_HISSA_DIGITS);
    }
    set('hissa', val);
    const num = Number(val);
    if (!val || isNaN(num) || num < 1) {
      setHissaError('Total hissa must be at least 1.');
    } else if (num > MAX_HISSA_COUNT) {
      setHissaError(`Total hissa cannot exceed ${MAX_HISSA_COUNT.toLocaleString('en-IN')}.`);
    } else {
      setHissaError('');
    }
  };

  const handleHissaPaste = (e) => {
    const text = e.clipboardData?.getData('text') || '';
    let cleaned = text.replace(/\D/g, '');
    if (cleaned.length > MAX_HISSA_DIGITS) {
      cleaned = cleaned.slice(0, MAX_HISSA_DIGITS);
    }
    e.preventDefault();
    set('hissa', cleaned);
    const num = Number(cleaned);
    if (!cleaned || isNaN(num) || num < 1) {
      setHissaError('Total hissa must be at least 1.');
    } else if (num > MAX_HISSA_COUNT) {
      setHissaError(`Total hissa cannot exceed ${MAX_HISSA_COUNT.toLocaleString('en-IN')}.`);
    } else {
      setHissaError('');
    }
  };

  const numCost = Number(form.cost);
  const numHissa = Number(form.hissa);
  const costWholePart = String(form.cost || '').split('.')[0].replace(/\D/g, '');

  const isCostValid =
    form.cost !== '' &&
    !isNaN(numCost) &&
    Number.isFinite(numCost) &&
    numCost > 0 &&
    costWholePart.length <= MAX_COST_DIGITS &&
    numCost <= MAX_COST_PER_HISSA &&
    (numHissa <= 0 || isNaN(numHissa) || numHissa * numCost <= MAX_TOTAL_BOOKING_COST) &&
    !costError;
  const isHissaValid =
    form.hissa !== '' &&
    !isNaN(numHissa) &&
    Number.isInteger(numHissa) &&
    numHissa >= 1 &&
    numHissa <= MAX_HISSA_COUNT &&
    !hissaError;

  const calculatedTotal =
    isCostValid && isHissaValid && numHissa > 0 && numCost > 0
      ? numHissa * numCost
      : 0;
  const totalFormatted = formatTotalAmount(calculatedTotal);

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = validatePersonName(form.personName);
    if (err) {
      setPersonNameError(err);
      return;
    }
    if (!isHissaValid) {
      setHissaError('Total hissa must be at least 1.');
      return;
    }
    const costWholeDigits = String(form.cost || '').split('.')[0].replace(/\D/g, '').length;
    if (costWholeDigits > MAX_COST_DIGITS || numCost > MAX_COST_PER_HISSA) {
      setCostError(
        `Cost per Hissa cannot exceed ₹${MAX_COST_PER_HISSA.toLocaleString('en-IN')} (entered amount is out of range or exceeds permitted limit).`
      );
      return;
    }
    if (!isCostValid) {
      setCostError('Please enter a valid positive cost per Hissa.');
      return;
    }
    setPersonNameError('');
    setCostError('');
    setHissaError('');
    onSave(form);
  };

  const receiptCode = String(booking.receiptNumber || booking.id || '').replace(/^#/, '');

  return (
    <Modal
      title={`Edit booking ${receiptCode}`}
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
            className={`input ${personNameError ? '!border-[#dc2626] !ring-[#dc2626]/20' : ''}`}
            value={form.personName}
            onChange={handlePersonNameChange}
            placeholder="Participant or family name"
            required
          />
          {personNameError && (
            <p data-testid="error-edit-person-name" className="mt-1.5 text-xs text-[#a63f32] dark:text-[#fca5a5]">
              {personNameError}
            </p>
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Animal inventory batch">
            <select
              data-testid="select-edit-animal"
              className="input"
              value={form.animalId}
              onChange={(e) => handleAnimalChange(e.target.value)}
              required
            >
              <option value="">Select an animal batch</option>
              {eligibleAnimals.map((a) => {
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
              className={`input ${hissaError ? '!border-[#dc2626] !ring-[#dc2626]/20' : ''}`}
              type="text"
              inputMode="numeric"
              maxLength={MAX_HISSA_DIGITS}
              value={form.hissa}
              onKeyDown={handleHissaKeyDown}
              onChange={handleHissaChange}
              onPaste={handleHissaPaste}
              required
            />
            {hissaError && (
              <p data-testid="error-edit-hissa" className="mt-1.5 text-xs text-[#a63f32] dark:text-[#fca5a5]">
                {hissaError}
              </p>
            )}
          </Field>

          <Field label="Cost per Hissa (₹)">
            <input
              data-testid="input-edit-cost"
              className={`input ${costError ? '!border-[#dc2626] !ring-[#dc2626]/20' : ''}`}
              type="text"
              inputMode="decimal"
              maxLength={MAX_COST_INPUT_LENGTH}
              value={form.cost}
              onKeyDown={handleCostKeyDown}
              onChange={handleCostChange}
              onPaste={handleCostPaste}
              placeholder="e.g. 15000"
              required
            />
            {costError && (
              <p data-testid="error-edit-cost" className="mt-1.5 text-xs text-[#a63f32] dark:text-[#fca5a5]">
                {costError}
              </p>
            )}
          </Field>
        </div>

        {/* Calculated Total Cost Summary Card */}
        <div className="rounded-xl border border-[#b9d9c4] bg-[#edf8ef] p-3.5 text-xs dark:border-[#225744] dark:bg-[#132c22] min-w-0 max-w-full overflow-hidden">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-semibold text-[#246b59] dark:text-[#52c99a] shrink-0">
              Total Calculated Cost:
            </span>
            <strong
              data-testid="text-edit-total-cost"
              title={totalFormatted.full}
              className="ml-auto font-display text-base font-extrabold text-[#183f35] dark:text-[#edf6f2] break-words [overflow-wrap:anywhere]"
            >
              {totalFormatted.display}
            </strong>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[11px] text-[#4f7b6b] dark:text-[#8ba79b]">
            <span className="truncate max-w-full">
              Formula: {form.hissa || 0} Hissa × ₹{formatNumber(Number(form.cost) || 0)}
            </span>
          </div>
        </div>

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
          disabled={
            isSaving ||
            Boolean(personNameError) ||
            Boolean(costError) ||
            Boolean(hissaError) ||
            !form.personName?.trim() ||
            !isCostValid ||
            !isHissaValid
          }
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

  const displayAnimal =
    typeof booking.animal === 'object' && booking.animal !== null
      ? booking.animal.animalType || booking.animal.animal_type || booking.animal.name || booking.animal.type || 'Buffalo'
      : typeof booking.animalType === 'object' && booking.animalType !== null
      ? booking.animalType.animalType || booking.animalType.name || 'Buffalo'
      : (booking.animal || booking.animalType || 'Buffalo');

  const displayDay =
    typeof booking.qurbaniDay === 'object' && booking.qurbaniDay !== null
      ? `Day ${booking.qurbaniDay.dayNumber || booking.qurbaniDay.id || 1}`
      : typeof booking.qurbaniDay === 'number'
      ? `Day ${booking.qurbaniDay}`
      : (booking.day || (booking.qurbaniDayId ? `Day ${booking.qurbaniDayId}` : 'Day 1'));

  const participantName = booking.qurbaniPersonName || booking.personName || 'N/A';
  const receiptNo = String(booking.receiptNumber || booking.hissaBookingId || booking.id || 'N/A').replace(/^#/, '');
  const hissaCount = booking.totalHissa !== undefined ? booking.totalHissa : (booking.hissa || 1);
  const totalCost = booking.totalHissaCost !== undefined ? booking.totalHissaCost : (booking.cost || 0);

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
            {participantName}
          </p>
        </div>
        <div className="soft-inset rounded-xl p-3.5">
          <p className="text-xs text-[#78847c] dark:text-[#92b1a3]">Receipt No</p>
          <p className="mt-0.5 font-bold font-mono text-[#183f35] dark:text-[#edf6f2]">
            {receiptNo}
          </p>
        </div>
        <div className="soft-inset rounded-xl p-3.5">
          <p className="text-xs text-[#78847c] dark:text-[#92b1a3]">Animal & Day</p>
          <p className="mt-0.5 font-bold text-[#183f35] dark:text-[#edf6f2]">
            {displayAnimal} · {displayDay}
          </p>
        </div>
        <div className="soft-inset rounded-xl p-3.5">
          <p className="text-xs text-[#78847c] dark:text-[#92b1a3]">Total Hissa & Cost</p>
          <p className="mt-0.5 font-bold text-[#183f35] dark:text-[#edf6f2]">
            {hissaCount} hissa · ₹{formatNumber(totalCost)}
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

/**
 * Helper to match receipt numbers and booking IDs without false positives on season year (e.g. '2026').
 * Allows matching:
 * - Single or double digits on the sequence part (e.g. '6' -> '000026' or '000006')
 * - Explicit leading zero padding (e.g. '0026' or '0006')
 * - Query with leading '#' (e.g. '#26' or '#6')
 * - Short or full receipt codes (e.g. 'qb-26', 'qb-2026-000026', '2026-000026')
 */
export function matchesReceipt(b, cleanQ) {
  if (!cleanQ) return false;

  const receiptStr = String(b.receiptNumber || b.id || '').trim().toLowerCase();
  const hissaBookingIdStr = String(b.hissaBookingId || b.bookingId || '').trim().toLowerCase();

  // Extract prefix and sequence from receipt (e.g. "qb-2026-000026" or "bk-1001")
  const lastDash = receiptStr.lastIndexOf('-');
  const seqPart = lastDash !== -1 ? receiptStr.slice(lastDash + 1) : receiptStr;
  const prefixPart = lastDash !== -1 ? receiptStr.slice(0, lastDash) : '';
  const unpaddedSeq = seqPart.replace(/^0+/, '') || '0';

  // 1. If query is a single 0: only match if unpadded sequence contains 0 (e.g. 10, 20, 100)
  if (cleanQ === '0') {
    return unpaddedSeq.includes('0') || hissaBookingIdStr.includes('0');
  }

  // 2. Partial/fuzzy match on unpadded sequence number or numeric ID:
  // e.g. cleanQ = "6" matches unpaddedSeq "26" or "6", numericId "26" or "6"
  // e.g. cleanQ = "26" matches unpaddedSeq "26"
  if (!cleanQ.startsWith('0')) {
    if (unpaddedSeq.includes(cleanQ)) return true;
    if (hissaBookingIdStr && hissaBookingIdStr.includes(cleanQ)) return true;
  }

  // 3. Match with explicit leading zeros on sequence part:
  // e.g. cleanQ = "0026", "0006", "000026"
  if (cleanQ.startsWith('0')) {
    if (seqPart.includes(cleanQ)) return true;
  }

  // 4. User enters short receipt code like "qb-26" or "qb-000026":
  const shortCodeUnpadded = `qb-${unpaddedSeq}`;
  const shortCodePadded = `qb-${seqPart}`;
  if (cleanQ.startsWith('qb') || cleanQ.includes('-')) {
    if (shortCodeUnpadded.includes(cleanQ) || shortCodePadded.includes(cleanQ)) {
      return true;
    }
  }

  // 5. User enters full receipt number or query with hyphen / explicit prefix:
  // e.g. "qb-2026-000026", "2026-000026", "qb-2026-26", "2026-26"
  const unpaddedFull = prefixPart ? `${prefixPart}-${unpaddedSeq}` : '';
  if (cleanQ.includes('-')) {
    if (receiptStr.includes(cleanQ)) return true;
    if (unpaddedFull && unpaddedFull.includes(cleanQ)) return true;
  }

  // 6. User explicitly typed season year "2026" or exact full receipt:
  if (
    cleanQ === '2026' ||
    receiptStr === cleanQ ||
    unpaddedFull === cleanQ ||
    seqPart === cleanQ ||
    unpaddedSeq === cleanQ
  ) {
    return true;
  }

  return false;
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

        const normalized = rawBookings.map(normalizeBooking);
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

  // Registered animal type (defaulting to Buffalo)
  const currentAnimalType = useMemo(() => {
    for (const a of animals) {
      const type = (a.animalType || a.animal || '').trim();
      if (type) return type;
    }
    for (const b of bookings) {
      const type = (
        typeof b.animal === 'object' && b.animal !== null
          ? b.animal.animalType || b.animal.name || ''
          : b.animalType || b.animal || ''
      ).trim();
      if (type) return type;
    }
    return 'Buffalo';
  }, [animals, bookings]);

  const q = query.trim().toLowerCase();
  const cleanQ = q.replace(/^#\s*/, '').trim();
  const filtered = bookings
    .filter((b) => {
      const matchesQuery =
        !q ||
        matchesReceipt(b, cleanQ) ||
        b.personName.toLowerCase().includes(q) ||
        (b.animal && String(b.animal).toLowerCase().includes(q)) ||
        (b.animalType && String(b.animalType).toLowerCase().includes(q)) ||
        (b.bookedBy && b.bookedBy.toLowerCase().includes(q)) ||
        (b.phone && String(b.phone).toLowerCase().includes(q)) ||
        (b.phoneNumber && String(b.phoneNumber).toLowerCase().includes(q)) ||
        (b.contactNumber && String(b.contactNumber).toLowerCase().includes(q)) ||
        (b.contact && String(b.contact).toLowerCase().includes(q));

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
            setSingleBookingDetail(normalizeBooking(res.data.data));
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

    const trimmedName = (form.personName || '').trim();
    if (!trimmedName) {
      setIsSaving(false);
      const err = 'Participant name is required';
      setApiError(err);
      return notify?.(err, 'error');
    }
    if (!/^[a-zA-Z\s-]+$/.test(trimmedName) || !/[a-zA-Z]/.test(trimmedName)) {
      setIsSaving(false);
      const err = 'Please enter a valid name containing alphabetical characters, spaces, and hyphens only.';
      setApiError(err);
      return notify?.(err, 'error');
    }
    if (!hissa || hissa < 1) {
      setIsSaving(false);
      const err = 'Total hissa must be at least 1';
      setApiError(err);
      return notify?.(err, 'error');
    }

    const targetAnimal = animals.find(
      (a) => String(a.animalId || a.id) === String(form.animalId || editingBooking.animalId)
    );
    const activeSeasonYear = getActiveSeasonYear();
    if (targetAnimal && Number(targetAnimal.batchYear) !== Number(activeSeasonYear)) {
      setIsSaving(false);
      const err = `Hissa booking is allowed only for animal inventory of the current year. Current year: ${activeSeasonYear}, animal batch year: ${targetAnimal.batchYear || 'N/A'}`;
      setApiError(err);
      return notify?.(err, 'error');
    }
    if (isNaN(cost) || cost <= 0) {
      setIsSaving(false);
      const err = 'Cost per Hissa must be positive';
      setApiError(err);
      return notify?.(err, 'error');
    }
    if (cost > MAX_COST_PER_HISSA) {
      setIsSaving(false);
      const err = `Cost per Hissa cannot exceed ₹${MAX_COST_PER_HISSA.toLocaleString('en-IN')}.`;
      setApiError(err);
      return notify?.(err, 'error');
    }

    const totalCost = hissa * cost;
    if (totalCost > MAX_TOTAL_BOOKING_COST) {
      setIsSaving(false);
      const err = `Total booking cost cannot exceed ₹${MAX_TOTAL_BOOKING_COST.toLocaleString('en-IN')} (₹10 Crore).`;
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
          animal: (
            typeof updated.animal === 'object' && updated.animal !== null
              ? updated.animal.animalType || updated.animal.animal_type || updated.animal.name || updated.animal.type || 'Animal'
              : typeof updated.animalType === 'object' && updated.animalType !== null
              ? updated.animalType.animalType || updated.animalType.animal_type || updated.animalType.name || 'Animal'
              : updated.animalType || updated.animal || editingBooking.animal || 'Animal'
          ),
          animalType: (
            typeof updated.animalType === 'string' && updated.animalType.trim()
              ? updated.animalType.trim()
              : typeof updated.animal === 'object' && updated.animal !== null
              ? updated.animal.animalType || updated.animal.animal_type || updated.animal.name || updated.animal.type || 'Animal'
              : updated.animalType || updated.animal || editingBooking.animal || 'Animal'
          ),
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
        const updatedCode = String(normalized.receiptNumber || normalized.id || '').replace(/^#/, '');
        notify?.(
          `Booking ${updatedCode} updated successfully!`,
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
    const receiptCode = String(booking.receiptNumber || booking.bookingId || booking.id || targetId || '').replace(/^#/, '');
    try {
      setDownloadingId(targetId);
      notify?.(`Generating PDF receipt for ${receiptCode}...`, 'info');
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
      booking.hissaBookingId ||
      booking.bookingId ||
      (typeof booking.id === 'string' && booking.id.includes('-')
        ? parseInt(booking.id.split('-').pop(), 10) || booking.id
        : booking.id);
    const receiptCode = String(booking.receiptNumber || booking.bookingId || booking.hissaBookingId || booking.id || targetId || '').replace(/^#/, '');

    setDeletingId(targetId);

    try {
      const res = await api.delete(`/api/v1/hissa-bookings/${targetId}`);
      if (res?.data?.success || res?.status === 200 || res?.status === 204) {
        notify?.(`Booking ${receiptCode} deleted successfully.`, 'success');

        setBookings((prev) =>
          prev.filter(
            (b) =>
              String(b.hissaBookingId || b.id || b.bookingId) !== String(targetId) &&
              String(b.receiptNumber) !== String(booking.receiptNumber)
          )
        );

        if (patchData) {
          patchData((prev) => ({
            ...prev,
            bookings: (prev.bookings || []).filter(
              (b) =>
                String(b.hissaBookingId || b.id || b.bookingId) !== String(targetId) &&
                String(b.receiptNumber) !== String(booking.receiptNumber)
            ),
          }));
        }

        setDeletingBooking(null);
        navigate('/bookings');
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
              String(b.hissaBookingId || b.id || b.bookingId) !== String(targetId) &&
              String(b.receiptNumber) !== String(booking.receiptNumber)
          )
        );
        if (patchData) {
          patchData((prev) => ({
            ...prev,
            bookings: (prev.bookings || []).filter(
              (b) =>
                String(b.hissaBookingId || b.id || b.bookingId) !== String(targetId) &&
                String(b.receiptNumber) !== String(booking.receiptNumber)
            ),
          }));
        }
        notify?.(`Booking ${receiptCode} removed locally (server offline).`, 'info');
        setDeletingBooking(null);
        navigate('/bookings');
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
          <div className="relative w-full sm:w-88 md:w-96 lg:w-[420px]">
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
              placeholder="Search"
              title="Search"
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

          {/* Static Animal Type Indicator */}
          <div
            data-testid="select-animal-filter"
            title={`Animal: ${currentAnimalType}`}
            className="flex h-10 items-center gap-2 rounded-xl border border-[#ded8ca] bg-[#faf6ed] px-3 text-xs font-semibold text-[#183f35] select-none dark:border-[#21473a] dark:bg-[#122820] dark:text-[#edf6f2]"
          >
            <Layers
              size={14}
              className="shrink-0 text-[#246b59] dark:text-[#4ade80]"
            />
            <span className="truncate">Animal: {currentAnimalType}</span>
          </div>

          {/* Custom Project Dropdown: Meat Wanted */}
          <ProjectDropdown
            value={meat === 'All' ? 'Meat: All' : `Meat: ${meat}`}
            onChange={(selectedMeat) => {
              const clean = selectedMeat.replace(/^Meat:\s*/i, '');
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
              setAnimalFilter('All');
              setMeat('All');
            }}
          />
        )}
      </section>

      {/* View Booking Details Modal */}
      {activeBooking && !deletingBooking && (
        <BookingDetails
          booking={activeBooking}
          onClose={() => navigate('/bookings')}
          onDelete={(b) => {
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
