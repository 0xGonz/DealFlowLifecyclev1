/**
 * Format a number as a currency string with optional shortening for large values
 * @param value The value to format
 * @param shorten Whether to shorten large values (e.g., 1M, 2B)
 * @param currency The currency symbol to use (default: $)
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, shorten = false, currency = '$'): string {
  if (value === 0) return `${currency}0`;
  if (!value) return `${currency}--`;
  
  // Format with shortening if requested
  if (shorten) {
    if (value >= 1_000_000_000) {
      return `${currency}${(value / 1_000_000_000).toFixed(1)}B`;
    } else if (value >= 1_000_000) {
      return `${currency}${(value / 1_000_000).toFixed(1)}M`;
    } else if (value >= 1_000) {
      return `${currency}${(value / 1_000).toFixed(1)}K`;
    }
  }
  
  // Standard currency formatting
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Format a number as a percentage
 * @param value The value to format (e.g., 15 for 15%)
 * @param decimals Number of decimal places (default: 0)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals = 0): string {
  if (value === undefined || value === null) return '--%';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a date string into a more readable format
 * @param dateString The date string to format
 * @param includeTime Whether to include the time in the output
 * @returns Formatted date string
 */
export function formatDate(dateString: string, includeTime = false): string {
  if (!dateString) return '--';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString; // Return original if invalid
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Format a number with thousand separators
 * @param value The value to format
 * @param decimals Number of decimal places (default: 0)
 * @returns Formatted number string
 */
export function formatNumber(value: number, decimals = 0): string {
  if (value === undefined || value === null) return '--';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

/**
 * Get the appropriate CSS class for a deal stage badge
 * @param stage The deal stage
 * @returns The CSS class for the badge background
 */
export function getDealStageBadgeClass(stage: string): string {
  const stageClasses: Record<string, string> = {
    initial_review: "bg-neutral-100 text-neutral-800",
    screening: "bg-sky-100 text-sky-800",
    diligence: "bg-blue-100 text-blue-800",
    ic_review: "bg-violet-100 text-violet-800",
    closing: "bg-amber-100 text-amber-800",
    closed: "bg-green-100 text-green-800",
    invested: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800"
  };
  
  return stageClasses[stage] || "bg-neutral-100 text-neutral-800";
}

/**
 * Format file sizes into human-readable format
 * @param bytes The size in bytes
 * @param decimals Number of decimal places to show
 * @returns Formatted size string (e.g., '2.5 MB')
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  if (!bytes) return '--';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
