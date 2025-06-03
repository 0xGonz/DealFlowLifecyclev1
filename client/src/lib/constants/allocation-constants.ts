/**
 * Constants for fund allocation and capital calls
 */

export const ALLOCATION_STATUS = {
  COMMITTED: 'committed',
  INVESTED: 'invested',
  FUNDED: 'funded',  // Added funded status for fully paid single allocations
  PARTIALLY_PAID: 'partially_paid', // New status for partially paid allocations
  PARTIALLY_CLOSED: 'partially_closed',
  CLOSED: 'closed',
  WRITTEN_OFF: 'written_off'
};

export const CAPITAL_CALL_SCHEDULES = {
  SINGLE: 'single',
  QUARTERLY: 'quarterly',
  MONTHLY: 'monthly',
  BIANNUAL: 'biannual',
  ANNUAL: 'annual',
  CUSTOM: 'custom'
};

export const CAPITAL_CALL_STATUS = {
  SCHEDULED: 'scheduled',
  CALLED: 'called',
  PARTIAL: 'partial',
  PAID: 'paid',
  DEFAULTED: 'defaulted'
};

export const PAYMENT_SCHEDULE_LABELS = {
  [CAPITAL_CALL_SCHEDULES.SINGLE]: 'Single Payment',
  [CAPITAL_CALL_SCHEDULES.QUARTERLY]: 'Quarterly',
  [CAPITAL_CALL_SCHEDULES.MONTHLY]: 'Monthly',
  [CAPITAL_CALL_SCHEDULES.BIANNUAL]: 'Bi-Annual',
  [CAPITAL_CALL_SCHEDULES.ANNUAL]: 'Annual',
  [CAPITAL_CALL_SCHEDULES.CUSTOM]: 'Custom Schedule'
};

export const CAPITAL_CALL_STATUS_LABELS = {
  [CAPITAL_CALL_STATUS.SCHEDULED]: 'Scheduled',
  [CAPITAL_CALL_STATUS.CALLED]: 'Called',
  [CAPITAL_CALL_STATUS.PARTIAL]: 'Partially Paid',
  [CAPITAL_CALL_STATUS.PAID]: 'Paid',
  [CAPITAL_CALL_STATUS.DEFAULTED]: 'Defaulted'
};

// Capital call timing constants
export const CAPITAL_CALL_TIMING = {
  DEFAULT_DUE_DAYS: 30, // Default days between call date and due date
  PAYMENT_GRACE_DAYS: 7, // Grace period for late payments
  REMINDER_DAYS_BEFORE: 7 // Days before due date to send reminders
};

// Default allocation values
export const ALLOCATION_DEFAULTS = {
  PORTFOLIO_WEIGHT: 0,
  INTEREST_PAID: 0,
  DISTRIBUTION_PAID: 0,
  INITIAL_MARKET_VALUE: 0, // Market value starts at 0, updated based on performance
  INITIAL_MOIC: 1, // Multiple of Invested Capital starts at 1x
  INITIAL_IRR: 0, // Internal Rate of Return starts at 0%
  PAID_AMOUNT: 0 // Initially no amount paid
};
