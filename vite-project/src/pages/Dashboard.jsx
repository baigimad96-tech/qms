import React, { useState, useEffect } from 'react';
import {
  Home,
  Box,
  BarChart3,
  BookOpenCheck,
  WalletCards,
  ClipboardList,
  ArrowRight,
  ShieldCheck,
  Plus,
  FileText,
  Pencil,
  Download,
  RefreshCw,
  Trash2,
  TrendingUp,
  PieChart,
  DollarSign,
  HeartHandshake,
  CheckCircle2,
} from 'lucide-react';
import StatCard from '../components/StatCard.jsx';
import Badge from '../components/Badge.jsx';
import { TableScroll, Th, Td, IconButton } from '../components/Table.jsx';
import { formatNumber, formatMoney, formatShortDate, formatDateTime } from '../data/mockData.js';
import { api } from '../services/api.js';
import { getUser } from '../utils/auth.js';
import { downloadReceipt } from '../utils/receipt.js';
import {
  getAnimalsByType,
  getHissaByAnimalType,
  getBookingsByQurbaniDay,
  getMeatStatistics,
  getRevenueByAnimalType,
  getRecentBookings,
} from '../services/dashboardApi.js';

export function PageIntro({ eyebrow, title, description, action, actionLabel, icon: Icon = FileText }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#a5782b] dark:text-[#f3c46a]">
          <Icon size={14} /> {eyebrow}
        </div>
        <h2 className="font-display text-3xl font-extrabold tracking-[-.05em] text-[#183f35] dark:text-[#edf6f2] sm:text-4xl">
          {title}
        </h2>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f7b74] dark:text-[#92b1a3]">{description}</p>
        )}
      </div>
      {action && (
        <button
          data-testid="button-page-action"
          onClick={action}
          className="btn-primary self-start md:self-auto"
        >
          {actionLabel}
          <Plus size={17} />
        </button>
      )}
    </div>
  );
}

