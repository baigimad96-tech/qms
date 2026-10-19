import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Layers,
  Users,
  Database,
  ArrowRight,
  Clock,
  CheckCircle2,
  User,
} from 'lucide-react';
import { PageIntro } from './Dashboard.jsx';
import StatCard from '../components/StatCard.jsx';
import { TableScroll, Th, Td, EmptyState } from '../components/Table.jsx';
import ProjectDropdown from '../components/ProjectDropdown.jsx';
import Modal, { ModalActions } from '../components/Modal.jsx';
import { formatDateTime, formatMoney, formatNumber } from '../data/mockData.js';
import { getAuditLogs, getAuditLogById, AUDIT_ENTITY_TYPES } from '../services/auditApi.js';
import { api } from '../services/api.js';

// Action badge styling helper
function getActionBadgeStyle(action) {
  const act = String(action || '').toUpperCase();
  if (act.includes('CREATED')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900';
  }
  if (act.includes('UPDATED') || act.includes('STOCK_ADDED') || act.includes('CAPACITY')) {
    return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900';
  }
  if (act.includes('DELETED')) {
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900';
  }
  return 'bg-[#eef4ed] text-[#246b59] border-[#ded7c8] dark:bg-[#16382b] dark:text-[#4ade80] dark:border-[#225744]';
}

// Entity badge styling helper
function getEntityBadgeStyle(entityType) {
  const ent = String(entityType || '').toUpperCase();
  switch (ent) {
    case 'ANIMAL':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900';
    case 'HISSA_BOOKING':
      return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-900';
    case 'USER':
    case 'ADMIN':
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-900';
    case 'QURBANI_DAY':
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-900';
    case 'EXPENSE':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-900';
    default:
      return 'bg-[#f4efe4] text-[#41685a] border-[#ded7c8] dark:bg-[#18362b] dark:text-[#9bc2b1] dark:border-[#285745]';
  }
}

// Human readable entity label helper
function getEntityLabel(entityType) {
  switch (String(entityType || '').toUpperCase()) {
    case 'ANIMAL':
      return 'Animal Inventory';
    case 'HISSA_BOOKING':
      return 'Hissa Booking';
    case 'USER':
      return 'Admin User';
    case 'QURBANI_DAY':
      return 'Qurbani Day';
    case 'EXPENSE':
      return 'Expense';
    default:
      return entityType || 'System';
  }
}

// Safe payload parser (handles JSON string, object, or null)
function parseAuditPayload(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
  return val;
}

// Entity ID label helper
function getEntityIdLabel(entityType) {
  switch (String(entityType || '').toUpperCase()) {
    case 'EXPENSE':
      return 'Expense ID';
    case 'HISSA_BOOKING':
      return 'Booking ID';
    case 'ANIMAL':
      return 'Animal Inventory ID';
    case 'USER':
    case 'ADMIN':
      return 'Admin User ID';
    case 'QURBANI_DAY':
      return 'Qurbani Day ID';
    default:
      return 'Entity ID';
  }
}

// Field labels metadata mapping
const AUDIT_FIELD_METADATA = {
  // Expense fields
  category: { label: 'Expense Category' },
  amount: { label: 'Amount (₹)', isMoney: true },
  expenseDate: { label: 'Expense Date', isDate: true },
  description: { label: 'Expense Description' },
  qurbaniDayId: { label: 'Allocated Qurbani Day', isDay: true },
  createdByAdminId: { label: 'Created By Admin ID' },

  // Booking fields
  qurbaniPersonName: { label: 'Participant Name' },
  personName: { label: 'Participant Name' },
  animalId: { label: 'Animal Batch ID' },
  animalType: { label: 'Animal Type' },
  totalHissa: { label: 'Total Hissa Count' },
  hissa: { label: 'Total Hissa' },
  perHissaCost: { label: 'Cost Per Hissa', isMoney: true },
  totalHissaCost: { label: 'Total Booking Cost', isMoney: true },
  cost: { label: 'Cost', isMoney: true },
  meatWanted: { label: 'Meat Wanted', isBoolean: true },
  bookedByAdminName: { label: 'Booked By Admin' },
  bookedBy: { label: 'Booked By Admin' },
  receiptNumber: { label: 'Receipt Number' },

  // Animal fields
  batchYear: { label: 'Batch Year' },
  totalAnimals: { label: 'Total Animals' },
  hissaPerAnimal: { label: 'Hissa Per Animal' },
  availableHissa: { label: 'Available Hissa' },
  bookedHissa: { label: 'Booked Hissa' },

  // User fields
  fullName: { label: 'Full Name' },
  email: { label: 'Email Address' },
  role: { label: 'Assigned Role' },
  status: { label: 'Account Status' },

  // Qurbani Day fields
  name: { label: 'Day Name' },
  dayNumber: { label: 'Day Number' },
  capacity: { label: 'Total Capacity' },
  date: { label: 'Scheduled Date' },
};

