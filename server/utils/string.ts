/**
 * Convert a full name to initials
 * @param fullName The full name to convert
 * @returns The initials (up to 2 characters)
 */
export function getInitials(fullName: string): string {
  if (!fullName) return "";
  
  const names = fullName.trim().split(/\s+/);
  
  if (names.length === 0) return "";
  if (names.length === 1) {
    // If only one name, take first two letters or just the first if it's a single letter
    return names[0].substring(0, Math.min(2, names[0].length)).toUpperCase();
  }
  
  // Otherwise take first letter of first and last name
  return (names[0][0] + names[names.length - 1][0]).toUpperCase();
}

/**
 * Sanitize a string for safe usage in IDs, URLs, etc.
 * @param str The string to sanitize
 * @returns The sanitized string
 */
export function sanitizeString(str: string): string {
  if (!str) return "";
  
  return str
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^\w\-]/g, "") // Remove non-word chars except hyphens
    .replace(/--+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Truncate a string to a maximum length, adding ellipsis if needed
 * @param str The string to truncate
 * @param maxLength The maximum length
 * @returns The truncated string
 */
export function truncateString(str: string, maxLength: number): string {
  if (!str) return "";
  if (str.length <= maxLength) return str;
  
  return str.substring(0, maxLength - 3) + "...";
}
