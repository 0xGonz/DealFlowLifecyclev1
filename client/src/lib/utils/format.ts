/**
 * Utility functions for formatting values
 */

// Format currency with $ sign and commas
export function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`;
}

// Format a percentage as a string with % sign
export function formatPercentage(value: number): string {
  return `${value}%`;
}

// Format an amount based on its type (dollar or percentage)
export function formatAmountByType(amount: number | undefined, amountType: 'percentage' | 'dollar'): string {
  if (amount === undefined) return 'N/A';
  
  if (amountType === 'dollar') {
    return `$${amount.toLocaleString()}`;
  } else {
    return `${amount}%`;
  }
}
