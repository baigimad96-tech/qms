import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReceiptIndianRupee,
  CalendarDays,
  TrendingDown,
  Layers,
  Plus,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Check,
  Pencil,
  Eye,
  X,
  ShieldCheck,
  Calendar,
  Lock,
  Tag,
  DollarSign,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { PageIntro } from './Dashboard.jsx';
import StatCard from '../components/StatCard.jsx';
import { TableScroll, Th, Td, EmptyState } from '../components/Table.jsx';
import ProjectDropdown from '../components/ProjectDropdown.jsx';
import Modal, { ModalActions, Field } from '../components/Modal.jsx';
import { formatMoney, formatNumber, formatShortDate, formatDateTime } from '../data/mockData.js';
import {
  getExpenses,
  getExpenseById,
  getExpenseSummary,
  createExpense,
  updateExpense,
  EXPENSE_CATEGORIES,
} from '../services/expenseApi.js';
import { api } from '../services/api.js';

// Category color styling helper
function getCategoryBadgeClass(category) {
  switch (category?.toUpperCase()) {
    case 'TRANSPORTATION':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900';
    case 'LABOR':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900';
    case 'FEED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900';
    case 'SLAUGHTER':
      return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900';
    case 'PACKAGING':
      return 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-900';
    case 'EQUIPMENT':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-900';
    case 'CLEANING':
      return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-900';
    case 'RENT':
      return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/50 dark:text-slate-300 dark:border-slate-900';
    case 'UTILITIES':
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-900';
    case 'OTHER':
      return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/50 dark:text-gray-300 dark:border-gray-900';
    default:
      return 'bg-[#f4efe4] text-[#41685a] border-[#ded7c8] dark:bg-[#18362b] dark:text-[#9bc2b1] dark:border-[#285745]';
  }
}

// Category readable label helper
function getCategoryLabel(category) {
  const match = EXPENSE_CATEGORIES.find((c) => c.value === category);
  return match ? match.label : category || 'Uncategorized';
}

