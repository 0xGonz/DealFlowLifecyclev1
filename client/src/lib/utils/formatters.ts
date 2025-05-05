import { format, parseISO } from 'date-fns';
import { DATE_FORMATS, TIME_MS } from '../constants/time-constants';
import { 
  CURRENCY_FORMAT, 
  NUMBER_FORMAT, 
  PERCENTAGE_FORMAT, 
  NA_PLACEHOLDERS,
  type CurrencyFormatOption,
  type NumberFormatOption,
  type PercentageFormatOption
} from '../constants/formatting-constants';

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
  if (!dateString) return NA_PLACEHOLDERS.DEFAULT;
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
  if (!dateString) return NA_PLACEHOLDERS.DEFAULT;
  
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
 * @param formatOption Currency format options (defaults to CURRENCY_FORMAT.DEFAULT)
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number, 
  formatOption: CurrencyFormatOption = CURRENCY_FORMAT.DEFAULT
): string {
  if (value === undefined || value === null) return NA_PLACEHOLDERS.DEFAULT;
  
  try {
    const { LOCALE, CURRENCY, MIN_FRACTION_DIGITS, MAX_FRACTION_DIGITS } = formatOption;
    return new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency: CURRENCY,
      minimumFractionDigits: MIN_FRACTION_DIGITS,
      maximumFractionDigits: MAX_FRACTION_DIGITS,
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
 * @param formatOption Number format options (defaults to NUMBER_FORMAT.DEFAULT)
 * @returns Formatted number string
 */
export function formatNumber(
  value: number,
  formatOption: NumberFormatOption = NUMBER_FORMAT.DEFAULT
): string {
  if (value === undefined || value === null) return NA_PLACEHOLDERS.DEFAULT;
  
  try {
    const { LOCALE, MIN_FRACTION_DIGITS, MAX_FRACTION_DIGITS } = formatOption;
    return new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: MIN_FRACTION_DIGITS,
      maximumFractionDigits: MAX_FRACTION_DIGITS,
    }).format(value);
  } catch (error) {
    console.error('Error formatting number:', error);
    return `${value}`;
  }
}

/**
 * Format a percentage value
 * 
 * @param value Number to format as percentage
 * @param formatOption Percentage format options (defaults to PERCENTAGE_FORMAT.DEFAULT)
 * @returns Formatted percentage string
 */
export function formatPercentage(
  value: number, 
  formatOption: PercentageFormatOption = PERCENTAGE_FORMAT.DEFAULT
): string {
  if (value === undefined || value === null) return NA_PLACEHOLDERS.DEFAULT;
  
  try {
    const { DECIMAL_PLACES, INCLUDE_SYMBOL } = formatOption;
    const formattedValue = value.toFixed(DECIMAL_PLACES);
    return INCLUDE_SYMBOL ? `${formattedValue}%` : formattedValue;
  } catch (error) {
    console.error('Error formatting percentage:', error);
    return `${value}%`;
  }
}
