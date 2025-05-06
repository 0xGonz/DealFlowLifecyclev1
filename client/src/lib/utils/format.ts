/**
 * Utility functions for formatting values
 */
import { DealStageColors } from '@shared/schema';

// Format currency with $ sign and commas
export function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`;
}

// Format a percentage as a string with % sign
export function formatPercentage(value: number, precision: number = 0): string {
  return `${value.toFixed(precision)}%`;
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

// Format bytes to human-readable file size
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Get the badge class for a deal stage
export function getDealStageBadgeClass(stage: string): string {
  const stageColor = DealStageColors[stage as keyof typeof DealStageColors] || 'neutral';
  
  switch (stageColor) {
    case 'neutral':
      return 'bg-gray-100 text-gray-800';
    case 'primary':
      return 'bg-indigo-100 text-indigo-800';
    case 'info':
      return 'bg-blue-100 text-blue-800';
    case 'success':
      return 'bg-emerald-100 text-emerald-800';
    case 'danger':
      return 'bg-red-100 text-red-800';
    case 'warning':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
