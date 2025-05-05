import { format, parseISO } from 'date-fns';
import { DATE_FORMATS, TIME_MS } from '../constants/time-constants';

/**
 * Utility functions for consistent data formatting throughout the application
 */

/**
 * Format a date string into a consistent display format
 * 
 * @param dateString ISO date string
 * @param formatStr Date format string (defaults to DATE_FORMATS.DEFAULT)
 * @returns Formatted date string
 */
export function formatDate(dateString: string, formatStr: string = DATE_FORMATS.DEFAULT): string {
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
    const diffInMs = now.getTime() - date.getTime();
    
    // Define time thresholds in milliseconds
    if (diffInMs < TIME_MS.MINUTE) return 'just now';
    if (diffInMs < TIME_MS.HOUR) return `${Math.floor(diffInMs / TIME_MS.MINUTE)} minutes ago`;
    if (diffInMs < TIME_MS.DAY) return `${Math.floor(diffInMs / TIME_MS.HOUR)} hours ago`;
    if (diffInMs < TIME_MS.WEEK) return `${Math.floor(diffInMs / TIME_MS.DAY)} days ago`;
    if (diffInMs < TIME_MS.MONTH) return `${Math.floor(diffInMs / TIME_MS.WEEK)} weeks ago`;
    
    return format(date, DATE_FORMATS.DEFAULT);
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
