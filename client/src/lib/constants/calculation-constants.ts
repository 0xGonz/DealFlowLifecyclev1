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
  // Average investment size in $
  AVERAGE_INVESTMENT: 8000000,
  // Convert millions to numeric value
  MILLION: 1000000,
  // Default minimum investment size for funds
  MIN_INVESTMENT: 1000000,
  // Average number of LP investors per fund
  AVG_LP_COUNT: 15,
  // Target IRR percentage
  TARGET_IRR: 18,
  // Target investment period in years
  TARGET_INVESTMENT_PERIOD: 3,
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

// Score calculation constants
export const SCORE_CALCULATION = {
  // Default score for new deals
  DEFAULT_SCORE: 0,
  // Minimum score required to advance to diligence
  MIN_DILIGENCE_SCORE: 65,
  // Minimum score required to advance to IC review
  MIN_IC_REVIEW_SCORE: 75,
};

// Pipeline metrics constants for trend calculations
export const PIPELINE_METRICS = {
  // Target investment rate as a percentage of all deals
  TARGET_INVESTMENT_RATE: 25,
  // Target percentage of deals that should reach diligence
  TARGET_DILIGENCE_RATE: 40,
  // Target percentage of deals that should reach IC review
  TARGET_IC_REVIEW_RATE: 30,
  // Target average days in each stage
  TARGET_DAYS: {
    INITIAL_REVIEW: 7,
    SCREENING: 14,
    DILIGENCE: 30,
    IC_REVIEW: 7,
    CLOSING: 21,
  },
  // Day categories for distribution charts
  DAY_CATEGORIES: {
    RECENT: 7,           // Less than 7 days
    SHORT: 14,           // 7-14 days
    MEDIUM: 30,          // 14-30 days
    LONG: Number.MAX_SAFE_INTEGER  // 30+ days
  },
};
