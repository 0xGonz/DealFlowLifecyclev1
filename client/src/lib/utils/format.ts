import { DEAL_STAGE_BADGE_CLASSES } from '../constants/style-constants';

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
  if (amount >= 1000000000) {
    return `$${(amount / 1000000000).toFixed(1)}B`;
  } else if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  
  // Format standard currency
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
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
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number | undefined | null, decimals = 1): string => {
  if (value === undefined || value === null) {
    return '0%';
  }
  
  // Convert to percentage and add % sign
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format a ratio value (used for MOIC, etc.)
 * @param value The ratio value
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted ratio string (e.g., "1.45x")
 */
export const formatRatio = (value: number | undefined | null, decimals = 2): string => {
  if (value === undefined || value === null) {
    return '0.00x';
  }
  
  return `${value.toFixed(decimals)}x`;
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
