import { StorageFactory } from '../storage-factory';
import { db } from '../db';
import { 
  CapitalCall, 
  InsertCapitalCall,
  FundAllocation
} from '@shared/schema';
import { addMonths, addQuarters, addYears } from 'date-fns';

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
  'scheduled': ['called', 'overdue', 'defaulted'],
  'called': ['partial', 'paid', 'overdue', 'defaulted'],
  'partial': ['paid', 'overdue', 'defaulted'],
  'overdue': ['paid', 'defaulted', 'partial'],
  'paid': [], // Terminal state
  'defaulted': [] // Terminal state
};

/**
 * Service for capital call related operations
 */
export class CapitalCallService {
  /**
   * Create a new capital call
   */
  async createCapitalCall(capitalCall: InsertCapitalCall): Promise<CapitalCall> {
    const storage = StorageFactory.getStorage();
    return await storage.createCapitalCall(capitalCall);
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
    callPercentage: number
  ): Promise<CapitalCall[]> {
    const storage = StorageFactory.getStorage();
    const calls: CapitalCall[] = [];
    
    // If it's a single payment, create a paid capital call immediately
    if (capitalCallSchedule === 'single') {
      const callAmount = allocation.amount;
      const singleCall = await storage.createCapitalCall({
        allocationId: allocation.id,
        callAmount: callAmount,
        amountType: allocation.amountType,
        callDate: new Date(), // Current date
        dueDate: new Date(), // Current date
        status: 'paid',
        paidAmount: callAmount, // Fully paid
        paidDate: new Date(),
        outstanding: 0, // Nothing left to pay
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
        callDate = new Date(firstCallDate);
      } else {
        switch (callFrequency) {
          case 'monthly':
            callDate = addMonths(new Date(firstCallDate), i);
            break;
          case 'quarterly':
            callDate = addQuarters(new Date(firstCallDate), i);
            break;
          case 'biannual':
            callDate = addMonths(new Date(firstCallDate), i * 6);
            break;
          case 'annual':
            callDate = addYears(new Date(firstCallDate), i);
            break;
          default:
            callDate = addMonths(new Date(firstCallDate), i);
        }
      }
      
      // Calculate due date (30 days after call date)
      const dueDate = new Date(callDate);
      dueDate.setDate(dueDate.getDate() + 30);
      
      // For the last call, use remaining percentage to ensure we reach 100%
      const isLastCall = i === callCount - 1;
      const thisCallPercentage = isLastCall ? remainingPercentage : callPercentage;
      
      // Calculate call amount based on percentage
      let callAmount: number;
      if (allocation.amountType === 'dollar') {
        callAmount = (baseAmount * thisCallPercentage) / 100;
      } else {
        callAmount = thisCallPercentage; // For percentage allocations, use the percentage directly
      }
      
      // Create capital call
      const call = await storage.createCapitalCall({
        allocationId: allocation.id,
        callAmount,
        amountType: allocation.amountType,
        callDate,
        dueDate,
        status: 'scheduled',
        paidAmount: 0, // Initially nothing paid
        outstanding: callAmount, // Full amount outstanding
        notes: `Scheduled payment ${i + 1} of ${callCount}`
      });
      
      calls.push(call);
      remainingPercentage -= thisCallPercentage;
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
    
    // Create payment record
    await storage.createCapitalCallPayment({
      capitalCallId,
      paymentAmount,
      paymentDate,
      paymentType,
      notes,
      createdBy
    });
    
    // Calculate new outstanding amount
    const newPaidAmount = (currentCall.paidAmount || 0) + paymentAmount;
    const newOutstanding = Math.max(0, currentCall.callAmount - newPaidAmount);
    
    // Update the outstanding amount in the database
    await storage.updateCapitalCall(capitalCallId, { 
      outstanding: newOutstanding,
      paidAmount: newPaidAmount
    });
    
    // Determine new status based on payment amount
    let newStatus: CapitalCall['status'] = currentCall.status;
    
    if (newOutstanding === 0) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0 && newOutstanding > 0) {
      newStatus = 'partial';
    }
    
    // Update capital call with new paid amount and status
    const updatedCall = await storage.updateCapitalCall(capitalCallId, {
      ...currentCall,
      paidAmount: newPaidAmount,
      outstanding: newOutstanding,
      status: newStatus,
      paidDate: paymentDate // Update to the latest payment date
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
    
    return updatedCall || null;
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
    let newOutstanding = currentCall.outstanding;
    let paidDate = currentCall.paidDate;
    
    // Handle payment-related status changes
    if (newStatus === 'paid' && paidAmount) {
      newPaidAmount = paidAmount;
      newOutstanding = 0;
      paidDate = new Date();
    } else if (newStatus === 'partial' && paidAmount) {
      // Additional validations for partial payments
      if (!paidAmount || paidAmount >= currentCall.callAmount) {
        throw new Error('Partial payment amount must be greater than 0 and less than the call amount');
      }
      
      newPaidAmount = paidAmount;
      newOutstanding = currentCall.callAmount - paidAmount;
      paidDate = new Date();
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
      outstanding: newOutstanding,
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
    
    // Update the dates
    const updatedCall = await storage.updateCapitalCallDates(id, callDate, dueDate);
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
          outstanding: call.outstanding || Math.max(0, call.callAmount - (call.paidAmount || 0)),
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
        outstanding: call.outstanding || Math.max(0, call.callAmount - (call.paidAmount || 0))
      };
    });
    
    return result;
  }
}

export const capitalCallService = new CapitalCallService();