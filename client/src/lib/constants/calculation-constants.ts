/**
 * Constants for calculations used throughout the application
 * Centralizes calculation formulas and parameters for consistency
 */

// Percentage calculation constants
export const PERCENTAGE_CALCULATION = {
  // Multiply by 100 to convert decimal to percentage
  DECIMAL_TO_PERCENTAGE: 100,
  // Default rounding method for percentages
  DEFAULT_ROUNDING: Math.round,
  // Base values used for relative calculations
  BASE_VALUE: 100,
};

// Financial calculation constants 
export const FINANCIAL_CALCULATION = {
  // Default sample deal value in $ (for demo purposes)
  DEFAULT_DEAL_VALUE: 5000000, 
  // Convert millions to numeric value
  MILLION: 1000000,
  // For currency formatting
  DEFAULT_PRECISION: 0,
};

// Score calculation constants
export const SCORE_CALCULATION = {
  // Default score for new deals
  DEFAULT_SCORE: 0,
  // Minimum score required to advance to diligence
  MIN_DILIGENCE_SCORE: 65,
  // Minimum score required to advance to IC review
  MIN_IC_REVIEW_SCORE: 75,
};
