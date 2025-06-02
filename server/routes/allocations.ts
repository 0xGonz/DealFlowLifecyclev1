import { Router, Request, Response } from 'express';
import { insertCapitalCallSchema, insertFundAllocationSchema } from '@shared/schema';
import { StorageFactory } from '../storage-factory';
import { synchronizeAllocationDates } from '../utils/date-integration';
import { capitalCallService } from '../services/capital-call.service';
import { allocationService } from '../services/allocation.service';
import { z } from 'zod';
import { requireAuth } from '../utils/auth';
import { requirePermission } from '../utils/permissions';

const router = Router();
const storage = StorageFactory.getStorage();

// Export the helper function from allocation service for backward compatibility
async function updateAllocationStatusBasedOnCapitalCalls(allocationId: number): Promise<void> {
  await allocationService.updateAllocationStatus(allocationId);
}

// Export the helper function from allocation service for backward compatibility
async function recalculatePortfolioWeights(fundId: number): Promise<void> {
  await allocationService.recalculatePortfolioWeights(fundId);
}

// PUT /api/allocations/:id - Update allocation with investment tracking
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'Invalid allocation ID' });
    }

    // Auto-calculate MOIC if market value and amount are provided
    if (updates.marketValue !== undefined && updates.amount !== undefined) {
      const marketValue = Number(updates.marketValue) || 0;
      const amount = Number(updates.amount) || 0;
      if (amount > 0) {
        updates.moic = marketValue / amount;
      }
    }

    // Validate and convert numeric fields safely
    const allowedNumericFields = {
      amount: true,
      portfolioWeight: true,
      interestPaid: true,
      distributionPaid: true,
      marketValue: true,
      moic: true,
      irr: true
    } as const;
    
    for (const field in updates) {
      if (field in allowedNumericFields && updates[field] !== undefined && updates[field] !== null) {
        updates[field] = Number(updates[field]) || 0;
      }
    }

    const result = await storage.updateFundAllocation(id, updates);
    
    if (!result) {
      return res.status(404).json({ error: 'Allocation not found' });
    }

    // Trigger portfolio weight recalculation
    try {
      await recalculatePortfolioWeights(result.fundId);
    } catch (error) {
      console.error(`Error updating allocation status for allocation ${id}:`, error);
    }

    res.json(result);
  } catch (error) {
    console.error('Error updating allocation:', error);
    res.status(500).json({ error: 'Failed to update allocation' });
  }
});

// Get all allocations
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    
    // Get all fund allocations from each fund
    const funds = await storage.getFunds();
    let allAllocations: Array<any> = [];
    
    for (const fund of funds) {
      // First make sure portfolio weights are up to date for each fund
      await recalculatePortfolioWeights(fund.id);
      
      // Then fetch the allocations with updated weights
      const fundAllocations = await storage.getAllocationsByFund(fund.id);
      // Add fund name to each allocation
      const enhancedAllocations = fundAllocations.map(allocation => ({
        ...allocation,
        fundName: fund.name
      }));
      allAllocations = [...allAllocations, ...enhancedAllocations];
    }
    
    // Get all deals to get deal names
    const deals = await storage.getDeals();
    const dealsMap = new Map(deals.map(deal => [deal.id, { name: deal.name, sector: deal.sector }]));
    
    // Add deal names and sectors
    const allocationsWithDealInfo = allAllocations.map(allocation => {
      const dealInfo = dealsMap.get(allocation.dealId) || { name: 'Unknown Deal', sector: '' };
      return {
        ...allocation,
        dealName: dealInfo.name,
        dealSector: dealInfo.sector // Add deal sector
      };
    });
    
    res.json(allocationsWithDealInfo);
  } catch (error) {
    console.error('Error fetching all allocations:', error);
    res.status(500).json({ message: 'Failed to fetch allocations' });
  }
});

