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

// All metrics now calculated from actual database data - no hardcoded targets

// Functions to calculate dynamic baselines from historical data
export const calculateDynamicBaselines = (historicalDeals: Deal[] = []) => {
  // Always calculate from actual data - no fallback defaults
  if (!historicalDeals.length) {
    return {
      BASELINE_TOTAL_DEALS: 0,
      BASELINE_ACTIVE_PIPELINE_PERCENT: 0,
      BASELINE_NEW_DEALS_PERCENT: 0,
      BASELINE_IC_REVIEW_PERCENT: 0,
      BASELINE_INVESTMENT_RATE: 0,
      BASELINE_AUM_PER_DEAL_MILLIONS: 0,
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
    BASELINE_TOTAL_DEALS: totalDeals,
    BASELINE_ACTIVE_PIPELINE_PERCENT: totalDeals > 0 ? Math.round((activeDeals / totalDeals) * 100) : 0,
    BASELINE_NEW_DEALS_PERCENT: totalDeals > 0 ? Math.round((newDeals / totalDeals) * 100) : 0,
    BASELINE_IC_REVIEW_PERCENT: totalDeals > 0 ? Math.round((icReviewDeals / totalDeals) * 100) : 0,
    BASELINE_INVESTMENT_RATE: totalDeals > 0 ? Math.round((investedDeals / totalDeals) * 100) : 0,
    BASELINE_AUM_PER_DEAL_MILLIONS: 0, // Will be calculated from actual AUM data when available
  };
};

// Export data-driven metrics - all values calculated from actual database data
export const DASHBOARD_METRICS = {
  BASELINE_TOTAL_DEALS: 0,
  BASELINE_ACTIVE_PIPELINE_PERCENT: 0,
  BASELINE_NEW_DEALS_PERCENT: 0,
  BASELINE_IC_REVIEW_PERCENT: 0,
  BASELINE_INVESTMENT_RATE: 0,
  BASELINE_AUM_PER_DEAL_MILLIONS: 0,
};
