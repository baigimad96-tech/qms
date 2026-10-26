/**
 * Pricing constraints and formatting for Qurbani booking amounts.
 * Enforces maximum value bounds, digit length restrictions, and prevents container overflow.
 */

// Maximum business constraints matching ₹1 Crore per hissa and ₹10 Crore total booking
export const MAX_COST_PER_HISSA = 10000000; // ₹1,00,00,000 (₹1 Crore max per hissa)
export const MAX_COST_DIGITS = 8; // Max 8 whole rupee digits
export const MAX_DECIMAL_PLACES = 2; // Up to 2 decimal places (.00 to .99)
export const MAX_HISSA_COUNT = 10000; // Max 10,000 hissas per booking
export const MAX_HISSA_DIGITS = 5; // Max 5 digits for hissa count
export const MAX_TOTAL_BOOKING_COST = 100000000; // ₹10,00,00,000 (₹10 Crore max total booking cost)

/**
 * Safely format calculated total amounts without layout breaking or card overflow.
 * Compacts very large figures (>= ₹1 Crore) while preserving full amount in tooltip.
 * @param {number|string|bigint} amount
 * @returns {{ display: string, full: string, isCompact: boolean }}
 */
export function formatTotalAmount(amount) {
  if (!amount) return { display: '₹0', full: '₹0', isCompact: false };
  const str = String(amount).trim();
  const num = Number(str);
  if (isNaN(num) || !Number.isFinite(num) || num <= 0) {
    return { display: '₹0', full: '₹0', isCompact: false };
  }

  const full = `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  // For very large figures (>= 1 Crore), provide a clean, non-overflowing compact badge
  if (num >= 10000000) {
    const cr = (num / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    return {
      display: `₹${cr} Cr`,
      full,
      isCompact: true,
    };
  }

  return {
    display: full,
    full,
    isCompact: false,
  };
}

/**
 * Validates a hissa cost against allowed numeric bounds.
 * @param {number|string} cost - The per-hissa cost entered
 * @param {Object} animal - The selected animal batch (optional)
 * @param {number|string} hissaCount - The number of hissas
 * @returns {{ isValid: boolean, error: string }}
 */
export function validateBookingCost(cost, animal, hissaCount = 1) {
  const numCost = Number(cost);
  const hissas = Math.max(1, Number(hissaCount) || 1);

  if (cost === '' || cost === null || cost === undefined) {
    return {
      isValid: false,
      error: 'Cost per Hissa is required.',
    };
  }

  if (isNaN(numCost) || !Number.isFinite(numCost) || numCost <= 0) {
    return {
      isValid: false,
      error: 'Please enter a valid numeric cost per Hissa.',
    };
  }

  const costStr = String(cost).trim();
  const [wholePart = '', decimalPart = ''] = costStr.split('.');

  if (wholePart.length > MAX_COST_DIGITS || numCost > MAX_COST_PER_HISSA) {
    return {
      isValid: false,
      error: `Cost per Hissa cannot exceed ₹${MAX_COST_PER_HISSA.toLocaleString('en-IN')} (entered amount is out of range or exceeds permitted limit).`,
    };
  }

  if (decimalPart.length > MAX_DECIMAL_PLACES) {
    return {
      isValid: false,
      error: 'Cost per Hissa cannot have more than 2 decimal places.',
    };
  }

  const totalCost = hissas * numCost;
  if (totalCost > MAX_TOTAL_BOOKING_COST) {
    return {
      isValid: false,
      error: `Total booking cost cannot exceed ₹${MAX_TOTAL_BOOKING_COST.toLocaleString('en-IN')} (₹10 Crore).`,
    };
  }

  return {
    isValid: true,
    error: '',
  };
}
