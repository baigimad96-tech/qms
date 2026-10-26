/**
 * Utility functions for text formatting and manipulation.
 */

/**
 * Formats a string to Title Case (e.g., "adila" -> "Adila", "shayaan Mustafaaa" -> "Shayaan Mustafaaa").
 * Trims extra whitespace and capitalizes the first letter of each word while lowercasing the rest.
 *
 * @param {string} str
 * @returns {string}
 */
export function formatToTitleCase(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
