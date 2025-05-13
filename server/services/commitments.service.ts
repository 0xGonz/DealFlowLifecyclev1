import { StorageFactory } from '../storage-factory';
import { db } from '../db';
import { 
  FundAllocation, 
  InsertFundAllocation, 
  CapitalCall, 
  InsertCapitalCall, 
  insertCapitalCallSchema,
  CapitalCallPayment, 
  InsertCapitalCallPayment,
  capitalCalls,
  capitalCallPayments,
  fundAllocations,
  Deal
} from '@shared/schema';
import { and, eq, sum, sql } from 'drizzle-orm';

/**
 * CommitmentsService
 * 
 * A service to handle fund commitment logic including:
 * - Tracking commitment amounts
 * - Creating and scheduling capital calls
 * - Processing payments against capital calls
 * - Calculating called/uncalled percentages
 * 
 * This service ensures that no business logic related to capital calculations
 * is duplicated across the application and that all calculations are consistent.
 */
export class CommitmentsService {
  /**
   * Create commitment
   * @param fundId - The ID of the fund
   * @param dealId - The ID of the deal
   * @param amount - The total commitment amount
   * @param amountType - Whether the amount is specified in percentage or dollars
   * @param securityType - The type of security
   * @param allocationDate - The date of the allocation
   * @param notes - Any additional notes
   * @returns The created fund allocation
   */
  async createCommitment(
    fundId: number,
    dealId: number,
    amount: number,
    amountType: 'percentage' | 'dollar' = 'dollar',
    securityType: string,
    allocationDate: Date = new Date(),
    notes?: string
  ): Promise<FundAllocation> {
    const storage = StorageFactory.getStorage();
    
    const allocation: InsertFundAllocation = {
      fundId,
      dealId,
      amount,
      amountType,
      securityType,
      allocationDate,
      notes: notes || '',
      status: 'committed', // Start in committed status
      portfolioWeight: 0,   // Will be calculated later
      interestPaid: 0,
      distributionPaid: 0,
      totalReturned: 0,
      marketValue: 0,
      moic: 1,
      irr: 0
    };
    
    return await storage.createFundAllocation(allocation);
  }
  
  /**
   * Create capital calls for a commitment
   * @param allocationId - The ID of the fund allocation
   * @param calls - Array of capital call data (amount and due date)
   * @returns Array of created capital calls
   */
  async createCapitalCalls(
    allocationId: number, 
    calls: Array<{callAmount: number, dueDate: Date, notes?: string, amountType?: 'percentage' | 'dollar'}>
  ): Promise<CapitalCall[]> {
    if (!calls || calls.length === 0) {
      throw new Error('At least one capital call must be specified');
    }
    
    // Get the allocation to verify the commitment exists and check total amount
    const storage = StorageFactory.getStorage();
    const allocation = await storage.getFundAllocation(allocationId);
    
    if (!allocation) {
      throw new Error(`Fund allocation with ID ${allocationId} not found`);
    }
    
    // Calculate the total amount being called
    const totalCallAmount = calls.reduce((sum, call) => {
      // If percentage, convert to dollar amount
      if (call.amountType === 'percentage') {
        return sum + (allocation.amount * (call.callAmount / 100));
      }
      return sum + call.callAmount;
    }, 0);
    
    // Ensure total call amount doesn't exceed commitment
    if (totalCallAmount > allocation.amount) {
      throw new Error(`Total call amount (${totalCallAmount}) exceeds commitment amount (${allocation.amount})`);
    }
    
    // Create all capital calls in a transaction
    if (db) {
      // Use transaction if database is available
      const createdCalls: CapitalCall[] = [];
      
      await db.transaction(async (tx) => {
        for (const call of calls) {
          // Calculate amount and percentage
          let callAmount = call.callAmount;
          let callPct: number | null = null;
          
          if (call.amountType === 'percentage') {
            callPct = call.callAmount;
            callAmount = allocation.amount * (callPct / 100);
          } else {
            // Calculate the percentage this call represents of the total commitment
            callPct = (callAmount / allocation.amount) * 100;
          }
          
          const capitalCall: InsertCapitalCall = {
            allocationId,
            callAmount,
            amountType: call.amountType || 'dollar',
            callDate: new Date(),
            dueDate: call.dueDate,
            paidAmount: 0,
            outstanding: callAmount,
            status: 'scheduled',
            notes: call.notes || '',
            callPct
          };
          
          // Validate the capital call with Zod schema
          const validatedCall = insertCapitalCallSchema.parse(capitalCall);
          
          // Insert the capital call
          const [createdCall] = await tx
            .insert(capitalCalls)
            .values(validatedCall)
            .returning();
            
          createdCalls.push(createdCall);
        }
      });
      
      return createdCalls;
    } else {
      // Fall back to non-transactional approach
      const createdCalls: CapitalCall[] = [];
      
      for (const call of calls) {
        // Calculate amount and percentage
        let callAmount = call.callAmount;
        let callPct: number | null = null;
        
        if (call.amountType === 'percentage') {
          callPct = call.callAmount;
          callAmount = allocation.amount * (callPct / 100);
        } else {
          // Calculate the percentage this call represents of the total commitment
          callPct = (callAmount / allocation.amount) * 100;
        }
        
        const capitalCall: InsertCapitalCall = {
          allocationId,
          callAmount,
          amountType: call.amountType || 'dollar',
          callDate: new Date(),
          dueDate: call.dueDate,
          paidAmount: 0,
          outstanding: callAmount,
          status: 'scheduled',
          notes: call.notes || '',
          callPct
        };
        
        const createdCall = await storage.createCapitalCall(capitalCall);
        createdCalls.push(createdCall);
      }
      
      return createdCalls;
    }
  }
  
