import { StorageFactory } from '../storage-factory';
import { db } from '../db';
import { eq, sql } from 'drizzle-orm';
import { 
  CapitalCall, 
  InsertCapitalCall,
  FundAllocation,
  InsertPayment,
  Payment,
  payments
} from '@shared/schema';
import { addMonths, addQuarters, addYears } from 'date-fns';
import { normalizeToNoonUTC, formatToNoonUTC } from '@shared/utils/date-utils';

// Define allocation statuses for use in the service
const ALLOCATION_STATUS = {
  COMMITTED: 'committed',
  INVESTED: 'invested',
  FUNDED: 'funded',
  PARTIALLY_CLOSED: 'partially_closed',
  CLOSED: 'closed',
  WRITTEN_OFF: 'written_off'
};

// Define the extended capital call type with fund and deal information
interface CapitalCallWithFundAllocation extends CapitalCall {
  fund_name: string;
  deal_name: string;
  allocation_amount: number;
}

// Define valid status transitions for capital calls
const VALID_STATUS_TRANSITIONS: Record<CapitalCall['status'], CapitalCall['status'][]> = {
  'scheduled': ['called', 'overdue', 'defaulted', 'partially_paid', 'paid'],
  'called': ['partial', 'paid', 'overdue', 'defaulted', 'partially_paid'],
  'partial': ['paid', 'overdue', 'defaulted', 'partially_paid'],
  'partially_paid': ['paid', 'overdue', 'defaulted'],
  'overdue': ['paid', 'defaulted', 'partial', 'partially_paid'],
  'paid': [], // Terminal state
  'defaulted': [] // Terminal state
};

/**
 * Validate if a status transition is allowed
 */
function validateStatusTransition(currentStatus: CapitalCall['status'], newStatus: CapitalCall['status']): boolean {
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}

/**
 * Calculate outstanding amount based on call amount and paid amount
 */
function calculateOutstandingAmount(callAmount: number, paidAmount: number): number {
  return Math.max(0, callAmount - (paidAmount || 0));
}

/**
 * Service for capital call related operations
 */
export class CapitalCallService {
  /**
   * Create a new capital call with validation and automatic calculation
   */
  async createCapitalCall(capitalCall: InsertCapitalCall): Promise<CapitalCall> {
    const storage = StorageFactory.getStorage();
    
    // Calculate outstanding amount automatically
    const outstandingAmount = calculateOutstandingAmount(
      capitalCall.callAmount, 
      capitalCall.paidAmount || 0
    );
    
    // Create the capital call with calculated outstanding amount
    const enrichedCapitalCall = {
      ...capitalCall,
      outstanding_amount: outstandingAmount,
      paidAmount: capitalCall.paidAmount || 0
    };
    
    const result = await storage.createCapitalCall(enrichedCapitalCall);
    
    // Update allocation status after creating capital call
    // We'll handle this through lifecycle events rather than direct imports to avoid circular dependencies
    
    return result;
  }

  /**
   * Update a capital call with validation
   */
  async updateCapitalCall(id: number, updates: Partial<CapitalCall>): Promise<CapitalCall> {
    const storage = StorageFactory.getStorage();
    
    // Get current capital call for validation
    const currentCall = await storage.getCapitalCall(id);
    if (!currentCall) {
      throw new Error('Capital call not found');
    }
    
    // Validate status transition if status is being updated
    if (updates.status && updates.status !== currentCall.status) {
      if (!validateStatusTransition(currentCall.status, updates.status)) {
        throw new Error(`Invalid status transition from ${currentCall.status} to ${updates.status}`);
      }
    }
    
    // Recalculate outstanding amount if call amount or paid amount changed
    if (updates.callAmount !== undefined || updates.paidAmount !== undefined) {
      const newCallAmount = updates.callAmount ?? currentCall.callAmount;
      const newPaidAmount = updates.paidAmount ?? (currentCall.paidAmount || 0);
      updates.outstanding_amount = calculateOutstandingAmount(newCallAmount, newPaidAmount);
    }
    
    const result = await storage.updateCapitalCall(id, updates);
    
    // Update allocation status after updating capital call
    // Status updates will be handled through lifecycle events
    
    if (!result) {
      throw new Error('Failed to update capital call');
    }
    
    return result;
  }

