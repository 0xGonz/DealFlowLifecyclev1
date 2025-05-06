/**
 * Calendar-related constants for the application
 * Centralizes calendar styles, indicators, and display configurations
 */

// Importing closing event constants from their dedicated file
export { 
  CLOSING_EVENT_TYPES,
  CLOSING_EVENT_STATUS,
  CLOSING_EVENT_STATUS_COLORS,
  CLOSING_EVENT_TYPE_LABELS
} from './closing-event-constants';

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

// Type definitions for calendar views and highlight types
export type CalendarView = typeof CALENDAR_VIEWS[keyof typeof CALENDAR_VIEWS];
export type CalendarEventType = typeof CALENDAR_EVENT_TYPES[keyof typeof CALENDAR_EVENT_TYPES];
export type HighlightType = 'call' | 'due' | 'paid' | 'closing' | 'actual_closing';

// Calendar layout constants
export const CALENDAR_LAYOUT = {
  INDICATOR: {
    SIZE: 1.5, // Size of the indicator dot in rem or px units
  },
};
