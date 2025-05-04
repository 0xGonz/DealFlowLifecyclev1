/**
 * Style constants for the application
 * Centralizes styling information for consistency
 */

// Deal stage badge styling
export const DEAL_STAGE_BADGE_CLASSES: Record<string, string> = {
  initial_review: 'bg-gray-200 text-gray-800',
  screening: 'bg-blue-200 text-blue-800',
  diligence: 'bg-indigo-200 text-indigo-800',
  ic_review: 'bg-purple-200 text-purple-800',
  closing: 'bg-amber-200 text-amber-800',
  closed: 'bg-emerald-200 text-emerald-800',
  invested: 'bg-teal-200 text-teal-800',
  rejected: 'bg-red-200 text-red-800',
  passed: 'bg-yellow-200 text-yellow-800',
  default: 'bg-gray-200 text-gray-800'
};

// Capital call status styling
export const CAPITAL_CALL_STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800 border-blue-300',
  called: 'bg-amber-100 text-amber-800 border-amber-300',
  partial: 'bg-purple-100 text-purple-800 border-purple-300',
  paid: 'bg-green-100 text-green-800 border-green-300',
  defaulted: 'bg-red-100 text-red-800 border-red-300'
};
