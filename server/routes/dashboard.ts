import { Router, Request, Response } from "express";
import { storage } from "../storage";

const router = Router();

// Get dashboard stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const deals = await storage.getDeals();
    const funds = await storage.getFunds();
    
    // Calculate dashboard stats
    const totalDeals = deals.length;
    const activeDeals = deals.filter(deal => deal.stage !== 'closed' && deal.stage !== 'passed').length;
    const newDeals = deals.length; // In a real app, this would filter by recent date
    const inIcReview = deals.filter(deal => deal.stage === 'ic_review').length;
    
    // Calculate total AUM
    const totalAum = funds.reduce((sum, fund) => sum + (fund.aum || 0), 0);
    
    // Mock trends (would be calculated from historical data in a real app)
    const activeDealsTrend = 10; // +10%
    const newDealsTrend = 25;  // +25%
    const icReviewTrend = 5;   // +5%
    const aumTrend = 15;       // +15%
    
    res.json({
      activeDeals,
      newDeals,
      inIcReview,
      totalAum,
      activeDealsTrend,
      newDealsTrend,
      icReviewTrend,
      aumTrend
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
});

// Get industry distribution stats
router.get('/industry-stats', async (req: Request, res: Response) => {
  try {
    // Get all deals to compute industry stats
    const deals = await storage.getDeals();
    
    // Count deals by industry
    const industryCount: Record<string, number> = {};
    deals.forEach(deal => {
      const industry = deal.industry || 'Other';
      industryCount[industry] = (industryCount[industry] || 0) + 1;
    });
    
    // Transform into array format for chart
    const industryStats = Object.entries(industryCount).map(([industry, count]) => ({
      industry,
      count,
      percentage: Math.round((count / deals.length) * 100)
    }));
    
    // Sort by count (descending)
    industryStats.sort((a, b) => b.count - a.count);
    
    res.json(industryStats);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch industry statistics' });
  }
});

export default router;