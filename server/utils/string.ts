/**
 * Generate initials from a full name
 * 
 * @param fullName The user's full name
 * @returns Initials (up to 2 characters)
 */
export function generateInitials(fullName: string): string {
  if (!fullName) return '';
  
  // Split the name by spaces and filter out empty segments
  const nameParts = fullName.split(' ').filter(Boolean);
  
  if (nameParts.length === 0) return '';
  
  if (nameParts.length === 1) {
    // If only one part, return the first character
    return nameParts[0].charAt(0).toUpperCase();
  }
  
  // Return first character of first and last parts
  return (
    nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)
  ).toUpperCase();
}

/**
 * Format a number as currency
 * 
 * @param amount The amount to format
 * @param currency The currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a number as percentage
 * 
 * @param value The value to format (e.g., 0.15 for 15%)
 * @param decimalPlaces Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimalPlaces = 1): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value);
}

/**
 * Truncate a string to a maximum length with ellipsis
 * 
 * @param str The string to truncate
 * @param maxLength Maximum length before truncating
 * @returns Truncated string
 */
export function truncateString(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

/**
 * Format a date in a user-friendly way
 * 
 * @param date The date to format
 * @param format Display format (default: 'short')
 * @returns Formatted date string
 */
export function formatDate(date: Date, format: 'short' | 'medium' | 'long' = 'short'): string {
  if (!date) return '';
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: format === 'short' ? 'short' : 'long',
    day: 'numeric',
  };
  
  if (format === 'long') {
    options.weekday = 'long';
  }
  
  return new Intl.DateTimeFormat('en-US', options).format(new Date(date));
}

/**
 * Generate a random color hex value
 * 
 * @returns Random color as hex string
 */
export function getRandomColor(): string {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
