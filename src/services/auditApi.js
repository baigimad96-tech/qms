import { api } from './api.js';

/**
 * Service for Audit Log API
 * Endpoint #27: GET /api/v1/audit-logs
 *
 * Query parameters:
 * - adminId (Long): Filter logs by admin user ID
 * - entityType (String): Filter by entity type ('ANIMAL', 'HISSA_BOOKING', 'USER', 'QURBANI_DAY', 'EXPENSE')
 * - action (String): Filter by action name (e.g. 'ANIMAL_STOCK_ADDED', 'ANIMAL_UPDATED', 'EXPENSE_CREATED')
 * - page (Integer): Zero-based page index (default: 0)
 * - size (Integer): Page size limit (default: 20)
 */

export const AUDIT_ENTITY_TYPES = [
  { value: 'ALL', label: 'All Entities' },
  { value: 'ANIMAL', label: 'Animal' },
  { value: 'HISSA_BOOKING', label: 'Hissa Booking' },
  { value: 'USER', label: 'User / Admin' },
  { value: 'QURBANI_DAY', label: 'Qurbani Day' },
  { value: 'EXPENSE', label: 'Expense' },
];

/**
 * Fetches audit logs with pagination and multi-parameter filters.
 *
 * @param {Object} params
 * @param {number} [params.page=0]
 * @param {number} [params.size=20]
 * @param {string} [params.entityType]
 * @param {string} [params.action]
 * @param {number|string} [params.adminId]
 * @returns {Promise<Object>} API response data envelope
 */
export async function getAuditLogs(params = {}) {
  const query = {};

  if (params.page !== undefined) query.page = Number(params.page);
  if (params.size !== undefined) query.size = Number(params.size);

  if (
    params.entityType &&
    params.entityType !== 'ALL' &&
    params.entityType !== 'All' &&
    params.entityType !== 'All Entities'
  ) {
    query.entityType = params.entityType;
  }

  if (
    params.action &&
    params.action !== 'ALL' &&
    params.action !== 'All' &&
    params.action !== 'All Actions'
  ) {
    query.action = params.action;
  }

  if (
    params.adminId !== undefined &&
    params.adminId !== null &&
    params.adminId !== 'ALL' &&
    params.adminId !== 'All' &&
    params.adminId !== 'All Admins' &&
    params.adminId !== ''
  ) {
    query.adminId = Number(params.adminId);
  }

  const response = await api.get('/api/v1/audit-logs', { params: query });
  return response.data;
}

/**
 * API 34 - Get Audit Log by ID
 * @param {number|string} auditId
 * @returns {Promise<Object>} API response data envelope with single audit log entry
 */
export async function getAuditLogById(auditId) {
  const response = await api.get(`/api/v1/audit-logs/${auditId}`);
  return response.data;
}

