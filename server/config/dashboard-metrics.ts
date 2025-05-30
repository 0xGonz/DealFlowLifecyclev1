/**
 * Dashboard metrics configuration
 * Contains baseline values and methods for dynamic trend calculations in dashboard statistics
 */
import { type Deal } from "@shared/schema";

/**
 * This module provides two mechanisms for metrics baselines:
 * 1. User-configurable baseline values that establish target performance metrics
 * 2. Functions to calculate dynamic baselines based on historical data
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

// Functions to calculate dynamic baselines from historical data
export const calculateDynamicBaselines = (historicalDeals: Deal[] = []) => {
  // Use a default if no historical data
  if (!historicalDeals.length) {
    return {
      BASELINE_TOTAL_DEALS: 5,
      BASELINE_ACTIVE_PIPELINE_PERCENT: TARGET_METRICS.TARGET_ACTIVE_PIPELINE_PERCENT,
      BASELINE_NEW_DEALS_PERCENT: TARGET_METRICS.TARGET_NEW_DEALS_PERCENT,
      BASELINE_IC_REVIEW_PERCENT: TARGET_METRICS.TARGET_IC_REVIEW_PERCENT,
      BASELINE_INVESTMENT_RATE: TARGET_METRICS.TARGET_INVESTMENT_RATE,
      BASELINE_AUM_PER_DEAL_MILLIONS: TARGET_METRICS.TARGET_AUM_PER_DEAL_MILLIONS,
    };
  }
  
  // Calculate actual baseline values from historical data
  const totalDeals = historicalDeals.length;
  const activeDeals = historicalDeals.filter(deal => [
    'initial_review', 'screening', 'diligence', 'ic_review', 'closing'
  ].includes(deal.stage)).length;
  const newDeals = historicalDeals.filter(deal => ['initial_review', 'screening'].includes(deal.stage)).length;
  const icReviewDeals = historicalDeals.filter(deal => deal.stage === 'ic_review').length;
  const investedDeals = historicalDeals.filter(deal => deal.stage === 'invested').length;
  
  return {
    BASELINE_TOTAL_DEALS: Math.max(totalDeals, 5),
    BASELINE_ACTIVE_PIPELINE_PERCENT: totalDeals > 0 ? Math.round((activeDeals / totalDeals) * 100) : TARGET_METRICS.TARGET_ACTIVE_PIPELINE_PERCENT,
    BASELINE_NEW_DEALS_PERCENT: totalDeals > 0 ? Math.round((newDeals / totalDeals) * 100) : TARGET_METRICS.TARGET_NEW_DEALS_PERCENT,
    BASELINE_IC_REVIEW_PERCENT: totalDeals > 0 ? Math.round((icReviewDeals / totalDeals) * 100) : TARGET_METRICS.TARGET_IC_REVIEW_PERCENT,
    BASELINE_INVESTMENT_RATE: totalDeals > 0 ? Math.round((investedDeals / totalDeals) * 100) : TARGET_METRICS.TARGET_INVESTMENT_RATE,
    BASELINE_AUM_PER_DEAL_MILLIONS: TARGET_METRICS.TARGET_AUM_PER_DEAL_MILLIONS, // This would be calculated from actual AUM data
  };
};

// Export fallback values for backwards compatibility
export const DASHBOARD_METRICS = {
  BASELINE_TOTAL_DEALS: 5,
  BASELINE_ACTIVE_PIPELINE_PERCENT: TARGET_METRICS.TARGET_ACTIVE_PIPELINE_PERCENT,
  BASELINE_NEW_DEALS_PERCENT: TARGET_METRICS.TARGET_NEW_DEALS_PERCENT,
  BASELINE_IC_REVIEW_PERCENT: TARGET_METRICS.TARGET_IC_REVIEW_PERCENT,
  BASELINE_INVESTMENT_RATE: TARGET_METRICS.TARGET_INVESTMENT_RATE,
  BASELINE_AUM_PER_DEAL_MILLIONS: TARGET_METRICS.TARGET_AUM_PER_DEAL_MILLIONS,
};
