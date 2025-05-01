/**
 * Format a number as currency
 */
export function formatCurrency(
  amount: number, 
  abbreviate = false, 
  locale = 'en-US',
  currency = 'USD'
): string {
  if (amount === undefined || amount === null) {
    return '';
  }
  
  // Handle abbreviation for large numbers
  if (abbreviate) {
    if (amount >= 1e9) {
      return `$${(amount / 1e9).toFixed(1)}B`;
    }
    if (amount >= 1e6) {
      return `$${(amount / 1e6).toFixed(1)}M`;
    }
    if (amount >= 1e3) {
      return `$${(amount / 1e3).toFixed(1)}K`;
    }
  }
  
  // Regular currency formatting
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a number with commas for thousands
 */
export function formatNumber(number: number): string {
  return new Intl.NumberFormat('en-US').format(number);
}

/**
 * Format a percentage with the specified number of decimal places
 */
export function formatPercentage(value: number, decimalPlaces = 1): string {
  return `${value.toFixed(decimalPlaces)}%`;
}

/**
 * Truncate text to a specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Format deal stages with nice labels
 */
export function formatDealStage(stage: string): string {
  const stageMap: Record<string, string> = {
    initial_review: "Initial Review",
    screening: "Screening",
    due_diligence: "Diligence",
    ic_review: "IC Review",
    closing: "Closing",
    closed: "Closed",
    passed: "Passed"
  };
  
  return stageMap[stage] || stage;
}

/**
 * Get the CSS class for a deal stage badge
 */
export function getDealStageBadgeClass(stage: string): string {
  const stageClasses: Record<string, string> = {
    initial_review: "bg-neutral-200 text-neutral-800 font-medium",
    screening: "bg-sky-100 text-sky-800 font-medium",
    due_diligence: "bg-blue-100 text-blue-800 font-medium",
    ic_review: "bg-violet-100 text-violet-800 font-medium",
    closing: "bg-amber-100 text-amber-800 font-medium",
    closed: "bg-green-100 text-green-800 font-medium",
    passed: "bg-red-100 text-red-800 font-medium"
  };
  
  return stageClasses[stage] || "bg-neutral-200 text-neutral-700 font-medium";
}
