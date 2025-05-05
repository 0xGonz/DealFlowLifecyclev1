import { DEAL_STAGE_BADGE_CLASSES } from '../constants/style-constants';
import { FINANCIAL_CALCULATION } from '../constants/calculation-constants';

/**
 * Format a number as currency
 * @param amount The amount to format
 * @param currency The currency code (default: USD)
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null) {
    return "$0.00";
  }
  
  // Format large numbers with appropriate abbreviations
  // Using billion constant
  const BILLION = FINANCIAL_CALCULATION.MILLION * 1000;
  const THOUSAND = 1000;
  
  if (amount >= BILLION) {
    return `$${(amount / BILLION).toFixed(1)}B`;
  } else if (amount >= FINANCIAL_CALCULATION.MILLION) {
    return `$${(amount / FINANCIAL_CALCULATION.MILLION).toFixed(1)}M`;
  } else if (amount >= THOUSAND) {
    return `$${(amount / THOUSAND).toFixed(1)}K`;
  }
  
  // Format standard currency
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: FINANCIAL_CALCULATION.PRECISION.CURRENCY
  }).format(amount);
};

/**
 * Format a date string
 * @param dateString The date string to format
 * @returns Formatted date string (MM/DD/YYYY)
 */
export const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * Format a percentage value
 * @param value The value to format as percentage
 * @param decimals Number of decimal places (default from constants)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number | undefined | null, decimals = FINANCIAL_CALCULATION.PRECISION.PERCENTAGE): string => {
  if (value === undefined || value === null) {
    return '0%';
  }
  
  // Convert to percentage and add % sign
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format a ratio value (used for MOIC, etc.)
 * @param value The ratio value
 * @param decimals Number of decimal places (default from constants)
 * @returns Formatted ratio string (e.g., "1.45x")
 */
export const formatRatio = (value: number | undefined | null, decimals = FINANCIAL_CALCULATION.PRECISION.MULTIPLE): string => {
  if (value === undefined || value === null) {
    return `0.${'0'.repeat(decimals)}x`;
  }
  
  return `${value.toFixed(decimals)}x`;
};

/**
 * Format an IRR value
 * @param value The IRR value
 * @param decimals Number of decimal places (default from constants)
 * @returns Formatted IRR string (e.g., "18.5%")
 */
export const formatIRR = (value: number | undefined | null, decimals = FINANCIAL_CALCULATION.PRECISION.IRR): string => {
  if (value === undefined || value === null) {
    return `0.${'0'.repeat(decimals)}%`;
  }
  
  // Ensure IRR is not negative for display
  const displayValue = Math.max(0, value);
  return `${displayValue.toFixed(decimals)}%`;
};

/**
 * Get the appropriate CSS class for a deal stage badge
 * @param stage The deal stage
 * @returns CSS class for the badge
 */
export const getDealStageBadgeClass = (stage: string): string => {
  return DEAL_STAGE_BADGE_CLASSES[stage] || DEAL_STAGE_BADGE_CLASSES.default;
};

/**
 * Format a file size in bytes to a human-readable format
 * @param bytes The size in bytes
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted file size string
 */
export const formatBytes = (bytes: number | undefined | null, decimals = 2): string => {
  if (bytes === undefined || bytes === null || bytes === 0) {
    return '0 Bytes';
  }
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
};
