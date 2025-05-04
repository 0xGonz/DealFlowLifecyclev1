/**
 * Constants related to deals and investment pipeline
 */

// Default sector to display when a deal has no sector assigned
export const DEFAULT_DEAL_SECTOR = 'Private Credit';

// Default values for new deals
export const DEFAULT_DEAL_VALUES = {
  stage: 'initial_review',
  score: 0,
  targetReturn: null,
  sector: DEFAULT_DEAL_SECTOR,
};

// Minimum score required for a deal to advance to diligence stage
export const MIN_DILIGENCE_SCORE = 65;

// Minimum score required for a deal to advance to IC review stage
export const MIN_IC_REVIEW_SCORE = 75;

// Common deal stage identifiers used throughout the application
export const DEAL_STAGES = {
  INITIAL_REVIEW: 'initial_review',
  SCREENING: 'screening',
  DILIGENCE: 'diligence',
  IC_REVIEW: 'ic_review',
  DECLINE: 'decline',
  CLOSED: 'closed',
  INVESTED: 'invested'
};
