/**
 * Shared date utilities to ensure consistent handling between client and server
 */

/**
 * Safely converts a value to a Date object
 * @param value A date string, Date object, or null/undefined
 * @returns A proper Date object or null if the input is invalid
 */
export function safeParseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  
  try {
    // If it's already a Date object, return it
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }
    
    // Parse the string into a Date
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
}

/**
 * Converts a date input to an ISO string for API requests
 * @param date A date string, Date object, or null/undefined
 * @returns ISO string or null if the input is invalid
 */
export function toISOString(date: string | Date | null | undefined): string | null {
  const parsedDate = safeParseDate(date);
  return parsedDate ? parsedDate.toISOString() : null;
}

/**
 * Formats a date to YYYY-MM-DD for input fields
 * @param date A date string, Date object, or null/undefined
 * @returns YYYY-MM-DD string or empty string if invalid
 */
export function toInputDateString(date: string | Date | null | undefined): string {
  const parsedDate = safeParseDate(date);
  if (!parsedDate) return '';
  
  // Format as YYYY-MM-DD
  return parsedDate.toISOString().split('T')[0];
}

/**
 * Preserves time zone information when converting between Date objects and strings
 * @param date The date to preserve
 * @returns A date with the original time zone preserved
 */
export function preserveTimeZone(date: string | Date | null | undefined): Date | null {
  const parsedDate = safeParseDate(date);
  if (!parsedDate) return null;
  
  // Convert to UTC time to avoid timezone shifts
  const utcDate = new Date(Date.UTC(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate(),
    12, 0, 0, 0
  ));
  
  return utcDate;
}