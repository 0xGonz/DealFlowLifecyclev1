import { Router } from 'express';
import { StorageFactory } from '../storage-factory';
import { asyncHandler } from '../utils/errorHandlers';
import { requireAuth } from '../utils/auth';

const storage = StorageFactory.getStorage();
export const dashboardRouter = Router();

// Apply authentication middleware to all routes
dashboardRouter.use(requireAuth);

// Get dashboard stats
dashboardRouter.get('/stats', asyncHandler(async (req, res) => {
  // In a real implementation, you would retrieve more specific dashboard metrics
  // For now, we'll return some placeholder stats based on the available data
  const deals = await storage.getDeals();
  const funds = await storage.getFunds();
  
  // Calculate total AUM (simple sum of fund sizes)
  const totalAUM = funds.reduce((total, fund) => total + (fund.aum || 0), 0);
  
  // Calculate pipeline value (simple sum of estimated deal values)
  const pipelineValue = deals.reduce((total, deal) => {
    // Only count deals in active pipeline stages
    if (['initial_review', 'screening', 'diligence', 'ic_review'].includes(deal.stage)) {
      // Since we don't have a deal value field, we'll use a generic value for now
      return total + 1000000; // Placeholder value
    }
    return total;
  }, 0);
  
  // Count deals in various stages
  const pipelineCount = deals.filter(deal => 
    ['initial_review', 'screening', 'diligence', 'ic_review'].includes(deal.stage)
  ).length;
  
  const activeInvestments = deals.filter(deal => 
    ['invested', 'closing'].includes(deal.stage)
  ).length;
  
  res.status(200).json({
    totalAUM,
    pipelineValue,
    pipelineCount,
    activeInvestments,
    fundCount: funds.length,
    // Additional metrics can be added here
  });
}));

// Get sector distribution stats
dashboardRouter.get('/sector-stats', asyncHandler(async (req, res) => {
  const deals = await storage.getDeals();
  
  // Create a map to count deals by sector
  const sectorCounts: Record<string, number> = {};
  const pipelineStages = ['initial_review', 'screening', 'diligence', 'ic_review'];
  
  // Only count deals in the active pipeline
  deals.filter(deal => pipelineStages.includes(deal.stage))
    .forEach(deal => {
      const sector = deal.sector || 'Other';
      sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
    });
  
  // Convert the map to an array of objects for easier consumption by the frontend
  const sectorStats = Object.entries(sectorCounts).map(([sector, count]) => ({
    sector,
    count,
  }));
  
  res.status(200).json(sectorStats);
}));
