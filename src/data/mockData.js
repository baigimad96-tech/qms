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
  return new Intl.NumberFormat('en-IN').format(Number(value || 0));
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
  const inventory = [
    { id: 'BUF-2025-01', animal: 'Buffalo', batchYear: 2025, totalAnimals: 8, totalHissa: 56, bookedHissa: 20, totalPrice: 900000 },
    { id: 'BUF-2025-02', animal: 'Buffalo', batchYear: 2025, totalAnimals: 10, totalHissa: 70, bookedHissa: 60, totalPrice: 1125000 },
    { id: 'BUF-2024-01', animal: 'Buffalo', batchYear: 2024, totalAnimals: 12, totalHissa: 84, bookedHissa: 93, totalPrice: 1320000 },
  ];

  const booking = (id, inventoryId, day, name, hissa, meat, createdAt, cost) => ({
    id,
    inventoryId,
    animal: 'Buffalo',
    day,
    personName: name,
    hissa,
    cost,
    meatWanted: meat,
    bookedBy: 'Aareb',
    createdAt,
    updatedAt: createdAt,
  });

  const bookings = [
    booking('BK-1001', 'BUF-2025-01', 'Day 1', 'Aariz Family', 8, 'Yes', '2025-05-02T09:14:00.000Z', 128000),
    booking('BK-1002', 'BUF-2025-01', 'Day 1', 'Safiya Rahman', 7, 'No', '2025-05-03T11:40:00.000Z', 112000),
    booking('BK-1003', 'BUF-2025-01', 'Day 1', 'Nadeem & Sons', 5, 'Yes', '2025-05-04T15:06:00.000Z', 80000),
    booking('BK-1004', 'BUF-2025-02', 'Day 1', 'Hiba Qureshi', 18, 'Yes', '2025-05-07T10:18:00.000Z', 288000),
    booking('BK-1005', 'BUF-2025-02', 'Day 1', 'Faisal Merchant', 15, 'No', '2025-05-08T12:22:00.000Z', 240000),
    booking('BK-1006', 'BUF-2025-02', 'Day 1', 'Yusuf Khan', 10, 'Yes', '2025-05-09T09:45:00.000Z', 160000),
    booking('BK-1007', 'BUF-2025-02', 'Day 1', 'Amina Begum', 5, 'No', '2025-05-10T14:08:00.000Z', 80000),
    booking('BK-1008', 'BUF-2025-02', 'Day 1', 'Imran Family', 5, 'Yes', '2025-05-11T16:20:00.000Z', 80000),
    booking('BK-1010', 'BUF-2025-02', 'Day 2', 'Hamza Siddiqui', 7, 'Yes', '2025-05-13T13:15:00.000Z', 112000),
    booking('BK-1011', 'BUF-2024-01', 'Day 2', 'Mariam House', 20, 'No', '2025-05-14T09:30:00.000Z', 320000),
    booking('BK-1012', 'BUF-2024-01', 'Day 2', 'Raza Family', 18, 'Yes', '2025-05-15T11:12:00.000Z', 288000),
    booking('BK-1013', 'BUF-2024-01', 'Day 2', 'Sana Traders', 15, 'No', '2025-05-16T15:26:00.000Z', 240000),
    booking('BK-1014', 'BUF-2024-01', 'Day 2', 'Kashif Ahmad', 12, 'Yes', '2025-05-17T10:55:00.000Z', 192000),
    booking('BK-1015', 'BUF-2024-01', 'Day 2', 'Ayesha Noor', 8, 'No', '2025-05-18T12:43:00.000Z', 128000),
    booking('BK-1016', 'BUF-2024-01', 'Day 3', 'Bilal Family', 10, 'Yes', '2025-05-20T09:20:00.000Z', 160000),
    booking('BK-1017', 'BUF-2024-01', 'Day 3', 'Zoya Foundation', 6, 'No', '2025-05-21T14:40:00.000Z', 96000),
    booking('BK-1018', 'BUF-2024-01', 'Day 3', 'Omar Siddiqui', 4, 'Yes', '2025-05-22T16:05:00.000Z', 64000),
  ];

  return {
    inventory,
    days: [
      { id: 'DAY-1', name: 'Day 1', capacity: 100 },
      { id: 'DAY-2', name: 'Day 2', capacity: 120 },
      { id: 'DAY-3', name: 'Day 3', capacity: 80 },
    ],
    bookings,
    admins: [ADMIN],
    expenses: [
      {
        expenseId: 1,
        category: 'TRANSPORTATION',
        description: 'Animal transit & logistics from supplier to center',
        amount: 15000,
        expenseDate: '2026-05-25',
        qurbaniDayId: null,
        createdByAdminId: 1,
        createdAt: '2026-05-25T10:00:00.000Z',
        updatedAt: '2026-05-25T10:00:00.000Z',
      },
      {
        expenseId: 2,
        category: 'LABOR',
        description: 'Slaughterhouse & butchering staff team wages',
        amount: 12000,
        expenseDate: '2026-05-25',
        qurbaniDayId: 1,
        createdByAdminId: 1,
        createdAt: '2026-05-25T11:00:00.000Z',
        updatedAt: '2026-05-25T11:00:00.000Z',
      },
      {
        expenseId: 3,
        category: 'FEED',
        description: 'Fodder and clean water supplies for holding pens',
        amount: 5000,
        expenseDate: '2026-05-25',
        qurbaniDayId: null,
        createdByAdminId: 1,
        createdAt: '2026-05-25T12:00:00.000Z',
        updatedAt: '2026-05-25T12:00:00.000Z',
      },
    ],
    audits: [
      { id: 'AUD-001', admin: 'Aareb', action: 'SYSTEM_SEEDED', entityType: 'SYSTEM', entityId: 'QURBANI-2025', at: '2025-05-01T08:00:00.000Z' },
      { id: 'AUD-002', admin: 'Aareb', action: 'ANIMAL_CREATED', entityType: 'ANIMAL', entityId: 'BUF-2025-01', at: '2025-05-01T08:04:00.000Z' },
      { id: 'AUD-003', admin: 'Aareb', action: 'ANIMAL_CREATED', entityType: 'ANIMAL', entityId: 'BUF-2025-02', at: '2025-05-01T08:10:00.000Z' },
      { id: 'AUD-004', admin: 'Aareb', action: 'ANIMAL_CREATED', entityType: 'ANIMAL', entityId: 'BUF-2024-01', at: '2025-05-01T08:15:00.000Z' },
    ],
  };
}

