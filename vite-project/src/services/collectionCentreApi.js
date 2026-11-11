import { api } from './api.js';

/**
 * Service for Qurbani Collection Centres Management (JIH-001)
 * Backend endpoints:
 * - GET    /api/v1/collection-centres (?activeOnly=true)
 * - GET    /api/v1/collection-centres/{id}
 * - POST   /api/v1/collection-centres
 * - PUT    /api/v1/collection-centres/{id}
 * - DELETE /api/v1/collection-centres/{id}
 */

/**
 * Fetch collection centres. Pass activeOnly=true to populate booking dropdowns.
 * @param {boolean} [activeOnly=false]
 * @returns {Promise<Array>} List of collection centres
 */
export async function getCollectionCentres(activeOnly = false) {
  const response = await api.get('/api/v1/collection-centres', {
    params: activeOnly ? { activeOnly: true } : {},
  });
  const raw = response.data?.data;
  return Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.content)
    ? raw.content
    : Array.isArray(response.data)
    ? response.data
    : [];
}

/**
 * Fetch a single collection centre by ID.
 * @param {number|string} id
 * @returns {Promise<Object>} Collection centre details
 */
export async function getCollectionCentreById(id) {
  const response = await api.get(`/api/v1/collection-centres/${id}`);
  return response.data?.data || response.data;
}

/**
 * Create a new collection centre.
 * @param {Object} payload - { name, location, contactPerson, contactNumber, isActive }
 * @returns {Promise<Object>} Created collection centre
 */
export async function createCollectionCentre(payload) {
  const response = await api.post('/api/v1/collection-centres', payload);
  return response.data?.data || response.data;
}

/**
 * Update an existing collection centre.
 * @param {number|string} id
 * @param {Object} payload - { name, location, contactPerson, contactNumber, isActive }
 * @returns {Promise<Object>} Updated collection centre
 */
export async function updateCollectionCentre(id, payload) {
  const response = await api.put(`/api/v1/collection-centres/${id}`, payload);
  return response.data?.data || response.data;
}

/**
 * Delete a collection centre.
 * Throws 400 Bad Request if centre is linked to existing bookings.
 * @param {number|string} id
 * @returns {Promise<any>}
 */
export async function deleteCollectionCentre(id) {
  const response = await api.delete(`/api/v1/collection-centres/${id}`);
  return response.data;
}
