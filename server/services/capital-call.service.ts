import { StorageFactory } from '../storage-factory';
import { 
  CapitalCall, 
  InsertCapitalCall
} from '@shared/schema';

// Define the extended capital call type with fund and deal information
interface CapitalCallWithFundAllocation extends CapitalCall {
  fund_name: string;
  deal_name: string;
  allocation_amount: number;
}

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
   * Update a capital call status
   */
  async updateCapitalCallStatus(id: number, status: CapitalCall['status'], paidAmount?: number): Promise<CapitalCall | null> {
    const storage = StorageFactory.getStorage();
    const updatedCall = await storage.updateCapitalCallStatus(id, status, paidAmount);
    return updatedCall || null;
  }

  /**
   * Update capital call dates
   */
  async updateCapitalCallDates(id: number, callDate: Date, dueDate: Date): Promise<CapitalCall | null> {
    const storage = StorageFactory.getStorage();
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