export function DayCapacity({ day, booked, capacity }) {
  const cap = Number(capacity ?? day?.capacity ?? day?.totalPerDay ?? 100);
  const bk = Number(booked ?? day?.bookedPerDay ?? 0);
  const remaining = Math.max(cap - bk, 0);
  const ratio = cap > 0 ? Math.min((bk / cap) * 100, 100) : 0;
  const status = ratio >= 100 ? 'Full' : ratio >= 75 ? 'Almost Full' : 'Available';
  const name = day?.name || `Day ${day?.dayNumber || day?.qurbaniDayId || 1}`;
  const testId = `card-capacity-${name.toLowerCase().replace(' ', '-')}`;

  return (
    <div data-testid={testId}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f3e9d3] text-xs font-extrabold text-[#9b6b1e] dark:bg-[#2b2413] dark:text-[#f3c46a]">
            {name.replace('Day ', 'D')}
          </span>
          <div>
            <p className="text-sm font-bold text-[#28463c] dark:text-[#edf6f2]">{name}</p>
            <p className="text-xs text-[#7b867e] dark:text-[#92b1a3]">
              {formatNumber(bk)} booked · {formatNumber(remaining)} remaining
            </p>
          </div>
        </div>
        <Badge status={status} />
      </div>
      <div className="progress-track h-2 overflow-hidden rounded-full">
        <div className="progress-fill h-full rounded-full" style={{ width: `${ratio}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-[#8a948e] dark:text-[#789d8e]">
        <span>0</span>
        <span>{formatNumber(cap)} capacity</span>
      </div>
    </div>
  );
}

export function BookingsTable({
  bookings,
  onView,
  onEdit,
  onDownload,
  onDelete,
  downloadingId = null,
  deletingId = null,
  compact = false,
}) {
  return (
    <TableScroll>
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <Th>Receipt No</Th>
            <Th>Qurbani Person</Th>
            <Th>Animal</Th>
            <Th>Qurbani Day</Th>
            <Th>Total Hissa</Th>
            <Th>Total Cost</Th>
            <Th>Meat Wanted</Th>
            <Th>Booked By</Th>
            <Th>Created At</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => {
            const isDownloading =
              downloadingId &&
              (String(downloadingId) === String(b.hissaBookingId) ||
                String(downloadingId) === String(b.id));

            const isDeleting =
              deletingId &&
              (String(deletingId) === String(b.hissaBookingId) ||
                String(deletingId) === String(b.id));

            const displayId = b.receiptNumber || String(b.hissaBookingId || b.id);

            return (
              <tr
                key={displayId}
                data-testid={`row-booking-${displayId}`}
                className="border-t border-[#eee8dc] dark:border-[#1e493b] hover:bg-[#faf6ed]/40 dark:hover:bg-[#132c22]/40 transition-colors"
              >
                <Td>
                  <span className="font-mono text-xs font-bold text-[#246b59] dark:text-[#52c99a]">
                    {b.receiptNumber || '—'}
                  </span>
                </Td>
                <Td>
                  <span className="font-semibold text-[#315246] dark:text-[#edf6f2]">{b.personName}</span>
                </Td>
                <Td className="dark:text-[#d3e3db]">{b.animal || b.animalType || 'Buffalo'}</Td>
                <Td>
                  <Badge status={b.day} />
                </Td>
                <Td className="font-bold text-[#315246] dark:text-[#edf6f2]">{formatNumber(b.hissa)}</Td>
                <Td className="font-medium text-[#315246] dark:text-[#edf6f2]">{formatMoney(b.cost)}</Td>
                <Td>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                      b.meatWanted === 'Yes' || b.meatWanted === true
                        ? 'bg-[#e4efe7] text-[#246b59] dark:bg-[#193a2f] dark:text-[#4ade80]'
                        : 'bg-[#f4efe5] text-[#8a948e] dark:bg-[#1f2f29] dark:text-[#8ba79b]'
                    }`}
                  >
                    {typeof b.meatWanted === 'boolean'
                      ? b.meatWanted ? 'Yes' : 'No'
                      : b.meatWanted || 'Yes'}
                  </span>
                </Td>
                <Td className="text-xs text-[#526359] dark:text-[#92b1a3]">{b.bookedBy}</Td>
                <Td className="whitespace-nowrap text-xs text-[#7b867e] dark:text-[#92b1a3]">
                  {compact ? formatShortDate(b.createdAt) : formatDateTime(b.createdAt)}
                </Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <IconButton
                      label="View booking"
                      icon={BookOpenCheck}
                      onClick={() => onView(b.hissaBookingId || b.id)}
                    />
                    {onEdit && (
                      <IconButton label="Edit booking" icon={Pencil} onClick={() => onEdit(b)} />
                    )}
                    {onDownload && (
                      <IconButton
                        label="Download PDF receipt"
                        icon={isDownloading ? RefreshCw : Download}
                        disabled={Boolean(isDownloading)}
                        className={isDownloading ? 'animate-spin text-[#246b59] dark:text-[#52c99a]' : ''}
                        onClick={() => onDownload(b)}
                      />
                    )}
                    {onDelete && (
                      <IconButton
                        label="Delete booking"
                        icon={isDeleting ? RefreshCw : Trash2}
                        disabled={Boolean(isDeleting)}
                        className={
                          isDeleting
                            ? 'animate-spin text-[#a63f32] dark:text-[#fca5a5]'
                            : 'text-[#a63f32] hover:text-[#dc2626] hover:bg-[#fff0ed] dark:text-[#fca5a5] dark:hover:bg-[#331614]'
                        }
                        onClick={() => onDelete(b)}
                      />
                    )}
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableScroll>
  );
}

export default function Dashboard({ data, navigate, notify }) {
  // Baseline data states
  const [inventory, setInventory] = useState(data?.inventory || []);
  const [days, setDays] = useState(data?.days || []);
  const [bookings, setBookings] = useState(data?.bookings || []);

  // Dashboard API live states (APIs 22 to 27)
  const [animalsByTypeStats, setAnimalsByTypeStats] = useState(null); // API 22
  const [hissaSummaryStats, setHissaSummaryStats] = useState(null); // API 23
  const [dayCapacityStats, setDayCapacityStats] = useState(null); // API 24
  const [meatStats, setMeatStats] = useState(null); // API 25
  const [revenueStats, setRevenueStats] = useState(null); // API 26
  const [recentBookingsList, setRecentBookingsList] = useState(null); // API 27

  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownloadReceipt = async (booking) => {
    const targetId = booking.hissaBookingId || booking.id;
    try {
      setDownloadingId(targetId);
      notify?.(`Generating PDF receipt for #${booking.receiptNumber || targetId}...`, 'info');
      const filename = await downloadReceipt(booking);
      notify?.(`Receipt ${filename} downloaded successfully!`, 'success');
    } catch (err) {
      console.error('Failed to download receipt:', err);
      notify?.(err.message || 'Failed to download PDF receipt.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadAllDashboardData = async () => {
      setIsLoading(true);

      // Execute APIs 22 to 27 and baseline endpoints concurrently
      const results = await Promise.allSettled([
        getAnimalsByType(), // [0] API 22
        getHissaByAnimalType(), // [1] API 23
        getBookingsByQurbaniDay(), // [2] API 24
        getMeatStatistics(), // [3] API 25
        getRevenueByAnimalType(), // [4] API 26
        getRecentBookings(6), // [5] API 27
        api.get('/api/v1/animals'), // [6] Baseline animals
        api.get('/api/v1/qurbani-days'), // [7] Baseline days
        api.get('/api/v1/hissa-bookings?size=100'), // [8] Baseline bookings
      ]);

      if (!isMounted) return;

      // 1. Process API 22 (Total Animals by Type)
      if (results[0].status === 'fulfilled' && results[0].value?.data) {
        const raw = results[0].value.data;
        if (Array.isArray(raw) && raw.length > 0) {
          setAnimalsByTypeStats(raw);
        }
      }

      // 2. Process API 23 (Hissa Summary by Type)
      if (results[1].status === 'fulfilled' && results[1].value?.data) {
        const raw = results[1].value.data;
        if (Array.isArray(raw) && raw.length > 0) {
          setHissaSummaryStats(raw);
        }
      }

      // 3. Process API 24 (Bookings by Qurbani Day)
      if (results[2].status === 'fulfilled' && results[2].value?.data) {
        const raw = results[2].value.data;
        if (Array.isArray(raw) && raw.length > 0) {
          setDayCapacityStats(raw);
        }
      }

      // 4. Process API 25 (Meat Requirement Statistics)
      if (results[3].status === 'fulfilled' && results[3].value?.data) {
        const raw = results[3].value.data;
        if (raw && typeof raw === 'object') {
          setMeatStats(raw);
        }
      }

      // 5. Process API 26 (Revenue by Animal Type)
      if (results[4].status === 'fulfilled' && results[4].value?.data) {
        const raw = results[4].value.data;
        if (Array.isArray(raw) && raw.length > 0) {
          setRevenueStats(raw);
        }
      }

      // 6. Process API 27 (Recent Bookings)
      if (results[5].status === 'fulfilled' && results[5].value?.data) {
        const raw = results[5].value.data;
        if (Array.isArray(raw) && raw.length > 0) {
          const baselineData =
            results[8].status === 'fulfilled'
              ? results[8].value?.data?.data || results[8].value?.data
              : null;
          const baselineBookings = Array.isArray(baselineData)
            ? baselineData
            : Array.isArray(baselineData?.content)
            ? baselineData.content
            : [];
          const normalizedRecent = raw.map((b) => ({
            ...b,
            id: b.receiptNumber || String(b.hissaBookingId || b.id),
            receiptNumber:
              b.receiptNumber ||
              baselineBookings.find(
                (booking) =>
                  String(booking.hissaBookingId || booking.id) ===
                  String(b.hissaBookingId || b.bookingId || b.id)
              )?.receiptNumber,
            bookingId: b.hissaBookingId || b.id,
            hissaBookingId: b.hissaBookingId || b.id,
            personName: b.qurbaniPersonName || b.personName || 'Anonymous',
            animal: b.animalType || b.animal || 'Buffalo',
            day: typeof b.qurbaniDay === 'number' ? `Day ${b.qurbaniDay}` : (b.day || `Day ${b.qurbaniDayId || 1}`),
            hissa: b.totalHissa !== undefined ? b.totalHissa : (b.hissa || 1),
            cost: b.totalHissaCost !== undefined ? b.totalHissaCost : (b.cost || 0),
            meatWanted: typeof b.meatWanted === 'boolean' ? (b.meatWanted ? 'Yes' : 'No') : (b.meatWanted || 'Yes'),
            bookedBy: b.bookedByAdminName || b.bookedBy || 'System Administrator',
            createdAt: b.createdAt || new Date().toISOString(),
          }));
          setRecentBookingsList(normalizedRecent);
        }
      }

      // 7. Process Baseline Animals (fallback/sync)
      if (results[6].status === 'fulfilled' && results[6].value?.data) {
        const rawInvData = results[6].value.data.data || results[6].value.data;
        const rawInv = Array.isArray(rawInvData)
          ? rawInvData
          : Array.isArray(rawInvData?.content)
          ? rawInvData.content
          : [];
        if (rawInv.length > 0) setInventory(rawInv);
      }

      // 8. Process Baseline Days (fallback/sync)
      if (results[7].status === 'fulfilled' && results[7].value?.data) {
        const rawDaysData = results[7].value.data.data || results[7].value.data;
        const rawDays = Array.isArray(rawDaysData)
          ? rawDaysData
          : Array.isArray(rawDaysData?.content)
          ? rawDaysData.content
          : [];
        if (rawDays.length > 0) {
          setDays(
            rawDays.map((d) => ({
              ...d,
              id: d.qurbaniDayId || d.id,
              name: d.name || `Day ${d.dayNumber || d.qurbaniDayId}`,
              capacity: d.totalPerDay !== undefined ? d.totalPerDay : (d.capacity || 100),
            }))
          );
        }
      }

      // 9. Process Baseline Bookings (fallback/sync)
      if (results[8].status === 'fulfilled' && results[8].value?.data) {
        const rawBkData = results[8].value.data.data || results[8].value.data;
        const rawBk = Array.isArray(rawBkData)
          ? rawBkData
          : Array.isArray(rawBkData?.content)
          ? rawBkData.content
          : [];
        if (rawBk.length > 0) {
          const normalized = rawBk.map((b) => ({
            ...b,
            id: b.receiptNumber || String(b.hissaBookingId || b.id),
            receiptNumber: b.receiptNumber,
            bookingId: b.hissaBookingId || b.id,
            hissaBookingId: b.hissaBookingId || b.id,
            personName: b.qurbaniPersonName || b.personName || 'Anonymous',
            animal: b.animalType || b.animal || 'Buffalo',
            day: typeof b.qurbaniDay === 'number' ? `Day ${b.qurbaniDay}` : (b.day || `Day ${b.qurbaniDayId || 1}`),
            hissa: b.totalHissa !== undefined ? b.totalHissa : (b.hissa || 1),
            cost: b.totalHissaCost !== undefined ? b.totalHissaCost : (b.cost || 0),
            meatWanted: typeof b.meatWanted === 'boolean' ? (b.meatWanted ? 'Yes' : 'No') : (b.meatWanted || 'Yes'),
            bookedBy: b.bookedByAdminName || b.bookedBy || 'System Administrator',
            createdAt: b.createdAt || new Date().toISOString(),
          }));
          setBookings(normalized);
        }
      }

      setIsLoading(false);
    };

    loadAllDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute Metrics with API 22-26 primary values and client-side fallback
  // Total Animals (API 22 primary)
  const totalAnimals = animalsByTypeStats
    ? animalsByTypeStats.reduce((sum, item) => sum + Number(item.totalAnimals || 0), 0)
    : inventory.reduce((sum, item) => sum + Number(item.totalAnimals || 0), 0);

  // Hissa Metrics (API 23 primary)
  const totalHissa = hissaSummaryStats
    ? hissaSummaryStats.reduce((sum, item) => sum + Number(item.totalHissa || 0), 0)
    : inventory.reduce((sum, item) => sum + Number(item.totalHissa || item.totalAnimals * 7 || 0), 0);

  const bookedHissa = hissaSummaryStats
    ? hissaSummaryStats.reduce((sum, item) => sum + Number(item.bookedHissa || 0), 0)
    : bookings.reduce((sum, b) => sum + Number(b.hissa || 0), 0);

  const availableHissa = hissaSummaryStats
    ? hissaSummaryStats.reduce((sum, item) => sum + Number(item.availableHissa || 0), 0)
    : Math.max(totalHissa - bookedHissa, 0);

  // Total Revenue (API 26 primary)
  const totalRevenue = revenueStats
    ? revenueStats.reduce((sum, item) => sum + Number(item.totalBookingAmount || 0), 0)
    : bookings.reduce((sum, b) => sum + Number(b.cost || 0), 0);

  // Meat Statistics (API 25 primary)
  const meatWantedCount =
    meatStats && meatStats.meatWanted !== undefined
      ? Number(meatStats.meatWanted)
      : bookings.filter((b) => b.meatWanted === 'Yes' || b.meatWanted === true).length;

  const meatNotWantedCount =
    meatStats && meatStats.meatNotWanted !== undefined
      ? Number(meatStats.meatNotWanted)
      : bookings.filter((b) => b.meatWanted === 'No' || b.meatWanted === false).length;

  const totalMeatResponses = meatWantedCount + meatNotWantedCount;
  const meatWantedPct = totalMeatResponses > 0 ? Math.round((meatWantedCount / totalMeatResponses) * 100) : 0;

  // Day Capacity List (API 24 primary)
  const displayDays = dayCapacityStats && dayCapacityStats.length > 0
    ? dayCapacityStats.map((d) => ({
        id: d.qurbaniDayId || d.dayNumber,
        name: `Day ${d.dayNumber || d.qurbaniDayId}`,
        capacity: Number(d.totalPerDay || 100),
        booked: Number(d.bookedPerDay || 0),
        remaining: Number(d.remaining ?? Math.max((d.totalPerDay || 100) - (d.bookedPerDay || 0), 0)),
      }))
    : days.map((d) => ({
        id: d.id,
        name: d.name,
        capacity: Number(d.capacity || 100),
        booked: bookings
          .filter((b) => b.day === d.name)
          .reduce((s, b) => s + Number(b.hissa || 0), 0),
        remaining: Math.max(
          Number(d.capacity || 100) -
            bookings
              .filter((b) => b.day === d.name)
              .reduce((s, b) => s + Number(b.hissa || 0), 0),
          0
        ),
      }));

  // Recent Bookings (API 27 primary)
  const displayRecent = recentBookingsList && recentBookingsList.length > 0
    ? recentBookingsList
    : [...bookings]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 6);

  // Top Stat Cards
  const stats = [
    {
      label: 'Total Animals',
      value: formatNumber(totalAnimals),
      sub: animalsByTypeStats
        ? `${animalsByTypeStats.length} animal types`
        : `${inventory.length} active batches`,
      icon: Box,
      color: 'gold',
    },
    {
      label: 'Total Hissa',
      value: formatNumber(totalHissa),
      sub: 'Across all animals',
      icon: BarChart3,
      color: 'green',
    },
    {
      label: 'Booked Hissa',
      value: formatNumber(bookedHissa),
      sub: totalHissa > 0 ? `${Math.round((bookedHissa / totalHissa) * 100)}% committed` : '0% committed',
      icon: BookOpenCheck,
      color: 'blue',
    },
    {
      label: 'Available Hissa',
      value: formatNumber(availableHissa),
      sub: 'Ready to allocate',
      icon: WalletCards,
      color: 'teal',
    },
    {
      label: 'Booking Revenue',
      value: formatMoney(totalRevenue),
      sub: revenueStats ? `${revenueStats.length} types contributing` : `${bookings.length} confirmed bookings`,
      icon: TrendingUp,
      color: 'orange',
    },
  ];

  const user = getUser();
  const userName = user?.fullName || 'Administrator';

  return (
    <div>
      <PageIntro
        eyebrow="Overview"
        title={`Welcome back, ${userName}.`}
        description="Here is the live pulse of your Qurbani operation, computed directly from server metrics."
        action={() => navigate('/new-booking')}
        actionLabel="New booking"
        icon={Home}
      />

      {/* Top 5 KPI Cards (Powered by APIs 22, 23, 26) */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat, i) => (
          <StatCard key={stat.label} {...stat} delay={i} />
        ))}
      </div>

      {/* Analytics Insights: Revenue by Animal Type (API 26) & Meat Distribution (API 25) */}
      <div className="mb-8 grid gap-6 md:grid-cols-2">
        {/* Revenue by Animal Type (API 26) */}
        <section className="card-surface rounded-2xl p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="kicker">Revenue breakdown</p>
              <h3 className="mt-1 font-display text-lg font-extrabold tracking-[-.03em] text-[#183f35] dark:text-[#edf6f2]">
                Booking Revenue by Animal Type
              </h3>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#e4efe7] text-[#246b59] dark:bg-[#193a2f] dark:text-[#4ade80]">
              <TrendingUp size={18} />
            </div>
          </div>

          {revenueStats && revenueStats.length > 0 ? (
            <div className="space-y-4">
              {revenueStats.map((rev) => {
                const amt = Number(rev.totalBookingAmount || 0);
                const pct = totalRevenue > 0 ? Math.min(Math.round((amt / totalRevenue) * 100), 100) : 0;
                return (
                  <div key={rev.animalType || 'animal'} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#28463c] dark:text-[#edf6f2]">
                        {rev.animalType}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-[#183f35] dark:text-[#52c99a]">
                          {formatMoney(amt)}
                        </span>
                        <span className="text-[11px] font-medium text-[#7b867e] dark:text-[#92b1a3]">
                          ({pct}%)
                        </span>
                      </div>
                    </div>
                    <div className="progress-track h-2 overflow-hidden rounded-full">
                      <div
                        className="progress-fill h-full rounded-full bg-[#246b59] dark:bg-[#52c99a]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-[#eee8dc] dark:border-[#1e493b] flex justify-between text-xs font-bold text-[#183f35] dark:text-[#edf6f2]">
                <span>Total Collected</span>
                <span className="font-mono text-[#246b59] dark:text-[#52c99a]">{formatMoney(totalRevenue)}</span>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-[#7b867e] dark:text-[#92b1a3]">
              Revenue statistics will populate as bookings are created.
            </div>
          )}
        </section>

        {/* Meat Requirement Statistics (API 25) */}
        <section className="card-surface rounded-2xl p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="kicker">Meat logistics</p>
              <h3 className="mt-1 font-display text-lg font-extrabold tracking-[-.03em] text-[#183f35] dark:text-[#edf6f2]">
                Meat Requirement Statistics
              </h3>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#f3e9d3] text-[#9b6b1e] dark:bg-[#2b2413] dark:text-[#f3c46a]">
              <PieChart size={18} />
            </div>
          </div>

          <div className="space-y-4">
            {/* Visual ratio bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#28463c] dark:text-[#edf6f2]">Takeaway vs Donated</span>
                <span className="font-semibold text-[#246b59] dark:text-[#52c99a]">
                  {meatWantedPct}% Takeaway
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[#f4efe5] dark:bg-[#1f2f29] flex">
                <div
                  className="bg-[#246b59] dark:bg-[#52c99a] transition-all duration-500"
                  style={{ width: `${meatWantedPct}%` }}
                />
                <div
                  className="bg-[#d97706] dark:bg-[#f59e0b] transition-all duration-500"
                  style={{ width: `${100 - meatWantedPct}%` }}
                />
              </div>
            </div>

            {/* Breakdown cards */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl border border-[#246b59]/20 bg-[#e4efe7]/40 dark:bg-[#193a2f]/40 p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#246b59] dark:text-[#4ade80]">
                  <CheckCircle2 size={14} />
                  <span>Takeaway</span>
                </div>
                <p className="mt-1 text-2xl font-black text-[#183f35] dark:text-[#edf6f2]">
                  {formatNumber(meatWantedCount)}
                </p>
                <p className="text-[11px] text-[#526359] dark:text-[#92b1a3]">Pack & dispatch to person</p>
              </div>

              <div className="rounded-xl border border-[#d97706]/20 bg-[#fef3c7]/40 dark:bg-[#3d2f14]/40 p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#b45309] dark:text-[#fbbf24]">
                  <HeartHandshake size={14} />
                  <span>Donated / Left</span>
                </div>
                <p className="mt-1 text-2xl font-black text-[#78350f] dark:text-[#fef3c7]">
                  {formatNumber(meatNotWantedCount)}
                </p>
                <p className="text-[11px] text-[#92400e] dark:text-[#fde68a]">Allocated for charity / trust</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Middle Section: Qurbani Day Capacity (API 24) & Operational Note */}
      <div className="mb-8 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        {/* Qurbani Day Capacity (API 24) */}
        <section className="card-surface rounded-2xl p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <p className="kicker">Capacity watch</p>
              <h3 className="mt-1 font-display text-xl font-extrabold tracking-[-.03em] text-[#183f35] dark:text-[#edf6f2]">
                Qurbani day capacity
              </h3>
            </div>
            <button
              data-testid="link-qurbani-days"
              onClick={() => navigate('/qurbani-days')}
              className="text-xs font-bold text-[#246b59] dark:text-[#52c99a] hover:underline"
            >
              Manage days <ArrowRight size={13} className="ml-1 inline" />
            </button>
          </div>
          <div className="space-y-5">
            {displayDays.map((day) => (
              <DayCapacity
                key={day.id}
                day={day}
                booked={day.booked}
                capacity={day.capacity}
              />
            ))}
          </div>
        </section>

        {/* Operational Note card */}
        <section className="relative overflow-hidden rounded-2xl bg-[#1f5548] p-6 text-[#faf5e9]">
          <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full border-[22px] border-[#e3a84b]/20" />
          <div className="relative">
            <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-xl bg-[#e3a84b] text-[#183f35]">
              <ShieldCheck size={23} />
            </div>
            <p className="text-xs font-bold uppercase tracking-[.15em] text-[#e6b65b]">
              Operational note
            </p>
            <h3 className="mt-3 max-w-xs font-display text-2xl font-extrabold leading-tight tracking-[-.04em]">
              A clear record makes a trusted promise.
            </h3>
            <p className="mt-3 text-sm leading-6 text-[#c6d9d0]">
              Every successful booking updates Hissa availability, daily capacity and the audit trail together.
            </p>
            <button
              data-testid="button-view-audit"
              onClick={() => navigate('/audit-logs')}
              className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#f2cc7b] hover:text-white"
            >
              Review audit trail <ArrowRight size={15} />
            </button>
          </div>
        </section>
      </div>

      {/* Recent Bookings Table (Powered by API 27) */}
      <section className="card-surface rounded-2xl p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="kicker">Activity</p>
            <h3 className="mt-1 font-display text-xl font-extrabold tracking-[-.03em] text-[#183f35] dark:text-[#edf6f2]">
              Recent bookings
            </h3>
          </div>
          <button
            data-testid="link-all-bookings"
            onClick={() => navigate('/bookings')}
            className="text-xs font-bold text-[#246b59] dark:text-[#52c99a] hover:underline"
          >
            View all <ArrowRight size={13} className="ml-1 inline" />
          </button>
        </div>
        <BookingsTable
          bookings={displayRecent}
          compact
          onView={(id) => navigate(`/bookings/${id}`)}
          onDownload={handleDownloadReceipt}
          downloadingId={downloadingId}
        />
      </section>
    </div>
  );
}
