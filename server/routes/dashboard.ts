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
  
  // Calculate pipeline value (simple sum of deal sizes)
  const pipelineValue = deals.reduce((total, deal) => {
    // Only count deals in active pipeline stages
    if (['initial_review', 'screening', 'diligence', 'ic_review'].includes(deal.stage)) {
      return total + (deal.projectedReturn || 0);
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