  /**
   * Create multiple capital calls based on allocation parameters.
   * This uses a transaction to ensure all calls are created atomically.
   */
  async createCapitalCallsForAllocation(
    allocation: FundAllocation, 
    capitalCallSchedule: string,
    callFrequency: string,
    firstCallDate: Date,
    callCount: number,
    callPercentage: number,
    callAmountType: 'percentage' | 'dollar' = 'percentage',
    callDollarAmount: number = 0
  ): Promise<CapitalCall[]> {
    const storage = StorageFactory.getStorage();
    const calls: CapitalCall[] = [];
    
    // If it's a single payment, create a paid capital call immediately
    if (capitalCallSchedule === 'single') {
      // Calculate call amount based on type
      let callAmount: number;
      if (callAmountType === 'dollar') {
        callAmount = callDollarAmount;
      } else {
        // For percentage, calculate based on allocation amount
        if (allocation.amountType === 'dollar') {
          callAmount = (allocation.amount * callPercentage) / 100;
        } else {
          callAmount = callPercentage;
        }
      }
      
      // Log the incoming date for debugging
      console.log('Creating single payment capital call with date:', {
        originalDate: firstCallDate,
        isoString: firstCallDate.toISOString(),
        dateString: firstCallDate.toString()
      });
      
      // Use the firstCallDate passed from the form for the call date, due date, and paid date
      // Normalize all dates to noon UTC to avoid timezone issues
      const normalizedDate = normalizeToNoonUTC(firstCallDate);
      
      console.log('Creating single payment capital call with normalized date:', {
        originalDate: firstCallDate,
        normalizedDate: normalizedDate,
        isoString: normalizedDate.toISOString()
      });
      
      const singleCall = await storage.createCapitalCall({
        allocationId: allocation.id,
        callAmount: callAmount,
        amountType: callAmountType === 'dollar' ? 'dollar' : allocation.amountType,
        callDate: normalizedDate, // Use the normalized date
        dueDate: normalizedDate, // Use the normalized date
        status: 'paid',
        paidAmount: callAmount, // Fully paid
        paidDate: normalizedDate, // Use the normalized date
        outstanding_amount: 0, // Nothing left to pay
        notes: 'Single payment allocation - automatically paid'
      });
      
      calls.push(singleCall);
      
      // Update allocation status to funded
      await storage.updateFundAllocation(allocation.id, {
        ...allocation,
        status: 'funded' as const
      });
      
      return calls;
    }
    
    // For scheduled payments, create multiple capital calls
    const baseAmount = allocation.amount;
    let remainingPercentage = 100;
    
    // Create capital calls based on schedule
    for (let i = 0; i < callCount; i++) {
      let callDate: Date;
      
      // Calculate call date based on frequency
      if (i === 0) {
        callDate = normalizeToNoonUTC(firstCallDate);
      } else {
        // Create normalized base date
        const baseDate = normalizeToNoonUTC(firstCallDate);
        
        switch (callFrequency) {
          case 'monthly':
            callDate = normalizeToNoonUTC(addMonths(baseDate, i));
            break;
          case 'quarterly':
            callDate = normalizeToNoonUTC(addQuarters(baseDate, i));
            break;
          case 'biannual':
            callDate = normalizeToNoonUTC(addMonths(baseDate, i * 6));
            break;
          case 'annual':
            callDate = normalizeToNoonUTC(addYears(baseDate, i));
            break;
          default:
            callDate = normalizeToNoonUTC(addMonths(baseDate, i));
        }
      }
      
      // Calculate due date (30 days after call date)
      const dueDate = addMonths(callDate, 1);
      // Normalize to noon UTC to avoid timezone issues
      const normalizedDueDate = normalizeToNoonUTC(dueDate);
      
      // Calculate call amount based on call amount type
      let callAmount: number;
      let callAmountTypeForCall: 'percentage' | 'dollar';
      
      if (callAmountType === 'dollar') {
        // Use dollar amount divided by call count
        callAmount = callDollarAmount / callCount;
        callAmountTypeForCall = 'dollar';
      } else {
        // For the last call, use remaining percentage to ensure we reach 100%
        const isLastCall = i === callCount - 1;
        const thisCallPercentage = isLastCall ? remainingPercentage : callPercentage;
        
        // Calculate call amount based on percentage and allocation type
        if (allocation.amountType === 'dollar') {
          callAmount = (baseAmount * thisCallPercentage) / 100;
          callAmountTypeForCall = 'dollar';
        } else {
          callAmount = thisCallPercentage; // For percentage allocations, use the percentage directly
          callAmountTypeForCall = 'percentage';
        }
      }
      
      // Create capital call
      const call = await storage.createCapitalCall({
        allocationId: allocation.id,
        callAmount,
        amountType: callAmountTypeForCall,
        callDate,
        dueDate: normalizedDueDate, // Use normalized due date
        status: 'scheduled',
        paidAmount: 0, // Initially nothing paid
        outstanding_amount: callAmount, // Full amount outstanding - match DB column name
        notes: `Scheduled payment ${i + 1} of ${callCount}`
      });
      
      calls.push(call);
      
      // Only subtract from remaining percentage if using percentage-based calls
      if (callAmountType === 'percentage') {
        const thisCallPercentage = i === callCount - 1 ? remainingPercentage : callPercentage;
        remainingPercentage -= thisCallPercentage;
      }
    }
    
    return calls;
  }

