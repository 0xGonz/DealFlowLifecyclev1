import { format, parseISO } from 'date-fns';

/**
 * Utility functions for consistent data formatting throughout the application
 */

/**
 * Format a date string into a consistent display format
 * 
 * @param dateString ISO date string
 * @param formatStr Date format string (defaults to 'MMM d, yyyy')
 * @returns Formatted date string
 */
export function formatDate(dateString: string, formatStr: string = 'MMM d, yyyy'): string {
  if (!dateString) return 'N/A';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Format a date string into a relative time (e.g., "2 days ago")
 * 
 * @param dateString ISO date string
 * @returns Relative time string
 */
export function formatRelativeTime(dateString: string): string {
  if (!dateString) return 'N/A';
  
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
    
    return format(date, 'MMM d, yyyy');
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'Invalid date';
  }
}

/**
 * Format a currency value
 * 
 * @param value Number to format as currency
 * @param currency Currency code (defaults to 'USD')
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
  if (value === undefined || value === null) return 'N/A';
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `${value}`;
  }
}

/**
 * Format a number with thousands separators
 * 
 * @param value Number to format
 * @returns Formatted number string
 */
export function formatNumber(value: number): string {
  if (value === undefined || value === null) return 'N/A';
  
  try {
    return new Intl.NumberFormat('en-US').format(value);
  } catch (error) {
    console.error('Error formatting number:', error);
    return `${value}`;
  }
}

/**
 * Format a percentage value
 * 
 * @param value Number to format as percentage
 * @param decimalPlaces Number of decimal places (defaults to 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimalPlaces: number = 1): string {
  if (value === undefined || value === null) return 'N/A';
  
  try {
    return `${value.toFixed(decimalPlaces)}%`;
  } catch (error) {
    console.error('Error formatting percentage:', error);
    return `${value}%`;
  }
}
