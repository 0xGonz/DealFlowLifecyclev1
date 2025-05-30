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