// Format today as YYYY-MM-DD
function getTodayDateString() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// Create or Edit Modal Component
function ExpenseFormModal({
  mode = 'create',
  expense = null,
  qurbaniDays = [],
  onClose,
  onSubmit,
  isSubmitting,
  apiError,
}) {
  const [category, setCategory] = useState(expense?.category || 'TRANSPORTATION');
  const [amount, setAmount] = useState(expense?.amount !== undefined ? String(expense.amount) : '');
  const [expenseDate, setExpenseDate] = useState(
    expense?.expenseDate || getTodayDateString()
  );
  const [allocationType, setAllocationType] = useState(
    expense?.qurbaniDayId ? 'day' : 'general'
  );
  const [selectedDayId, setSelectedDayId] = useState(
    expense?.qurbaniDayId ? String(expense.qurbaniDayId) : '1'
  );
  const [description, setDescription] = useState(expense?.description || '');

  const todayStr = getTodayDateString();

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      category,
      amount: parseFloat(amount),
      expenseDate,
      qurbaniDayId: allocationType === 'day' ? Number(selectedDayId) : null,
      description: description.trim() || null,
    };
    onSubmit(payload);
  };

  const isEdit = mode === 'edit';

  return (
    <Modal
      title={isEdit ? `Edit Expense #${expense.expenseId}` : 'Record New Expense'}
      description={
        isEdit
          ? 'Update the operational category, amount, allocation, or notes for this expense record.'
          : 'Record a new operational expense and associate it with a specific Qurbani Day or General overhead.'
      }
      onClose={onClose}
    >
      {apiError && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#f3a69b] bg-[#fff3f0] p-3.5 text-xs text-[#a63f32] dark:border-[#5c2420] dark:bg-[#331614] dark:text-[#fca5a5]">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span className="leading-5">{apiError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Category Dropdown */}
          <Field label="Category *">
            <select
              className="input text-xs font-semibold"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </Field>

          {/* Amount Input */}
          <Field label="Amount (₹) *">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#7b867e] dark:text-[#8ea99b]">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 15000"
                className="input pl-9 text-sm font-semibold"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Expense Date */}
          <Field label="Expense Date *">
            <input
              type="date"
              max={todayStr}
              className="input text-xs"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              required
            />
            <span className="mt-1 block text-[10px] text-[#7b867e] dark:text-[#8ba79b]">
              Cannot be a future date (maximum: today).
            </span>
          </Field>

          {/* Allocation Type */}
          <Field label="Allocation *">
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setAllocationType('general')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  allocationType === 'general'
                    ? 'border-[#246b59] bg-[#e4efe7] text-[#246b59] dark:border-[#4ade80] dark:bg-[#16382b] dark:text-[#4ade80]'
                    : 'border-[#ded8ca] bg-[#faf6ed] text-[#7b867e] hover:border-[#b8c9c0] dark:border-[#21473a] dark:bg-[#122820] dark:text-[#92b1a3]'
                }`}
              >
                {allocationType === 'general' && <Check size={13} />}
                General (Overhead)
              </button>
              <button
                type="button"
                onClick={() => setAllocationType('day')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  allocationType === 'day'
                    ? 'border-[#246b59] bg-[#e4efe7] text-[#246b59] dark:border-[#4ade80] dark:bg-[#16382b] dark:text-[#4ade80]'
                    : 'border-[#ded8ca] bg-[#faf6ed] text-[#7b867e] hover:border-[#b8c9c0] dark:border-[#21473a] dark:bg-[#122820] dark:text-[#92b1a3]'
                }`}
              >
                {allocationType === 'day' && <Check size={13} />}
                Qurbani Day
              </button>
            </div>
          </Field>
        </div>

        {/* Qurbani Day Selector when Day-specific is picked */}
        {allocationType === 'day' && (
          <Field label="Select Qurbani Day *">
            <select
              className="input text-xs font-semibold"
              value={selectedDayId}
              onChange={(e) => setSelectedDayId(e.target.value)}
              required
            >
              {qurbaniDays.length > 0 ? (
                qurbaniDays.map((d) => (
                  <option key={d.qurbaniDayId || d.id} value={d.qurbaniDayId || d.id}>
                    {d.dayName || d.name || `Day ${d.qurbaniDayId || d.id}`} (Day {d.qurbaniDayId || d.id})
                  </option>
                ))
              ) : (
                <>
                  <option value="1">Day 1</option>
                  <option value="2">Day 2</option>
                  <option value="3">Day 3</option>
                </>
              )}
            </select>
          </Field>
        )}

        {/* Description / Notes */}
        <Field label="Description (Optional)">
          <textarea
            rows={3}
            placeholder="Details of expense, vendor name, purpose..."
            className="input resize-none text-xs"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <ModalActions
          onClose={onClose}
          submitLabel={
            isSubmitting
              ? isEdit
                ? 'Updating Expense...'
                : 'Recording...'
              : isEdit
              ? 'Save Changes'
              : 'Record Expense'
          }
        />
      </form>
    </Modal>
  );
}

