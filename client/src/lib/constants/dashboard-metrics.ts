/**
 * Client-side dashboard metrics configuration
 * Contains target values to use for comparisons in dashboard statistics
 */

// User-configurable baseline targets - these should come from user preferences or admin settings
export const TARGET_METRICS = {
  // Industry benchmarks or organizational targets
  TARGET_ACTIVE_PIPELINE_PERCENT: 75, // Target: 75% of deals should be in active stages
  TARGET_NEW_DEALS_PERCENT: 30,       // Target: 30% of pipeline should be new deals
  TARGET_IC_REVIEW_PERCENT: 20,       // Target: 20% of pipeline should reach IC review
  TARGET_INVESTMENT_RATE: 25,         // Target: 25% of evaluated deals should receive investment
  TARGET_AUM_PER_DEAL_MILLIONS: 8,    // Target: $8M average investment per deal
};
