/**
 * Calendar-related constants for the application
 * Centralizes calendar styles, indicators, and display configurations
 */

// Calendar date highlight background colors
export const CALENDAR_HIGHLIGHT_COLORS = {
  CALL: 'bg-blue-50' as const,
  DUE: 'bg-amber-50' as const,
  PAID: 'bg-green-50' as const,
  CLOSING: 'bg-purple-50' as const,
  ACTUAL_CLOSING: 'bg-indigo-50' as const,
  PAST: 'text-neutral-400' as const,
};

// Calendar indicator colors
export const CALENDAR_INDICATOR_COLORS = {
  CALL: 'bg-blue-500' as const,
  DUE: 'bg-amber-500' as const,
  PAID: 'bg-green-500' as const,
  CLOSING: 'bg-purple-500' as const,
  ACTUAL_CLOSING: 'bg-indigo-500' as const,
};

// Calendar view options
export const CALENDAR_VIEWS = {
  CALENDAR: 'calendar' as const,
  LIST: 'list' as const,
};

// Calendar event types
export const CALENDAR_EVENT_TYPES = {
  ALL: 'all' as const,
  CAPITAL_CALLS: 'capital_calls' as const,
  CLOSING_EVENTS: 'closing_events' as const,
};

// Closing event types
export const CLOSING_EVENT_TYPES = {
  FIRST_CLOSE: 'first_close' as const,
  SECOND_CLOSE: 'second_close' as const,
  FINAL_CLOSE: 'final_close' as const,
  EXTENSION: 'extension' as const,
  CUSTOM: 'custom' as const,
};

// Closing event status
export const CLOSING_EVENT_STATUS = {
  SCHEDULED: 'scheduled' as const,
  COMPLETED: 'completed' as const,
  DELAYED: 'delayed' as const,
  CANCELLED: 'cancelled' as const,
};

// Closing event status colors
export const CLOSING_EVENT_STATUS_COLORS = {
  scheduled: 'bg-neutral-100 text-neutral-800' as const,
  completed: 'bg-green-100 text-green-800' as const,
  delayed: 'bg-amber-100 text-amber-800' as const,
  cancelled: 'bg-red-100 text-red-800' as const,
};

// Closing event type labels
export const CLOSING_EVENT_TYPE_LABELS = {
  first_close: 'First Close' as const,
  second_close: 'Second Close' as const,
  final_close: 'Final Close' as const,
  extension: 'Extension' as const,
  custom: 'Custom' as const,
};

// Type definitions for calendar views and highlight types
export type CalendarView = typeof CALENDAR_VIEWS[keyof typeof CALENDAR_VIEWS];
export type CalendarEventType = typeof CALENDAR_EVENT_TYPES[keyof typeof CALENDAR_EVENT_TYPES];
export type HighlightType = 'call' | 'due' | 'paid' | 'closing' | 'actual_closing';

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
