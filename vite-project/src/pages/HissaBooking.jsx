import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Minus,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Building2,
  Users,
  User,
  Trash2,
} from 'lucide-react';
import { PageIntro } from './Dashboard.jsx';
import { Field } from '../components/Modal.jsx';
import { formatNumber, deduplicateBookings } from '../data/mockData.js';
import { api } from '../services/api.js';
import { getUser } from '../utils/auth.js';
import { getErrorMessage } from './AnimalInventory.jsx';
import { downloadReceipt } from '../utils/receipt.js';
import { getActiveSeasonYear } from '../utils/season.js';
import { getCollectionCentres } from '../services/collectionCentreApi.js';
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

const getMemberPlaceholder = (index) => `Member ${index + 1}`;

const validateMemberName = (val) => {
  const trimmed = (val || '').trim();
  if (!trimmed) {
    return 'Member name is required.';
  }
  if (trimmed.length < 2) {
    return 'Member name must be at least 2 characters.';
  }
  if (trimmed.length > 50) {
    return 'Member name cannot exceed 50 characters.';
  }
  if (/\d/.test(trimmed)) {
    return 'Member name must contain letters only (no numbers).';
  }
  if (!/^[a-zA-Z\s.'-]+$/.test(trimmed) || !/[a-zA-Z]/.test(trimmed)) {
    return 'Name can only contain alphabetical letters, spaces, hyphens, and dots.';
  }
  return '';
};

export default function HissaBooking({
  data,
  patchData,
  notify,
  navigate,
  registerNavBlocker,
  unregisterNavBlocker,
}) {
  const location = useLocation();

  const [form, setForm] = useState({
    inventoryId: '',
    day: '',
    collectionCentreId: '',
    personName: '',
    hissa: '',
    cost: '',
    meatWanted: 'Yes',
  });
  const [bookingMode, setBookingMode] = useState('single'); // 'single' | 'multi'
  const [members, setMembers] = useState([
    { memberName: '', hissaCount: 1 },
    { memberName: '', hissaCount: 1 },
  ]);
  const [memberErrors, setMemberErrors] = useState({});
  const [collectionCentres, setCollectionCentres] = useState(data.collectionCentres || []);
  const [personNameError, setPersonNameError] = useState('');
  const [costError, setCostError] = useState('');
  const [hissaError, setHissaError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdBooking, setCreatedBooking] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDaysSyncing, setIsDaysSyncing] = useState(false);
  const [inventory, setInventory] = useState(data.inventory || []);
  const [days, setDays] = useState(data.days || []);
  const [bookings, setBookings] = useState(() => deduplicateBookings(data.bookings || []));
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetFormSession = useCallback(() => {
    setForm({
      inventoryId: '',
      day: '',
      collectionCentreId: '',
      personName: '',
      hissa: '',
      cost: '',
      meatWanted: 'Yes',
    });
    setBookingMode('single');
    setMembers([
      { memberName: '', hissaCount: 1 },
      { memberName: '', hissaCount: 1 },
    ]);
    setMemberErrors({});
    setPersonNameError('');
    setCostError('');
    setHissaError('');
    setSuccess('');
    setCreatedBooking(null);
  }, []);

  const isFormDirty = Boolean(
    !success &&
    (
      form.inventoryId ||
      form.day ||
      form.collectionCentreId ||
      form.personName?.trim() ||
      (bookingMode === 'multi' && (members.length > 1 || members.some((m) => m.memberName?.trim() || m.hissaCount > 1))) ||
      (bookingMode === 'single' && form.hissa && form.hissa !== '0') ||
      form.cost ||
      (form.meatWanted && form.meatWanted !== 'Yes')
    )
  );

  // Register navigation blocker whenever form has unsaved booking details
  useEffect(() => {
    if (isFormDirty) {
      registerNavBlocker?.(() => isFormDirty);
    } else {
      unregisterNavBlocker?.();
    }
    return () => {
      unregisterNavBlocker?.();
    };
  }, [isFormDirty, registerNavBlocker, unregisterNavBlocker]);

  // Warn user when trying to close or reload browser window with unsaved booking details
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isFormDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isFormDirty]);

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
        const [invRes, daysRes, dashDaysRes, bkRes, centresRes] = await Promise.all([
          api.get('/api/v1/animals', { params: { batchYear: activeSeasonYear } }).catch(() => null),
          api.get('/api/v1/qurbani-days').catch(() => null),
          api.get('/api/v1/dashboard/bookings/by-qurbani-day').catch(() => null),
          api.get('/api/v1/hissa-bookings?size=500').catch(() => null),
          getCollectionCentres(true).catch(() => null),
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
          if (Array.isArray(centresRes) && centresRes.length > 0) {
            const localCentres = Array.isArray(data?.collectionCentres) ? data.collectionCentres : [];
            const merged = centresRes.map((sc) => {
              const localMatch = localCentres.find(
                (lc) => String(lc.collectionCentreId || lc.id) === String(sc.collectionCentreId || sc.id)
              );
              const loc = sc.location || sc.address || localMatch?.location || localMatch?.address || '';
              return {
                ...sc,
                location: loc,
                address: loc,
              };
            });
            setCollectionCentres(merged);
          } else if (data.collectionCentres && data.collectionCentres.length > 0) {
            setCollectionCentres(data.collectionCentres.filter((c) => c.isActive !== false));
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

  const validateHissaValue = (
    hissaVal,
    currentSelected = selected,
    currentDay = selectedDay,
    mode = bookingMode,
    currentMembers = members
  ) => {
    if (hissaVal === '' || hissaVal === undefined || hissaVal === null) return '';
    if (mode === 'multi' && currentMembers && currentMembers.length < 2) {
      return 'Please allocate at least 1 Hissa across family members.';
    }
    const num = Number(hissaVal);
    if (isNaN(num) || !Number.isFinite(num) || num < 1 || !Number.isInteger(num)) {
      if (mode === 'multi') {
        return 'Please allocate at least 1 Hissa across family members.';
      }
      return 'Please enter the number of Hissas (minimum 1).';
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
          return `Requested ${num} ${num === 1 ? 'Hissa exceeds' : 'Hissas exceed'} available animal batch capacity (${animAvail} remaining).`;
        } else {
          return `Requested ${num} ${num === 1 ? 'Hissa exceeds' : 'Hissas exceed'} remaining day capacity (${dayRem} remaining).`;
        }
      }
    } else if (animAvail !== null && num > animAvail) {
      return `Requested ${num} ${num === 1 ? 'Hissa exceeds' : 'Hissas exceed'} available animal batch capacity (${animAvail} remaining).`;
    } else if (dayRem !== null && num > dayRem) {
      return `Requested ${num} ${num === 1 ? 'Hissa exceeds' : 'Hissas exceed'} remaining day capacity (${dayRem} remaining).`;
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

  const selectedCentre = useMemo(() => {
    return collectionCentres.find(
      (c) => String(c.collectionCentreId || c.id) === String(form.collectionCentreId)
    );
  }, [collectionCentres, form.collectionCentreId]);

  const handleAddMember = () => {
    const newIndex = members.length;
    setMembers((prev) => [...prev, { memberName: '', hissaCount: 1 }]);
    setTimeout(() => {
      const input = document.querySelector(`[data-testid="input-member-name-${newIndex}"]`);
      input?.focus();
    }, 60);
  };

  const firstEmptyMemberIndex = useMemo(() => {
    if (bookingMode !== 'multi') return -1;
    return members.findIndex((m) => !m.memberName?.trim());
  }, [bookingMode, members]);

  const handleRemoveMember = (index) => {
    if (members.length <= 2) return;
    setMembers((prev) => prev.filter((_, i) => i !== index));
    setMemberErrors((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => {
        const idx = Number(k);
        if (idx < index) {
          next[idx] = prev[idx];
        } else if (idx > index) {
          next[idx - 1] = prev[idx];
        }
      });
      return next;
    });
  };

  const handleMemberChange = (index, field, value) => {
    setMembers((prev) => {
      const next = [...prev];
      if (field === 'hissaCount') {
        const count = Math.max(1, parseInt(String(value).replace(/\D/g, ''), 10) || 1);
        next[index] = { ...next[index], hissaCount: count };
      } else if (field === 'memberName') {
        next[index] = { ...next[index], memberName: value };
        const err = validateMemberName(value);
        setMemberErrors((prevErr) => {
          const nextErr = { ...prevErr };
          if (err) {
            nextErr[index] = err;
          } else {
            delete nextErr[index];
          }
          return nextErr;
        });
      }
      return next;
    });
  };

  const effectiveTotalHissa = useMemo(() => {
    if (bookingMode === 'single') {
      return Number(form.hissa) || 0;
    }
    return members.reduce((sum, m) => sum + (Number(m.hissaCount) || 0), 0);
  }, [bookingMode, form.hissa, members]);

  // Synchronize hissa validation error dynamically whenever inputs or capacities change
  useEffect(() => {
    if (bookingMode === 'single') {
      if (!form.hissa || form.hissa === '') {
        setHissaError('');
      } else {
        setHissaError(validateHissaValue(form.hissa, selected, selectedDay, 'single'));
      }
    } else {
      if (members.length < 2 || effectiveTotalHissa < 1) {
        setHissaError('Please allocate at least 1 Hissa across family members.');
      } else {
        setHissaError(validateHissaValue(effectiveTotalHissa, selected, selectedDay, 'multi', members));
      }
    }
  }, [bookingMode, form.hissa, effectiveTotalHissa, members, selected, selectedDay]);

  const submit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setSuccess('');

    // 1. Animal Inventory check
    if (!form.inventoryId || !selected) {
      const el = document.querySelector('[data-testid="select-inventory"]');
      el?.focus();
      return notify('Please select an Animal Inventory batch.', 'error');
    }
    if (selected && Number(selected.batchYear) !== Number(activeSeasonYear)) {
      const err = `Hissa booking is allowed only for Animal Inventory of the current year. Current year: ${activeSeasonYear}, animal batch year: ${selected.batchYear || 'N/A'}`;
      return notify(err, 'error');
    }

    // 2. Qurbani Day check
    if (!form.day || !selectedDay) {
      const el = document.querySelector('[data-testid="select-day"]');
      el?.focus();
      return notify('Please select a Qurbani day.', 'error');
    }

    // 3. Person / Family name check
    const trimmedPersonName = (form.personName || '').trim();
    if (!trimmedPersonName) {
      const msg = bookingMode === 'multi' ? 'Please enter the Family or Group booking name.' : 'Please enter the Qurbani person name.';
      setPersonNameError(msg);
      const el = document.querySelector('[data-testid="input-person-name"]');
      el?.focus();
      return notify(msg, 'error');
    }
    if (trimmedPersonName.length < 2) {
      const msg = bookingMode === 'multi' ? 'Family or Group booking name must be at least 2 characters.' : 'Qurbani person name must be at least 2 characters.';
      setPersonNameError(msg);
      const el = document.querySelector('[data-testid="input-person-name"]');
      el?.focus();
      return notify(msg, 'error');
    }
    if (!/^[a-zA-Z\s-]+$/.test(trimmedPersonName) || !/[a-zA-Z]/.test(trimmedPersonName)) {
      const err = 'Please enter a valid name containing alphabetical characters, spaces, and hyphens only.';
      setPersonNameError(err);
      const el = document.querySelector('[data-testid="input-person-name"]');
      el?.focus();
      return notify(err, 'error');
    }
    setPersonNameError('');

    // 4. Cost check
    const cost = Number(form.cost);
    const costWholeDigits = String(form.cost || '').split('.')[0].replace(/\D/g, '').length;
    if (!form.cost || isNaN(cost) || !Number.isFinite(cost) || cost <= 0) {
      const err = 'Please enter a valid positive cost per Hissa.';
      setCostError(err);
      const el = document.querySelector('[data-testid="input-booking-cost"]');
      el?.focus();
      return notify(err, 'error');
    }
    if (costWholeDigits > MAX_COST_DIGITS || cost > MAX_COST_PER_HISSA) {
      const err = `Cost per Hissa cannot exceed ₹${MAX_COST_PER_HISSA.toLocaleString('en-IN')} (entered amount is out of range or exceeds permitted limit).`;
      setCostError(err);
      const el = document.querySelector('[data-testid="input-booking-cost"]');
      el?.focus();
      return notify(err, 'error');
    }
    setCostError('');

    // 5. Member / Hissa validation
    if (bookingMode === 'multi') {
      if (!members || members.length < 2) {
        return notify('Family / Multi-Person booking requires at least 2 family members. For a single person, please select Single Person Booking.', 'error');
      }
      const newErrors = {};
      let firstInvalidIndex = -1;
      for (let i = 0; i < members.length; i++) {
        const m = members[i];
        const mErr = validateMemberName(m.memberName);
        if (mErr) {
          newErrors[i] = mErr;
          if (firstInvalidIndex === -1) firstInvalidIndex = i;
        }
        const mCount = Number(m.hissaCount);
        if (!mCount || isNaN(mCount) || mCount < 1 || !Number.isInteger(mCount)) {
          return notify(`Member #${i + 1} must have at least 1 Hissa.`, 'error');
        }
      }
      if (firstInvalidIndex !== -1) {
        setMemberErrors(newErrors);
        const el = document.querySelector(`[data-testid="input-member-name-${firstInvalidIndex}"]`);
        el?.focus();
        return notify(`Please enter the full name for Member #${firstInvalidIndex + 1}.`, 'error');
      }
    } else {
      if (!form.hissa || Number(form.hissa) < 1) {
        const err = 'Please enter the number of Hissas (minimum 1).';
        setHissaError(err);
        const el = document.querySelector('[data-testid="input-booking-hissa"]');
        el?.focus();
        return notify(err, 'error');
      }
    }

    const hissa = effectiveTotalHissa;

    if (!hissa || isNaN(hissa) || hissa < 1 || !Number.isInteger(hissa)) {
      const err = bookingMode === 'multi'
        ? 'Please allocate at least 1 Hissa across family members.'
        : 'Please enter the number of Hissas (minimum 1).';
      setHissaError(err);
      return notify(err, 'error');
    }
    const hissaValidationErr = validateHissaValue(hissa, selected, selectedDay, bookingMode);
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
      collectionCentreId: form.collectionCentreId ? Number(form.collectionCentreId) : null,
      bookedByAdminName: adminName,
      qurbaniPersonName: trimmedPersonName,
      perHissaCost: cost,
      meatWanted: form.meatWanted === 'Yes' || form.meatWanted === true,
      ...(bookingMode === 'multi'
        ? {
            members: members.map((m) => ({
              memberName: m.memberName.trim(),
              hissaCount: Number(m.hissaCount) || 1,
            })),
          }
        : {
            totalHissa: hissa,
            members: [{ memberName: trimmedPersonName, hissaCount: hissa }],
          }),
    };

    setIsSubmitting(true);
    try {
      const response = await api.post('/api/v1/hissa-bookings', payload);

      if (response.data?.success) {
        const rawNewBooking = response.data.data;
        const matchedCentre = collectionCentres.find(
          (c) => String(c.collectionCentreId || c.id) === String(form.collectionCentreId)
        );
        const normalizedMembers = rawNewBooking?.members?.length
          ? rawNewBooking.members
          : bookingMode === 'multi'
          ? members.map((m, idx) => ({
              bookingMemberId: idx + 1,
              memberName: m.memberName.trim(),
              hissaCount: Number(m.hissaCount) || 1,
            }))
          : [{ bookingMemberId: 1, memberName: trimmedPersonName, hissaCount: hissa }];

        const normalizedNewBooking = {
          ...rawNewBooking,
          day: selectedDay?.name || `Day ${rawNewBooking?.qurbaniDayId || selectedDay?.id || 1}`,
          personName: trimmedPersonName || rawNewBooking?.qurbaniPersonName || 'Anonymous',
          qurbaniPersonName: trimmedPersonName || rawNewBooking?.qurbaniPersonName || 'Anonymous',
          animal: selected?.animal || selected?.animalType || 'Buffalo',
          animalType: selected?.animalType || 'Buffalo',
          animalId: Number(selected.animalId || selected.id),
          qurbaniDayId: Number(selectedDay.qurbaniDayId || selectedDay.id),
          collectionCentreId: form.collectionCentreId ? Number(form.collectionCentreId) : null,
          collectionCentreName: matchedCentre?.name || rawNewBooking?.collectionCentreName || null,
          collectionCentre: matchedCentre || rawNewBooking?.collectionCentre || null,
          hissa: hissa,
          totalHissa: hissa,
          cost: cost * hissa,
          totalHissaCost: cost * hissa,
          perHissaCost: cost,
          meatWanted: form.meatWanted,
          bookedBy: rawNewBooking?.bookedByAdminName || rawNewBooking?.bookedBy || adminName,
          bookedByAdminName: rawNewBooking?.bookedByAdminName || rawNewBooking?.bookedBy || adminName,
          members: normalizedMembers,
          bookingMode: bookingMode,
          isFamily: bookingMode === 'multi',
          createdAt: rawNewBooking?.createdAt || new Date().toISOString(),
        };
        const rawReceipt = rawNewBooking?.receiptNumber || rawNewBooking?.hissaBookingId || rawNewBooking?.id;
        const receiptNo = rawReceipt ? String(rawReceipt).replace(/^#/, '') : 'Confirmed';
        setCreatedBooking(normalizedNewBooking);
        setSuccess(`Booking ${receiptNo} confirmed for ${trimmedPersonName}.`);
        notify(`Booking ${receiptNo} created successfully!`, 'success');

        resetFormSession();

        setBookings((prev) => deduplicateBookings([...prev, normalizedNewBooking]));
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
          bookings: deduplicateBookings([...(prev?.bookings || []), normalizedNewBooking]),
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
    } finally {
      setIsSubmitting(false);
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
    (effectiveTotalHissa <= 0 || isNaN(effectiveTotalHissa) || effectiveTotalHissa * numCost <= MAX_TOTAL_BOOKING_COST) &&
    !costError;

  const isHissaValid = useMemo(() => {
    if (bookingMode === 'single') {
      const singleErr = validateHissaValue(form.hissa, selected, selectedDay, 'single');
      return (
        form.hissa !== '' &&
        !isNaN(numHissa) &&
        Number.isInteger(numHissa) &&
        numHissa >= 1 &&
        numHissa <= MAX_HISSA_COUNT &&
        (!selected || (availableHissa > 0 && numHissa <= availableHissa)) &&
        (!selectedDay || (effectiveDayRemaining > 0 && numHissa <= effectiveDayRemaining)) &&
        !singleErr
      );
    }
    const hasMemberErrors = Object.keys(memberErrors).some((k) => Boolean(memberErrors[k]));
    const allMembersValid =
      members.length >= 2 &&
      !hasMemberErrors &&
      members.every((m) => {
        const name = (m.memberName || '').trim();
        const cnt = Number(m.hissaCount);
        return (
          name.length >= 2 &&
          !/\d/.test(name) &&
          /^[a-zA-Z\s.'-]+$/.test(name) &&
          /[a-zA-Z]/.test(name) &&
          Number.isInteger(cnt) &&
          cnt >= 1
        );
      });
    const multiErr = validateHissaValue(effectiveTotalHissa, selected, selectedDay, 'multi', members);
    return (
      allMembersValid &&
      effectiveTotalHissa >= 1 &&
      effectiveTotalHissa <= MAX_HISSA_COUNT &&
      (!selected || (availableHissa > 0 && effectiveTotalHissa <= availableHissa)) &&
      (!selectedDay || (effectiveDayRemaining > 0 && effectiveTotalHissa <= effectiveDayRemaining)) &&
      !multiErr
    );
  }, [
    bookingMode,
    form.hissa,
    numHissa,
    selected,
    availableHissa,
    selectedDay,
    effectiveDayRemaining,
    members,
    memberErrors,
    effectiveTotalHissa,
  ]);

  const calculatedTotal =
    !isNaN(numCost) && numCost > 0 && effectiveTotalHissa > 0
      ? effectiveTotalHissa * numCost
      : 0;

  const totalFormatted = formatTotalAmount(calculatedTotal);

  return (
    <div>
      <PageIntro
        eyebrow="Hissa Booking"
        title="Create a New Booking"
        description="Record the person, protect the Hissa and leave a clean trail for the team."
        action={resetFormSession}
        actionLabel="New Booking"
        icon={BookOpenCheck}
      />
      <div className="grid min-w-0 gap-6 xl:grid-cols-[1fr_340px]">
        <section className="card-surface min-w-0 rounded-2xl p-5 sm:p-8">
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
              className="relative mb-6 rounded-2xl border border-[#b9d9c4] bg-[#edf8ef] p-4 sm:p-5 text-sm text-[#246b59] dark:border-[#225744] dark:bg-[#132c22] dark:text-[#52c99a] min-w-0 max-w-full shadow-sm"
            >
              <button
                type="button"
                data-testid="button-dismiss-success-banner"
                aria-label="Dismiss success banner"
                onClick={() => {
                  setSuccess('');
                  setCreatedBooking(null);
                }}
                className="absolute top-3.5 right-3.5 rounded-lg p-1.5 text-[#246b59] transition hover:bg-[#246b59]/10 hover:opacity-100 dark:text-[#52c99a] dark:hover:bg-[#52c99a]/10"
              >
                <X size={16} />
              </button>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pr-8 min-w-0">
                <div className="flex min-w-0 items-start gap-3 flex-1">
                  <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#246b59]/15 text-[#246b59] dark:bg-[#52c99a]/20 dark:text-[#52c99a]">
                    <CircleCheck size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm leading-snug break-words [overflow-wrap:anywhere] text-[#183f35] dark:text-[#eaf5ef]">
                      {success}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        data-testid="button-view-created-booking"
                        onClick={() => navigate('/bookings')}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#246b59] underline hover:text-[#183f35] dark:text-[#52c99a] dark:hover:text-[#a3e9c7]"
                      >
                        <span>View all bookings</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-1 lg:pt-0">
                  <button
                    type="button"
                    data-testid="button-book-another-hissa"
                    onClick={resetFormSession}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#246b59]/30 bg-white/90 px-3.5 py-2 text-xs font-bold text-[#183f35] shadow-sm transition hover:bg-white dark:border-[#52c99a]/30 dark:bg-[#142f26] dark:text-[#edf6f2] dark:hover:bg-[#1a3d31]"
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
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#246b59] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#1b5344] active:scale-[0.98] dark:bg-[#52c99a] dark:text-[#0e271f] dark:hover:bg-[#63d6a8] disabled:opacity-50"
                    >
                      {isDownloading ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Download size={14} />
                      )}
                      <span>{isDownloading ? 'Generating...' : 'Download PDF Receipt'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          <form onSubmit={submit} className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Select Animal Inventory">
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

                      const err = validateHissaValue(bookingMode === 'multi' ? effectiveTotalHissa : form.hissa, anim, currentDayObj);
                      setHissaError(err);
                    } else {
                      await syncDaysForSelectedAnimal(null);
                      const err = validateHissaValue(bookingMode === 'multi' ? effectiveTotalHissa : form.hissa, null, selectedDay);
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

              <Field label="Select Qurbani Day">
                <select
                  data-testid="select-day"
                  className="input"
                  value={form.day}
                  onChange={(e) => {
                    const dayId = e.target.value;
                    set('day', dayId);
                    const dayObj = days.find((x) => String(x.qurbaniDayId || x.id) === String(dayId) || x.name === dayId);
                    const err = validateHissaValue(bookingMode === 'multi' ? effectiveTotalHissa : form.hissa, selected, dayObj);
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
                    Max {formatNumber(availableHissa)} Hissa in stock.
                  </p>
                )}
              </Field>

              <Field label="Collection Centre (Optional)">
                <select
                  data-testid="select-collection-centre"
                  className="input"
                  value={form.collectionCentreId}
                  onChange={(e) => set('collectionCentreId', e.target.value)}
                >
                  <option value="">Choose a collection centre (optional)</option>
                  {collectionCentres.map((centre) => {
                    const loc = (centre.location || centre.address || '').trim();
                    return (
                      <option
                        key={centre.collectionCentreId || centre.id}
                        value={centre.collectionCentreId || centre.id}
                      >
                        {centre.name}{loc ? ` (${loc})` : ''}
                      </option>
                    );
                  })}
                </select>
                {selectedCentre ? (
                  <p className="mt-1 text-[11px] font-semibold text-[#246b59] dark:text-[#52c99a] flex items-center gap-1">
                    <Building2 size={11} className="shrink-0" />
                    <span>Selected: {selectedCentre.name}</span>
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-[#7b867e] dark:text-[#8ba79b]">
                    Physical centre for meat pickup/distribution.
                  </p>
                )}
              </Field>
            </div>

            {/* Booking Mode Switcher */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-[.1em] text-[#6b776f] dark:text-[#9bb8ab]">
                Booking Type
              </label>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#eee8dc]/70 p-1 dark:bg-[#142e24] border border-[#ded8ca] dark:border-[#1e493b]">
                <button
                  type="button"
                  data-testid="button-mode-single"
                  onClick={() => {
                    setBookingMode('single');
                    setHissaError(validateHissaValue(form.hissa, selected, selectedDay, 'single'));
                  }}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-xs sm:text-sm font-bold transition ${
                    bookingMode === 'single'
                      ? 'bg-white dark:bg-[#1f5548] text-[#183f35] dark:text-[#f8f3e7] shadow-sm'
                      : 'text-[#6f7b73] dark:text-[#8ba79b] hover:text-[#183f35] dark:hover:text-[#edf6f2]'
                  }`}
                >
                  <User size={15} />
                  <span>Single Person Booking</span>
                </button>
                <button
                  type="button"
                  data-testid="button-mode-multi"
                  onClick={() => {
                    setBookingMode('multi');
                    setMembers((prev) => {
                      if (prev.length < 2) {
                        return [
                          prev[0] || { memberName: '', hissaCount: 1 },
                          { memberName: '', hissaCount: 1 },
                        ];
                      }
                      return prev;
                    });
                  }}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-xs sm:text-sm font-bold transition ${
                    bookingMode === 'multi'
                      ? 'bg-white dark:bg-[#1f5548] text-[#183f35] dark:text-[#f8f3e7] shadow-sm'
                      : 'text-[#6f7b73] dark:text-[#8ba79b] hover:text-[#183f35] dark:hover:text-[#edf6f2]'
                  }`}
                >
                  <Users size={15} />
                  <span>Family / Multi-Person Booking</span>
                </button>
              </div>
            </div>

            {/* Mode-specific Fields */}
            {bookingMode === 'single' ? (
              <>
                <Field label="Qurbani Person Name">
                  <input
                    data-testid="input-person-name"
                    className={`input ${personNameError ? '!border-[#dc2626] !ring-[#dc2626]/20' : ''}`}
                    value={form.personName}
                    onChange={handlePersonNameChange}
                    placeholder="e.g. Mohammad Irfan"
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
              </>
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Family / Group Booking Name">
                    <input
                      data-testid="input-person-name"
                      className={`input ${personNameError ? '!border-[#dc2626] !ring-[#dc2626]/20' : ''}`}
                      value={form.personName}
                      onChange={handlePersonNameChange}
                      placeholder="Enter family or group name (e.g. Farooqi Family)"
                      required
                    />
                    {personNameError && (
                      <p data-testid="error-person-name" className="mt-1.5 text-xs text-[#a63f32] dark:text-[#fca5a5]">
                        {personNameError}
                      </p>
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
                        <span className="shrink-0">Family total:</span>
                        <span
                          className="font-bold text-[#183f35] dark:text-[#edf6f2] break-words [overflow-wrap:anywhere]"
                          title={totalFormatted.full}
                        >
                          {totalFormatted.display}
                        </span>
                        <span className="truncate max-w-full text-[11px] text-[#567a6d] dark:text-[#90b3a3]">
                          ({effectiveTotalHissa} hissas × ₹{formatNumber(Number(form.cost))})
                        </span>
                      </div>
                    )}
                  </Field>
                </div>

                {/* Dynamic Family Members Component */}
                <div className="rounded-2xl border border-[#ded8ca] bg-[#fbf9f4]/60 p-4 sm:p-5 dark:border-[#1e493b] dark:bg-[#11271f]/50 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eee8dc] pb-3 dark:border-[#1e493b]">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#246b59]/10 text-[#246b59] dark:bg-[#52c99a]/10 dark:text-[#52c99a]">
                        <Users size={16} />
                      </div>
                      <div>
                        <h4 className="font-display text-sm font-bold text-[#183f35] dark:text-[#edf6f2]">
                          Family Members &amp; Hissa Breakdown
                        </h4>
                        <p className="text-[11px] text-[#7b867e] dark:text-[#92b1a3]">
                          Record individual family members and their designated Hissa count.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#e4efe7] px-2.5 py-1 text-xs font-bold text-[#246b59] dark:bg-[#193a2f] dark:text-[#4ade80]">
                        Total Hissas: {effectiveTotalHissa}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {members.map((member, index) => {
                      const memberCost = (Number(member.hissaCount) || 0) * (Number(form.cost) || 0);
                      const hasErr = Boolean(memberErrors[index]);
                      return (
                        <div
                          key={index}
                          data-testid={`member-row-${index}`}
                          className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 rounded-xl border p-3.5 transition-all ${
                            hasErr
                              ? 'border-[#dc2626]/60 bg-[#fff8f8] dark:border-[#dc2626]/50 dark:bg-[#201414]'
                              : 'border-[#e5dfd2] bg-white dark:border-[#1e493b] dark:bg-[#142e24]'
                          }`}
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#eee8dc] text-xs font-bold text-[#183f35] dark:bg-[#1e493b] dark:text-[#edf6f2]">
                            {index + 1}
                          </div>

                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              data-testid={`input-member-name-${index}`}
                              placeholder={getMemberPlaceholder(index)}
                              value={member.memberName}
                              onChange={(e) => handleMemberChange(index, 'memberName', e.target.value)}
                              onBlur={() => {
                                if (!member.memberName?.trim()) {
                                  setMemberErrors((prev) => ({
                                    ...prev,
                                    [index]: `Member #${index + 1} full name is required.`,
                                  }));
                                } else {
                                  const err = validateMemberName(member.memberName);
                                  setMemberErrors((prev) => {
                                    const next = { ...prev };
                                    if (err) next[index] = err;
                                    else delete next[index];
                                    return next;
                                  });
                                }
                              }}
                              className={`input !py-2 !text-xs sm:!text-sm placeholder:text-[#7b867e]/50 placeholder:italic dark:placeholder:text-[#92b1a3]/50 ${
                                hasErr ? '!border-[#dc2626] !ring-[#dc2626]/20' : ''
                              }`}
                              required
                            />
                            {hasErr && (
                              <p
                                data-testid={`error-member-name-${index}`}
                                className="mt-1 flex items-center gap-1 text-xs text-[#a63f32] dark:text-[#fca5a5]"
                              >
                                <AlertCircle size={12} className="shrink-0" />
                                <span>{memberErrors[index]}</span>
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-[#7b867e] dark:text-[#92b1a3]">Hissa:</span>
                              <div className="flex items-center rounded-lg border border-[#ded8ca] bg-[#fbf9f4] dark:border-[#1e493b] dark:bg-[#11241e] overflow-hidden">
                                <button
                                  type="button"
                                  data-testid={`button-decrement-member-${index}`}
                                  onClick={() => handleMemberChange(index, 'hissaCount', Math.max(1, (Number(member.hissaCount) || 1) - 1))}
                                  disabled={Number(member.hissaCount) <= 1}
                                  aria-label={`Decrease hissa for member ${index + 1}`}
                                  className="px-2.5 py-1.5 text-xs font-bold text-[#7b867e] hover:bg-[#eee8dc] hover:text-[#183f35] disabled:opacity-30 dark:text-[#92b1a3] dark:hover:bg-[#193a2f] dark:hover:text-white transition"
                                >
                                  <Minus size={12} />
                                </button>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  data-testid={`input-member-hissa-${index}`}
                                  value={member.hissaCount}
                                  onChange={(e) => handleMemberChange(index, 'hissaCount', e.target.value)}
                                  className="w-9 text-center font-bold text-xs bg-transparent py-1 border-0 focus:outline-none focus:ring-0 text-[#183f35] dark:text-[#edf6f2]"
                                />
                                <button
                                  type="button"
                                  data-testid={`button-increment-member-${index}`}
                                  onClick={() => handleMemberChange(index, 'hissaCount', (Number(member.hissaCount) || 0) + 1)}
                                  aria-label={`Increase hissa for member ${index + 1}`}
                                  className="px-2.5 py-1.5 text-xs font-bold text-[#7b867e] hover:bg-[#eee8dc] hover:text-[#183f35] dark:text-[#92b1a3] dark:hover:bg-[#193a2f] dark:hover:text-white transition"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            </div>

                            {Number(form.cost) > 0 && (
                              <span className="inline-flex items-center rounded-md bg-[#eaf4ee] px-2 py-1 text-xs font-mono font-bold text-[#246b59] dark:bg-[#16382b] dark:text-[#52c99a]">
                                ₹{formatNumber(memberCost)}
                              </span>
                            )}

                            <button
                              type="button"
                              data-testid={`button-remove-member-${index}`}
                              onClick={() => handleRemoveMember(index)}
                              disabled={members.length <= 2}
                              title={members.length <= 2 ? 'Family booking requires a minimum of 2 members' : `Remove member ${index + 1}`}
                              aria-label={`Remove member ${index + 1}`}
                              className="p-1.5 rounded-lg text-[#a63f32] hover:bg-[#fff0ed] hover:text-[#dc2626] disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:text-[#fca5a5] dark:hover:bg-[#331614] transition"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      data-testid="button-add-member"
                      onClick={handleAddMember}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#246b59]/30 bg-white px-3.5 py-2 text-xs font-bold text-[#246b59] shadow-sm transition hover:bg-[#246b59]/5 dark:border-[#52c99a]/30 dark:bg-[#142e24] dark:text-[#52c99a] dark:hover:bg-[#193a2f]"
                    >
                      <Plus size={14} />
                      <span>Add Family Member</span>
                    </button>

                    {hissaError ? (
                      <p data-testid="error-booking-hissa" className="text-xs font-semibold text-[#dc2626] dark:text-[#fca5a5] flex items-center gap-1.5">
                        <AlertTriangle size={13} className="shrink-0" />
                        <span>{hissaError}</span>
                      </p>
                    ) : members.length < 2 ? (
                      <p className="text-xs font-semibold text-[#d97706] dark:text-[#fbbf24] flex items-center gap-1.5">
                        <AlertCircle size={13} className="shrink-0" />
                        <span>Please allocate at least 1 Hissa across family members.</span>
                      </p>
                    ) : firstEmptyMemberIndex !== -1 ? (
                      <p className="text-xs font-semibold text-[#d97706] dark:text-[#fbbf24] flex items-center gap-1.5">
                        <AlertCircle size={13} className="shrink-0" />
                        <span>Member #{firstEmptyMemberIndex + 1} full name is required ({effectiveTotalHissa} {effectiveTotalHissa === 1 ? 'Hissa' : 'Hissas'} allocated)</span>
                      </p>
                    ) : (
                      <span className="text-[11px] font-medium text-[#567a6d] dark:text-[#90b3a3] flex items-center gap-1">
                        <Check size={13} className="text-[#246b59] dark:text-[#52c99a]" />
                        <span>All {effectiveTotalHissa} {effectiveTotalHissa === 1 ? 'Hissa' : 'Hissas'} allocated across {members.length} members</span>
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}

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
                className="btn-primary justify-center disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer shadow-md transition"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={15} className="animate-spin shrink-0" />
                    <span>Confirming booking...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm booking</span>
                    <ArrowRight size={16} />
                  </>
                )}
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
                <span className="shrink-0">Booking Type</span>
                <strong className="min-w-0 text-right text-[#f9f4e9] break-words [overflow-wrap:anywhere]">
                  {bookingMode === 'multi'
                    ? members.length < 2
                      ? `Family (min. 2 members)`
                      : `Family (${members.length} members)`
                    : 'Single Person'}
                </strong>
              </div>
              <div className="flex min-w-0 items-baseline justify-between gap-3">
                <span className="shrink-0">Collection Centre</span>
                <strong className="min-w-0 text-right text-[#f9f4e9] break-words [overflow-wrap:anywhere]">
                  {selectedCentre ? selectedCentre.name : 'Central / Unassigned'}
                </strong>
              </div>
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
                <span className="shrink-0">Total Hissas</span>
                <strong className="min-w-0 text-right text-[#f9f4e9] break-words [overflow-wrap:anywhere]">
                  {effectiveTotalHissa} {effectiveTotalHissa === 1 ? 'Hissa' : 'Hissas'}
                </strong>
              </div>
              <div className="flex min-w-0 items-baseline justify-between gap-3">
                <span className="shrink-0">Animal type</span>
                <strong className="min-w-0 text-right text-[#f9f4e9] break-words [overflow-wrap:anywhere]">
                  {selected?.animalType || '—'}
                </strong>
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
