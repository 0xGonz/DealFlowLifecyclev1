/**
 * Time-related constants for the server
 * Centralizes time values, intervals, and conversions
 */

// Time intervals in milliseconds
export const TIME_MS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000, // Approximate
  YEAR: 365 * 24 * 60 * 60 * 1000, // Non-leap year
};

// Default durations
export const DEFAULT_DURATIONS = {
  CAPITAL_CALL_DUE_DAYS: 30, // Default days until a capital call is due
  SESSION_TIMEOUT_MINUTES: 60, // Default session timeout in minutes
  TOKEN_EXPIRY_DAYS: 7, // Default token expiry period
};