// Fund allocations
router.post('/', requireAuth, requirePermission('create', 'allocation'), async (req: Request, res: Response) => {
  try {
    
    // Log the incoming data for debugging
    console.log('Allocation request body:', req.body);
    
    // Parse and validate the allocation data - remove amountType since allocations are always in dollars
    const { amountType, ...cleanRequestBody } = req.body;
    const allocationData = insertFundAllocationSchema.parse({
      ...cleanRequestBody,
      amountType: 'dollar' // Force all allocations to be in dollars
    });
    
    // For single payment schedules, automatically mark as 'funded' instead of 'committed'
    if (req.body.capitalCallSchedule === 'single') {
      allocationData.status = 'funded';
    }
    
    // Log the validated data
    console.log('Parsed allocation data:', allocationData);
    
    // Make sure fund and deal exist
    const fund = await storage.getFund(allocationData.fundId);
    const deal = await storage.getDeal(allocationData.dealId);
    
    if (!fund) {
      return res.status(404).json({ message: 'Fund not found' });
    }
    
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    const newAllocation = await storage.createFundAllocation(allocationData);
    
    // Update deal stage to "invested" regardless of how many funds it's allocated to
    // This ensures the deal stays in the invested pipeline stage
    if (deal.stage !== 'invested') {
      await storage.updateDeal(deal.id, { 
        stage: 'invested',
        createdBy: (req as any).user.id
      });
      
      // Create a timeline event for this allocation
      await storage.createTimelineEvent({
        dealId: deal.id,
        eventType: 'closing_scheduled',
        content: `Deal was allocated to fund: ${fund.name}`,
        createdBy: (req as any).user.id,
        metadata: {} as any
      });
    }
    
    // Create appropriate capital calls based on the allocation schedule
    // Use our enhanced capital call service for better date handling and validation
    if (req.body.capitalCallSchedule) {
      try {
        // Extract all parameters needed for capital call creation
        const capitalCallSchedule = req.body.capitalCallSchedule;
        const callFrequency = req.body.callFrequency || 'monthly';
        
        // Parse the allocation date properly, ensuring timezone preservation
        let defaultDate: Date;
        try {
          defaultDate = allocationData.allocationDate 
            ? new Date(allocationData.allocationDate) 
            : new Date();
            
          console.log('Using allocation date as default:', {
            original: allocationData.allocationDate,
            parsed: defaultDate.toISOString()
          });
        } catch (error) {
          console.error('Error parsing allocation date:', error);
          defaultDate = new Date();
        }
        
        // Parse the first call date from the request body, preserving timezone
        let firstCallDate: Date;
        try {
          if (req.body.firstCallDate) {
            firstCallDate = new Date(req.body.firstCallDate);
            
            console.log('Using explicitly provided first call date:', {
              original: req.body.firstCallDate,
              parsed: firstCallDate.toISOString()
            });
          } else {
            firstCallDate = defaultDate;
            console.log('No first call date provided, using default date');
          }
        } catch (error) {
          console.error('Error parsing first call date:', error);
          firstCallDate = defaultDate;
        }
          
        const callCount = req.body.callCount || 1;
        const callPercentage = req.body.callPercentage || 100;
        const callAmountType = req.body.callAmountType || 'percentage';
        const callDollarAmount = req.body.callDollarAmount || 0;
        
        console.log('Creating capital calls with parameters:', {
          allocationId: newAllocation.id,
          capitalCallSchedule,
          callFrequency,
          firstCallDate,
          callCount,
          callPercentage,
          callAmountType,
          callDollarAmount
        });
        
        // Use the enhanced service to create all capital calls in one transaction
        await capitalCallService.createCapitalCallsForAllocation(
          newAllocation, 
          capitalCallSchedule,
          callFrequency,
          firstCallDate,
          callCount,
          callPercentage,
          callAmountType,
          callDollarAmount
        );
        
        console.log(`Successfully created capital calls for allocation ID ${newAllocation.id}`);
      } catch (error) {
        console.error('Error creating capital calls:', error);
        // We won't fail the entire allocation if capital call creation fails
        // Just log it for troubleshooting
      }
    }
    
    // Get all deals to validate allocations
    const allDeals = await storage.getDeals();
    const validDealIds = allDeals.map(deal => deal.id);
    
    // Instead of manually calculating weights, use our new recalculatePortfolioWeights function
    // This ensures a consistent weight calculation method across the application
    
    // First, make sure allocation statuses are up to date based on capital calls
    // Get all allocations for this fund
    const allFundAllocations = await storage.getAllocationsByFund(fund.id);
    for (const allocation of allFundAllocations) {
      await updateAllocationStatusBasedOnCapitalCalls(allocation.id);
    }
    
    // Then recalculate all portfolio weights
    await recalculatePortfolioWeights(fund.id);
    
    res.status(201).json(newAllocation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Zod validation error:', JSON.stringify(error.errors, null, 2));
      return res.status(400).json({ message: 'Invalid allocation data', errors: error.errors });
    }
    console.error('Error creating fund allocation:', error);
    res.status(500).json({ message: 'Failed to create fund allocation', error: error instanceof Error ? error.message : String(error) });
  }
});