function formatAuditKey(key) {
  if (AUDIT_FIELD_METADATA[key]?.label) {
    return AUDIT_FIELD_METADATA[key].label;
  }
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatAuditValue(key, value) {
  if (value === null || value === undefined || value === '') {
    if (key === 'qurbaniDayId') return 'General Expense (No specific day)';
    return '—';
  }

  const meta = AUDIT_FIELD_METADATA[key];

  if (meta?.isMoney || key.toLowerCase().includes('amount') || key.toLowerCase().includes('cost')) {
    const num = Number(value);
    return isNaN(num) ? String(value) : formatMoney(num);
  }

  if (meta?.isDay || key === 'qurbaniDayId') {
    return `Day ${value}`;
  }

  if (typeof value === 'boolean' || meta?.isBoolean) {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

// Render formatted Key-Value grid
function RenderKeyValueGrid({ data, emptyMessage = 'No details recorded.' }) {
  if (!data || typeof data !== 'object') {
    return (
      <div className="rounded-xl bg-[#faf6ed] p-3 text-xs italic text-[#7b867e] dark:bg-[#122820] dark:text-[#8ba79b]">
        {data ? String(data) : emptyMessage}
      </div>
    );
  }

  const entries = Object.entries(data);
  if (entries.length === 0) {
    return (
      <div className="rounded-xl bg-[#faf6ed] p-3 text-xs italic text-[#7b867e] dark:bg-[#122820] dark:text-[#8ba79b]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {entries.map(([key, val]) => (
        <div
          key={key}
          className="rounded-xl border border-[#ded8ca] bg-[#faf6ed] p-3 dark:border-[#21473a] dark:bg-[#122820]"
        >
          <p className="text-[11px] font-semibold text-[#7b867e] dark:text-[#8ba79b]">
            {formatAuditKey(key)}
          </p>
          <p className="mt-1 break-words text-xs font-bold text-[#183f35] dark:text-[#edf6f2]">
            {formatAuditValue(key, val)}
          </p>
        </div>
      ))}
    </div>
  );
}

// Audit Change / Detail Inspector Modal
function AuditDetailModal({ audit, onClose }) {
  if (!audit) return null;

  const id = audit.auditId || audit.id;
  const admin =
    audit.adminName || (audit.adminId ? `Admin #${audit.adminId}` : audit.admin || 'System');
  const timestamp = audit.createdAt || audit.at;
  const action = String(audit.action || '').toUpperCase();

  const oldPayload = parseAuditPayload(audit.oldValue);
  const newPayload = parseAuditPayload(audit.newValue);

  const isUpdate = action.includes('UPDATE') || (Boolean(oldPayload) && Boolean(newPayload));
  const isCreate = action.includes('CREATE') || (!oldPayload && Boolean(newPayload));
  const isDelete = action.includes('DELETE') || (Boolean(oldPayload) && !newPayload);

  // Compute modified fields if this is an update event
  const changedKeys = useMemo(() => {
    if (!isUpdate || !oldPayload || !newPayload || typeof oldPayload !== 'object' || typeof newPayload !== 'object') {
      return [];
    }
    const all = Array.from(new Set([...Object.keys(oldPayload), ...Object.keys(newPayload)]));
    return all.filter((k) => JSON.stringify(oldPayload[k]) !== JSON.stringify(newPayload[k]));
  }, [isUpdate, oldPayload, newPayload]);

  return (
    <Modal
      title={`Audit Event #${id}`}
      description="Complete event details, administrator attribution, and entity state records."
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* Top Summary & Attribution Card */}
        <div className="rounded-xl border border-[#ded8ca] bg-[#faf6ed] p-4 dark:border-[#21473a] dark:bg-[#122820]">
          {/* Header Row: Action Badge + Entity Type + Timestamp */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eee8dc] pb-3 dark:border-[#1a3d31]">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${getActionBadgeStyle(
                  audit.action
                )}`}
              >
                {audit.action}
              </span>
              <span
                className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${getEntityBadgeStyle(
                  audit.entityType
                )}`}
              >
                {getEntityLabel(audit.entityType)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#7b867e] dark:text-[#8ba79b]">
              <Clock size={13} />
              <span>{formatDateTime(timestamp)}</span>
            </div>
          </div>

          {/* Attribution Grid: Admin Name, Target Entity ID, Event ID */}
          <div className="mt-3 grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-3">
            <div className="rounded-lg border border-[#eee8dc]/70 bg-white/70 p-2.5 dark:border-[#1e4636] dark:bg-[#153428]/70">
              <p className="text-[11px] font-semibold text-[#7b867e] dark:text-[#8ba79b]">
                Executed By Admin
              </p>
              <p className="mt-1 flex items-center gap-1.5 font-bold text-[#183f35] dark:text-[#edf6f2]">
                <User size={13} className="shrink-0 text-[#246b59] dark:text-[#4ade80]" />
                <span className="truncate">{admin}</span>
              </p>
              {audit.adminId && (
                <p className="mt-0.5 text-[10px] text-[#8a948e] dark:text-[#698d80]">
                  Admin ID: #{audit.adminId}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-[#eee8dc]/70 bg-white/70 p-2.5 dark:border-[#1e4636] dark:bg-[#153428]/70">
              <p className="text-[11px] font-semibold text-[#7b867e] dark:text-[#8ba79b]">
                {getEntityIdLabel(audit.entityType)}
              </p>
              <p className="mt-1 flex items-center gap-1.5 font-mono font-bold text-[#183f35] dark:text-[#edf6f2]">
                <Layers size={13} className="shrink-0 text-[#246b59] dark:text-[#4ade80]" />
                <span>#{audit.entityId}</span>
              </p>
              <p className="mt-0.5 text-[10px] text-[#8a948e] dark:text-[#698d80]">
                {getEntityLabel(audit.entityType)}
              </p>
            </div>

            <div className="rounded-lg border border-[#eee8dc]/70 bg-white/70 p-2.5 dark:border-[#1e4636] dark:bg-[#153428]/70">
              <p className="text-[11px] font-semibold text-[#7b867e] dark:text-[#8ba79b]">
                Audit Record ID
              </p>
              <p className="mt-1 font-mono font-bold text-[#246b59] dark:text-[#4ade80]">
                #{id}
              </p>
              <p className="mt-0.5 text-[10px] text-[#8a948e] dark:text-[#698d80]">
                Immutable Security Trail
              </p>
            </div>
          </div>
        </div>

        {/* DETAILS SECTION */}
        {/* CASE 1: UPDATE EVENT -> Show Changed Fields Diff + Old & New Values */}
        {isUpdate && (
          <div className="space-y-3">
            {changedKeys.length > 0 && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 text-xs dark:border-blue-900/60 dark:bg-blue-950/30">
                <div className="mb-2 flex items-center gap-1.5 font-bold text-blue-800 dark:text-blue-300">
                  <Activity size={14} />
                  <span>Modified Fields ({changedKeys.length})</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {changedKeys.map((k) => (
                    <div
                      key={k}
                      className="rounded-lg border border-blue-100 bg-white/90 p-2 dark:border-blue-900/40 dark:bg-[#122820]"
                    >
                      <span className="block text-[11px] font-semibold text-[#7b867e] dark:text-[#8ba79b]">
                        {formatAuditKey(k)}
                      </span>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="font-mono text-rose-600 line-through dark:text-rose-400">
                          {formatAuditValue(k, oldPayload?.[k])}
                        </span>
                        <ArrowRight size={12} className="shrink-0 text-[#7b867e] dark:text-[#8ba79b]" />
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatAuditValue(k, newPayload?.[k])}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Side-by-Side or Stacked Old vs New */}
            <div className="space-y-3">
              {/* Previous Value */}
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/30 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/10">
                <div className="mb-2.5 flex items-center justify-between border-b border-amber-200/60 pb-2 dark:border-amber-900/30">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                    Previous Value (Before Modification)
                  </span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                    Old State
                  </span>
                </div>
                <RenderKeyValueGrid data={oldPayload} emptyMessage="No prior data recorded." />
              </div>

              {/* Updated Value */}
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/10">
                <div className="mb-2.5 flex items-center justify-between border-b border-emerald-200/60 pb-2 dark:border-emerald-900/30">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    Updated Value (After Modification)
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                    New State
                  </span>
                </div>
                <RenderKeyValueGrid data={newPayload} emptyMessage="No updated state recorded." />
              </div>
            </div>
          </div>
        )}

        {/* CASE 2: CREATE EVENT -> Show Created Record Details (New Value) */}
        {!isUpdate && isCreate && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <div className="mb-3 flex items-center justify-between border-b border-emerald-200/60 pb-2.5 dark:border-emerald-900/40">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 size={15} />
                <span>Created Record Details (New Value)</span>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-400">
                Newly Recorded
              </span>
            </div>
            <RenderKeyValueGrid data={newPayload} emptyMessage="No creation payload recorded." />
          </div>
        )}

        {/* CASE 3: DELETE EVENT -> Show Deleted Record Details (Snapshot from Old Value) */}
        {!isUpdate && isDelete && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 dark:border-rose-900/50 dark:bg-rose-950/20">
            <div className="mb-3 flex items-center justify-between border-b border-rose-200/60 pb-2.5 dark:border-rose-900/40">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300">
                <X size={15} />
                <span>Deleted Record Details (Snapshot)</span>
              </div>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-900/60 dark:text-rose-400">
                Removed from System
              </span>
            </div>
            <RenderKeyValueGrid data={oldPayload || newPayload} emptyMessage="No deletion snapshot available." />
          </div>
        )}

        {/* CASE 4: OTHER / SYSTEM EVENT -> Fallback if neither */}
        {!isUpdate && !isCreate && !isDelete && (
          <div className="space-y-3">
            {oldPayload && (
              <div className="rounded-xl border border-[#ded8ca] bg-[#faf6ed] p-3.5 dark:border-[#21473a] dark:bg-[#122820]">
                <p className="mb-2 text-xs font-bold text-[#183f35] dark:text-[#edf6f2]">Previous Value</p>
                <RenderKeyValueGrid data={oldPayload} />
              </div>
            )}
            {newPayload && (
              <div className="rounded-xl border border-[#ded8ca] bg-[#faf6ed] p-3.5 dark:border-[#21473a] dark:bg-[#122820]">
                <p className="mb-2 text-xs font-bold text-[#183f35] dark:text-[#edf6f2]">Current Value</p>
                <RenderKeyValueGrid data={newPayload} />
              </div>
            )}
          </div>
        )}

        <ModalActions onClose={onClose} submitLabel="Close" cancel={false} />
      </div>
    </Modal>
  );
}

export default function AuditLogs({ data }) {
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');
  const [adminFilter, setAdminFilter] = useState('All');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Data states
  const [auditLogs, setAuditLogs] = useState([]);
  const [adminUsers, setAdminUsers] = useState(data?.admins || []);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackendConnected, setIsBackendConnected] = useState(true);

  // Inspector modal
  const [selectedAudit, setSelectedAudit] = useState(null);

  // Fetch admin users for dropdown attribution
  const fetchAdmins = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/admins');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setAdminUsers(res.data.data);
      }
    } catch {
      if (data?.admins?.length) setAdminUsers(data.admins);
    }
  }, [data?.admins]);

  // Fetch live audit logs from GET /api/v1/audit-logs
  const fetchAuditLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = {
        page: currentPage,
        size: pageSize,
      };

      if (entityFilter !== 'All') {
        queryParams.entityType = entityFilter;
      }
      if (actionFilter !== 'All') {
        let actionVal = actionFilter;
        if (actionVal === 'BOOKING_CREATED') actionVal = 'HISSA_BOOKING_CREATED';
        if (actionVal === 'BOOKING_UPDATED') actionVal = 'HISSA_BOOKING_UPDATED';
        if (actionVal === 'BOOKING_DELETED') actionVal = 'HISSA_BOOKING_DELETED';
        queryParams.action = actionVal;
      }
      if (adminFilter !== 'All') {
        queryParams.adminId = Number(adminFilter);
      }

      const res = await getAuditLogs(queryParams);

      if (res?.data) {
        setIsBackendConnected(true);
        const rawContent = res.data.content || (Array.isArray(res.data) ? res.data : []);
        setAuditLogs(rawContent);
        setTotalElements(res.data.totalElements !== undefined ? res.data.totalElements : rawContent.length);
        setTotalPages(res.data.totalPages !== undefined ? Math.max(res.data.totalPages, 1) : 1);
      } else {
        // Fallback to local mock data
        setIsBackendConnected(false);
        const fallback = data?.audits || [];
        setAuditLogs(fallback);
        setTotalElements(fallback.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.warn('Live audit-logs API error, using local fallback:', err);
      setIsBackendConnected(false);
      const fallback = data?.audits || [];
      setAuditLogs(fallback);
      setTotalElements(fallback.length);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, entityFilter, actionFilter, adminFilter, data?.audits]);

  // Inspect single audit log via API 34 (GET /api/v1/audit-logs/:id)
  const handleInspectAudit = async (audit) => {
    setSelectedAudit(audit);
    const targetId = audit?.auditId || audit?.id;
    if (targetId) {
      try {
        const res = await getAuditLogById(targetId);
        if (res?.data) {
          setSelectedAudit(res.data);
        }
      } catch (err) {
        console.warn(`Live GET /api/v1/audit-logs/${targetId} error, using list payload:`, err);
      }
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Compute available actions dynamically from returned logs + standard presets
  const actionOptions = useMemo(() => {
    const actions = new Set([
      'ANIMAL_STOCK_ADDED',
      'ANIMAL_CREATED',
      'ANIMAL_UPDATED',
      'HISSA_BOOKING_CREATED',
      'HISSA_BOOKING_UPDATED',
      'HISSA_BOOKING_DELETED',
      'ADMIN_CREATED',
      'ADMIN_UPDATED',
      'EXPENSE_CREATED',
      'EXPENSE_UPDATED',
      'QURBANI_DAY_CAPACITY_UPDATED',
    ]);
    auditLogs.forEach((item) => {
      if (item.action) actions.add(item.action);
    });

    const matchesEntity = (action) => {
      switch (entityFilter) {
        case 'ANIMAL':
          return action.startsWith('ANIMAL_');
        case 'HISSA_BOOKING':
          return action.startsWith('HISSA_BOOKING_') || action.startsWith('BOOKING_');
        case 'USER':
          return action.startsWith('ADMIN_') || action.startsWith('USER_');
        case 'QURBANI_DAY':
          return action.startsWith('QURBANI_DAY_');
        case 'EXPENSE':
          return action.startsWith('EXPENSE_');
        default:
          return true;
      }
    };

    return ['All', ...Array.from(actions).filter(matchesEntity)];
  }, [auditLogs, entityFilter]);

  // Compute entity type dropdown options
  const entityOptions = useMemo(() => {
    return [
      'All',
      'ANIMAL',
      'HISSA_BOOKING',
      'USER',
      'QURBANI_DAY',
      'EXPENSE',
    ];
  }, []);

  // Compute admin dropdown options
  const adminOptions = useMemo(() => {
    const list = ['All'];
    adminUsers.forEach((a) => {
      const name = a.fullName || a.name;
      if (name) list.push(name);
    });
    return list;
  }, [adminUsers]);
  const selectedAdmin = adminUsers.find(
    (admin) => String(admin.userId || admin.id) === adminFilter
  );

  // Client-side search filtering across active page items
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return auditLogs;
    const q = searchQuery.toLowerCase();
    return auditLogs.filter((item) => {
      const id = String(item.auditId || item.id || '').toLowerCase();
      const admin = String(item.adminName || item.admin || item.adminId || '').toLowerCase();
      const action = String(item.action || '').toLowerCase();
      const entity = String(item.entityType || '').toLowerCase();
      const entityId = String(item.entityId || '').toLowerCase();
      return (
        id.includes(q) ||
        admin.includes(q) ||
        action.includes(q) ||
        entity.includes(q) ||
        entityId.includes(q)
      );
    });
  }, [auditLogs, searchQuery]);

  // Check if any filter is active
  const hasActiveFilters =
    searchQuery || entityFilter !== 'All' || actionFilter !== 'All' || adminFilter !== 'All';

  const handleResetFilters = () => {
    setSearchQuery('');
    setEntityFilter('All');
    setActionFilter('All');
    setAdminFilter('All');
    setCurrentPage(0);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageIntro
          eyebrow="Accountability & Compliance"
          title="Audit logs"
          description="A durable, immutable security ledger of all administrative and operational activities across inventory, bookings, and expenses."
          icon={Activity}
        />
        <button
          type="button"
          onClick={fetchAuditLogs}
          disabled={isLoading}
          className="btn-secondary flex items-center gap-2 text-xs sm:self-start"
          title="Refresh audit logs"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Audited Events"
          value={String(totalElements)}
          sub="Recorded lifecycle mutations"
          icon={Activity}
          color="gold"
          delay={0}
        />
        <StatCard
          label="Distinct Actions"
          value={String(actionOptions.length - 1)}
          sub="Operation classifications"
          icon={Database}
          color="green"
          delay={1}
        />
        <StatCard
          label="Active Admins"
          value={String(Math.max(adminUsers.length, 1))}
          sub="Attributed operators"
          icon={Users}
          color="teal"
          delay={2}
        />
        <StatCard
          label="Filtered Records"
          value={String(filteredLogs.length)}
          sub={`Page ${currentPage + 1} of ${totalPages}`}
          icon={Layers}
          color="orange"
          delay={3}
        />
      </div>

      {/* Main Table Card */}
      <section className="card-surface rounded-2xl p-5 sm:p-6">
        {/* Card Header & Status */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="kicker">Security Trail</p>
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
                {isBackendConnected ? 'Live API (Endpoint #27)' : 'Local Storage'}
              </span>
            </div>
            <h3 className="mt-1 font-display text-xl font-extrabold text-[#183f35] dark:text-[#edf6f2]">
              {totalElements} recorded events
            </h3>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e4efe8] text-[#246b59] dark:bg-[#153428] dark:text-[#4ade80]">
            <ShieldCheck size={19} />
          </div>
        </div>

        {/* Filter Toolbar matching Bookings and AnimalInventory */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a948e] dark:text-[#698d80]"
            />
            <input
              type="text"
              placeholder="Search audit , admin, action..."
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

          {/* Entity Type Dropdown */}
          <ProjectDropdown
            value={entityFilter}
            onChange={(selected) => {
              setEntityFilter(selected);
              setActionFilter('All');
              setCurrentPage(0);
            }}
            options={entityOptions}
            icon={Filter}
            testId="dropdown-audit-entity"
            fitOptions
            placeholder="Filter by Entity"
          />

          {/* Action Dropdown */}
          <ProjectDropdown
            value={actionFilter}
            onChange={(selected) => {
              setActionFilter(selected);
              setCurrentPage(0);
            }}
            options={actionOptions}
            icon={Database}
            testId="dropdown-audit-action"
            fitOptions
            placeholder="Filter by Action"
          />

          {/* Admin User Dropdown */}
          <ProjectDropdown
            value={adminFilter === 'All' ? 'All' : (selectedAdmin?.fullName || selectedAdmin?.name || 'All')}
            onChange={(selected) => {
              const admin = adminUsers.find(
                (item) => (item.fullName || item.name) === selected
              );
              setAdminFilter(selected === 'All' ? 'All' : String(admin?.userId || admin?.id || 'All'));
              setCurrentPage(0);
            }}
            options={adminOptions}
            icon={Users}
            testId="dropdown-audit-admin"
            placeholder="Filter by Admin"
          />

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

        {/* Audit Table */}
        <TableScroll>
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <Th>Admin</Th>
                <Th>Action</Th>
                <Th>Entity Type</Th>
                <Th>Date / Time</Th>
                <Th className="text-right">Details</Th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((audit) => {
                const id = audit.auditId || audit.id;
                const adminName =
                  audit.adminName || (audit.adminId ? `Admin #${audit.adminId}` : audit.admin || 'System');
                const timestamp = audit.createdAt || audit.at;

                return (
                  <tr
                    key={id}
                    data-testid={`row-audit-${id}`}
                    className="border-t border-[#eee8dc] hover:bg-[#faf7f0]/60 dark:border-[#21473a] dark:hover:bg-[#122b22]/50 transition-colors"
                  >
                    {/* Admin */}
                    <Td className="font-semibold text-[#183f35] dark:text-[#edf6f2]">
                      {adminName}
                    </Td>

                    {/* Action */}
                    <Td>
                      <span
                        className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-bold ${getActionBadgeStyle(
                          audit.action
                        )}`}
                      >
                        {audit.action}
                      </span>
                    </Td>

                    {/* Entity Type */}
                    <Td>
                      <span
                        className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-semibold ${getEntityBadgeStyle(
                          audit.entityType
                        )}`}
                      >
                        {getEntityLabel(audit.entityType)}
                      </span>
                    </Td>

                    {/* Date / Time */}
                    <Td className="whitespace-nowrap text-xs text-[#7b867e] dark:text-[#8ba79b]">
                      {formatDateTime(timestamp)}
                    </Td>

                    {/* Actions / View Details */}
                    <Td className="text-right">
                      <button
                        type="button"
                        data-testid={`button-audit-details-${id}`}
                        onClick={() => handleInspectAudit(audit)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#246b59] hover:bg-[#e4efe8] dark:text-[#4ade80] dark:hover:bg-[#16382b] transition"
                        title="View complete audit details"
                      >
                        <Eye size={14} />
                        <span>Details</span>
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableScroll>

        {/* Empty State */}
        {filteredLogs.length === 0 && !isLoading && (
          <EmptyState
            title="No audit events found"
            description={
              hasActiveFilters
                ? 'No recorded events match the selected entity type, action, or search filters.'
                : 'There are currently no recorded operational events in this ledger.'
            }
          />
        )}

        {/* Pagination Bar */}
        <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-[#eee8dc] pt-4 dark:border-[#21473a] sm:flex-row">
          <p className="text-xs text-[#7b867e] dark:text-[#8ba79b]">
            Showing <strong className="text-[#183f35] dark:text-[#edf6f2]">{filteredLogs.length}</strong> of{' '}
            <strong className="text-[#183f35] dark:text-[#edf6f2]">{totalElements}</strong> total audit records
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
              disabled={currentPage === 0 || isLoading}
              className="flex h-9 items-center gap-1 rounded-xl border border-[#ded8ca] bg-[#faf6ed] px-3 text-xs font-semibold text-[#183f35] transition hover:bg-white disabled:opacity-40 disabled:pointer-events-none dark:border-[#21473a] dark:bg-[#122820] dark:text-[#edf6f2] dark:hover:bg-[#173329]"
            >
              <ChevronLeft size={14} />
              Previous
            </button>
            <span className="px-2 text-xs font-bold text-[#246b59] dark:text-[#4ade80]">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages - 1))}
              disabled={currentPage >= totalPages - 1 || isLoading}
              className="flex h-9 items-center gap-1 rounded-xl border border-[#ded8ca] bg-[#faf6ed] px-3 text-xs font-semibold text-[#183f35] transition hover:bg-white disabled:opacity-40 disabled:pointer-events-none dark:border-[#21473a] dark:bg-[#122820] dark:text-[#edf6f2] dark:hover:bg-[#173329]"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* Audit Detail / Snapshot Modal */}
      {selectedAudit && (
        <AuditDetailModal
          audit={selectedAudit}
          onClose={() => setSelectedAudit(null)}
        />
      )}
    </div>
  );
}
