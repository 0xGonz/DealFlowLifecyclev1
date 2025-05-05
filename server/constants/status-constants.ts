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