export function loadInitialData() {
  try {
    const animals = localStorage.getItem('qurbani_animals');
    const bookings = localStorage.getItem('qurbani_bookings');
    const days = localStorage.getItem('qurbani_days');
    const admins = localStorage.getItem('qurbani_admins');
    const audits = localStorage.getItem('qurbani_audit_logs');
    const expenses = localStorage.getItem('qurbani_expenses');

    if (animals && bookings && days && admins && audits) {
      return {
        inventory: JSON.parse(animals),
        bookings: JSON.parse(bookings),
        days: JSON.parse(days),
        admins: JSON.parse(admins),
        audits: JSON.parse(audits),
        expenses: expenses ? JSON.parse(expenses) : seedData().expenses,
      };
    }

    const legacy = localStorage.getItem('qurbani-demo-data');
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (!parsed.expenses) parsed.expenses = seedData().expenses;
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load from localStorage:', err);
  }
  return seedData();
}

export function persistData(data) {
  try {
    localStorage.setItem('qurbani_animals', JSON.stringify(data.inventory));
    localStorage.setItem('qurbani_bookings', JSON.stringify(data.bookings));
    localStorage.setItem('qurbani_days', JSON.stringify(data.days));
    localStorage.setItem('qurbani_admins', JSON.stringify(data.admins));
    localStorage.setItem('qurbani_audit_logs', JSON.stringify(data.audits));
    if (data.expenses) {
      localStorage.setItem('qurbani_expenses', JSON.stringify(data.expenses));
    }
    localStorage.setItem('qurbani-demo-data', JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}
