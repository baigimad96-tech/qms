import { api } from './api.js';

/**
 * Service for Dashboard Analytics APIs (APIs 22 to 27)
 * Conforming to JIH Backend Spring Boot specifications:
 * - API 22: GET /api/v1/dashboard/animals/by-type
 * - API 23: GET /api/v1/dashboard/hissa/by-animal-type
 * - API 24: GET /api/v1/dashboard/bookings/by-qurbani-day
 * - API 25: GET /api/v1/dashboard/bookings/meat-stats
 * - API 26: GET /api/v1/dashboard/revenue/by-animal-type
 * - API 27: GET /api/v1/dashboard/recent-bookings
 */

/**
 * API 22 - Total Animals by Animal Type
 * @param {Object} [params] - { batchYear }
 * @returns {Promise<Object>} API envelope with data array [{ animalType, totalAnimals }]
 */
export async function getAnimalsByType(params = {}) {
  const query = {};
  if (params.batchYear) query.batchYear = params.batchYear;
  const response = await api.get('/api/v1/dashboard/animals/by-type', { params: query });
  return response.data;
}

/**
 * API 23 - Hissa Summary by Animal Type
 * @param {Object} [params] - { batchYear }
 * @returns {Promise<Object>} API envelope with data array [{ animalType, totalHissa, bookedHissa, availableHissa }]
 */
export async function getHissaByAnimalType(params = {}) {
  const query = {};
  if (params.batchYear) query.batchYear = params.batchYear;
  const response = await api.get('/api/v1/dashboard/hissa/by-animal-type', { params: query });
  return response.data;
}

/**
 * API 24 - Bookings by Qurbani Day
 * @returns {Promise<Object>} API envelope with data array [{ qurbaniDayId, dayNumber, totalPerDay, bookedPerDay, remaining }]
 */
export async function getBookingsByQurbaniDay() {
  const response = await api.get('/api/v1/dashboard/bookings/by-qurbani-day');
  return response.data;
}

/**
 * API 25 - Meat Requirement Statistics
 * @returns {Promise<Object>} API envelope with data object { meatWanted, meatNotWanted }
 */
export async function getMeatStatistics() {
  const response = await api.get('/api/v1/dashboard/bookings/meat-stats');
  return response.data;
}

/**
 * API 26 - Booking Revenue by Animal Type
 * @param {Object} [params] - { batchYear }
 * @returns {Promise<Object>} API envelope with data array [{ animalType, totalBookingAmount }]
 */
export async function getRevenueByAnimalType(params = {}) {
  const query = {};
  if (params.batchYear) query.batchYear = params.batchYear;
  const response = await api.get('/api/v1/dashboard/revenue/by-animal-type', { params: query });
  return response.data;
}

/**
 * API 27 - Recent Hissa Bookings
 * @param {number} [limit=6]
 * @returns {Promise<Object>} API envelope with data array of recent bookings
 */
export async function getRecentBookings(limit = 6) {
  const response = await api.get('/api/v1/dashboard/recent-bookings', {
    params: { limit },
  });
  return response.data;
}
