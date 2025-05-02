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
    const activeDeals = deals ? deals.filter(deal => deal.stage !== 'closed' && deal.stage !== 'passed').length : 0;
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
    
    // Mock trends (would be calculated from historical data in a real app)
    const totalDealsTrend = 15; // +15%
    const activePipelineTrend = 10; // +10%
    const newDealsTrend = 25;  // +25%
    const icReviewTrend = 5;   // +5%
    const investmentRateTrend = 8; // +8%
    
    const response = {
      totalDeals,
      activeDeals,
      activePipelinePercent,
      newDeals,
      newDealsPercent,
      inIcReview,
      icReviewPercent,
      investedDeals,
      investmentRate,
      totalAum,
      totalDealsTrend,
      activePipelineTrend,
      newDealsTrend,
      icReviewTrend,
      investmentRateTrend
    };
    
    console.log('Dashboard stats: Sending response', response);
    res.json(response);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
});

// Get sector distribution stats
router.get('/sector-stats', async (req: Request, res: Response) => {
  try {
    console.log('Sector stats: Getting storage instance');
    // Get all deals to compute sector stats
    const storage = StorageFactory.getStorage();
    console.log('Sector stats: Fetching deals');
    const deals = await storage.getDeals();
    console.log(`Sector stats: Retrieved ${deals ? deals.length : 0} deals`);
    
    if (!deals || deals.length === 0) {
      console.log('Sector stats: No deals found, returning empty array');
      return res.json([]);
    }
    
    // Count deals by sector
    const sectorCount: Record<string, number> = {};
    deals.forEach(deal => {
      const sector = deal.sector || 'Other';
      sectorCount[sector] = (sectorCount[sector] || 0) + 1;
    });
    
    // Transform into array format for chart
    const sectorStats = Object.entries(sectorCount).map(([sector, count]) => ({
      sector,
      count,
      percentage: Math.round((count / deals.length) * 100)
    }));
    
    // Sort by count (descending)
    sectorStats.sort((a, b) => b.count - a.count);
    
    console.log('Sector stats: Sending response', sectorStats);
    res.json(sectorStats);
  } catch (error) {
    console.error('Error fetching sector statistics:', error);
    res.status(500).json({ message: 'Failed to fetch sector statistics' });
  }
});

// Redirect old endpoint to new one for backward compatibility
router.get('/industry-stats', async (req: Request, res: Response) => {
  try {
    console.log('Industry stats: Getting storage instance');
    // Get sector statistics formatted to match the old industry-stats endpoint
    const storage = StorageFactory.getStorage();
    console.log('Industry stats: Fetching deals');
    const deals = await storage.getDeals();
    console.log(`Industry stats: Retrieved ${deals ? deals.length : 0} deals`);
    
    if (!deals || deals.length === 0) {
      console.log('Industry stats: No deals found, returning empty array');
      return res.json([]);
    }
    
    // Count deals by sector
    const sectorCount: Record<string, number> = {};
    deals.forEach(deal => {
      const sector = deal.sector || 'Other';
      sectorCount[sector] = (sectorCount[sector] || 0) + 1;
    });
    
    // Transform into array format for chart
    const sectorStats = Object.entries(sectorCount).map(([sector, count]) => ({
      industry: sector, // Using 'industry' key for backward compatibility
      count,
      percentage: Math.round((count / deals.length) * 100)
    }));
    
    // Sort by count (descending)
    sectorStats.sort((a, b) => b.count - a.count);
    
    console.log('Industry stats: Sending response', sectorStats);
    res.json(sectorStats);
  } catch (error) {
    console.error('Error fetching industry statistics:', error);
    res.status(500).json({ message: 'Failed to fetch industry statistics' });
  }
});

export default router;