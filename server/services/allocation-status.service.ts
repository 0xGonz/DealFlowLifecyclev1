/**
 * Allocation Status Service
 * 
 * Handles the logic for determining allocation status based on committed vs paid amounts
 * and provides methods for updating payment status consistently across the system.
 */

export interface AllocationStatusData {
  amount: number;           // Committed amount
  paidAmount: number | null;      // Actually paid amount
  status: string | null;          // Current status
}

export interface AllocationStatusResult {
  status: 'committed' | 'funded' | 'unfunded' | 'partially_paid' | 'written_off';
  paidPercentage: number;
  remainingAmount: number;
  isFullyPaid: boolean;
  isPartiallyPaid: boolean;
}

export class AllocationStatusService {
  
  /**
   * Calculate the correct status based on committed and paid amounts
   */
  static calculateStatus(allocation: AllocationStatusData): AllocationStatusResult {
    const { amount: committed, paidAmount: paid, status } = allocation;
    
    // Ensure non-negative values
    const committedAmount = Math.max(0, committed || 0);
    const paidAmountSafe = Math.max(0, paid || 0);
    
    // Calculate derived values
    const paidPercentage = committedAmount > 0 ? (paidAmountSafe / committedAmount) * 100 : 0;
    const remainingAmount = Math.max(0, committedAmount - paidAmountSafe);
    const isFullyPaid = paidAmountSafe >= committedAmount && committedAmount > 0;
    const isPartiallyPaid = paidAmountSafe > 0 && paidAmountSafe < committedAmount;
    
    // Determine status based on payment progress
    let resultStatus: AllocationStatusResult['status'];
    
    if (status === 'written_off') {
      // Preserve written_off status regardless of payment amounts
      resultStatus = 'written_off';
    } else if (status === 'unfunded') {
      // Preserve unfunded status if explicitly set
      resultStatus = 'unfunded';
    } else if (isFullyPaid) {
      // Fully paid
      resultStatus = 'funded';
    } else if (isPartiallyPaid) {
      // Partially paid
      resultStatus = 'partially_paid';
    } else {
      // No payments made yet
      resultStatus = 'committed';
    }
    
    return {
      status: resultStatus,
      paidPercentage,
      remainingAmount,
      isFullyPaid,
      isPartiallyPaid
    };
  }
  
  /**
   * Process a payment and return updated allocation data
   */
  static processPayment(
    allocation: AllocationStatusData, 
    paymentAmount: number
  ): { updatedPaidAmount: number; newStatus: string } {
    
    const currentPaid = allocation.paidAmount || 0;
    const updatedPaidAmount = currentPaid + Math.max(0, paymentAmount);
    
    // Calculate new status with updated paid amount
    const result = this.calculateStatus({
      ...allocation,
      paidAmount: updatedPaidAmount
    });
    
    return {
      updatedPaidAmount,
      newStatus: result.status
    };
  }
  
  /**
   * Validate payment amount against allocation constraints
   */
  static validatePayment(
    allocation: AllocationStatusData,
    paymentAmount: number
  ): { isValid: boolean; error?: string } {
    
    if (paymentAmount < 0) {
      return { isValid: false, error: 'Payment amount cannot be negative' };
    }
    
    const currentPaid = allocation.paidAmount || 0;
    const committed = allocation.amount || 0;
    const totalAfterPayment = currentPaid + paymentAmount;
    
    if (totalAfterPayment > committed * 1.1) { // Allow 10% buffer for rounding
      return { 
        isValid: false, 
        error: `Payment would exceed committed amount. Remaining: $${(committed - currentPaid).toLocaleString()}` 
      };
    }
    
    return { isValid: true };
  }
  
  /**
   * Get display information for allocation status
   */
  static getStatusDisplay(allocation: AllocationStatusData): {
    statusLabel: string;
    statusColor: string;
    paymentInfo: string;
  } {
    
    const result = this.calculateStatus(allocation);
    
    const statusLabels: Record<string, string> = {
      committed: 'Committed',
      funded: 'Funded',
      unfunded: 'Unfunded',
      partially_paid: 'Partially Paid',
      written_off: 'Written Off'
    };
    
    const statusColors: Record<string, string> = {
      committed: 'blue',
      funded: 'green',
      unfunded: 'gray',
      partially_paid: 'yellow',
      written_off: 'red'
    };
    
    const committed = allocation.amount || 0;
    const paid = allocation.paidAmount || 0;
    
    let paymentInfo = '';
    if (result.isPartiallyPaid) {
      paymentInfo = `$${paid.toLocaleString()} of $${committed.toLocaleString()} (${result.paidPercentage.toFixed(1)}%)`;
    } else if (result.isFullyPaid) {
      paymentInfo = `$${committed.toLocaleString()} (100%)`;
    } else {
      paymentInfo = `$0 of $${committed.toLocaleString()} (0%)`;
    }
    
    return {
      statusLabel: statusLabels[result.status] || 'Unknown',
      statusColor: statusColors[result.status] || 'gray',
      paymentInfo
    };
  }
}