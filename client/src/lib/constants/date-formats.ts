/**
 * Date format constants for consistent date formatting across the application
 */

export const DATE_FORMATS = {
  // ISO date format (YYYY-MM-DD)
  ISO: 'yyyy-MM-dd',
  
  // Full date with day name, month name, date, and year (e.g., Tuesday, September 21, 2021)
  FULL: 'EEEE, MMMM d, yyyy',
  
  // Long date format (e.g., September 21, 2021)
  LONG: 'MMMM d, yyyy',
  
  // Medium date format (e.g., Sep 21, 2021)
  MEDIUM: 'MMM d, yyyy',
  
  // Short date format (e.g., 09/21/2021)
  SHORT: 'MM/dd/yyyy',
  
  // Short date with time (e.g., 09/21/2021 14:30)
  SHORT_WITH_TIME: 'MM/dd/yyyy HH:mm',
  
  // Month and year (e.g., September 2021)
  MONTH_YEAR: 'MMMM yyyy',
  
  // Month and day (e.g., September 21)
  MONTH_DAY: 'MMMM d',
};
