/**
 * Utility functions for managing Qurbani season dates and active season year.
 */

/**
 * Returns the currently active Qurbani season year dynamically.
 * Allows passing an optional data/context object if an activeSeasonYear override is provided.
 * Defaults to the current calendar year.
 *
 * @param {Object} [data]
 * @returns {number}
 */
export function getActiveSeasonYear(data) {
  if (data?.activeSeasonYear && !isNaN(Number(data.activeSeasonYear))) {
    return Number(data.activeSeasonYear);
  }
  return new Date().getFullYear();
}

export const ACTIVE_SEASON_YEAR = new Date().getFullYear();
