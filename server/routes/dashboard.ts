import { Router, Request, Response } from "express";
import { StorageFactory } from "../storage-factory";

const router = Router();

// Get dashboard stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    console.log('Dashboard stats: Getting storage instance');
    const storage = StorageFactory.getStorage();
    console.log('Dashboard stats: Fetching deals');
    const deals = await storage.getDeals();
    console.log(`Dashboard stats: Retrieved ${deals ? deals.length : 0} deals`);
    console.log('Dashboard stats: Fetching funds');
    const funds = await storage.getFunds();
    console.log(`Dashboard stats: Retrieved ${funds ? funds.length : 0} funds`);
    
    // Calculate dashboard stats
    const totalDeals = deals ? deals.length : 0;
    const activeDeals = deals ? deals.filter(deal => deal.stage !== 'closed' && deal.stage !== 'rejected').length : 0;
    const activePipelinePercent = totalDeals > 0 ? Math.round((activeDeals / totalDeals) * 100) : 0;
    const newDeals = deals ? deals.filter(deal => ['initial_review', 'screening'].includes(deal.stage)).length : 0;
    const newDealsPercent = totalDeals > 0 ? Math.round((newDeals / totalDeals) * 100) : 0;
    const inIcReview = deals ? deals.filter(deal => deal.stage === 'ic_review').length : 0;
    const icReviewPercent = totalDeals > 0 ? Math.round((inIcReview / totalDeals) * 100) : 0;
    
    // Calculate investment rate - deals that are in 'invested' stage compared to total deals
    const investedDeals = deals ? deals.filter(deal => deal.stage === 'invested').length : 0;
    const investmentRate = totalDeals > 0 ? Math.round((investedDeals / totalDeals) * 100) : 0;
    
    // Calculate total AUM
    const totalAum = funds ? funds.reduce((sum, fund) => sum + (fund.aum || 0), 0) : 0;
    
    // Calculate trends based on real data patterns
    // Simulate historical data comparison by creating relative change values
    // In a real app, we would compare with data from previous periods (week/month)
    // For now, we'll create data-driven trends based on proportions in the pipeline
    
    // Get total deals in late stages (diligence and beyond) as a baseline
    const lateStageDeals = deals ? deals.filter(deal => 
      ['diligence', 'ic_review', 'closing', 'closed', 'invested'].includes(deal.stage)).length : 0;
    const earlyStageDeals = totalDeals - lateStageDeals;
    
    // Define baseline constants for trend calculations
    const BASELINE_TOTAL_DEALS = 5;
    const BASELINE_ACTIVE_PIPELINE_PERCENT = 75;
    const BASELINE_NEW_DEALS_PERCENT = 40;
    const BASELINE_IC_REVIEW_PERCENT = 25;
    const BASELINE_INVESTMENT_RATE = 30;
    const BASELINE_AUM_PER_DEAL_MILLIONS = 10;
    
    // Calculate trends as relative change metrics (not just percentages but change indicators)
    const totalDealsTrend = totalDeals > BASELINE_TOTAL_DEALS ? 
      Math.round((totalDeals / BASELINE_TOTAL_DEALS - 1) * 100) : 10;
    const activePipelineTrend = totalDeals > 0 ? 
      Math.round((activeDeals / totalDeals) * 100) - BASELINE_ACTIVE_PIPELINE_PERCENT : 0;
    const newDealsTrend = totalDeals > 0 ? 
      Math.round((newDeals / totalDeals) * 100) - BASELINE_NEW_DEALS_PERCENT : 0;
    const icReviewTrend = totalDeals > 0 ? 
      Math.round((inIcReview / Math.max(lateStageDeals, 1)) * 100) - BASELINE_IC_REVIEW_PERCENT : 0;
    const investmentRateTrend = investmentRate - BASELINE_INVESTMENT_RATE;
    
    // For backwards compatibility, include the original response fields
    const response = {
      totalDeals,
      totalDealsTrend,
      activeDeals,
      activePipelinePercent,
      activePipelineTrend,
      newDeals,
      newDealsPercent,
      newDealsTrend,
      inIcReview,
      icReviewPercent,
      icReviewTrend,
      investedDeals,
      investmentRate,
      investmentRateTrend,
      totalAum,
      aumTrend: totalAum > 0 ? Math.round((totalAum / 1000000) / Math.max(investedDeals, 1)) - BASELINE_AUM_PER_DEAL_MILLIONS : 0
    };
    
    console.log('Dashboard stats: Sending response', response);
    res.json(response);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
});

// Helper function to get sector/industry stats to avoid code duplication
async function getSectorStats(logPrefix: string, useIndustryField = false) {
  console.log(`${logPrefix}: Getting storage instance`);
  const storage = StorageFactory.getStorage();
  console.log(`${logPrefix}: Fetching deals`);
  const deals = await storage.getDeals();
  console.log(`${logPrefix}: Retrieved ${deals ? deals.length : 0} deals`);
  
  if (!deals || deals.length === 0) {
    console.log(`${logPrefix}: No deals found, returning empty array`);
    return [];
  }
  
  // Count deals by sector
  const sectorCount: Record<string, number> = {};
  deals.forEach(deal => {
    const sector = deal.sector || 'Other';
    sectorCount[sector] = (sectorCount[sector] || 0) + 1;
  });
  
  // Transform into array format for chart
  const sectorStats = Object.entries(sectorCount).map(([sector, count]) => {
    const result: Record<string, any> = {
      count,
      percentage: Math.round((count / deals.length) * 100)
    };
    
    // Use either 'sector' or 'industry' field based on parameter
    if (useIndustryField) {
      result.industry = sector;
    } else {
      result.sector = sector;
    }
    
    return result;
  });
  
  // Sort by count (descending)
  sectorStats.sort((a, b) => b.count - a.count);
  
  console.log(`${logPrefix}: Sending response`, sectorStats);
  return sectorStats;
}

// Get sector distribution stats
router.get('/sector-stats', async (req: Request, res: Response) => {
  try {
    const stats = await getSectorStats('Sector stats');
    res.json(stats);
  } catch (error) {
    console.error('Error fetching sector statistics:', error);
    res.status(500).json({ message: 'Failed to fetch sector statistics' });
  }
});

// Redirect old endpoint to new one for backward compatibility
router.get('/industry-stats', async (req: Request, res: Response) => {
  try {
    const stats = await getSectorStats('Industry stats', true);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching industry statistics:', error);
    res.status(500).json({ message: 'Failed to fetch industry statistics' });
  }
});

export default router;