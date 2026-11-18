import { api } from './api.js';

/**
 * Service for Expense Management APIs
 * Conforming to JIH Backend Spring Boot specifications:
 * - POST  /api/v1/expenses
 * - GET   /api/v1/expenses
 * - GET   /api/v1/expenses/{expenseId}
 * - PATCH /api/v1/expenses/{expenseId}
 * - GET   /api/v1/expenses/summary
 */

export const EXPENSE_CATEGORIES = [
  { value: 'TRANSPORTATION', label: 'Transportation', color: 'blue' },
  { value: 'LABOR', label: 'Labor', color: 'orange' },
  { value: 'FEED', label: 'Feed', color: 'green' },
  { value: 'SLAUGHTER', label: 'Slaughter', color: 'red' },
  { value: 'PACKAGING', label: 'Packaging', color: 'pink' },
  { value: 'EQUIPMENT', label: 'Equipment', color: 'indigo' },
  { value: 'CLEANING', label: 'Cleaning', color: 'teal' },
  { value: 'RENT', label: 'Rent', color: 'slate' },
  { value: 'UTILITIES', label: 'Utilities', color: 'purple' },
  { value: 'OTHER', label: 'Other', color: 'gray' },
];

/**
 * Fetch paginated & filtered expenses
 * @param {Object} params - { page, size, category, qurbaniDayId, fromDate, toDate, search }
 */
export async function getExpenses(params = {}) {
  const query = {};
  if (params.page !== undefined) query.page = params.page;
  if (params.size !== undefined) query.size = params.size;
  if (params.category && params.category !== 'All') query.category = params.category;
  if (params.qurbaniDayId !== undefined && params.qurbaniDayId !== 'All') {
    if (params.qurbaniDayId === 'general') {
      // Backend does not filter null via query param directly or handles it
    } else {
      query.qurbaniDayId = params.qurbaniDayId;
    }
  }
  if (params.fromDate) query.fromDate = params.fromDate;
  if (params.toDate) query.toDate = params.toDate;
  if (params.search) query.search = params.search;

  const response = await api.get('/api/v1/expenses', { params: query });
  return response.data;
}

/**
 * Fetch expense by primary key
 * @param {number|string} expenseId
 */
export async function getExpenseById(expenseId) {
  const response = await api.get(`/api/v1/expenses/${expenseId}`);
  return response.data;
}

/**
 * Fetch aggregate expense summary
 * @param {Object} params - { category, qurbaniDayId, fromDate, toDate }
 */
export async function getExpenseSummary(params = {}) {
  const query = {};
  if (params.category && params.category !== 'All') query.category = params.category;
  if (params.qurbaniDayId !== undefined && params.qurbaniDayId !== 'All' && params.qurbaniDayId !== 'general') {
    query.qurbaniDayId = params.qurbaniDayId;
  }
  if (params.fromDate) query.fromDate = params.fromDate;
  if (params.toDate) query.toDate = params.toDate;

  const response = await api.get('/api/v1/expenses/summary', { params: query });
  return response.data;
}

/**
 * Create a new operational expense
 * @param {Object} payload - { category, description, amount, expenseDate, qurbaniDayId }
 */
export async function createExpense(payload) {
  const cleanPayload = {
    category: payload.category,
    description: payload.description?.trim() || null,
    amount: Number(payload.amount),
    expenseDate: payload.expenseDate,
    qurbaniDayId: payload.qurbaniDayId ? Number(payload.qurbaniDayId) : null,
  };

  const response = await api.post('/api/v1/expenses', cleanPayload);
  return response.data;
}

/**
 * Partially update an existing expense (PATCH)
 * @param {number|string} expenseId
 * @param {Object} payload - Partial update fields
 */
export async function updateExpense(expenseId, payload) {
  const patchBody = {};
  if (payload.category !== undefined) patchBody.category = payload.category;
  if (payload.description !== undefined) {
    patchBody.description = payload.description?.trim() || null;
  }
  if (payload.amount !== undefined) patchBody.amount = Number(payload.amount);
  if (payload.expenseDate !== undefined) patchBody.expenseDate = payload.expenseDate;
  if (payload.qurbaniDayId !== undefined) {
    patchBody.qurbaniDayId = payload.qurbaniDayId ? Number(payload.qurbaniDayId) : null;
  }

  const response = await api.patch(`/api/v1/expenses/${expenseId}`, patchBody);
  return response.data;
}
