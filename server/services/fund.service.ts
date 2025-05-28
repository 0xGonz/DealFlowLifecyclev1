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
  allocations?: FundAllocation[]; // Optional allocations with enriched data
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
    
    // Calculate called capital as the sum of all ACTUALLY PAID amounts
    // This should be paid_amount for paid calls, and paid_amount for partial calls
    const result = await db.execute(`
      WITH funded_allocations AS (
        SELECT 
          id, amount
        FROM fund_allocations
        WHERE fund_id = ${fundId} AND status = 'funded'
      ),
      all_payments AS (
        SELECT 
          SUM(COALESCE(cc.paid_amount, 0)) as total_paid
        FROM capital_calls cc
        JOIN fund_allocations fa ON cc.allocation_id = fa.id
        WHERE fa.fund_id = ${fundId} 
          AND fa.status IN ('funded', 'partially_paid')
          AND cc.status IN ('paid', 'partial', 'partially_paid')
      )
      SELECT 
        COALESCE(ap.total_paid, 0) as called_capital
      FROM all_payments ap
    `);
    
    // Extract and return the called capital, defaulting to 0 if null
    const calledCapital = result.rows[0]?.called_capital || 0;
    return Number(calledCapital);
  }
  
  /**
   * Calculate the uncalled capital for a fund
   * Uncalled capital = Total commitments - Called capital
   * This represents money committed but not yet called/paid
   */
  async calculateUncalledCapital(fundId: number): Promise<number> {
    const storage = getStorage();
    
    // Get total committed capital (all allocations except written_off)
    const allocations = await storage.getAllocationsByFund(fundId);
    const totalCommitments = allocations
      .filter(a => a.status !== 'written_off')
      .reduce((sum, a) => sum + a.amount, 0);
    
    // Get called capital (actual payments made)
    const calledCapital = await this.calculateCalledCapital(fundId);
    
    // Uncalled = Commitments - Called
    const uncalledCapital = totalCommitments - calledCapital;
    
    return Math.max(0, uncalledCapital); // Ensure non-negative
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
        try {
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
          
          // Update the fund's AUM to match called capital
          await this.updateFundAUM(fund.id);
          
          return {
            ...fund,
            committedCapital,
            totalFundSize: fund.aum || 0,
            allocationCount: allocations.length,
            calledCapital,
            uncalledCapital
          };
        } catch (error) {
          console.error(`Error calculating statistics for fund ${fund.id}:`, error);
          // Return fund with default values in case of error
          return {
            ...fund,
            committedCapital: 0,
            totalFundSize: fund.aum || 0,
            allocationCount: 0,
            calledCapital: 0,
            uncalledCapital: 0
          };
        }
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
    
    // Get allocations for this fund with deal names and sectors
    let allocations = await storage.getAllocationsByFund(fundId);
    
    // Enrich allocations with deal information for better asset-side identification
    if (allocations && allocations.length > 0) {
      const enrichedAllocations = await Promise.all(
        allocations.map(async (allocation: FundAllocation) => {
          try {
            if (allocation.dealId) {
              const deal = await storage.getDeal(allocation.dealId);
              if (deal) {
                return {
                  ...allocation,
                  dealName: deal.name || 'Unknown Deal',
                  dealSector: deal.sector || ''
                };
              }
            }
            return allocation;
          } catch (error) {
            console.warn(`Could not fetch deal info for allocation ${allocation.id}, dealId: ${allocation.dealId}`);
            return allocation;
          }
        })
      );
      allocations = enrichedAllocations;
    }
    
    // Calculate committed capital based on all allocations
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
      totalFundSize: committedCapital || 0,  // Use committed capital as total fund size
      allocationCount: allocations.length,
      calledCapital,     // Include the calculated called capital
      uncalledCapital,   // Include the calculated uncalled capital
      allocations        // Include enriched allocations for UI display
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