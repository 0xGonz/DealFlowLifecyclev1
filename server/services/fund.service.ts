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
  calledCapital: number;
  uncalledCapital: number;
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
   * Calculate the called capital for a fund based on actual payment records
   * This is the sum of all payments made against capital calls for the fund's allocations
   */
  async calculateCalledCapital(fundId: number): Promise<number> {
    const storage = getStorage();
    const db = storage.getDbClient();
    
    // Use SQL query to join allocations, capital calls, and payments
    // This ensures we're calculating based on actual payment records
    // and only counts payments for allocations that are marked as funded
    const result = await db.execute(`
      SELECT SUM(p.amount_usd) as called_capital
      FROM fund_allocations fa
      JOIN capital_calls cc ON fa.id = cc.allocation_id
      JOIN payments p ON cc.id = p.capital_call_id
      WHERE fa.fund_id = ${fundId} AND fa.status = 'funded'
    `);
    
    // Extract and return the called capital, defaulting to 0 if null
    const calledCapital = result.rows[0]?.called_capital || 0;
    return Number(calledCapital);
  }
  
  /**
   * Calculate the uncalled capital for a fund based on capital calls and payment records
   * This is the sum of all capital call amounts minus the sum of payments
   */
  async calculateUncalledCapital(fundId: number): Promise<number> {
    const storage = getStorage();
    const db = storage.getDbClient();
    
    // Query to calculate uncalled capital based on capital calls that aren't fully paid
    // This implementation fixes the issue with funded allocations showing as uncalled
    const result = await db.execute(`
      WITH committed_capital AS (
        SELECT 
          SUM(fa.amount) as total_committed
        FROM fund_allocations fa
        WHERE fa.fund_id = ${fundId} AND fa.status != 'written_off' AND fa.status != 'funded'
      ),
      outstanding_calls AS (
        SELECT 
          SUM(cc.outstanding) as total_outstanding
        FROM fund_allocations fa
        JOIN capital_calls cc ON fa.id = cc.allocation_id
        WHERE fa.fund_id = ${fundId} AND cc.status != 'paid' AND cc.status != 'defaulted'
      )
      SELECT 
        COALESCE(c.total_committed, 0) as uncalled_capital
      FROM committed_capital c
    `);
    
    // Extract and return the uncalled capital, defaulting to 0 if null
    const uncalledCapital = result.rows[0]?.uncalled_capital || 0;
    return Math.max(0, Number(uncalledCapital)); // Ensure non-negative 
  }
  
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
        
        // Calculate statistics based on actual payments
        let committedCapital = 0;
        
        if (allocations && allocations.length > 0) {
          committedCapital = allocations.reduce((sum: number, allocation: FundAllocation) => {
            return sum + Number(allocation.amount || 0);
          }, 0);
        }
        
        // Calculate called and uncalled capital using payment data
        const calledCapital = await this.calculateCalledCapital(fund.id);
        const uncalledCapital = await this.calculateUncalledCapital(fund.id);
        
        return {
          ...fund,
          committedCapital,
          totalFundSize: fund.aum || 0,
          allocationCount: allocations.length,
          calledCapital,
          uncalledCapital
        };
      })
    );
    
    return fundAllocations;
  }

  /**
   * Calculate Fund AUM from fund allocations
   * This centralized method ensures consistent AUM calculation based on payments
   */
  async calculateFundAUM(fundId: number): Promise<number> {
    // Use called capital as the AUM since it represents actual money invested
    const calledCapital = await this.calculateCalledCapital(fundId);
    return calledCapital;
  }
  
  /**
   * Update a fund's AUM in the database
   */
  async updateFundAUM(fundId: number): Promise<boolean> {
    try {
      const storage = getStorage();
      const fund = await storage.getFund(fundId);
      
      if (!fund) {
        return false;
      }
      
      // Calculate the new AUM
      const aum = await this.calculateFundAUM(fundId);
      
      // Update the fund with the new AUM
      await storage.updateFund(fundId, { aum });
      
      return true;
    } catch (error) {
      console.error('Error updating fund AUM:', error);
      return false;
    }
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
    
    // Calculate statistics based on actual payments
    let committedCapital = 0;
    
    if (allocations && allocations.length > 0) {
      committedCapital = allocations.reduce((sum: number, allocation: FundAllocation) => {
        return sum + Number(allocation.amount || 0);
      }, 0);
    }
    
    // Get called and uncalled capital based on actual payment data
    // This is more accurate than using allocation status
    const calledCapital = await this.calculateCalledCapital(fundId);
    const uncalledCapital = await this.calculateUncalledCapital(fundId);
    
    // Recalculate AUM based on actual payments - AUM should equal called capital
    const aum = calledCapital;
    
    // Update fund's AUM if it's different to maintain consistency
    if (fund.aum !== aum) {
      await storage.updateFund(fundId, { aum });
      console.log(`Updated fund ${fundId} AUM from ${fund.aum} to ${aum}`);
    }
    
    return {
      ...fund,
      committedCapital,
      totalFundSize: aum,  // Use the fresh calculation
      allocationCount: allocations.length,
      calledCapital,     // Include the calculated called capital
      uncalledCapital    // Include the calculated uncalled capital
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