// Get allocations for a fund
router.get('/fund/:fundId', requireAuth, async (req: Request, res: Response) => {
  try {
    const fundId = Number(req.params.fundId);
    
    // First make sure portfolio weights are up to date
    await recalculatePortfolioWeights(fundId);
    
    // Then fetch the allocations with updated weights
    const allocations = await storage.getAllocationsByFund(fundId);
    
    // Get all deals to validate allocations
    const deals = await storage.getDeals();
    const validDealIds = deals.map(deal => deal.id);
    
    // Filter out allocations to non-existent deals
    const validAllocations = allocations.filter(allocation => 
      validDealIds.includes(allocation.dealId)
    );
    
    res.json(validAllocations);
  } catch (error) {
    console.error('Error fetching fund allocations:', error);
    res.status(500).json({ message: 'Failed to fetch allocations' });
  }
});

// Get invalid allocations for a fund (allocations to non-existent deals)
router.get('/fund/:fundId/invalid', async (req: Request, res: Response) => {
  try {
    const fundId = Number(req.params.fundId);
    
    // Make sure portfolio weights are up to date first
    await recalculatePortfolioWeights(fundId);
    
    // Then get the allocations with updated weights
    const allocations = await storage.getAllocationsByFund(fundId);
    
    // Get all deals to validate allocations
    const deals = await storage.getDeals();
    const validDealIds = deals.map(deal => deal.id);
    
    // Get only allocations to non-existent deals
    const invalidAllocations = allocations.filter(allocation => 
      !validDealIds.includes(allocation.dealId)
    );
    
    res.json(invalidAllocations);
  } catch (error) {
    console.error('Error fetching invalid fund allocations:', error);
    res.status(500).json({ message: 'Failed to fetch invalid allocations' });
  }
});

// Get allocations for a deal
router.get('/deal/:dealId', requireAuth, async (req: Request, res: Response) => {
  try {
    const dealId = Number(req.params.dealId);
    
    // First check if deal exists
    const deal = await storage.getDeal(dealId);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    // Get all allocations for this deal
    const allocations = await storage.getAllocationsByDeal(dealId);
    
    // Update portfolio weights for all funds that have this deal
    for (const allocation of allocations) {
      // Recalculate portfolio weights for each fund that has this deal
      await recalculatePortfolioWeights(allocation.fundId);
    }
    
    // Now get the updated allocations after weight recalculation
    const updatedAllocations = await storage.getAllocationsByDeal(dealId);
    
    // Get fund names for each allocation
    const allocationsWithFundNames = await Promise.all(
      updatedAllocations.map(async (allocation) => {
        const fund = await storage.getFund(allocation.fundId);
        return {
          ...allocation,
          fundName: fund?.name || `Fund ${allocation.fundId}`
        };
      })
    );
    
    res.json(allocationsWithFundNames);
  } catch (error) {
    console.error('Error fetching deal allocations:', error);
    res.status(500).json({ message: 'Failed to fetch allocations' });
  }
});

// Delete an allocation
router.delete('/:id', requireAuth, requirePermission('delete', 'allocation'), async (req: Request, res: Response) => {
  try {
    const allocationId = Number(req.params.id);
    
    // Find the allocation first to get fundId
    const allocation = await storage.getFundAllocation(allocationId);
    if (!allocation) {
      return res.status(404).json({ message: 'Allocation not found' });
    }
    
    // Get deal details before deletion
    const deal = await storage.getDeal(allocation.dealId);
    
    // Delete the allocation
    const result = await storage.deleteFundAllocation(allocationId);
    if (!result) {
      return res.status(404).json({ message: 'Allocation not found or could not be deleted' });
    }
    
    // Check if the deal still has any other allocations
    const remainingAllocations = await storage.getAllocationsByDeal(allocation.dealId);
    
    // If no allocations remain and deal is in 'invested' stage, move it back to "closing" stage
    if (remainingAllocations.length === 0 && deal && deal.stage === 'invested') {
      await storage.updateDeal(deal.id, { 
        stage: 'closing',  // Move back to the previous stage in the pipeline
        createdBy: (req as any).user.id
      });
      
      // Create a timeline event for this stage change
      await storage.createTimelineEvent({
        dealId: deal.id,
        eventType: 'stage_change',
        content: `Deal moved from Invested to Closing after last fund allocation was removed`,
        createdBy: (req as any).user.id,
        metadata: {
          previousStage: ['invested'],
          newStage: ['closing']
        }
      });
    }
    
    // Get all deals to validate allocations
    const deals = await storage.getDeals();
    const validDealIds = deals.map(deal => deal.id);
    
    // Use our consistent portfolio weights recalculation function
    await recalculatePortfolioWeights(allocation.fundId);
    
    // Create a timeline event for this deletion if deal exists
    if (deal) {
      const fund = await storage.getFund(allocation.fundId);
      await storage.createTimelineEvent({
        dealId: deal.id,
        eventType: 'closing_scheduled',
        content: `Deal allocation to fund ${fund?.name || 'Unknown'} was removed`,
        createdBy: (req as any).user.id,
        metadata: {} as any
      });
    }
    
    res.status(200).json({ message: 'Allocation deleted successfully' });
  } catch (error) {
    console.error('Error deleting fund allocation:', error);
    res.status(500).json({ message: 'Failed to delete fund allocation' });
  }
});

