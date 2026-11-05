/**
 * Money utilities for Varavuselavu.
 * Rule: Money is always stored as integers in paise (₹1 = 100 paise).
 * Never use floats for monetary calculations or storage.
 */

/**
 * Converts a rupee string or number to integer paise.
 * Examples:
 *   "123.45" -> 12345
 *   "120" -> 12000
 *   "0.50" -> 50
 *   "1,234.50" -> 123450
 */
export function toPaise(input: string | number): number {
  if (typeof input === 'number') {
    if (isNaN(input) || !isFinite(input)) return 0;
    return Math.round(input * 100);
  }

  if (!input || typeof input !== 'string') return 0;

  // Remove commas, spaces, currency symbols
  const clean = input.replace(/[₹,\s]/g, '').trim();
  if (!clean) return 0;

  const parts = clean.split('.');
  const wholePart = parseInt(parts[0] || '0', 10);
  if (isNaN(wholePart)) return 0;

  let fractionPart = 0;
  if (parts.length > 1) {
    // Pad or trim fraction to exactly 2 digits
    const fractionStr = (parts[1] + '00').slice(0, 2);
    fractionPart = parseInt(fractionStr, 10);
  }

  const sign = wholePart < 0 || clean.startsWith('-') ? -1 : 1;
  return Math.abs(wholePart) * 100 * sign + fractionPart * sign;
}

/**
 * Converts integer paise to rupees (float / decimal).
 * Used when passing to stats/charts or displaying.
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Formats integer paise into Indian Rupee format (en-IN).
 * Examples:
 *   12000 -> "₹120" (hides .00 for whole amounts)
 *   12345 -> "₹123.45"
 *   12345600 -> "₹1,23,456"
 *   12345678 -> "₹1,23,456.78"
 */
export function formatINR(
  paise: number,
  options?: {
    showSign?: boolean;
    isExpense?: boolean;
    alwaysShowDecimals?: boolean;
  }
): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const wholeRupees = Math.floor(absPaise / 100);
  const remainderPaise = absPaise % 100;

  // Indian digit grouping for integer part
  const formattedWhole = new Intl.NumberFormat('en-IN').format(wholeRupees);

  let formattedAmount = formattedWhole;
  if (remainderPaise > 0 || options?.alwaysShowDecimals) {
    const fraction = remainderPaise.toString().padStart(2, '0');
    formattedAmount += `.${fraction}`;
  }

  let prefix = '₹';
  if (options?.showSign) {
    if (options.isExpense) {
      prefix = '− ₹';
    } else if (isNegative) {
      prefix = '− ₹';
    } else {
      prefix = '+ ₹';
    }
  } else if (isNegative) {
    prefix = '− ₹';
  }

  return `${prefix}${formattedAmount}`;
}

/**
 * Formats a rupee number into compact Indian notation (e.g. ₹0, ₹500, ₹1.2k, ₹10k, ₹1.5L, ₹1Cr).
 * Used for chart Y-axis ticks and compact labels.
 */
export function formatIndianCurrencyAbbreviated(rupees: number): string {
  if (!rupees || isNaN(rupees) || rupees === 0) return '₹0';
  const abs = Math.abs(rupees);
  const sign = rupees < 0 ? '−' : '';

  if (abs >= 10000000) {
    const cr = abs / 10000000;
    const formatted = cr >= 10 || cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(1);
    return `${sign}₹${formatted}Cr`;
  }
  if (abs >= 100000) {
    const l = abs / 100000;
    const formatted = l >= 10 || l % 1 === 0 ? l.toFixed(0) : l.toFixed(1);
    return `${sign}₹${formatted}L`;
  }
  if (abs >= 1000) {
    const k = abs / 1000;
    const formatted = k >= 10 || k % 1 === 0 ? k.toFixed(0) : k.toFixed(1);
    return `${sign}₹${formatted}k`;
  }
  return `${sign}₹${Math.round(abs)}`;
}

