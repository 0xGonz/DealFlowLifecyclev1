/**
 * Generates initials from a full name.
 * For example, "John Doe" becomes "JD".
 * 
 * @param fullName - Full name to generate initials from.
 * @returns String with the initials, uppercase.
 */
export function generateInitials(fullName: string): string {
  if (!fullName) {
    return 'XX'; // Default
  }
  
  const parts = fullName.trim().split(/\s+/);
  
  if (parts.length === 1) {
    // If only one name, take first two letters
    return fullName.substring(0, 2).toUpperCase();
  }
  
  // Otherwise take first letter of first name and first letter of last name
  const firstInitial = parts[0].charAt(0);
  const lastInitial = parts[parts.length - 1].charAt(0);
  
  return (firstInitial + lastInitial).toUpperCase();
}

/**
 * Formats a number as currency with dollar sign.
 * 
 * @param amount - Number to format.
 * @returns String formatted as currency.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a percentage value.
 * 
 * @param value - Number to format as percentage (e.g., 0.15 for 15%).
 * @param decimalPlaces - Number of decimal places to show, defaults to 1.
 * @returns String formatted as percentage.
 */
export function formatPercentage(value: number, decimalPlaces: number = 1): string {
  return `${(value * 100).toFixed(decimalPlaces)}%`;
}

/**
 * Truncates a string if it exceeds the specified length.
 * 
 * @param text - String to truncate.
 * @param maxLength - Maximum length of the string, defaults to 50.
 * @returns Truncated string if necessary, with ellipsis.
 */
export function truncateText(text: string, maxLength: number = 50): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  return `${text.substring(0, maxLength)}...`;
}
