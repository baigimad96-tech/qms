export const ADMIN = {
  id: 'ADM-001',
  fullName: 'Aareb',
  email: 'admin@example.com',
  phone: '+91 98765 43210',
  createdAt: '2025-01-08T10:30:00.000Z',
};

export function formatMoney(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatNumber(value) {
  if (value === undefined || value === null || value === '') return '0';
  if (typeof value === 'bigint') {
    return new Intl.NumberFormat('en-IN').format(value);
  }
  const str = String(value).trim();
  if (/^\d+$/.test(str)) {
    try {
      return new Intl.NumberFormat('en-IN').format(BigInt(str));
    } catch {}
  }
  const n = Number(value);
  if (isNaN(n)) return '0';
  return new Intl.NumberFormat('en-IN').format(n);
}

export function formatCompactNumber(value) {
  if (value === undefined || value === null || value === '') return '0';
  const str = typeof value === 'bigint' ? value.toString() : String(value).trim();
  if (!str || str === '0') return '0';

  if (/[eE]/.test(str)) {
    const n = Number(str);
    return isNaN(n) ? '0' : n.toExponential(2);
  }

  if (/^\d+$/.test(str)) {
    try {
      const bi = BigInt(str);
      if (bi < 10000000n) {
        return new Intl.NumberFormat('en-IN').format(bi);
      }
      const num = Number(bi);
      if (num > 1e16) {
        return num.toExponential(2);
      }
      return new Intl.NumberFormat('en-IN', {
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 2,
      }).format(num);
    } catch {}
  }

  const num = Number(str);
  if (isNaN(num)) return '0';
  if (num > 1e16) return num.toExponential(2);
  if (num >= 1e7) {
    return new Intl.NumberFormat('en-IN', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 2,
    }).format(num);
  }
  return new Intl.NumberFormat('en-IN').format(num);
}

export function formatHissaValue(val) {
  if (val === undefined || val === null || val === '') {
    return { display: '0', full: '0', isCompact: false, fontSize: 'text-2xl' };
  }

  const str = typeof val === 'bigint' ? val.toString() : String(val).trim();
  if (!str || str === '0') {
    return { display: '0', full: '0', isCompact: false, fontSize: 'text-2xl' };
  }

  // Exponential notation input
  if (/[eE]/.test(str)) {
    const n = Number(str);
    if (isNaN(n) || !Number.isFinite(n)) {
      return { display: '—', full: 'Invalid number', isCompact: false, fontSize: 'text-2xl' };
    }
    const exp = n.toExponential(2);
    return { display: exp, full: str, isCompact: true, fontSize: 'text-lg sm:text-xl' };
  }

  // Integer digit strings (supporting BigInt for massive inputs)
  if (/^\d+$/.test(str)) {
    try {
      const bi = BigInt(str);
      const fullStr = new Intl.NumberFormat('en-IN').format(bi);

      // Standard range: <= 1 Crore (up to 7 digits)
      if (bi < 10000000n) {
        const fontSize = fullStr.length > 8 ? 'text-xl sm:text-2xl' : 'text-2xl';
        return { display: fullStr, full: fullStr, isCompact: false, fontSize };
      }

      // Medium-large: 1 Crore to 1,000 Crore (up to 11 digits)
      if (str.length <= 11) {
        return { display: fullStr, full: fullStr, isCompact: false, fontSize: 'text-lg sm:text-xl' };
      }

      // Massive inputs (> 11 digits): use compact notation with full formatted tooltip
      const num = Number(bi);
      let compact;
      if (num > 1e16) {
        compact = num.toExponential(2);
      } else {
        compact = new Intl.NumberFormat('en-IN', {
          notation: 'compact',
          compactDisplay: 'short',
          maximumFractionDigits: 2,
        }).format(num);
      }
      return { display: compact, full: fullStr, isCompact: true, fontSize: 'text-lg sm:text-xl' };
    } catch {}
  }

  const num = Number(str);
  if (isNaN(num) || !Number.isFinite(num)) {
    return { display: '—', full: 'Invalid number', isCompact: false, fontSize: 'text-2xl' };
  }

  const fullStr = new Intl.NumberFormat('en-IN').format(num);
  if (num > 1e16) {
    return { display: num.toExponential(2), full: fullStr, isCompact: true, fontSize: 'text-lg sm:text-xl' };
  }
  if (num >= 1e11) {
    const compact = new Intl.NumberFormat('en-IN', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 2,
    }).format(num);
    return { display: compact, full: fullStr, isCompact: true, fontSize: 'text-lg sm:text-xl' };
  }

  const fontSize = fullStr.length > 10 ? 'text-lg sm:text-xl' : 'text-2xl';
  return { display: fullStr, full: fullStr, isCompact: false, fontSize };
}

export function formatDateTime(value) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatShortDate(value) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function generateId(prefix, list) {
  return `${prefix}-${String(list.length + 1).padStart(3, '0')}`;
}

export function seedData() {
  return {
    inventory: [],
    days: [],
    bookings: [],
    admins: [],
    expenses: [],
    audits: [],
    collectionCentres: [],
  };
}

export function deduplicateBookings(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  return list.filter((b, idx) => {
    const rawKey = b?.receiptNumber || b?.hissaBookingId || b?.bookingId || b?.id || (b?.qurbaniPersonName ? `${b.qurbaniPersonName}-${b.createdAt}` : `idx-${idx}`);
    const cleanKey = String(rawKey).replace(/^#/, '').trim();
    if (!cleanKey) return true;
    if (seen.has(cleanKey)) return false;
    seen.add(cleanKey);
    return true;
  });
}

export function loadInitialData() {
  return seedData();
}

export function persistData(data) {
  try {
    const cleanBookings = deduplicateBookings(data?.bookings);
    if (data?.inventory) localStorage.setItem('qurbani_animals', JSON.stringify(data.inventory));
    if (data?.bookings) localStorage.setItem('qurbani_bookings', JSON.stringify(cleanBookings));
    if (data?.days) localStorage.setItem('qurbani_days', JSON.stringify(data.days));
    if (data?.admins) localStorage.setItem('qurbani_admins', JSON.stringify(data.admins));
    if (data?.audits) localStorage.setItem('qurbani_audit_logs', JSON.stringify(data.audits));
    if (data?.expenses) {
      localStorage.setItem('qurbani_expenses', JSON.stringify(data.expenses));
    }
    if (data?.collectionCentres) {
      localStorage.setItem('qurbani_collection_centres', JSON.stringify(data.collectionCentres));
    }
    localStorage.setItem('qurbani-demo-data', JSON.stringify({ ...data, bookings: cleanBookings }));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}
