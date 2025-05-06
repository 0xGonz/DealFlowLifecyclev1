/**
 * Constants for closing events
 * Used in the Calendar view for showing closing events
 */

export const CLOSING_EVENT_TYPES = {
  CUSTOM: 'custom',
  FIRST_CLOSE: 'first_close',
  SECOND_CLOSE: 'second_close',
  FINAL_CLOSE: 'final_close',
  EXTENSION: 'extension'
} as const;

export type ClosingEventType = typeof CLOSING_EVENT_TYPES[keyof typeof CLOSING_EVENT_TYPES];

export const CLOSING_EVENT_STATUS = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  DELAYED: 'delayed',
  CANCELLED: 'cancelled'
} as const;

export type ClosingEventStatus = typeof CLOSING_EVENT_STATUS[keyof typeof CLOSING_EVENT_STATUS];

export const CLOSING_EVENT_TYPE_LABELS = {
  [CLOSING_EVENT_TYPES.CUSTOM]: 'Custom Event',
  [CLOSING_EVENT_TYPES.FIRST_CLOSE]: 'First Close',
  [CLOSING_EVENT_TYPES.SECOND_CLOSE]: 'Second Close',
  [CLOSING_EVENT_TYPES.FINAL_CLOSE]: 'Final Close',
  [CLOSING_EVENT_TYPES.EXTENSION]: 'Extension'
};

export const CLOSING_EVENT_STATUS_COLORS = {
  [CLOSING_EVENT_STATUS.SCHEDULED]: 'bg-blue-100 hover:bg-blue-200 text-blue-800',
  [CLOSING_EVENT_STATUS.DELAYED]: 'bg-amber-100 hover:bg-amber-200 text-amber-800',
  [CLOSING_EVENT_STATUS.COMPLETED]: 'bg-green-100 hover:bg-green-200 text-green-800',
  [CLOSING_EVENT_STATUS.CANCELLED]: 'bg-red-100 hover:bg-red-200 text-red-800'
};

export const CLOSING_EVENT_STATUS_LABELS = {
  [CLOSING_EVENT_STATUS.SCHEDULED]: 'Scheduled',
  [CLOSING_EVENT_STATUS.DELAYED]: 'Delayed',
  [CLOSING_EVENT_STATUS.COMPLETED]: 'Completed',
  [CLOSING_EVENT_STATUS.CANCELLED]: 'Cancelled'
};
