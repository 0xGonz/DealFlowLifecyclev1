/**
 * Calendar-related constants for the application
 * Centralizes calendar styles, indicators, and display configurations
 */

// Calendar date highlight background colors
export const CALENDAR_HIGHLIGHT_COLORS = {
  CALL: 'bg-blue-50' as const,
  DUE: 'bg-amber-50' as const,
  PAID: 'bg-green-50' as const,
  PAST: 'text-neutral-400' as const,
};

// Calendar indicator colors
export const CALENDAR_INDICATOR_COLORS = {
  CALL: 'bg-blue-500' as const,
  DUE: 'bg-amber-500' as const,
  PAID: 'bg-green-500' as const,
};

// Calendar view options
export const CALENDAR_VIEWS = {
  CALENDAR: 'calendar' as const,
  LIST: 'list' as const,
};

// Type definitions for calendar views and highlight types
export type CalendarView = typeof CALENDAR_VIEWS[keyof typeof CALENDAR_VIEWS];
export type HighlightType = 'call' | 'due' | 'paid';

// Calendar layout constants
export const CALENDAR_LAYOUT = {
  DAY_SIZE: {
    WIDTH: 9,
    HEIGHT: 9,
  },
  INDICATOR: {
    SIZE: 1, // Size of the indicator dot in rem or px units
  },
};
