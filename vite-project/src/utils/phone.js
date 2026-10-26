/**
 * Utility functions for Indian phone number parsing, sanitization, and formatting.
 */

/**
 * Strips country code prefix (+91, 91) or leading 0 from an Indian phone number,
 * returning the clean standard 10-digit mobile number.
 *
 * @param {string|number} rawPhone
 * @returns {string} 10-digit phone number
 */
export function sanitizeIndianPhone(rawPhone) {
  if (!rawPhone) return '';
  let digits = String(rawPhone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  } else if (digits.length > 10 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 10);
}

/**
 * Formats a phone number for display with +91 country code prefix.
 *
 * @param {string|number} rawPhone
 * @returns {string} Formatted phone string, e.g. "+91 98765 43210"
 */
export function formatIndianPhone(rawPhone) {
  if (!rawPhone) return 'N/A';
  const clean = sanitizeIndianPhone(rawPhone);
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return String(rawPhone);
}
