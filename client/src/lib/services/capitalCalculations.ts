import type { FundAllocation } from '@/lib/types';

export interface CapitalMetrics {
  committedAmount: number;
  calledAmount: number;
  uncalledAmount: number;
}

/**
 * Calculate capital metrics for a single allocation based on its status and capital call history
 * This is a scalable service that can be extended to integrate with actual capital call data
 */
export function calculateAllocationCapitalMetrics(allocation: FundAllocation): CapitalMetrics {
  const committedAmount = allocation.amount;
  let calledAmount = 0;
  let uncalledAmount = allocation.amount;
  
  // Calculate based on allocation status
  // In a real system, this would query actual capital call records
  switch (allocation.status) {
    case 'funded':
      // Fully funded allocations have called = committed
      calledAmount = allocation.amount;
      uncalledAmount = 0;
      break;
      
    case 'partially_paid':
      // For partially paid, we would query capital calls table
      // For now, we calculate based on funding percentage stored in allocation
      // This could be enhanced to query: SELECT SUM(amount) FROM capital_calls WHERE allocation_id = ?
      const fundingPercentage = allocation.fundingPercentage || 0.4; // Default fallback
      calledAmount = allocation.amount * fundingPercentage;
      uncalledAmount = allocation.amount - calledAmount;
      break;
      
    case 'committed':
    case 'unfunded':
    default:
      // No capital has been called yet
      calledAmount = 0;
      uncalledAmount = allocation.amount;
      break;
  }
  
  return {
    committedAmount,
    calledAmount,
    uncalledAmount
  };
}

/**
 * Calculate fund-level capital metrics by aggregating all allocations
 */
export function calculateFundCapitalMetrics(allocations: FundAllocation[]): CapitalMetrics {
  return allocations.reduce(
    (totals, allocation) => {
      const metrics = calculateAllocationCapitalMetrics(allocation);
      return {
        committedAmount: totals.committedAmount + metrics.committedAmount,
        calledAmount: totals.calledAmount + metrics.calledAmount,
        uncalledAmount: totals.uncalledAmount + metrics.uncalledAmount
      };
    },
    { committedAmount: 0, calledAmount: 0, uncalledAmount: 0 }
  );
}

/**
 * Get display amount based on capital view selection
 */
export function getDisplayAmount(
  metrics: CapitalMetrics, 
  view: 'total' | 'called' | 'uncalled'
): number {
  switch (view) {
    case 'called':
      return metrics.calledAmount;
    case 'uncalled':
      return metrics.uncalledAmount;
    case 'total':
    default:
      return metrics.committedAmount;
  }
}

/**
 * Get color class based on capital view selection
 */
export function getCapitalViewColorClass(view: 'total' | 'called' | 'uncalled'): string {
  switch (view) {
    case 'called':
      return 'text-green-700 font-medium';
    case 'uncalled':
      return 'text-orange-700 font-medium';
    case 'total':
    default:
      return 'text-blue-700 font-medium';
  }
}