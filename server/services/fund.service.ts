import { StorageFactory } from "../storage-factory";
import { 
  InsertFund, 
  Fund,
  FundAllocation
} from "@shared/schema";
import { IStorage } from "../storage";

// Extended Fund interface with allocation stats
export interface FundWithAllocations extends Fund {
  committedCapital: number;
  totalFundSize: number;
  allocationCount: number;
}

/**
 * Helper function to get a fresh storage instance
 */
function getStorage(): IStorage {
  return StorageFactory.getStorage();
}

/**
 * Fund Service - Handles business logic for funds
 */
export class FundService {
  /**
   * Get all funds with allocation statistics
   */
  async getAllFundsWithAllocations(): Promise<FundWithAllocations[]> {
    const storage = getStorage();
    const funds = await storage.getFunds();
    
    // Get allocations for each fund
    const fundAllocations = await Promise.all(
      funds.map(async (fund: Fund) => {
        const allocations = await storage.getAllocationsByFund(fund.id);
        
        // Calculate statistics
        let committedCapital = 0;
        
        if (allocations && allocations.length > 0) {
          committedCapital = allocations.reduce((sum: number, allocation: FundAllocation) => {
            return sum + Number(allocation.amount || 0);
          }, 0);
        }
        
        return {
          ...fund,
          committedCapital,
          totalFundSize: fund.aum || 0,
          allocationCount: allocations.length
        };
      })
    );
    
    return fundAllocations;
  }

  /**
   * Get a specific fund with its allocations
   */
  async getFundWithAllocations(fundId: number): Promise<FundWithAllocations | null> {
    const storage = getStorage();
    const fund = await storage.getFund(fundId);
    
    if (!fund) {
      return null;
    }
    
    // Get allocations for this fund
    const allocations = await storage.getAllocationsByFund(fundId);
    
    // Calculate statistics
    let committedCapital = 0;
    
    if (allocations && allocations.length > 0) {
      committedCapital = allocations.reduce((sum: number, allocation: FundAllocation) => {
        return sum + Number(allocation.amount || 0);
      }, 0);
    }
    
    return {
      ...fund,
      committedCapital,
      totalFundSize: fund.aum || 0,
      allocationCount: allocations.length
    };
  }

  /**
   * Create a new fund
   */
  async createFund(fundData: InsertFund): Promise<Fund> {
    const storage = getStorage();
    
    // Set default values if not provided
    const completeData = {
      ...fundData,
      // Always initialize with aum=0 - this will only be calculated based on actual allocations
      aum: 0,
      vintage: fundData.vintage || new Date().getFullYear(),
      distributionRate: fundData.distributionRate || 0.3,
      appreciationRate: fundData.appreciationRate || 0.88,
      createdAt: new Date()
    };
    
    const fund = await storage.createFund(completeData);
    return fund;
  }

  /**
   * Update an existing fund
   */
  async updateFund(fundId: number, updateData: Partial<InsertFund>): Promise<Fund | null> {
    const storage = getStorage();
    
    // Make sure fund exists
    const fund = await storage.getFund(fundId);
    if (!fund) {
      return null;
    }
    
    const updatedFund = await storage.updateFund(fundId, updateData);
    return updatedFund || null;
  }

  /**
   * Delete a fund
   */
  async deleteFund(fundId: number): Promise<boolean> {
    const storage = getStorage();
    
    // Make sure fund exists
    const fund = await storage.getFund(fundId);
    if (!fund) {
      return false;
    }
    
    // Check if fund has allocations
    const allocations = await storage.getAllocationsByFund(fundId);
    if (allocations.length > 0) {
      throw new Error("Cannot delete fund with existing allocations");
    }
    
    const result = await storage.deleteFund(fundId);
    return result;
  }
}

export const fundService = new FundService();