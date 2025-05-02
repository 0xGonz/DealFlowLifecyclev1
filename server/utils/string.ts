/**
 * Generate initials from a full name
 * @param fullName The user's full name
 * @returns Initials (up to 2 characters)
 */
export function generateInitials(fullName: string): string {
  if (!fullName || fullName.trim() === '') {
    return 'NA';
  }
  
  const names = fullName.trim().split(' ');
  
  if (names.length === 1) {
    return names[0].charAt(0).toUpperCase();
  }
  
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}

/**
 * Generate a random color from a predefined palette
 * @returns A hex color code
 */
export function generateRandomColor(): string {
  const colors = [
    '#4F46E5', // Indigo
    '#0EA5E9', // Sky Blue
    '#14B8A6', // Teal
    '#10B981', // Emerald
    '#6366F1', // Violet
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#F43F5E', // Rose
    '#F59E0B', // Amber
    '#84CC16', // Lime
  ];
  
  const randomIndex = Math.floor(Math.random() * colors.length);
  return colors[randomIndex];
}

/**
 * Format a date to a localized string
 * @param date The date to format
 * @returns A formatted date string
 */
export function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Capitalize the first letter of a string
 * @param str The string to capitalize
 * @returns The capitalized string
 */
export function capitalize(str: string): string {
  if (!str || str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format a number as currency
 * @param value The number to format
 * @returns A formatted currency string
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Format a number as a percentage
 * @param value The number to format (0-1)
 * @returns A formatted percentage string
 */
export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value);
}

/**
 * Truncate a string to a specified length
 * @param str The string to truncate
 * @param length The maximum length
 * @returns The truncated string
 */
export function truncate(str: string, length: number = 100): string {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}