  /**
   * Get a capital call by id
   */
  async getCapitalCall(id: number): Promise<CapitalCall | null> {
    const storage = StorageFactory.getStorage();
    const capitalCall = await storage.getCapitalCall(id);
    return capitalCall || null;
  }

  /**
   * Get all capital calls
   */
  async getAllCapitalCalls(): Promise<CapitalCall[]> {
    const storage = StorageFactory.getStorage();
    return await storage.getAllCapitalCalls();
  }

  /**
   * Get capital calls for a specific allocation
   */
  async getCapitalCallsByAllocation(allocationId: number): Promise<CapitalCall[]> {
    const storage = StorageFactory.getStorage();
    return await storage.getCapitalCallsByAllocation(allocationId);
  }

  /**
   * Get capital calls for a specific deal
   */
  async getCapitalCallsByDeal(dealId: number): Promise<CapitalCall[]> {
    const storage = StorageFactory.getStorage();
    return await storage.getCapitalCallsByDeal(dealId);
  }

  /**
   * Add a payment to a capital call
   */
  async addPaymentToCapitalCall(
    capitalCallId: number, 
    paymentAmount: number, 
    paymentDate: Date,
    paymentType: 'wire' | 'check' | 'ach' | 'other' | null = 'wire',
    notes: string | null = null,
    createdBy: number
  ): Promise<CapitalCall | null> {
    const storage = StorageFactory.getStorage();
    
    // Get current capital call
    const currentCall = await storage.getCapitalCall(capitalCallId);
    if (!currentCall) {
      throw new Error('Capital call not found');
    }
    
    // Get total payments already made for this capital call from the payments table
    const existingPayments = await this.getPaymentsForCapitalCall(capitalCallId);
    // Calculate total payments from database records
    const totalPaidSoFar = existingPayments.reduce((sum, payment: any) => {
      // Cast to any to handle both snake_case and camelCase field names
      const amount = payment.amount_usd || 0;
      return sum + Number(amount);
    }, 0);
    
    // Calculate potential new paid amount to check for over-payment
    const potentialPaidAmount = totalPaidSoFar + paymentAmount;
    
    // Check for over-payment
    if (potentialPaidAmount > currentCall.callAmount) {
      throw new Error(`Payment amount of ${paymentAmount} would exceed the call amount. The maximum allowed payment is ${currentCall.callAmount - totalPaidSoFar}`);
    }
    
    // Create payment record in the payments table using SQL template literals
    const formattedDate = new Date(paymentDate).toISOString().split('T')[0];
    await db.execute(sql`
      INSERT INTO payments (capital_call_id, paid_date, amount_usd) 
      VALUES (${capitalCallId}, ${formattedDate}, ${paymentAmount})
    `);
    
    // Also create a payment record in the capital_call_payments table for backwards compatibility
    await storage.createCapitalCallPayment({
      capitalCallId,
      paymentAmount,
      paymentDate,
      paymentType,
      notes,
      createdBy
    });
    
    // Calculate new outstanding amount
    const newPaidAmount = potentialPaidAmount;
    const newOutstanding = Math.max(0, currentCall.callAmount - newPaidAmount);
    
    // Determine new status based on payment amount
    let newStatus: CapitalCall['status'];
    
    if (newOutstanding === 0) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0 && newOutstanding > 0) {
      // Use the new partially_paid status instead of partial
      newStatus = 'partially_paid';
    } else {
      newStatus = currentCall.status;
    }
    
    // Create a proper normalized Date object for the payment date
    const normalizedPaymentDate = new Date(paymentDate);
    normalizedPaymentDate.setUTCHours(12, 0, 0, 0);
    
    // Update capital call with new paid amount and status
    const updatedCall = await storage.updateCapitalCall(capitalCallId, {
      ...currentCall,
      paidAmount: newPaidAmount,
      outstanding_amount: newOutstanding, // Match the DB column name
      status: newStatus,
      paidDate: normalizedPaymentDate // Use normalized Date object
    });
    
