/**
 * Generate initials from a full name
 * 
 * @param fullName Full name to generate initials from
 * @returns Initials (up to 2 characters)
 */
export function generateInitials(fullName: string): string {
  if (!fullName) return 'U';
  
  const nameParts = fullName.trim().split(/\s+/);
  
  if (nameParts.length === 1) {
    // Single name: take first two letters
    return nameParts[0].substring(0, 2).toUpperCase();
  } else {
    // Multiple names: take first letter of first and last name
    const firstInitial = nameParts[0].charAt(0);
    const lastInitial = nameParts[nameParts.length - 1].charAt(0);
    return (firstInitial + lastInitial).toUpperCase();
  }
}

/**
 * Colors that provide good contrast with light text
 */
const AVATAR_COLORS = [
  '#2563EB', // Blue
  '#7C3AED', // Violet
  '#DB2777', // Pink
  '#9333EA', // Purple
  '#D97706', // Amber
  '#059669', // Emerald
  '#DC2626', // Red
  '#4338CA', // Indigo
  '#0E7490', // Cyan
  '#65A30D', // Lime
  '#0891B2', // Teal
  '#A21CAF', // Fuchsia
  '#AB2F5C', // Rose-Pink
  '#1E429F', // Deep Blue
  '#3F6212', // Dark Lime
  '#5B21B6', // Strong Purple
  '#B45309', // Dark Amber
  '#B91C1C', // Dark Red
  '#096A2E', // Forest Green
  '#3730A3', // Deep Indigo
];

/**
 * Generate a random color for avatars
 * @returns Random color from the predefined palette
 */
export function generateRandomColor(): string {
  const randomIndex = Math.floor(Math.random() * AVATAR_COLORS.length);
  return AVATAR_COLORS[randomIndex];
}

/**
 * Shorten a string to a maximum length with ellipsis
 * 
 * @param str String to shorten
 * @param maxLength Maximum length before adding ellipsis
 * @returns Shortened string
 */
export function shortenString(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

/**
 * Format a number as currency
 * 
 * @param amount Amount to format
 * @param currency Currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a number as a percentage
 * 
 * @param value Value to format (0.1 = 10%)
 * @param decimalPlaces Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimalPlaces = 1): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value);
}
