import { api } from './api.js';

/**
 * Service for Hissa Booking & Receipts (JIH-001 & JIH-002)
 * Backend endpoints:
 * - POST   /api/v1/hissa-bookings (supports single & multi-person members[])
 * - GET    /api/v1/hissa-bookings (filtering & pagination)
 * - GET    /api/v1/hissa-bookings/{id}
 * - PATCH  /api/v1/hissa-bookings/{id}
 * - DELETE /api/v1/hissa-bookings/{id}
 * - GET    /api/v1/hissa-bookings/{id}/receipt (PDF streaming)
 */

export async function createHissaBooking(payload) {
  const response = await api.post('/api/v1/hissa-bookings', payload);
  return response.data;
}

export async function getHissaBookings(params = {}) {
  const response = await api.get('/api/v1/hissa-bookings', { params });
  return response.data;
}

export async function getHissaBookingById(id) {
  const response = await api.get(`/api/v1/hissa-bookings/${id}`);
  return response.data;
}

export async function updateHissaBooking(id, payload) {
  const response = await api.patch(`/api/v1/hissa-bookings/${id}`, payload);
  return response.data;
}

export async function deleteHissaBooking(id) {
  const response = await api.delete(`/api/v1/hissa-bookings/${id}`);
  return response.data;
}

/**
 * Downloads on-demand official PDF receipt from backend streaming endpoint.
 * @param {number|string} hissaBookingId
 * @param {string} [receiptNumber]
 */
export async function downloadBookingReceiptPdf(hissaBookingId, receiptNumber) {
  const response = await api.get(`/api/v1/hissa-bookings/${hissaBookingId}/receipt`, {
    responseType: 'blob',
  });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const cleanNum = String(receiptNumber || hissaBookingId).replace(/^#/, '');
  link.setAttribute('download', `${cleanNum}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
