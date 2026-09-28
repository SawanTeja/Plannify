/**
 * Formatting utilities for currency, numbers, text, and avatars.
 * Adheres to DRY by centralizing common string/number presentations.
 */

/**
 * Formats a numeric value into a currency string.
 * @param {number|string} amount
 * @param {string} [currencySymbol='₹']
 * @param {object} [options]
 * @param {number} [options.decimals=2]
 * @param {boolean} [options.absolute=false]
 * @returns {string}
 */
export const formatCurrency = (amount, currencySymbol = '₹', options = {}) => {
  const { decimals = 2, absolute = false } = options;
  const num = parseFloat(amount);
  if (isNaN(num)) return `${currencySymbol}0.00`;

  const finalVal = absolute ? Math.abs(num) : num;
  const isNegative = finalVal < 0;
  const formatted = Math.abs(finalVal).toFixed(decimals);

  return `${isNegative ? '-' : ''}${currencySymbol}${formatted}`;
};

/**
 * Safely extracts initials for user avatar display.
 * @param {string} name
 * @param {number} [limit=2]
 * @returns {string}
 */
export const getInitials = (name, limit = 1) => {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';

  if (limit === 1) {
    return parts[0][0].toUpperCase();
  }

  return parts
    .slice(0, limit)
    .map(p => p[0]?.toUpperCase() || '')
    .join('');
};

/**
 * Truncates text with an ellipsis if it exceeds maxLength.
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export const truncateText = (text, maxLength = 30) => {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};
