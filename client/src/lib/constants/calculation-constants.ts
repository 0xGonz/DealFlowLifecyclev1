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
  // Convert millions to numeric value
  MILLION: 1000000,
  // Formatting precision for different financial metrics
  PRECISION: {
    // For currency values (e.g. $5,000,000)
    CURRENCY: 0,
    // For percentages (e.g. weight: 25.5%)
    PERCENTAGE: 1,
    // For IRR values (e.g. 18.5%)
    IRR: 1,
    // For multiples (e.g. MOIC: 2.50x)
    MULTIPLE: 2,
  },
};

// Score calculation constants (configurable thresholds only)
export const SCORE_CALCULATION = {
  // Default score for new deals - always starts at 0
  DEFAULT_SCORE: 0,
};

// Day categories for distribution charts (UI grouping only)
export const TIME_CATEGORIES = {
  RECENT: 7,           // Less than 7 days
  SHORT: 14,           // 7-14 days  
  MEDIUM: 30,          // 14-30 days
  LONG: Number.MAX_SAFE_INTEGER  // 30+ days
};
