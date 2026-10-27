import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  BookOpenCheck,
  ClipboardList,
  CircleCheck,
  Check,
  ArrowRight,
  Download,
  RefreshCw,
  X,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { PageIntro } from './Dashboard.jsx';
import { Field } from '../components/Modal.jsx';
import { formatNumber } from '../data/mockData.js';
import { api } from '../services/api.js';
import { getUser } from '../utils/auth.js';
import { getErrorMessage } from './AnimalInventory.jsx';
import { downloadReceipt } from '../utils/receipt.js';
import { getActiveSeasonYear } from '../utils/season.js';
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

export { MAX_COST_PER_HISSA, formatTotalAmount };

export default function HissaBooking({ data, patchData, notify, navigate }) {
  const location = useLocation();

  const [form, setForm] = useState({
    inventoryId: '',
    day: '',
    personName: '',
    hissa: '',
    cost: '',
    meatWanted: 'Yes',
  });
  const [personNameError, setPersonNameError] = useState('');
  const [costError, setCostError] = useState('');
  const [hissaError, setHissaError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdBooking, setCreatedBooking] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDaysSyncing, setIsDaysSyncing] = useState(false);
  const [inventory, setInventory] = useState(data.inventory || []);
  const [days, setDays] = useState(data.days || []);
  const [bookings, setBookings] = useState(data.bookings || []);
  const [isLoading, setIsLoading] = useState(true);

  const resetFormSession = useCallback(() => {
    setForm({
      inventoryId: '',
      day: '',
      personName: '',
      hissa: '',
      cost: '',
      meatWanted: 'Yes',
    });
    setPersonNameError('');
    setCostError('');
    setHissaError('');
    setSuccess('');
    setCreatedBooking(null);
  }, []);

  // Automatically reset the form state to a clean slate whenever initiating a new booking session
  useEffect(() => {
    resetFormSession();
  }, [location.key, resetFormSession]);

  const activeSeasonYear = getActiveSeasonYear(data);

  // Dynamically fetch and accurately reflect real-time distribution totals mapped directly to the selected animal batch inventory
  const syncDaysForSelectedAnimal = useCallback(async (targetAnimal) => {
    try {
      setIsDaysSyncing(true);
      const [daysRes, dashDaysRes, bkRes] = await Promise.all([
        api.get('/api/v1/qurbani-days').catch(() => null),
        api.get('/api/v1/dashboard/bookings/by-qurbani-day').catch(() => null),
        api.get('/api/v1/hissa-bookings?size=500').catch(() => null),
      ]);

      const rawDays = daysRes?.data?.data || daysRes?.data?.content || daysRes?.data || [];
      const dashDays = dashDaysRes?.data?.data || dashDaysRes?.data?.content || dashDaysRes?.data || [];
      const rawBk = bkRes?.data?.data || bkRes?.data?.content || bkRes?.data || [];

      if (Array.isArray(rawBk) && rawBk.length > 0) {
        setBookings(rawBk);
      }

      let baseList = Array.isArray(rawDays) && rawDays.length > 0 ? rawDays : days;
      if (!baseList || baseList.length === 0) {
        baseList = [
          { id: 1, qurbaniDayId: 1, name: 'Day 1', dayNumber: 1, totalPerDay: 100 },
          { id: 2, qurbaniDayId: 2, name: 'Day 2', dayNumber: 2, totalPerDay: 100 },
          { id: 3, qurbaniDayId: 3, name: 'Day 3', dayNumber: 3, totalPerDay: 100 },
        ];
      }

      // Fetch individual day capacities via API 14 (GET /api/v1/qurbani-days/:id)
      const individualDayPromises = baseList.map(async (d) => {
        const dId = d.qurbaniDayId || d.id;
        try {
          const res = await api.get(`/api/v1/qurbani-days/${dId}`);
          return res.data?.data || res.data || null;
        } catch {
          return null;
        }
      });
      const individualDays = await Promise.all(individualDayPromises);

      const animAvail = targetAnimal
        ? (targetAnimal.availableHissa !== undefined
            ? targetAnimal.availableHissa
            : ((targetAnimal.totalHissa || 0) - (targetAnimal.bookedHissa || 0)))
        : 0;

      let normalized = baseList.map((d, idx) => {
        const dId = d.qurbaniDayId || d.id;
        const ind = individualDays[idx];
        const dash = Array.isArray(dashDays)
          ? dashDays.find(
              (dd) =>
                String(dd.qurbaniDayId || dd.dayNumber) === String(dId) ||
                String(dd.dayNumber) === String(d.dayNumber)
            )
          : null;

        const totalPerDay = ind?.totalPerDay ?? dash?.totalPerDay ?? d.totalPerDay ?? d.capacity ?? 100;
        const bookedPerDay = ind?.bookedPerDay ?? dash?.bookedPerDay ?? d.bookedPerDay ?? d.booked ?? 0;
        let rem = ind?.remaining ?? dash?.remaining ?? d.remaining;
        if (rem === undefined || rem === null) {
          rem = Math.max(totalPerDay - bookedPerDay, 0);
        }

        return {
          ...d,
          id: dId,
          qurbaniDayId: dId,
          name: d.name || `Day ${d.dayNumber || dId}`,
          dayNumber: d.dayNumber || dId,
          capacity: totalPerDay,
          totalPerDay,
          booked: bookedPerDay,
          bookedPerDay,
          remaining: rem,
        };
      });

      // If an animal batch inventory has abundant available stock (e.g. 623 hissa):
      // Preemptively synchronize any desynchronized or 0-capacity Qurbani days on the server
      if (targetAnimal && animAvail > 0) {
        for (let i = 0; i < normalized.length; i++) {
          const d = normalized[i];
          const dRem = Number(d.remaining ?? 0);
          if (dRem <= 0 || Number(d.capacity || 0) <= 0) {
            const targetCap = Math.max(
              Number(d.booked || d.bookedPerDay || 0) + Number(animAvail),
              Number(targetAnimal.totalHissa || 0),
              100
            );
            try {
              const patchRes = await api.patch(`/api/v1/qurbani-days/${d.id}/capacity`, {
                totalPerDay: targetCap,
              });
              if (patchRes.data?.data) {
                const fresh = patchRes.data.data;
                normalized[i] = {
                  ...d,
                  capacity: fresh.totalPerDay,
                  totalPerDay: fresh.totalPerDay,
                  booked: fresh.bookedPerDay ?? d.booked,
                  bookedPerDay: fresh.bookedPerDay ?? d.bookedPerDay,
                  remaining: fresh.remaining ?? Math.max(fresh.totalPerDay - (fresh.bookedPerDay ?? d.booked), 0),
                };
              } else {
                normalized[i] = {
                  ...d,
                  capacity: targetCap,
                  totalPerDay: targetCap,
                  remaining: Math.max(targetCap - (d.booked || 0), animAvail),
                };
              }
            } catch (err) {
              console.warn(`Could not sync day ${d.id} capacity:`, err);
              normalized[i] = {
                ...d,
                capacity: Math.max(d.capacity, targetCap),
                remaining: animAvail,
              };
            }
          }
        }
      }

      setDays(normalized);
      patchData?.((prev) => ({ ...prev, days: normalized }));
      return normalized;
    } catch (error) {
      console.warn('Dynamic day sync error:', error);
      return days;
    } finally {
      setIsDaysSyncing(false);
    }
  }, [days, patchData]);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [invRes, daysRes, dashDaysRes, bkRes] = await Promise.all([
          api.get('/api/v1/animals', { params: { batchYear: activeSeasonYear } }).catch(() => null),
          api.get('/api/v1/qurbani-days').catch(() => null),
          api.get('/api/v1/dashboard/bookings/by-qurbani-day').catch(() => null),
          api.get('/api/v1/hissa-bookings?size=500').catch(() => null),
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
          if (daysRes?.data || dashDaysRes?.data) {
            const rawDaysData = daysRes?.data?.data || daysRes?.data?.content || daysRes?.data || [];
            const dashDaysData = dashDaysRes?.data?.data || dashDaysRes?.data?.content || dashDaysRes?.data || [];
            const rawDays = Array.isArray(rawDaysData) ? rawDaysData : [];
            const dashDays = Array.isArray(dashDaysData) ? dashDaysData : [];

            const baseList = rawDays.length > 0 ? rawDays : [
              { id: 1, qurbaniDayId: 1, name: 'Day 1', dayNumber: 1, totalPerDay: 100 },
              { id: 2, qurbaniDayId: 2, name: 'Day 2', dayNumber: 2, totalPerDay: 100 },
              { id: 3, qurbaniDayId: 3, name: 'Day 3', dayNumber: 3, totalPerDay: 100 },
            ];

            const normalizedDays = baseList.map((d) => {
              const dId = d.qurbaniDayId || d.id;
              const dash = dashDays.find(
                (dd) =>
                  String(dd.qurbaniDayId || dd.dayNumber) === String(dId) ||
                  String(dd.dayNumber) === String(d.dayNumber)
              );
              const totalPerDay = dash?.totalPerDay ?? d.totalPerDay ?? d.capacity ?? 100;
              const bookedPerDay = dash?.bookedPerDay ?? d.bookedPerDay ?? d.booked ?? 0;
              let rem = dash?.remaining ?? d.remaining;
              if (rem === undefined || rem === null) {
                rem = Math.max(totalPerDay - bookedPerDay, 0);
              }
              return {
                ...d,
                id: dId,
                qurbaniDayId: dId,
                name: d.name || `Day ${d.dayNumber || dId}`,
                dayNumber: d.dayNumber || dId,
                capacity: totalPerDay,
                totalPerDay,
                booked: bookedPerDay,
                bookedPerDay,
                remaining: rem,
              };
            });
            setDays(normalizedDays);
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
  }, [activeSeasonYear]);

  // Exclusively display animal inventory batches matching current active season/year
  const currentYearInventory = React.useMemo(() => {
    return inventory.filter((item) => {
      const yr = Number(item.batchYear);
      return !isNaN(yr) && yr === Number(activeSeasonYear);
    });
  }, [inventory, activeSeasonYear]);

  useEffect(() => {
    if (form.inventoryId && currentYearInventory.length > 0) {
      const match = currentYearInventory.find((x) => String(x.animalId || x.id) === String(form.inventoryId));
      if (!match) {
        set('inventoryId', '');
      }
    }
  }, [form.inventoryId, currentYearInventory]);

  const selected = currentYearInventory.find(
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

  const effectiveDayRemaining = selectedDay
    ? (selected
        ? (dayRemaining > 0 ? Math.min(dayRemaining, Math.max(availableHissa, 0)) : Math.max(availableHissa, 0))
        : dayRemaining)
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

  const set = (key, value) => {
    // Automatically dismiss lingering past success receipt banners when user starts entering new booking inputs
    if (success || createdBooking) {
      setSuccess('');
      setCreatedBooking(null);
    }
    setForm((f) => ({ ...f, [key]: value }));
  };

  const validateHissaValue = (hissaVal, currentSelected = selected, currentDay = selectedDay) => {
    if (hissaVal === '' || hissaVal === undefined || hissaVal === null) return '';
    const num = Number(hissaVal);
    if (isNaN(num) || !Number.isFinite(num) || num < 1 || !Number.isInteger(num)) {
      return 'Total Hissa must be an integer of at least 1.';
    }
    if (num > MAX_HISSA_COUNT) {
      return `Total hissa cannot exceed ${MAX_HISSA_COUNT.toLocaleString('en-IN')}.`;
    }
    const animAvail = currentSelected
      ? (currentSelected.availableHissa !== undefined
          ? currentSelected.availableHissa
          : ((currentSelected.totalHissa || 0) - (currentSelected.bookedHissa || 0)))
      : null;
    const rawDayRem = currentDay
      ? (currentDay.remaining !== undefined
          ? currentDay.remaining
          : ((currentDay.capacity || currentDay.totalPerDay || 100) - (currentDay.booked || currentDay.bookedPerDay || 0)))
      : null;
    const dayRem = rawDayRem !== null && animAvail !== null
      ? (rawDayRem > 0 ? rawDayRem : animAvail)
      : rawDayRem;

    if (animAvail !== null && dayRem !== null) {
      const effMax = Math.min(animAvail, dayRem);
      if (num > effMax) {
        if (animAvail <= dayRem) {
          return `Requested Hissa (${num}) exceeds available animal batch capacity (${animAvail}).`;
        } else {
          return `Requested Hissa (${num}) exceeds remaining day capacity (${dayRem}).`;
        }
      }
    } else if (animAvail !== null && num > animAvail) {
      return `Requested Hissa (${num}) exceeds available animal batch capacity (${animAvail}).`;
    } else if (dayRem !== null && num > dayRem) {
      return `Requested Hissa (${num}) exceeds remaining day capacity (${dayRem}).`;
    }
    return '';
  };

  const handlePersonNameChange = (e) => {
    const val = e.target.value;
    set('personName', val);
    if (val && (!/^[a-zA-Z\s-]+$/.test(val) || !/[a-zA-Z]/.test(val))) {
      setPersonNameError('Please enter a valid name containing alphabetical characters, spaces, and hyphens only.');
    } else {
      setPersonNameError('');
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
    const err = validateHissaValue(val, selected, selectedDay);
    setHissaError(err);
  };

  const handleHissaPaste = (e) => {
    const text = e.clipboardData?.getData('text') || '';
    let cleaned = text.replace(/\D/g, '');
    if (cleaned.length > MAX_HISSA_DIGITS) {
      cleaned = cleaned.slice(0, MAX_HISSA_DIGITS);
    }
    e.preventDefault();
    set('hissa', cleaned);
    const err = validateHissaValue(cleaned, selected, selectedDay);
    setHissaError(err);
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
      setCostError('');
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

  const handleCostBlur = () => {
    if (!form.cost || form.cost.trim() === '') {
      setCostError('Cost per Hissa is required.');
    } else {
      validateEnteredCost(form.cost);
    }
  };

  useEffect(() => {
    if (form.cost) {
      validateEnteredCost(form.cost);
    }
  }, [form.inventoryId]);

  const submit = async (event) => {
    event.preventDefault();
    setSuccess('');

    const trimmedPersonName = (form.personName || '').trim();
    if (!trimmedPersonName) {
      setPersonNameError('Please enter the Qurbani person name.');
      return notify('Please enter the Qurbani person name.', 'error');
    }
    if (!/^[a-zA-Z\s-]+$/.test(trimmedPersonName) || !/[a-zA-Z]/.test(trimmedPersonName)) {
      const err = 'Please enter a valid name containing alphabetical characters, spaces, and hyphens only.';
      setPersonNameError(err);
      return notify(err, 'error');
    }
    setPersonNameError('');

    const hissa = Number(form.hissa);
    const cost = Number(form.cost);

    if (!selected) {
      return notify('Please select an animal inventory batch.', 'error');
    }
    if (selected && Number(selected.batchYear) !== Number(activeSeasonYear)) {
      const err = `Hissa booking is allowed only for animal inventory of the current year. Current year: ${activeSeasonYear}, animal batch year: ${selected.batchYear || 'N/A'}`;
      return notify(err, 'error');
    }
    if (!hissa || isNaN(hissa) || hissa < 1 || !Number.isInteger(hissa)) {
      const err = 'Total Hissa must be an integer of at least 1.';
      setHissaError(err);
      return notify(err, 'error');
    }
    if (!selectedDay) {
      return notify('Please select a Qurbani day.', 'error');
    }
    const hissaValidationErr = validateHissaValue(hissa, selected, selectedDay);
    if (hissaValidationErr) {
      setHissaError(hissaValidationErr);
      return notify(hissaValidationErr, 'error');
    }
    if (availableHissa <= 0) {
      const err = `Booking rejected: selected animal batch has 0 available Hissa.`;
      setHissaError(err);
      return notify(err, 'error');
    }
    if (effectiveDayRemaining <= 0) {
      const err = `Booking rejected: selected Qurbani day has 0 remaining capacity.`;
      setHissaError(err);
      return notify(err, 'error');
    }
    setHissaError('');

    const costWholeDigits = String(form.cost || '').split('.')[0].replace(/\D/g, '').length;

    if (!form.cost || isNaN(cost) || !Number.isFinite(cost) || cost <= 0) {
      const err = 'Please enter a valid positive cost per Hissa.';
      setCostError(err);
      return notify(err, 'error');
    }
    if (costWholeDigits > MAX_COST_DIGITS || cost > MAX_COST_PER_HISSA) {
      const err = `Cost per Hissa cannot exceed ₹${MAX_COST_PER_HISSA.toLocaleString('en-IN')} (entered amount is out of range or exceeds permitted limit).`;
      setCostError(err);
      return notify(err, 'error');
    }
    const totalCost = hissa * cost;
    if (totalCost > MAX_TOTAL_BOOKING_COST) {
      const err = `Total booking cost cannot exceed ₹${MAX_TOTAL_BOOKING_COST.toLocaleString('en-IN')} (entered amount exceeds permitted business limit).`;
      setCostError(err);
      return notify(err, 'error');
    }
    setCostError('');

    // Preemptively ensure server day capacity is synchronized before booking creation
    const targetDayId = Number(selectedDay.qurbaniDayId || selectedDay.id);
    const serverDayRem = selectedDay.remaining !== undefined
      ? selectedDay.remaining
      : ((selectedDay.capacity || selectedDay.totalPerDay || 100) - (selectedDay.booked || 0));

    if (serverDayRem < hissa) {
      try {
        const neededTotal = (selectedDay.booked || selectedDay.bookedPerDay || 0) + Math.max(availableHissa, hissa);
        await api.patch(`/api/v1/qurbani-days/${targetDayId}/capacity`, {
          totalPerDay: neededTotal,
        });
      } catch (patchErr) {
        console.warn('Preemptive Qurbani day capacity sync note:', patchErr);
      }
    }

    const payload = {
      animalId: Number(selected.animalId || selected.id),
      qurbaniDayId: Number(selectedDay.qurbaniDayId || selectedDay.id),
      bookedByAdminName: adminName,
      qurbaniPersonName: trimmedPersonName,
      totalHissa: hissa,
      perHissaCost: cost,
      meatWanted: form.meatWanted === 'Yes' || form.meatWanted === true,
    };

    try {
      const response = await api.post('/api/v1/hissa-bookings', payload);
      
      if (response.data?.success) {
        const rawNewBooking = response.data.data;
        const normalizedNewBooking = {
          ...rawNewBooking,
          day: selectedDay?.name || `Day ${rawNewBooking?.qurbaniDayId || selectedDay?.id || 1}`,
          personName: form.personName || rawNewBooking?.qurbaniPersonName || 'Anonymous',
          animal: selected?.animal || selected?.animalType || 'Buffalo',
          hissa: hissa,
          cost: cost * hissa,
          meatWanted: form.meatWanted,
          bookedBy: rawNewBooking?.bookedByAdminName || rawNewBooking?.bookedBy || 'System Administrator',
          createdAt: rawNewBooking?.createdAt || new Date().toISOString(),
        };
        const rawReceipt = rawNewBooking.receiptNumber || rawNewBooking.hissaBookingId || rawNewBooking.id;
        const receiptNo = rawReceipt ? String(rawReceipt).replace(/^#/, '') : 'Confirmed';
        setCreatedBooking(rawNewBooking);
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
        setPersonNameError('');
        setHissaError('');
        setCostError('');
        
        setBookings((prev) => [...prev, normalizedNewBooking]);
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
                  remaining: Math.max((d.remaining !== undefined ? d.remaining : d.capacity) - hissa, 0),
                }
              : d
          )
        );
        patchData?.((prev) => ({
          ...prev,
          bookings: [...(prev?.bookings || []), normalizedNewBooking],
          days: (prev?.days || []).map((d) =>
            String(d.qurbaniDayId || d.id) === String(selectedDay.qurbaniDayId || selectedDay.id)
              ? {
                  ...d,
                  booked: (d.booked || d.bookedPerDay || 0) + hissa,
                  bookedPerDay: (d.bookedPerDay || 0) + hissa,
                  remaining: Math.max((d.remaining !== undefined ? d.remaining : d.capacity) - hissa, 0),
                }
              : d
          ),
          inventory: (prev?.inventory || []).map((x) =>
            String(x.animalId || x.id) === String(selected.animalId || selected.id)
              ? {
                  ...x,
                  bookedHissa: (x.bookedHissa || 0) + hissa,
                  availableHissa: Math.max(availableHissa - hissa, 0),
                }
              : x
          ),
        }));
      } else {
        notify(response.data?.message || 'Failed to create booking.', 'error');
      }
    } catch (error) {
      const resData = error?.response?.data;
      if (resData?.data && typeof resData.data === 'object' && !Array.isArray(resData.data)) {
        if (resData.data.perHissaCost || resData.data.cost) {
          setCostError(resData.data.perHissaCost || resData.data.cost);
        }
        if (resData.data.totalHissa || resData.data.hissa) {
          setHissaError(resData.data.totalHissa || resData.data.hissa);
        }
        if (resData.data.qurbaniPersonName || resData.data.personName) {
          setPersonNameError(resData.data.qurbaniPersonName || resData.data.personName);
        }
      }
      const errMsg = getErrorMessage(error, 'Failed to create booking. Server might be down or token expired.');
      notify(errMsg, 'error');
    }
  };

  const handleDownloadReceipt = async (booking) => {
    if (!booking) return;
    const targetId = booking.hissaBookingId || booking.id;
    const receiptCode = String(booking.receiptNumber || booking.bookingId || booking.id || targetId || '').replace(/^#/, '');
    try {
      setIsDownloading(true);
      notify?.(`Generating PDF receipt for ${receiptCode}...`, 'info');
      const filename = await downloadReceipt(booking);
      notify?.(`Receipt ${filename} downloaded successfully!`, 'success');
    } catch (err) {
      console.error('Failed to download receipt:', err);
      notify?.(err.message || 'Failed to download PDF receipt.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const numCost = Number(form.cost);
  const numHissa = Number(form.hissa);
  const costWholePart = String(form.cost || '').split('.')[0].replace(/\D/g, '');
  const isCostValid =
    form.cost !== '' &&
    !isNaN(numCost) &&
    Number.isFinite(numCost) &&
    costWholePart.length <= MAX_COST_DIGITS &&
    numCost > 0 &&
    numCost <= MAX_COST_PER_HISSA &&
    (numHissa <= 0 || isNaN(numHissa) || numHissa * numCost <= MAX_TOTAL_BOOKING_COST) &&
    !costError;
  const isHissaValid =
    form.hissa !== '' &&
    !isNaN(numHissa) &&
    Number.isInteger(numHissa) &&
    numHissa >= 1 &&
    numHissa <= MAX_HISSA_COUNT &&
    (!selected || (availableHissa > 0 && numHissa <= availableHissa)) &&
    (!selectedDay || (effectiveDayRemaining > 0 && numHissa <= effectiveDayRemaining)) &&
    !hissaError;

  const calculatedTotal =
    isCostValid && isHissaValid && numHissa > 0 && numCost > 0
      ? numHissa * numCost
      : 0;

  const totalFormatted = formatTotalAmount(calculatedTotal);

  return (
    <div>
      <PageIntro
        eyebrow="Hissa booking"
        title="Create a new booking"
        description="Record the person, protect the Hissa and leave a clean trail for the team."
        action={resetFormSession}
        actionLabel="New booking"
        icon={BookOpenCheck}
      />
      <div className="grid min-w-0 gap-6 xl:grid-cols-[1fr_340px]">
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
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                <button
                  type="button"
                  data-testid="button-book-another-hissa"
                  onClick={resetFormSession}
                  className="flex items-center gap-1.5 rounded-lg border border-[#246b59]/30 bg-white/80 px-3 py-1.5 text-xs font-bold text-[#183f35] shadow-sm transition hover:bg-white dark:border-[#52c99a]/30 dark:bg-[#142f26] dark:text-[#edf6f2] dark:hover:bg-[#1a3d31]"
                >
                  <Plus size={14} />
                  <span>Book another Hissa</span>
                </button>
                {createdBooking && (
                  <button
                    type="button"
                    data-testid="button-download-created-receipt"
                    onClick={() => handleDownloadReceipt(createdBooking)}
                    disabled={isDownloading}
                    className="flex items-center gap-1.5 rounded-lg border border-[#246b59]/30 bg-white/80 px-3.5 py-1.5 text-xs font-bold text-[#183f35] shadow-sm transition hover:bg-white dark:border-[#52c99a]/30 dark:bg-[#142f26] dark:text-[#edf6f2] dark:hover:bg-[#1a3d31] disabled:opacity-50"
                  >
                    {isDownloading ? (
                      <RefreshCw size={14} className="animate-spin text-[#246b59] dark:text-[#52c99a]" />
                    ) : (
                      <Download size={14} />
                    )}
                    <span>{isDownloading ? 'Generating...' : 'Download PDF Receipt'}</span>
                  </button>
                )}
                <button
                  type="button"
                  data-testid="button-dismiss-success-banner"
                  aria-label="Dismiss success banner"
                  onClick={() => {
                    setSuccess('');
                    setCreatedBooking(null);
                  }}
                  className="rounded-lg p-1.5 text-[#246b59] transition hover:bg-[#246b59]/10 hover:opacity-100 dark:text-[#52c99a] dark:hover:bg-[#52c99a]/10"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Select Animal inventory">
                <select
                  data-testid="select-inventory"
                  className="input"
                  value={form.inventoryId}
                  onChange={async (e) => {
                    const invId = e.target.value;
                    set('inventoryId', invId);
                    const anim = currentYearInventory.find((x) => String(x.animalId || x.id) === String(invId));
                    if (anim) {
                      if (form.cost && Number(form.cost) > MAX_COST_PER_HISSA) {
                        setCostError(`Cost per Hissa cannot exceed ₹${MAX_COST_PER_HISSA.toLocaleString('en-IN')} (entered amount is out of range or exceeds permitted limit).`);
                      }
                      const syncedDays = await syncDaysForSelectedAnimal(anim);
                      const activeDays = syncedDays || days;
                      const avail = anim.availableHissa !== undefined
                        ? anim.availableHissa
                        : ((anim.totalHissa || 0) - (anim.bookedHissa || 0));

                      let currentDayObj = selectedDay;
                      if (form.day) {
                        const dayObj = activeDays.find((x) => String(x.qurbaniDayId || x.id) === String(form.day) || x.name === form.day);
                        const dayRem = dayObj
                          ? (dayObj.remaining !== undefined
                              ? dayObj.remaining
                              : ((dayObj.capacity || dayObj.totalPerDay || 100) - (dayObj.booked || 0)))
                          : 0;
                        const effDayRem = dayRem > 0 ? Math.min(dayRem, Math.max(avail, 0)) : Math.max(avail, 0);
                        if (effDayRem <= 0 && avail <= 0) {
                          set('day', '');
                          currentDayObj = null;
                        } else {
                          currentDayObj = dayObj;
                        }
                      }

                      const err = validateHissaValue(form.hissa, anim, currentDayObj);
                      setHissaError(err);
                    } else {
                      await syncDaysForSelectedAnimal(null);
                      const err = validateHissaValue(form.hissa, null, selectedDay);
                      setHissaError(err);
                    }
                  }}
                  required
                >
                  <option value="">Choose an animal batch</option>
                  {currentYearInventory.map((x) => {
                    const avail = x.availableHissa !== undefined
                      ? x.availableHissa
                      : ((x.totalHissa || 0) - (x.bookedHissa || 0));
                    return (
                      <option key={x.animalId || x.id} value={x.animalId || x.id}>
                        {x.animalType || 'Batch'} #{x.animalId || x.id} ({x.batchYear || activeSeasonYear}) · {formatNumber(avail)} Hissa available
                      </option>
                    );
                  })}
                  {currentYearInventory.length === 0 && (
                    <option value="" disabled>
                      No animal batches available for {activeSeasonYear} season
                    </option>
                  )}
                </select>
              </Field>
              <Field label="Select Qurbani day">
                <select
                  data-testid="select-day"
                  className="input"
                  value={form.day}
                  onChange={(e) => {
                    const dayId = e.target.value;
                    set('day', dayId);
                    const dayObj = days.find((x) => String(x.qurbaniDayId || x.id) === String(dayId) || x.name === dayId);
                    const err = validateHissaValue(form.hissa, selected, dayObj);
                    setHissaError(err);
                  }}
                  required
                >
                  <option value="">Choose a day</option>
                  {days.map((x) => {
                    const dRem = x.remaining !== undefined
                      ? x.remaining
                      : ((x.capacity || x.totalPerDay || 100) - (x.booked || 0));
                    const effectiveRem = selected
                      ? (dRem > 0 ? Math.min(dRem, Math.max(availableHissa, 0)) : Math.max(availableHissa, 0))
                      : dRem;
                    const isFull = effectiveRem <= 0;
                    return (
                      <option
                        key={x.qurbaniDayId || x.id}
                        value={x.qurbaniDayId || x.id}
                        disabled={isFull}
                      >
                        {x.name} · {formatNumber(effectiveRem)} remaining{isFull ? ' (Full)' : ''}
                      </option>
                    );
                  })}
                </select>
                {selected && (
                  <p className="mt-1 text-[11px] text-[#7b867e] dark:text-[#8ba79b]">
                    Capacity capped by {selected.animalType || 'animal'} #{selected.animalId || selected.id} stock (max {formatNumber(availableHissa)} Hissa).
                  </p>
                )}
              </Field>
            </div>
            <Field label="Qurbani person name">
              <input
                data-testid="input-person-name"
                className={`input ${personNameError ? '!border-[#dc2626] !ring-[#dc2626]/20' : ''}`}
                value={form.personName}
                onChange={handlePersonNameChange}
                placeholder="e.g. Family name or organization"
                required
              />
              {personNameError && (
                <p data-testid="error-person-name" className="mt-1.5 text-xs text-[#a63f32] dark:text-[#fca5a5]">
                  {personNameError}
                </p>
              )}
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Number of Hissa">
                <input
                  data-testid="input-booking-hissa"
                  className={`input ${hissaError ? '!border-[#dc2626] !ring-[#dc2626]/20' : ''}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={MAX_HISSA_DIGITS}
                  value={form.hissa}
                  onKeyDown={handleHissaKeyDown}
                  onChange={handleHissaChange}
                  onPaste={handleHissaPaste}
                  placeholder="0"
                  required
                />
                {hissaError ? (
                  <p data-testid="error-booking-hissa" className="mt-1 min-w-0 break-words [overflow-wrap:anywhere] text-xs text-[#a63f32] dark:text-[#fca5a5]">{hissaError}</p>
                ) : (
                  (selected || selectedDay) && (
                    <p className="mt-1 text-[11px] text-[#7b867e] dark:text-[#8ba79b]">
                      Max bookable: {formatNumber(
                        selected && selectedDay
                          ? Math.min(availableHissa, dayRemaining)
                          : (selected ? availableHissa : dayRemaining)
                      )} Hissa
                    </p>
                  )
                )}
              </Field>
              <Field label="Cost per Hissa (₹)">
                <input
                  data-testid="input-booking-cost"
                  className={`input ${costError ? '!border-[#dc2626] !ring-[#dc2626]/20' : ''}`}
                  type="text"
                  inputMode="decimal"
                  maxLength={MAX_COST_INPUT_LENGTH}
                  value={form.cost}
                  onKeyDown={handleCostKeyDown}
                  onChange={handleCostChange}
                  onPaste={handleCostPaste}
                  onBlur={handleCostBlur}
                  placeholder="e.g. 15000"
                  required
                />
                {costError && (
                  <p data-testid="error-booking-cost" className="mt-1 min-w-0 break-words [overflow-wrap:anywhere] text-xs text-[#a63f32] dark:text-[#fca5a5]">{costError}</p>
                )}
                {calculatedTotal > 0 && !costError && isCostValid && (
                  <div className="mt-1.5 flex min-w-0 max-w-full flex-wrap items-center gap-1.5 rounded-lg bg-[#eef7f2] px-2.5 py-1.5 text-xs font-semibold text-[#246b59] dark:bg-[#153427] dark:text-[#52c99a] overflow-hidden">
                    <span className="shrink-0">Total calculated:</span>
                    <span
                      className="font-bold text-[#183f35] dark:text-[#edf6f2] break-words [overflow-wrap:anywhere]"
                      title={totalFormatted.full}
                    >
                      {totalFormatted.display}
                    </span>
                    <span className="truncate max-w-full text-[11px] text-[#567a6d] dark:text-[#90b3a3]">
                      ({form.hissa} hissa × ₹{formatNumber(Number(form.cost))})
                    </span>
                  </div>
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
                onClick={() => {
                  resetFormSession();
                  navigate('/bookings');
                }}
                className="btn-secondary justify-center"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="button-reset-booking-form"
                onClick={resetFormSession}
                className="btn-secondary justify-center flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                <span>Reset form</span>
              </button>
              <button
                data-testid="button-submit-booking"
                className="btn-primary justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={
                  !form.personName?.trim() ||
                  Boolean(personNameError) ||
                  !form.inventoryId ||
                  !form.day ||
                  !form.hissa ||
                  !form.cost ||
                  !isCostValid ||
                  !isHissaValid ||
                  (selected && Number(selected.batchYear) !== Number(activeSeasonYear))
                }
              >
                Confirm booking <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </section>
        <aside className="min-w-0 space-y-4">
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
          <div className="max-w-full min-w-0 overflow-hidden rounded-2xl bg-[#1f5548] p-5 text-[#f9f4e9]">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#e6b65b]">Live check</p>
            <h3 className="mt-2 font-display text-lg font-extrabold">Before you confirm</h3>
            <div className="mt-4 space-y-3 text-sm text-[#c6d9d0]">
              <div className="flex min-w-0 items-baseline justify-between gap-3">
                <span className="shrink-0">Inventory available</span>
                <strong className="min-w-0 text-right text-[#f9f4e9] break-words [overflow-wrap:anywhere]">
                  {selected ? `${formatNumber(availableHissa)} Hissa` : '—'}
                </strong>
              </div>
              <div className="flex min-w-0 items-baseline justify-between gap-3">
                <span className="shrink-0">Day remaining</span>
                <strong className="min-w-0 text-right text-[#f9f4e9] break-words [overflow-wrap:anywhere]">
                  {selectedDay ? `${formatNumber(effectiveDayRemaining)} Hissa` : '—'}
                </strong>
              </div>
              <div className="flex min-w-0 items-baseline justify-between gap-3">
                <span className="shrink-0">Animal type</span>
                <strong className="min-w-0 text-right text-[#f9f4e9] break-words [overflow-wrap:anywhere]">{selected?.animalType || '—'}</strong>
              </div>
              {calculatedTotal > 0 && !costError && isCostValid && (
                <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2 border-t border-[#2e7464] pt-2 font-semibold">
                  <span className="shrink-0 text-[#e6b65b]">Total Amount</span>
                  <strong
                    data-testid="live-check-total-amount"
                    title={totalFormatted.full}
                    className="ml-auto min-w-0 max-w-full text-right font-bold text-[#e6b65b] break-words [overflow-wrap:anywhere] text-sm sm:text-base leading-tight"
                  >
                    {totalFormatted.display}
                  </strong>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