// Update an allocation
router.patch('/:id', requireAuth, requirePermission('edit', 'allocation'), async (req: Request, res: Response) => {
  try {
    const allocationId = Number(req.params.id);
    
    // Validate the allocation still exists
    const existingAllocation = await storage.getFundAllocation(allocationId);
    if (!existingAllocation) {
      return res.status(404).json({ message: 'Allocation not found' });
    }
    
    // Extract the allocation date if it's being updated
    const updatedAllocationDate = req.body.allocationDate ? new Date(req.body.allocationDate) : null;
    const originalDate = existingAllocation.allocationDate;
    
    // First update the basic allocation data
    const updatedAllocation = await storage.updateFundAllocation(allocationId, req.body);
    if (!updatedAllocation) {
      return res.status(500).json({ message: 'Failed to update allocation' });
    }
    
    // If the allocation date has changed, synchronize all related entities
    if (updatedAllocationDate && 
        originalDate && 
        updatedAllocationDate.getTime() !== new Date(originalDate).getTime()) {
      
      // Use the date integration utility to synchronize dates
      await synchronizeAllocationDates(allocationId, updatedAllocationDate);
      
      // Create a timeline event for the date change
      await storage.createTimelineEvent({
        dealId: existingAllocation.dealId,
        eventType: 'closing_scheduled',
        content: `Allocation dates updated for fund allocation`,
        createdBy: (req as any).user?.id || 1,
        metadata: {
          originalDate: originalDate,
          newDate: updatedAllocationDate
        } as any
      });
    }
    
    // Recalculate portfolio weights for this fund
    await recalculatePortfolioWeights(existingAllocation.fundId);
    
    // Return the updated allocation
    res.json(updatedAllocation);
  } catch (error) {
    console.error('Error updating allocation:', error);
    res.status(500).json({ 
      message: 'Failed to update allocation', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Update allocation date with synchronization
// POST /api/allocations/fund/:fundId/recalculate-weights - Recalculate portfolio weights
router.post('/fund/:fundId/recalculate-weights', requireAuth, async (req: Request, res: Response) => {
  try {
    const fundId = parseInt(req.params.fundId);
    
    if (!fundId || isNaN(fundId)) {
      return res.status(400).json({ error: 'Invalid fund ID' });
    }

    await allocationService.recalculatePortfolioWeights(fundId);
    
    res.json({ 
      message: 'Portfolio weights recalculated successfully',
      fundId: fundId 
    });
  } catch (error) {
    console.error('Error recalculating portfolio weights:', error);
    res.status(500).json({ error: 'Failed to recalculate portfolio weights' });
  }
});

router.patch('/:id/date', async (req: Request, res: Response) => {
  try {
    const allocationId = Number(req.params.id);
    
    // Validate the new date
    if (!req.body.allocationDate) {
      return res.status(400).json({ message: 'Allocation date is required' });
    }
    
    const newDate = new Date(req.body.allocationDate);
    if (isNaN(newDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    // Get the allocation to ensure it exists
    const allocation = await storage.getFundAllocation(allocationId);
    if (!allocation) {
      return res.status(404).json({ message: 'Allocation not found' });
    }
    
    // Use the date integration utility to synchronize all related dates
    const result = await synchronizeAllocationDates(allocationId, newDate);
    
    if (!result) {
      return res.status(500).json({ 
        message: 'Date synchronization failed' 
      });
    }
    
    // Get the updated allocation
    const updatedAllocation = await storage.getFundAllocation(allocationId);
    
    // Return the updated allocation with synchronized dates
    res.json(updatedAllocation);
  } catch (error) {
    console.error('Error updating allocation date:', error);
    res.status(500).json({ 
      message: 'Failed to update allocation date', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

export default router;