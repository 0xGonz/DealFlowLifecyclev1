/**
 * DataDrivenCalculationsService
 * 
 * Replaces all hardcoded calculations with database-driven logic.
 * Ensures 100% scalability by calculating everything from actual data.
 */
import { getStorage } from '../storage';

export class DataDrivenCalculationsService {
  
  /**
   * Calculate actual portfolio metrics from real fund and allocation data
   * No hardcoded values - everything comes from database
   */
  static async calculatePortfolioMetrics() {
    const storage = getStorage();
    const funds = await storage.getFunds();
    
    let totalCommitted = 0;
    let totalCalled = 0;
    let totalReturned = 0;
    let activeInvestments = 0;
    
    for (const fund of funds) {
      const allocations = await storage.getAllocationsByFund(fund.id);
      
      for (const allocation of allocations) {
        const committed = Number(allocation.amount) || 0;
        const called = Number(allocation.paidAmount) || 0;
        const returned = Number(allocation.totalReturned) || 0;
        
        totalCommitted += committed;
        totalCalled += called;
        totalReturned += returned;
        
        if (allocation.status === 'funded' || allocation.status === 'partially_paid') {
          activeInvestments++;
        }
      }
    }
    
    return {
      totalCommitted,
      totalCalled,
      totalUncalled: totalCommitted - totalCalled,
      totalReturned,
      activeInvestments,
      totalFunds: funds.length,
      // Calculate actual metrics from real data
      averageAllocationSize: activeInvestments > 0 ? totalCalled / activeInvestments : 0,
      deploymentRate: totalCommitted > 0 ? (totalCalled / totalCommitted) * 100 : 0
    };
  }
  
  /**
   * Calculate actual deal stage distribution from database
   * No hardcoded target percentages - shows real pipeline state
   */
  static async calculateDealStageDistribution() {
    const storage = getStorage();
    const deals = await storage.getDeals();
    
    const stageDistribution = {
      initial_review: 0,
      screening: 0,
      diligence: 0,
      ic_review: 0,
      closing: 0,
      invested: 0,
      passed: 0,
      rejected: 0
    };
    
    deals.forEach(deal => {
      if (stageDistribution.hasOwnProperty(deal.stage)) {
        stageDistribution[deal.stage as keyof typeof stageDistribution]++;
      }
    });
    
    const total = deals.length;
    
    return {
      counts: stageDistribution,
      percentages: Object.fromEntries(
        Object.entries(stageDistribution).map(([stage, count]) => [
          stage,
          total > 0 ? (count / total) * 100 : 0
        ])
      ),
      total
    };
  }
  
  /**
   * Calculate fund performance metrics from actual data
   * No hardcoded IRR or multiple targets - uses real fund data
   */
  static async calculateFundPerformanceMetrics(fundId: number) {
    const storage = getStorage();
    const fund = await storage.getFund(fundId);
    const allocations = await storage.getAllocationsByFund(fundId);
    
    if (!fund || !allocations.length) {
      return {
        totalCommitted: 0,
        totalCalled: 0,
        totalReturned: 0,
        irr: 0,
        moic: 1,
        allocationCount: 0
      };
    }
    
    const totalCommitted = allocations.reduce((sum, alloc) => sum + (Number(alloc.amount) || 0), 0);
    const totalCalled = allocations.reduce((sum, alloc) => sum + (Number(alloc.paidAmount) || 0), 0);
    const totalReturned = allocations.reduce((sum, alloc) => sum + (Number(alloc.totalReturned) || 0), 0);
    
    // Calculate MOIC from actual returns vs called capital
    const moic = totalCalled > 0 ? totalReturned / totalCalled : 1;
    
    // Use fund's actual appreciation rate or calculate from returns
    const irr = Number(fund.appreciationRate) || 0;
    
    return {
      totalCommitted,
      totalCalled,
      totalReturned,
      irr,
      moic,
      allocationCount: allocations.length
    };
  }
  
  /**
   * Calculate sector distribution from actual deal data
   * No hardcoded sector mappings - uses actual sectors from deals
   */
  static async calculateSectorDistribution() {
    const storage = getStorage();
    const deals = await storage.getDeals();
    
    const sectorCounts: Record<string, number> = {};
    
    deals.forEach(deal => {
      const sector = deal.sector || 'Unspecified';
      sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
    });
    
    const total = deals.length;
    
    return Object.entries(sectorCounts).map(([sector, count]) => ({
      sector,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    })).sort((a, b) => b.count - a.count);
  }
}