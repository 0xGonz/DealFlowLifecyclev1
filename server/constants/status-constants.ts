/**
 * Status and enum constants for the server-side
 * Centralizes status values for consistency
 */

// Capital call status values
// Note: Values must match the enum in shared/schema.ts capitalCalls table
export const CAPITAL_CALL_STATUS = {
  SCHEDULED: 'scheduled' as const,
  CALLED: 'called' as const,
  PARTIAL: 'partial' as const,
  PAID: 'paid' as const,
  DEFAULTED: 'defaulted' as const
};

export type CapitalCallStatus = typeof CAPITAL_CALL_STATUS[keyof typeof CAPITAL_CALL_STATUS];

// Capital call status display labels
export const CAPITAL_CALL_STATUS_LABELS = {
  [CAPITAL_CALL_STATUS.SCHEDULED]: 'Scheduled' as const,
  [CAPITAL_CALL_STATUS.CALLED]: 'Called' as const,
  [CAPITAL_CALL_STATUS.PARTIAL]: 'Partially Paid' as const,
  [CAPITAL_CALL_STATUS.PAID]: 'Paid' as const,
  [CAPITAL_CALL_STATUS.DEFAULTED]: 'Defaulted' as const
};

// Closing event types
// Note: Values must match the enum in shared/schema.ts closingScheduleEvents table
export const CLOSING_EVENT_TYPES = {
  FIRST_CLOSE: 'first_close' as const,
  SECOND_CLOSE: 'second_close' as const,
  FINAL_CLOSE: 'final_close' as const,
  EXTENSION: 'extension' as const,
  CUSTOM: 'custom' as const
};

export type ClosingEventType = typeof CLOSING_EVENT_TYPES[keyof typeof CLOSING_EVENT_TYPES];

// Closing event type display labels
export const CLOSING_EVENT_TYPE_LABELS = {
  [CLOSING_EVENT_TYPES.FIRST_CLOSE]: 'First Close' as const,
  [CLOSING_EVENT_TYPES.SECOND_CLOSE]: 'Second Close' as const,
  [CLOSING_EVENT_TYPES.FINAL_CLOSE]: 'Final Close' as const,
  [CLOSING_EVENT_TYPES.EXTENSION]: 'Extension' as const,
  [CLOSING_EVENT_TYPES.CUSTOM]: 'Custom' as const
};

// Closing event status values
// Note: Values must match the enum in shared/schema.ts closingScheduleEvents table
export const CLOSING_EVENT_STATUS = {
  SCHEDULED: 'scheduled' as const,
  COMPLETED: 'completed' as const,
  DELAYED: 'delayed' as const,
  CANCELLED: 'cancelled' as const
};

export type ClosingEventStatus = typeof CLOSING_EVENT_STATUS[keyof typeof CLOSING_EVENT_STATUS];

// Closing event status display labels
export const CLOSING_EVENT_STATUS_LABELS = {
  [CLOSING_EVENT_STATUS.SCHEDULED]: 'Scheduled' as const,
  [CLOSING_EVENT_STATUS.COMPLETED]: 'Completed' as const,
  [CLOSING_EVENT_STATUS.DELAYED]: 'Delayed' as const,
  [CLOSING_EVENT_STATUS.CANCELLED]: 'Cancelled' as const
};

// Deal stage values
// Note: Values must match the enum in shared/schema.ts deals table
export const DEAL_STAGES = {
  INITIAL_REVIEW: 'initial_review' as const,
  SCREENING: 'screening' as const,
  DILIGENCE: 'diligence' as const,
  IC_REVIEW: 'ic_review' as const,
  CLOSING: 'closing' as const,
  CLOSED: 'closed' as const,
  INVESTED: 'invested' as const,
  REJECTED: 'rejected' as const
};

export type DealStage = typeof DEAL_STAGES[keyof typeof DEAL_STAGES];

// Deal stage display labels
export const DEAL_STAGE_LABELS = {
  [DEAL_STAGES.INITIAL_REVIEW]: 'Initial Review' as const,
  [DEAL_STAGES.SCREENING]: 'Screening' as const,
  [DEAL_STAGES.DILIGENCE]: 'Diligence' as const,
  [DEAL_STAGES.IC_REVIEW]: 'IC Review' as const,
  [DEAL_STAGES.CLOSING]: 'Closing' as const,
  [DEAL_STAGES.CLOSED]: 'Closed' as const,
  [DEAL_STAGES.INVESTED]: 'Invested' as const,
  [DEAL_STAGES.REJECTED]: 'Rejected' as const
};

// Payment schedule types
export const SCHEDULE_TYPES = {
  SINGLE: 'single' as const,
  MONTHLY: 'monthly' as const,
  QUARTERLY: 'quarterly' as const,
  BIANNUAL: 'biannual' as const,
  ANNUAL: 'annual' as const,
  CUSTOM: 'custom' as const
};

export type ScheduleType = typeof SCHEDULE_TYPES[keyof typeof SCHEDULE_TYPES];

// Schedule type display labels
export const SCHEDULE_TYPE_LABELS = {
  [SCHEDULE_TYPES.SINGLE]: 'Single Payment' as const,
  [SCHEDULE_TYPES.MONTHLY]: 'Monthly' as const,
  [SCHEDULE_TYPES.QUARTERLY]: 'Quarterly' as const,
  [SCHEDULE_TYPES.BIANNUAL]: 'Biannual' as const,
  [SCHEDULE_TYPES.ANNUAL]: 'Annual' as const,
  [SCHEDULE_TYPES.CUSTOM]: 'Custom Schedule' as const
};
