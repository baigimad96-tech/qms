import { api } from './api.js';
import { getRefreshToken, clearAuth } from '../utils/auth.js';

/**
 * Calls backend POST /api/v1/auth/logout to atomically revoke
 * the active access token and refresh token on the server.
 *
 * Always clears client-side credentials in finally block.
 *
 * @returns {Promise<string>} The status message
 */
export async function logoutUser() {
  const refreshToken = getRefreshToken();
  let message = 'You have been signed out.';

  try {
    if (refreshToken) {
      const response = await api.post('/api/v1/auth/logout', { refreshToken });
      if (response.data?.message) {
        message = response.data.message;
      }
    }
  } catch (error) {
    console.warn(
      'Backend logout notice (proceeding with local signout):',
      error?.response?.data?.message || error.message
    );
  } finally {
    clearAuth();
  }

  return message;
}

/**
 * Calls backend POST /api/v1/auth/forgot-password
 * Request payload: { email: string }
 *
 * @param {string} email
 * @returns {Promise<any>}
 */
export async function requestPasswordReset(email) {
  const response = await api.post('/api/v1/auth/forgot-password', { email });
  return response.data;
}

/**
 * Calls backend POST /api/v1/auth/reset-password
 * Request payload: { token: string, newPassword: string, confirmPassword: string }
 *
 * @param {{ token: string, newPassword: string, confirmPassword: string }} payload
 * @returns {Promise<any>}
 */
export async function resetPassword({ token, newPassword, confirmPassword }) {
  const response = await api.post('/api/v1/auth/reset-password', {
    token,
    newPassword,
    confirmPassword,
  });
  return response.data;
}