  /**
   * Process a payment for a capital call
   * @param capitalCallId - ID of the capital call
   * @param paymentAmount - Amount of the payment
   * @param paymentDate - Date of the payment
   * @param paymentType - Type of payment (wire, check, etc.)
   * @param createdBy - User ID who created the payment
   * @param notes - Additional notes
   * @returns The updated capital call with new status
   */
  async processPayment(
    capitalCallId: number,
    paymentAmount: number,
    paymentDate: Date = new Date(),
    paymentType: 'wire' | 'check' | 'ach' | 'other' = 'wire',
    createdBy: number,
    notes?: string
  ): Promise<{payment: CapitalCallPayment, updatedCall: CapitalCall}> {
    const storage = StorageFactory.getStorage();
    
    // Get the capital call
    const capitalCall = await storage.getCapitalCall(capitalCallId);
    if (!capitalCall) {
      throw new Error(`Capital call with ID ${capitalCallId} not found`);
    }
    
    // Check if payment amount is valid
    if (paymentAmount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }
    
    // Calculate new paid amount and outstanding
    const newPaidAmount = (capitalCall.paidAmount || 0) + paymentAmount;
    const newOutstanding = capitalCall.callAmount - newPaidAmount;
    
    // Ensure payment doesn't exceed call amount
    if (newPaidAmount > capitalCall.callAmount) {
      throw new Error(`Payment would exceed call amount: ${newPaidAmount} > ${capitalCall.callAmount}`);
    }
    
    // Determine new status
    let newStatus: CapitalCall['status'] = capitalCall.status;
    if (newPaidAmount === capitalCall.callAmount) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0 && newPaidAmount < capitalCall.callAmount) {
      newStatus = 'partial';
    }
    
    // Create the payment record
    const payment: InsertCapitalCallPayment = {
      capitalCallId,
      paymentAmount,
      paymentDate,
      paymentType,
      notes: notes || '',
      createdBy
    };
    
    const createdPayment = await storage.createCapitalCallPayment(payment);
    
    // Update the capital call with new payment information
    const updatedCall = await storage.updateCapitalCall(capitalCallId, {
      paidAmount: newPaidAmount,
      outstanding: newOutstanding,
      status: newStatus,
      paidDate: paymentDate
    });
    
    if (!updatedCall) {
      throw new Error(`Failed to update capital call with ID ${capitalCallId}`);
    }
    
    // Also update the allocation status if needed
    await this.updateAllocationStatusBasedOnCalls(capitalCall.allocationId);
    
