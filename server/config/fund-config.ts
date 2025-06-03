/**
 * Fund and allocation configuration
 * Centralizes all fund-related business rules and limits
 */

export const FUND_CONFIG = {
  // Maximum commitment amounts
  MAX_COMMITMENT: parseInt(process.env.MAX_FUND_COMMITMENT || '10000000000', 10), // 10 billion default
  MIN_COMMITMENT: parseInt(process.env.MIN_FUND_COMMITMENT || '1000', 10), // $1,000 minimum
  
  // Capital call configuration
  DEFAULT_CALL_DUE_DAYS: parseInt(process.env.DEFAULT_CALL_DUE_DAYS || '30', 10), // 30 days default
  MIN_CALL_DUE_DAYS: parseInt(process.env.MIN_CALL_DUE_DAYS || '7', 10), // 7 days minimum
  MAX_CALL_DUE_DAYS: parseInt(process.env.MAX_CALL_DUE_DAYS || '180', 10), // 6 months maximum
  
  // Allocation limits and validation
  MAX_PORTFOLIO_WEIGHT: parseFloat(process.env.MAX_PORTFOLIO_WEIGHT || '1.0'), // 100% maximum
  MIN_ALLOCATION_AMOUNT: parseInt(process.env.MIN_ALLOCATION_AMOUNT || '1000', 10),
  
  // Currency and formatting
  CURRENCY_STEP: parseInt(process.env.CURRENCY_STEP || '1000', 10), // $1,000 default step
  PERCENTAGE_PRECISION: parseInt(process.env.PERCENTAGE_PRECISION || '2', 10), // 2 decimal places
  
  // Performance calculation settings
  IRR_CALCULATION_PRECISION: parseInt(process.env.IRR_CALCULATION_PRECISION || '4', 10),
  MOIC_CALCULATION_PRECISION: parseInt(process.env.MOIC_CALCULATION_PRECISION || '2', 10),
  
  // Status workflow configuration
  ALLOWED_STATUS_TRANSITIONS: {
    committed: ['funded', 'unfunded', 'partially_paid', 'written_off'] as const,
    partially_paid: ['funded', 'written_off'] as const,
    funded: ['written_off'] as const,
    unfunded: ['committed', 'written_off'] as const,
    written_off: [] as const // Terminal state
  },
  
  // Fund metrics recalculation settings
  BATCH_SIZE: parseInt(process.env.FUND_BATCH_SIZE || '100', 10),
  RECALC_THROTTLE_MS: parseInt(process.env.FUND_RECALC_THROTTLE || '5000', 10), // 5 seconds
};

// Type definitions for better TypeScript support
export type AllocationStatus = keyof typeof FUND_CONFIG.ALLOWED_STATUS_TRANSITIONS;

// Validation functions
export function isValidStatusTransition(from: AllocationStatus, to: AllocationStatus): boolean {
  const allowedTransitions = FUND_CONFIG.ALLOWED_STATUS_TRANSITIONS[from];
  return allowedTransitions.some(status => status === to);
}

export function validateCommitmentAmount(amount: number): { isValid: boolean; error?: string } {
  if (amount < FUND_CONFIG.MIN_COMMITMENT) {
    return {
      isValid: false,
      error: `Commitment amount must be at least $${FUND_CONFIG.MIN_COMMITMENT.toLocaleString()}`
    };
  }
  
  if (amount > FUND_CONFIG.MAX_COMMITMENT) {
    return {
      isValid: false,
      error: `Commitment amount cannot exceed $${FUND_CONFIG.MAX_COMMITMENT.toLocaleString()}`
    };
  }
  
  return { isValid: true };
}