// Expense Detail Modal Component
function ExpenseDetailModal({ expense, qurbaniDays = [], onClose, onEdit }) {
  if (!expense) return null;

  const dayInfo = expense.qurbaniDayId
    ? qurbaniDays.find((d) => (d.qurbaniDayId || d.id) === expense.qurbaniDayId)?.name ||
      `Day ${expense.qurbaniDayId}`
    : 'General Overhead';

  return (
    <Modal
      title={`Expense #${expense.expenseId}`}
      description="Detailed ledger entry and verification trail."
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* Top Info Banner */}
        <div className="flex items-center justify-between rounded-xl bg-[#f4efe4] p-4 dark:bg-[#153428]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7b867e] dark:text-[#90ae9f]">
              Expense Amount
            </p>
            <p className="mt-1 font-display text-2xl font-extrabold text-[#183f35] dark:text-[#edf6f2]">
              ₹{formatNumber(expense.amount)}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-bold ${getCategoryBadgeClass(
              expense.category
            )}`}
          >
            {getCategoryLabel(expense.category)}
          </span>
        </div>

        {/* Attributes Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-[#ded8ca] bg-[#faf6ed] p-3 dark:border-[#21473a] dark:bg-[#122820]">
            <p className="font-semibold text-[#7b867e] dark:text-[#8ba79b]">Expense Date</p>
            <p className="mt-1 font-bold text-[#183f35] dark:text-[#edf6f2]">
              {expense.expenseDate ? formatShortDate(expense.expenseDate) : '—'}
            </p>
          </div>

          <div className="rounded-xl border border-[#ded8ca] bg-[#faf6ed] p-3 dark:border-[#21473a] dark:bg-[#122820]">
            <p className="font-semibold text-[#7b867e] dark:text-[#8ba79b]">Allocation</p>
            <p className="mt-1 font-bold text-[#183f35] dark:text-[#edf6f2]">{dayInfo}</p>
          </div>

          <div className="rounded-xl border border-[#ded8ca] bg-[#faf6ed] p-3 dark:border-[#21473a] dark:bg-[#122820]">
            <p className="font-semibold text-[#7b867e] dark:text-[#8ba79b]">Recorded By</p>
            <p className="mt-1 font-bold text-[#183f35] dark:text-[#edf6f2]">
              Admin - {expense.createdByAdmin}
            </p>
          </div>

          <div className="rounded-xl border border-[#ded8ca] bg-[#faf6ed] p-3 dark:border-[#21473a] dark:bg-[#122820]">
            <p className="font-semibold text-[#7b867e] dark:text-[#8ba79b]">Last Updated</p>
            <p className="mt-1 font-bold text-[#183f35] dark:text-[#edf6f2]">
              {expense.updatedAt ? formatDateTime(expense.updatedAt) : '—'}
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="rounded-xl border border-[#ded8ca] bg-[#faf6ed] p-3.5 text-xs dark:border-[#21473a] dark:bg-[#122820]">
          <p className="font-semibold text-[#7b867e] dark:text-[#8ba79b]">Description / Notes</p>
          <p className="mt-1.5 leading-relaxed text-[#183f35] dark:text-[#edf6f2]">
            {expense.description || <span className="italic text-[#8ba79b]">No description recorded.</span>}
          </p>
        </div>

        {/* Immutability & Audit Info Note */}
        <div className="flex items-center gap-2 rounded-xl bg-[#e8f4ed] p-3 text-xs text-[#246b59] dark:bg-[#102a20] dark:text-[#4ade80]">
          <ShieldCheck size={16} className="shrink-0" />
          <span>
            This financial record is audit-protected. Modifying this entry logs an automatic audit event in the Audit Trail.
          </span>
        </div>

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(expense);
            }}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Pencil size={13} />
            Edit Expense
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function ExpenseTracker({ data, patchData, notify }) {
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [dayFilter, setDayFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dateError, setDateError] = useState('');

  // Data state
  const [expenses, setExpenses] = useState(data.expenses || []);
  const [summary, setSummary] = useState({
    totalExpense: 0,
    qurbaniDayExpense: 0,
    generalExpense: 0,
  });
  const [qurbaniDays, setQurbaniDays] = useState(data.days || []);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackendConnected, setIsBackendConnected] = useState(true);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [viewingExpense, setViewingExpense] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Fetch Qurbani Days
  const fetchQurbaniDays = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/qurbani-days');
      if (res.data?.data && Array.isArray(res.data.data)) {
        setQurbaniDays(res.data.data);
      }
    } catch {
      // Fallback to local days
      if (data.days?.length) setQurbaniDays(data.days);
    }
  }, []);

  // Fetch Expenses and Summary
  const fetchExpensesData = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);

    try {
      const [listRes, summaryRes] = await Promise.all([
        getExpenses({ page: 0, size: 200 }).catch((err) => {
          console.warn('getExpenses failed:', err);
          return null;
        }),
        getExpenseSummary().catch((err) => {
          console.warn('getExpenseSummary failed:', err);
          return null;
        }),
      ]);

      if (listRes?.data) {
        setIsBackendConnected(true);
        let items = [];
        if (Array.isArray(listRes.data)) {
          items = listRes.data;
        } else if (Array.isArray(listRes.data.content)) {
          items = listRes.data.content;
        }
        setExpenses(items);
      } else {
        // Fallback to local mock state if backend is unreachable
        setIsBackendConnected(false);
        setExpenses((prev) => (prev.length > 0 ? prev : data.expenses || []));
      }

      if (summaryRes?.data) {
        setSummary({
          totalExpense: Number(summaryRes.data.totalExpense) || 0,
          qurbaniDayExpense: Number(summaryRes.data.qurbaniDayExpense) || 0,
          generalExpense: Number(summaryRes.data.generalExpense) || 0,
        });
      }
    } catch (err) {
      console.warn('Expense fetch error, using local fallback:', err);
      setIsBackendConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQurbaniDays();
    fetchExpensesData();
  }, [fetchQurbaniDays, fetchExpensesData]);

  // Handle Date range changes with validation
  const handleFromDateChange = (e) => {
    const val = e.target.value;
    setFromDate(val);
    if (val && toDate && val > toDate) {
      setDateError('From date cannot be later than To date.');
      notify?.('From date cannot be later than To date.', 'error');
    } else {
      setDateError('');
    }
  };

  const handleToDateChange = (e) => {
    const val = e.target.value;
    setToDate(val);
    if (val && fromDate && val < fromDate) {
      setDateError('From date cannot be later than To date.');
      notify?.('From date cannot be later than To date.', 'error');
    } else {
      setDateError('');
    }
  };

  const isDateRangeInvalid = Boolean(fromDate && toDate && fromDate > toDate);

  // Client-side filtering for fast interactive searching
  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      // Search query (matches description, category, or ID)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const idMatch = String(item.expenseId).toLowerCase().includes(q);
        const descMatch = (item.description || '').toLowerCase().includes(q);
        const catMatch = (item.category || '').toLowerCase().includes(q);
        if (!idMatch && !descMatch && !catMatch) return false;
      }

      // Category filter
      if (categoryFilter !== 'All' && item.category !== categoryFilter) {
        return false;
      }

      // Day filter
      if (dayFilter === 'General Only') {
        if (item.qurbaniDayId !== null && item.qurbaniDayId !== undefined) return false;
      } else if (dayFilter !== 'All') {
        const dayNum = parseInt(dayFilter.replace(/\D/g, ''), 10);
        if (Number(item.qurbaniDayId) !== dayNum) return false;
      }

      // Date bounds - only apply when date range is valid (prevents invalid date range from being accepted)
      if (!isDateRangeInvalid) {
        if (fromDate && item.expenseDate && item.expenseDate < fromDate) return false;
        if (toDate && item.expenseDate && item.expenseDate > toDate) return false;
      }

      return true;
    });
  }, [expenses, searchQuery, categoryFilter, dayFilter, fromDate, toDate, isDateRangeInvalid]);

  // Category dropdown options
  const categoryOptions = useMemo(() => {
    return ['All', ...EXPENSE_CATEGORIES.map((c) => c.value)];
  }, []);

  // Day dropdown options
  const dayOptions = useMemo(() => {
    return ['All', 'General Only', 'Day 1', 'Day 2', 'Day 3'];
  }, []);

  // Check if any filter is active
  const hasActiveFilters =
    searchQuery || categoryFilter !== 'All' || dayFilter !== 'All' || fromDate || toDate;

  const hasValidFilters =
    searchQuery ||
    categoryFilter !== 'All' ||
    dayFilter !== 'All' ||
    (!isDateRangeInvalid && (fromDate || toDate));

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('All');
    setDayFilter('All');
    setFromDate('');
    setToDate('');
    setDateError('');
  };

  // Create Expense Handler
  const handleCreateSubmit = async (payload) => {
    setIsSubmitting(true);
    setApiError(null);
    try {
      const res = await createExpense(payload);
      const createdItem = res?.data || {
        ...payload,
        expenseId: Date.now(),
        createdByAdminId: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      notify?.('Expense recorded successfully.', 'success');
      setIsCreateOpen(false);

      // Refresh list
      fetchExpensesData();
    } catch (err) {
      console.error('Failed to create expense:', err);
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.data && typeof err.response.data.data === 'object'
          ? Object.values(err.response.data.data).join(', ')
          : null) ||
        err.message ||
        'Failed to record expense.';

      // If backend is offline, save locally
      if (!err.response) {
        const newLocal = {
          ...payload,
          expenseId: expenses.length + 1,
          createdByAdminId: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const updated = [newLocal, ...expenses];
        setExpenses(updated);
        patchData((prev) => ({ ...prev, expenses: updated }));
        notify?.('Expense saved to local ledger (Backend offline).', 'info');
        setIsCreateOpen(false);
      } else {
        setApiError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Expense Handler
  const handleEditSubmit = async (payload) => {
    if (!editingExpense) return;
    setIsSubmitting(true);
    setApiError(null);

    try {
      const res = await updateExpense(editingExpense.expenseId, payload);
      notify?.(`Expense #${editingExpense.expenseId} updated successfully.`, 'success');
      setEditingExpense(null);
      fetchExpensesData();
    } catch (err) {
      console.error('Failed to update expense:', err);
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.data && typeof err.response.data.data === 'object'
          ? Object.values(err.response.data.data).join(', ')
          : null) ||
        err.message ||
        'Failed to update expense.';

      if (!err.response) {
        // Update locally
        const updated = expenses.map((item) =>
          item.expenseId === editingExpense.expenseId
            ? { ...item, ...payload, updatedAt: new Date().toISOString() }
            : item
        );
        setExpenses(updated);
        patchData((prev) => ({ ...prev, expenses: updated }));
        notify?.(`Expense #${editingExpense.expenseId} updated locally.`, 'info');
        setEditingExpense(null);
      } else {
        setApiError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Inspect single expense via API 30 (GET /api/v1/expenses/:id)
  const handleOpenViewExpense = async (expense) => {
    setViewingExpense(expense);
    const targetId = expense?.expenseId || expense?.id;
    if (targetId) {
      try {
        const res = await getExpenseById(targetId);
        if (res?.data) {
          setViewingExpense(res.data);
        }
      } catch (err) {
        console.warn(`Live GET /api/v1/expenses/${targetId} error, using list item:`, err);
      }
    }
  };

  // Edit single expense via API 30 (GET /api/v1/expenses/:id)
  const handleOpenEditExpense = async (expense) => {
    setApiError(null);
    setEditingExpense(expense);
    const targetId = expense?.expenseId || expense?.id;
    if (targetId) {
      try {
        const res = await getExpenseById(targetId);
        if (res?.data) {
          setEditingExpense(res.data);
        }
      } catch (err) {
        console.warn(`Live GET /api/v1/expenses/${targetId} error, using list item:`, err);
      }
    }
  };


  // Compute dynamic summary reflecting active filters or global backend summary
  const activeSummary = useMemo(() => {
    if (!hasValidFilters && summary.totalExpense > 0) {
      return summary;
    }
    const total = filteredExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const dayExp = filteredExpenses
      .filter((e) => e.qurbaniDayId !== null && e.qurbaniDayId !== undefined)
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const genExp = Math.max(total - dayExp, 0);
    return {
      totalExpense: hasValidFilters ? total : summary.totalExpense,
      qurbaniDayExpense: hasValidFilters ? dayExp : summary.qurbaniDayExpense,
      generalExpense: hasValidFilters ? genExp : summary.generalExpense,
    };
  }, [filteredExpenses, hasValidFilters, summary]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageIntro
          eyebrow="Financial Operations"
          title="Expense Tracker"
          description="Log and categorize operational expenditures, allocate costs to Qurbani Days, and track financial outflows."
          icon={ReceiptIndianRupee}
        />
        <div className="flex flex-wrap items-center gap-2.5 sm:self-start">
          <button
            type="button"
            onClick={fetchExpensesData}
            disabled={isLoading}
            className="btn-secondary flex items-center gap-2 text-xs"
            title="Refresh expenses"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            data-testid="button-add-expense"
            onClick={() => {
              setApiError(null);
              setIsCreateOpen(true);
            }}
            className="btn-primary flex items-center gap-2 text-xs shadow-md shadow-[#246b59]/20"
          >
            <Plus size={16} />
            Record Expense
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Operational Outflow"
          value={`₹${formatNumber(activeSummary.totalExpense)}`}
          sub={hasActiveFilters ? 'Filtered total' : 'Combined day & general expenditures'}
          icon={ReceiptIndianRupee}
          color="gold"
          delay={0}
        />
        <StatCard
          label="Day-Specific Expenses"
          value={`₹${formatNumber(activeSummary.qurbaniDayExpense)}`}
          sub={hasActiveFilters ? 'Filtered day costs' : 'Costs tied to Qurbani Days 1, 2, or 3'}
          icon={CalendarDays}
          color="green"
          delay={1}
        />
        <StatCard
          label="General Overhead"
          value={`₹${formatNumber(activeSummary.generalExpense)}`}
          sub={hasActiveFilters ? 'Filtered overhead' : 'Unlinked site & facility expenses'}
          icon={TrendingDown}
          color="teal"
          delay={2}
        />
        <StatCard
          label="Total Ledger Records"
          value={formatNumber(expenses.length)}
          sub={`${filteredExpenses.length} currently shown in filter`}
          icon={Layers}
          color="orange"
          delay={3}
        />
      </div>

      {/* Main Card with Filter Toolbar & Table */}
      <section className="card-surface rounded-2xl p-5 sm:p-6">
        {/* Table Title & Connectivity Indicator */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="kicker">Operational Ledger</p>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isBackendConnected
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isBackendConnected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                {isBackendConnected ? 'Backend Connected' : 'Local Storage'}
              </span>
            </div>
            <h3 className="mt-1 font-display text-xl font-extrabold text-[#183f35] dark:text-[#edf6f2]">
              Tracked Expenditures
            </h3>
          </div>

          {/* Immutability Banner */}
          <div className="flex items-center gap-2 text-xs text-[#7b867e] dark:text-[#8ba79b]">
            <Lock size={13} className="shrink-0 text-[#246b59] dark:text-[#4ade80]" />
            <span>Immutable Ledger — Deletions restricted for audit safety</span>
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
              type="text"
              placeholder="Search description or category..."
              className="h-10 w-full rounded-xl border border-[#ded8ca] bg-[#faf6ed] pl-10 pr-8 text-xs font-medium !text-[#183f35] placeholder:text-[#8a948e] transition focus:border-[#246b59] focus:bg-white focus:outline-none dark:border-[#21473a] dark:bg-[#122820] dark:text-[#edf6f2] dark:placeholder:text-[#698d80] dark:focus:border-[#4ade80]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a948e] hover:text-[#183f35] dark:hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <ProjectDropdown
            value={categoryFilter === 'All' ? 'Category: All' : `Category: ${getCategoryLabel(categoryFilter)}`}
            onChange={(selected) => {
              const clean = selected.replace('Category: ', '');
              const found = EXPENSE_CATEGORIES.find((c) => c.label === clean);
              setCategoryFilter(found ? found.value : 'All');
            }}
            options={['Category: All', ...EXPENSE_CATEGORIES.map((c) => `Category: ${c.label}`)]}
            icon={Tag}
            testId="dropdown-expense-category"
          />

          {/* Qurbani Day Dropdown */}
          <ProjectDropdown
            value={dayFilter === 'All' ? 'Allocation: All' : `Allocation: ${dayFilter}`}
            onChange={(selected) => {
              setDayFilter(selected.replace('Allocation: ', ''));
            }}
            options={dayOptions.map((d) => (d === 'All' ? 'Allocation: All' : `Allocation: ${d}`))}
            icon={CalendarDays}
            testId="dropdown-expense-day"
          />

          {/* Date Range Picker */}
          <div className="flex flex-col gap-1">
            <div
              className={`flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs transition-colors ${
                dateError
                  ? 'border-[#a63f32] bg-[#fff5f5] text-[#a63f32] dark:border-red-500/70 dark:bg-red-950/30'
                  : 'border-[#ded8ca] bg-[#faf6ed] dark:border-[#21473a] dark:bg-[#122820]'
              }`}
            >
              <Calendar
                size={13}
                className={`shrink-0 ${
                  dateError ? 'text-[#a63f32] dark:text-red-400' : 'text-[#8a948e] dark:text-[#698d80]'
                }`}
              />
              <span
                className={`text-[11px] font-semibold ${
                  dateError ? 'text-[#a63f32] dark:text-red-400' : 'text-[#8a948e] dark:text-[#698d80]'
                }`}
              >
                From:
              </span>
              <input
                data-testid="input-expense-from-date"
                type="date"
                max={toDate || undefined}
                className="bg-transparent text-xs font-semibold text-[#183f35] dark:text-[#edf6f2] outline-none"
                value={fromDate}
                onChange={handleFromDateChange}
              />
              <span
                className={`mx-0.5 text-[11px] font-semibold ${
                  dateError ? 'text-[#a63f32] dark:text-red-400' : 'text-[#8a948e] dark:text-[#698d80]'
                }`}
              >
                To:
              </span>
              <input
                data-testid="input-expense-to-date"
                type="date"
                min={fromDate || undefined}
                className="bg-transparent text-xs font-semibold text-[#183f35] dark:text-[#edf6f2] outline-none"
                value={toDate}
                onChange={handleToDateChange}
              />
              {(fromDate || toDate) && (
                <button
                  type="button"
                  title="Clear date range"
                  onClick={() => {
                    setFromDate('');
                    setToDate('');
                    setDateError('');
                  }}
                  className="ml-1 text-[#8a948e] hover:text-[#183f35] dark:hover:text-white"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            {dateError && (
              <span
                data-testid="error-expense-date-range"
                className="flex items-center gap-1 text-[11px] font-semibold text-[#a63f32] dark:text-red-400"
              >
                <AlertCircle size={12} className="shrink-0" />
                {dateError}
              </span>
            )}
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="h-10 rounded-xl px-3 text-xs font-bold text-[#a63f32] transition hover:bg-[#fff3f0] dark:text-[#fca5a5] dark:hover:bg-[#331614]"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Expenses Table */}
        <TableScroll>
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <Th>Category</Th>
                <Th>Amount</Th>
                <Th>Allocation</Th>
                <Th>Expense Date</Th>
                <Th>Description</Th>
                <Th>Admin</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense) => {
                const dayLabel = expense.qurbaniDayId
                  ? `Day ${expense.qurbaniDayId}`
                  : 'General';

                return (
                  <tr
                    key={expense.expenseId}
                    data-testid={`row-expense-${expense.expenseId}`}
                    className="border-t border-[#eee8dc] hover:bg-[#faf7f0]/60 dark:border-[#21473a] dark:hover:bg-[#122b22]/50 transition-colors"
                  >
                    {/* Category */}
                    <Td>
                      <span
                        className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${getCategoryBadgeClass(
                          expense.category
                        )}`}
                      >
                        {getCategoryLabel(expense.category)}
                      </span>
                    </Td>

                    {/* Amount */}
                    <Td>
                      <span className="font-display font-extrabold text-[#183f35] dark:text-[#edf6f2]">
                        ₹{formatNumber(expense.amount)}
                      </span>
                    </Td>

                    {/* Allocation / Day */}
                    <Td>
                      {expense.qurbaniDayId ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#eaf3ed] px-2 py-0.5 text-xs font-semibold text-[#246b59] dark:bg-[#153428] dark:text-[#4ade80]">
                          <CalendarDays size={12} />
                          {dayLabel}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#f0eae1] px-2 py-0.5 text-xs font-semibold text-[#6d7971] dark:bg-[#182e26] dark:text-[#90a89d]">
                          General
                        </span>
                      )}
                    </Td>

                    {/* Date */}
                    <Td className="whitespace-nowrap text-xs text-[#7b867e] dark:text-[#8ba79b]">
                      {expense.expenseDate ? formatShortDate(expense.expenseDate) : '—'}
                    </Td>

                    {/* Description */}
                    <Td className="max-w-[240px] truncate text-xs text-[#55675e] dark:text-[#b4cbbe]">
                      {expense.description || (
                        <span className="italic text-[#92a49b]">No description</span>
                      )}
                    </Td>

                    {/* Admin */}
                    <Td className="font-mono text-xs text-[#7b867e] dark:text-[#8ba79b]">
                      {expense.createdByAdmin}
                    </Td>

                    {/* Actions */}
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          data-testid={`button-view-expense-${expense.expenseId}`}
                          onClick={() => handleOpenViewExpense(expense)}
                          className="rounded-lg p-1.5 text-[#246b59] hover:bg-[#e4efe8] dark:text-[#4ade80] dark:hover:bg-[#16382b] transition"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          data-testid={`button-edit-expense-${expense.expenseId}`}
                          onClick={() => handleOpenEditExpense(expense)}
                          className="rounded-lg p-1.5 text-[#8f6b28] hover:bg-[#faeed7] dark:text-[#f3c46a] dark:hover:bg-[#2b2210] transition"
                          title="Edit Expense"
                        >
                          <Pencil size={15} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableScroll>

        {/* Empty State */}
        {filteredExpenses.length === 0 && !isLoading && (
          <EmptyState
            title="No expenses found"
            description={
              hasActiveFilters
                ? 'No expense records match your active filters or search terms.'
                : 'Start tracking operational outlays by recording your first expense.'
            }
          />
        )}
      </section>

      {/* Record Expense Modal */}
      {isCreateOpen && (
        <ExpenseFormModal
          mode="create"
          qurbaniDays={qurbaniDays}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreateSubmit}
          isSubmitting={isSubmitting}
          apiError={apiError}
        />
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <ExpenseFormModal
          mode="edit"
          expense={editingExpense}
          qurbaniDays={qurbaniDays}
          onClose={() => setEditingExpense(null)}
          onSubmit={handleEditSubmit}
          isSubmitting={isSubmitting}
          apiError={apiError}
        />
      )}

      {/* View Detail Modal */}
      {viewingExpense && (
        <ExpenseDetailModal
          expense={viewingExpense}
          qurbaniDays={qurbaniDays}
          onClose={() => setViewingExpense(null)}
          onEdit={(exp) => {
            setEditingExpense(exp);
          }}
        />
      )}
    </div>
  );
}