    return { payment: createdPayment, updatedCall };
  }
  
  /**
   * Get commitment statistics for a fund allocation
   * @param allocationId - The ID of the fund allocation
   * @returns Statistics including total commitment, called amount, called percentage, etc.
   */
  async getCommitmentStats(allocationId: number): Promise<{
    totalCommitment: number;
    calledAmount: number;
    calledPercentage: number;
    uncalledAmount: number;
    uncalledPercentage: number;
    paidAmount: number;
    paidPercentage: number;
    outstandingAmount: number;
    outstandingPercentage: number;
  }> {
    const storage = StorageFactory.getStorage();
    
    // Get the allocation
    const allocation = await storage.getFundAllocation(allocationId);
    if (!allocation) {
      throw new Error(`Fund allocation with ID ${allocationId} not found`);
    }
    
    // Get all capital calls for this allocation
    const calls = await storage.getCapitalCallsByAllocation(allocationId);
    
    // Calculate statistics
    const totalCommitment = allocation.amount;
    
    // The amount that has been "called" is the sum of all capital calls
    const calledAmount = calls.reduce((sum, call) => sum + call.callAmount, 0);
    
    // The amount actually paid is the sum of paid amounts across all calls
    const paidAmount = calls.reduce((sum, call) => sum + (call.paidAmount || 0), 0);
    
    // The outstanding amount is what has been called but not yet paid
    const outstandingAmount = calledAmount - paidAmount;
    
    // The uncalled amount is the total commitment minus what has been called
    const uncalledAmount = totalCommitment - calledAmount;
    
    // Convert amounts to percentages
    const calledPercentage = totalCommitment > 0 ? (calledAmount / totalCommitment) * 100 : 0;
    const uncalledPercentage = totalCommitment > 0 ? (uncalledAmount / totalCommitment) * 100 : 0;
    const paidPercentage = totalCommitment > 0 ? (paidAmount / totalCommitment) * 100 : 0;
    const outstandingPercentage = totalCommitment > 0 ? (outstandingAmount / totalCommitment) * 100 : 0;
    
    return {
      totalCommitment,
      calledAmount,
      calledPercentage,
      uncalledAmount,
      uncalledPercentage,
      paidAmount,
      paidPercentage,
      outstandingAmount,
      outstandingPercentage
    };
  }
  
  /**
   * Get aggregated statistics for a fund
   * @param fundId - The ID of the fund
   * @returns Fund-level statistics for called/uncalled capital
   */
  async getFundCommitmentStats(fundId: number): Promise<{
    totalCommitment: number;
    calledAmount: number;
    calledPercentage: number;
    uncalledAmount: number;
    uncalledPercentage: number;
    allocationStats: Array<{
      allocationId: number;
      dealId: number;
      dealName: string;
      totalCommitment: number;
      calledAmount: number;
      calledPercentage: number;
      uncalledAmount: number;
    }>;
  }> {
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const storage = StorageFactory.getStorage();
    
    // Get all allocations for this fund using direct fund-specific method
    const allocations = await storage.getAllocationsByFund(fundId);
    
    // Get all deals to get names
    const deals = await storage.getDeals();
    const dealMap = new Map<number, any>();
    
    // Create a map of deal IDs to deal objects for quick lookups
    deals.forEach(deal => {
      dealMap.set(deal.id, deal);
    });
    
    const allocationStats = [];
    let totalCommitment = 0;
    let totalCalledAmount = 0;
    
    // Calculate stats for each allocation
    for (const allocation of allocations) {
      const stats = await this.getCommitmentStats(allocation.id);
      
      const deal = dealMap.get(allocation.dealId);
      const dealName = deal ? deal.name : 'Unknown Deal';
      
      allocationStats.push({
        allocationId: allocation.id,
        dealId: allocation.dealId,
        dealName,
        totalCommitment: stats.totalCommitment,
        calledAmount: stats.calledAmount,
        calledPercentage: stats.calledPercentage,
        uncalledAmount: stats.uncalledAmount
      });
      
      totalCommitment += stats.totalCommitment;
      totalCalledAmount += stats.calledAmount;
    }
    
    // Calculate fund-level percentages
    const calledPercentage = totalCommitment > 0 ? (totalCalledAmount / totalCommitment) * 100 : 0;
    const uncalledAmount = totalCommitment - totalCalledAmount;
    const uncalledPercentage = totalCommitment > 0 ? (uncalledAmount / totalCommitment) * 100 : 0;
    
    return {
      totalCommitment,
      calledAmount: totalCalledAmount,
      calledPercentage,
      uncalledAmount,
      uncalledPercentage,
      allocationStats
    };
  }
  
  /**
   * Update the status of a fund allocation based on its capital calls
   * If all calls are paid, the allocation becomes 'funded'
   * If no calls exist or none are paid, it stays 'committed'
   * If some calls are paid, it's 'partial'
   * @param allocationId - The ID of the fund allocation
   */
  private async updateAllocationStatusBasedOnCalls(allocationId: number): Promise<void> {
    const storage = StorageFactory.getStorage();
    
    // Get all capital calls for this allocation
    const calls = await storage.getCapitalCallsByAllocation(allocationId);
    
    // If no calls, leave status as is
    if (!calls || calls.length === 0) {
      return;
    }
    
    // Determine if all calls are paid
    const allPaid = calls.every(call => call.status === 'paid');
    const somePaid = calls.some(call => call.status === 'paid' || call.status === 'partial');
    
    let newStatus: FundAllocation['status'];
    
    if (allPaid) {
      newStatus = 'funded';
    } else if (somePaid) {
      newStatus = 'partial';
    } else {
      newStatus = 'committed';
    }
    
    // Get the allocation
    const allocation = await storage.getFundAllocation(allocationId);
    if (!allocation || allocation.status === newStatus) {
      return; // No update needed
    }
    
    // Update the allocation status
    await storage.updateFundAllocation(allocationId, { status: newStatus });
  }
}

export const commitmentsService = new CommitmentsService();