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
  'scheduled': ['called', 'defaulted'],
  'called': ['partial', 'paid', 'defaulted'],
  'partial': ['paid', 'defaulted'],
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
      const singleCall = await storage.createCapitalCall({
        allocationId: allocation.id,
        callAmount: allocation.amount,
        amountType: allocation.amountType,
        callDate: new Date(), // Current date
        dueDate: new Date(), // Current date
        status: 'paid',
        paidAmount: allocation.amount,
        paidDate: new Date(),
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
    
    // Additional validations
    if (newStatus === 'paid' && !paidAmount) {
      throw new Error('Paid amount is required when marking a capital call as paid');
    }
    
    if (newStatus === 'partial' && (!paidAmount || paidAmount >= currentCall.callAmount)) {
      throw new Error('Partial payment amount must be greater than 0 and less than the call amount');
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
    
    // Update the capital call status
    const updatedCall = await storage.updateCapitalCallStatus(id, newStatus, paidAmount);
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
    
    // Filter capital calls by date range
    const filteredCalls = capitalCalls.filter((call: CapitalCall) => {
      const callDate = new Date(call.callDate);
      return callDate >= startDate && callDate <= endDate;
    });

    // Get detailed information for each capital call
    const result: CapitalCallWithFundAllocation[] = [];
    
    for (const call of filteredCalls) {
      // Get allocation details
      const allocation = await storage.getFundAllocation(call.allocationId);
      if (!allocation) continue;
      
      // Get fund details
      const fund = await storage.getFund(allocation.fundId);
      if (!fund) continue;
      
      // Get deal details
      const deal = await storage.getDeal(allocation.dealId);
      if (!deal) continue;
      
      result.push({
        ...call,
        fund_name: fund.name,
        deal_name: deal.name,
        allocation_amount: allocation.amount
      });
    }
    
    return result;
  }
}

export const capitalCallService = new CapitalCallService();