    // If call is now fully paid, check if all calls for this allocation are paid
    if (newStatus === 'paid') {
      // Get the allocation to update its status if needed
      const allocation = await storage.getFundAllocation(currentCall.allocationId);
      
      if (allocation) {
        // Check if this is the last unpaid call for this allocation
        const allCalls = await storage.getCapitalCallsByAllocation(allocation.id);
        const hasUnpaidCalls = allCalls.some(call => 
          call.id !== capitalCallId && 
          call.status !== 'paid' && 
          call.status !== 'defaulted'
        );
        
        // If all calls are now paid or defaulted, update allocation status to funded
        if (!hasUnpaidCalls && allocation.status !== 'funded') {
          await storage.updateFundAllocation(allocation.id, {
            ...allocation,
            status: 'funded' as const
          });
        }
      }
    }
    
    // Invalidate any cached data for this capital call
    // This ensures the UI will fetch the latest data
    
    return updatedCall || null;
  }
  
  /**
   * Get all payments for a specific capital call
   */
  async getPaymentsForCapitalCall(capitalCallId: number): Promise<any[]> {
    // Use SQL template literals to avoid field name mapping issues
    // We're returning any[] instead of Payment[] because the raw SQL results use snake_case field names
    const result = await db.execute(sql`
      SELECT * FROM payments WHERE capital_call_id = ${capitalCallId}
    `);
    return result.rows || [];
  }

  /**
   * Update a capital call status with validation of state transitions
   */
  async updateCapitalCallStatus(id: number, newStatus: CapitalCall['status'], paidAmount?: number): Promise<CapitalCall | null> {
    const storage = StorageFactory.getStorage();
    
    // Get current capital call
    const currentCall = await storage.getCapitalCall(id);
    if (!currentCall) {
      throw new Error('Capital call not found');
    }
    
    // Validate status transition
    const currentStatus = currentCall.status;
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
    
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'. ` +
        `Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`
      );
    }
    
    // Calculate new values based on status change
    let newPaidAmount = currentCall.paidAmount;
    let newOutstanding = currentCall.outstanding_amount;
    let paidDate = currentCall.paidDate;
    
    // Handle payment-related status changes
    if (newStatus === 'paid' && paidAmount) {
      newPaidAmount = paidAmount;
      newOutstanding = 0;
      // Create a proper Date object with time set to noon UTC
      const today = new Date();
      today.setUTCHours(12, 0, 0, 0);
      paidDate = today;
    } else if (newStatus === 'partial' && paidAmount) {
      // Additional validations for partial payments
      if (!paidAmount || paidAmount >= currentCall.callAmount) {
        throw new Error('Partial payment amount must be greater than 0 and less than the call amount');
      }
      
      newPaidAmount = paidAmount;
      newOutstanding = currentCall.callAmount - paidAmount;
      // Create a proper Date object with time set to noon UTC
      const today = new Date();
      today.setUTCHours(12, 0, 0, 0);
      paidDate = today;
    } else if (newStatus === 'defaulted') {
      // Defaulted calls have their outstanding amount written off
      newOutstanding = 0;
    }
    
    // Process the status update with potential side effects
    if (newStatus === 'paid') {
      // Get the allocation to update its status if needed
      const allocation = await storage.getFundAllocation(currentCall.allocationId);
      
      if (allocation) {
        // Check if this is the last unpaid call for this allocation
        const allCalls = await storage.getCapitalCallsByAllocation(allocation.id);
        const hasUnpaidCalls = allCalls.some(call => 
          call.id !== id && 
          call.status !== 'paid' && 
          call.status !== 'defaulted'
        );
        
        // If all calls are now paid or defaulted, update allocation status to funded
        if (!hasUnpaidCalls && allocation.status !== 'funded') {
          await storage.updateFundAllocation(allocation.id, {
            ...allocation,
            status: 'funded' as const
          });
        }
      }
    }
    
    // Update the capital call with all changes
    const updatedCall = await storage.updateCapitalCall(id, {
      ...currentCall,
      status: newStatus,
      paidAmount: newPaidAmount,
      outstanding_amount: newOutstanding,
      paidDate
    });
    
    return updatedCall || null;
  }

  /**
   * Update capital call dates with validation
   */
  async updateCapitalCallDates(id: number, callDate: Date, dueDate: Date): Promise<CapitalCall | null> {
    const storage = StorageFactory.getStorage();
    
    // Validate dates
    if (dueDate < callDate) {
      throw new Error('Due date must be after call date');
    }
    
    // Get current capital call to ensure it exists
    const currentCall = await storage.getCapitalCall(id);
    if (!currentCall) {
      throw new Error('Capital call not found');
    }
    
    // Only allow date changes for scheduled or called capital calls
    if (currentCall.status !== 'scheduled' && currentCall.status !== 'called') {
      throw new Error(`Cannot update dates for capital call with status '${currentCall.status}'`);
    }
    
    // Format dates properly for consistent handling
    // First get ISO strings and split to get just the date part (YYYY-MM-DD)
    const formattedCallDate = new Date(callDate).toISOString().split('T')[0];
    const formattedDueDate = new Date(dueDate).toISOString().split('T')[0];
    
    // Then convert back to Date objects for the storage interface
    const callDateObj = new Date(formattedCallDate);
    const dueDateObj = new Date(formattedDueDate);
    
    // Update the dates with properly formatted Date objects
    const updatedCall = await storage.updateCapitalCallDates(id, callDateObj, dueDateObj);
    return updatedCall || null;
  }

  /**
   * Get capital calls for the calendar view
   * Including additional information about the fund and allocation
   */
  async getCapitalCallsForCalendar(startDate: Date, endDate: Date): Promise<CapitalCallWithFundAllocation[]> {
    const storage = StorageFactory.getStorage();
    const capitalCalls = await storage.getAllCapitalCalls();
    
    if (!capitalCalls.length) {
      return [];
    }
    
    // Filter capital calls by date range
    const filteredCalls = capitalCalls.filter((call: CapitalCall) => {
      const callDate = new Date(call.callDate);
      return callDate >= startDate && callDate <= endDate;
    });
    
    if (!filteredCalls.length) {
      return [];
    }

    // Get all allocation IDs from capital calls
    const allocationIds = [...new Set(filteredCalls.map(call => call.allocationId))];
    
    // Fetch all allocations in a single batch
    const allocations = await Promise.all(
      allocationIds.map(id => storage.getFundAllocation(id))
    );
    
    // Create a lookup map for allocations
    const allocationMap = allocations.reduce((map, allocation) => {
      if (allocation) {
        map[allocation.id] = allocation;
      }
      return map;
    }, {} as Record<number, any>);
    
    // Get all deal IDs from allocations
    const dealIds = [...new Set(
      allocations
        .filter(a => a !== null)
        .map(a => a!.dealId)
    )];
    
    // Fetch all deals in a single batch
    const deals = await Promise.all(
      dealIds.map(id => storage.getDeal(id))
    );
    
    // Create a lookup map for deals
    const dealMap = deals.reduce((map, deal) => {
      if (deal) {
        map[deal.id] = deal;
      }
      return map;
    }, {} as Record<number, any>);
    
    // Get all fund IDs from allocations
    const fundIds = [...new Set(
      allocations
        .filter(a => a !== null)
        .map(a => a!.fundId)
    )];
    
    // Fetch all funds in a single batch
    const funds = await Promise.all(
      fundIds.map(id => storage.getFund(id))
    );
    
    // Create a lookup map for funds
    const fundMap = funds.reduce((map, fund) => {
      if (fund) {
        map[fund.id] = fund;
      }
      return map;
    }, {} as Record<number, any>);
    
    // Now enhance each capital call with fund and deal information
    const result = filteredCalls.map(call => {
      const allocation = allocationMap[call.allocationId];
      
      if (!allocation) {
        return {
          ...call,
          fund_name: 'Unknown Fund',
          deal_name: 'Unknown Deal',
          allocation_amount: 0,
          // Allow for client-side calculation by including both fields
          outstanding_amount: call.outstanding_amount || Math.max(0, call.callAmount - (call.paidAmount || 0)),
          dealId: 0,
          fundId: 0
        };
      }
      
      const deal = dealMap[allocation.dealId] || { name: 'Unknown Deal' };
      const fund = fundMap[allocation.fundId] || { name: 'Unknown Fund' };
      
      return {
        ...call,
        fund_name: fund.name || 'Unknown Fund',
        deal_name: deal.name || 'Unknown Deal',
        allocation_amount: allocation.amount || 0,
        // For client compatibility
        dealId: allocation.dealId,
        fundId: allocation.fundId,
        dealName: deal.name,
        fundName: fund.name,
        // Ensure outstanding amount is calculated if not available
        outstanding_amount: call.outstanding_amount || Math.max(0, call.callAmount - (call.paidAmount || 0))
      };
    });
    
    return result;
  }
}

export const capitalCallService = new CapitalCallService();