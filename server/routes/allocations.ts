import { Router, Request, Response } from 'express';
import { insertCapitalCallSchema, insertFundAllocationSchema } from '@shared/schema';
import { StorageFactory } from '../storage-factory';
import { synchronizeAllocationDates } from '../utils/date-integration';
import { z } from 'zod';

const router = Router();

// Helper function to update allocation status based on capital calls
async function updateAllocationStatusBasedOnCapitalCalls(allocationId: number): Promise<void> {
  try {
    const storage = StorageFactory.storage;
    
    // Get the allocation
    const allocation = await storage.getFundAllocation(allocationId);
    if (!allocation) return;
    
    // Get capital calls for this allocation
    const capitalCalls = await storage.getCapitalCallsByAllocation(allocationId);
    if (!capitalCalls || capitalCalls.length === 0) return;
    
    // Calculate total called amount and total paid amount
    let totalCalledAmount = 0;
    let totalPaidAmount = 0;
    
    for (const call of capitalCalls) {
      if (call.status !== 'scheduled') {
        // Only count calls that have been actually called or paid
        totalCalledAmount += call.callAmount;
      }
      
      if (call.status === 'paid' && call.paidAmount) {
        totalPaidAmount += call.paidAmount;
      }
    }
    
    // Determine allocation status based on capital calls
    let newStatus = allocation.status;
    
    // If no capital has been called, status remains 'committed'
    if (totalCalledAmount === 0) {
      newStatus = 'committed';
    }
    // If some capital has been called and fully paid, status is 'funded'
    else if (totalPaidAmount >= totalCalledAmount) {
      newStatus = 'funded';
    }
    // If some capital has been called but not fully paid, status is 'committed'
    else if (totalPaidAmount < totalCalledAmount) {
      newStatus = 'committed';
    }
    
    // Only update if status changed
    if (newStatus !== allocation.status) {
      await storage.updateFundAllocation(allocation.id, { status: newStatus });
      
      // Recalculate portfolio weights for all allocations in this fund
      // to maintain correct weights as allocations get funded
      await recalculatePortfolioWeights(allocation.fundId);
    }
  } catch (error) {
    console.error(`Error updating allocation status for allocation ${allocationId}:`, error);
  }
}

// Helper function to recalculate portfolio weights for a fund
async function recalculatePortfolioWeights(fundId: number): Promise<void> {
  try {
    const storage = StorageFactory.storage;
    
    console.log(`[DEBUG] Starting portfolio weight recalculation for fund ID ${fundId}`);
    
    // Get all allocations for the fund
    const allocations = await storage.getAllocationsByFund(fundId);
    if (!allocations || allocations.length === 0) {
      console.log(`[DEBUG] No allocations found for fund ID ${fundId}, skipping weight calculation`);
      return;
    }
    
    console.log(`[DEBUG] Found ${allocations.length} total allocations for fund ID ${fundId}`);
    
    // Get funded allocations
    const fundedAllocations = allocations.filter(allocation => allocation.status === 'funded');
    console.log(`[DEBUG] Found ${fundedAllocations.length} funded allocations for fund ID ${fundId}`);
    
    // Calculate the total called (funded) capital in the fund
    const calledCapital = fundedAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    console.log(`[DEBUG] Total called capital for fund ID ${fundId}: ${calledCapital}`);
    
    // If there's no called capital yet, we don't need to update weights
    if (calledCapital <= 0) {
      console.log(`[DEBUG] No called capital for fund ID ${fundId}, skipping weight calculation`);
      return;
    }
    
    // Update the weight for each allocation
    for (const allocation of allocations) {
      // Only funded allocations contribute to portfolio weight
      const weight = allocation.status === 'funded'
        ? (allocation.amount / calledCapital) * 100
        : 0;
      
      console.log(`[DEBUG] Allocation ID ${allocation.id}: Status ${allocation.status}, Amount ${allocation.amount}, Calculated Weight ${weight}%`);
      
      // Update the allocation with the new weight
      const updatedAllocation = await storage.updateFundAllocation(
        allocation.id,
        { portfolioWeight: parseFloat(weight.toFixed(2)) }
      );
      
      console.log(`[DEBUG] Updated allocation ID ${allocation.id} with weight ${updatedAllocation?.portfolioWeight}%`);
    }
    
    // For validation, fetch the allocations again and check their weights
    const updatedAllocations = await storage.getAllocationsByFund(fundId);
    console.log(`[DEBUG] Validation: Portfolio weights after recalculation:`);
    updatedAllocations.forEach(a => {
      console.log(`[DEBUG] ID ${a.id}: Status ${a.status}, Weight ${a.portfolioWeight}%`);
    });
    
    console.log(`[SUCCESS] Recalculated portfolio weights for fund ID ${fundId}`);
  } catch (error) {
    console.error(`[ERROR] Error recalculating portfolio weights for fund ID ${fundId}:`, error);
  }
}

// Get all allocations
router.get('/', async (req: Request, res: Response) => {
  try {
    const storage = StorageFactory.storage;
    
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
router.post('/', async (req: Request, res: Response) => {
  try {
    const storage = StorageFactory.storage;
    
    // Log the incoming data for debugging
    console.log('Allocation request body:', req.body);
    
    // Parse and validate the allocation data
    const allocationData = insertFundAllocationSchema.parse(req.body);
    
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
    
    // If this is a single payment allocation, automatically create a capital call that's marked as paid
    if (req.body.capitalCallSchedule === 'single') {
      // Determine the call amount based on amountType
      const callAmount = allocationData.amountType === 'percentage' ? 100 : allocationData.amount;
      
      // Create a paid capital call record
      await storage.createCapitalCall({
        allocationId: newAllocation.id,
        callAmount: callAmount,
        amountType: allocationData.amountType,
        callDate: new Date(), // Current date for the call
        dueDate: req.body.firstCallDate ? new Date(req.body.firstCallDate) : new Date(), // Use firstCallDate if provided
        paidAmount: callAmount, // Same as call amount since fully paid
        paidDate: new Date(), // Current date for payment
        status: 'paid',
        notes: 'Automatically created for single payment allocation'
      });
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
router.get('/fund/:fundId', async (req: Request, res: Response) => {
  try {
    const storage = StorageFactory.storage;
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
    const storage = StorageFactory.storage;
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
router.get('/deal/:dealId', async (req: Request, res: Response) => {
  try {
    const storage = StorageFactory.storage;
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
    res.json(updatedAllocations);
  } catch (error) {
    console.error('Error fetching deal allocations:', error);
    res.status(500).json({ message: 'Failed to fetch allocations' });
  }
});

// Delete an allocation
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const storage = StorageFactory.storage;
    const allocationId = Number(req.params.id);
    
    // Find the allocation first to get fundId
    const allocation = await storage.getFundAllocation(allocationId);
    if (!allocation) {
      return res.status(404).json({ message: 'Allocation not found' });
    }
    
    // Get deal details before deletion
    const deal = await storage.getDeal(allocation.dealId);
    
    // Get any capital calls associated with this allocation for tracking/logging
    const capitalCalls = await storage.getCapitalCallsByAllocation(allocationId);
    const capitalCallCount = capitalCalls.length;
    
    // Delete associated capital calls first
    if (capitalCallCount > 0) {
      console.log(`Deleting ${capitalCallCount} capital calls for allocation ID ${allocationId}`);
      const deleteResult = await storage.deleteCapitalCallsByAllocation(allocationId);
      if (!deleteResult) {
        console.warn(`Failed to delete some capital calls for allocation ID ${allocationId}`);
      }
    }
    
    // Now delete the allocation
    const result = await storage.deleteFundAllocation(allocationId);
    if (!result) {
      return res.status(404).json({ message: 'Allocation not found or could not be deleted' });
    }
    
    // Check if the deal still has any other allocations
    const remainingAllocations = await storage.getAllocationsByDeal(allocation.dealId);
    
    // If no allocations remain and deal is in 'invested' stage, we could optionally change its stage
    // but we'll leave it as 'invested' to maintain history of it being invested
    
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
        content: `Deal allocation to fund ${fund?.name || 'Unknown'} was removed${capitalCallCount > 0 ? ` (along with ${capitalCallCount} capital calls)` : ''}`,
        createdBy: (req as any).user.id,
        metadata: {} as any
      });
    }
    
    res.status(200).json({ 
      message: 'Allocation deleted successfully', 
      deletedCapitalCalls: capitalCallCount
    });
  } catch (error) {
    console.error('Error deleting fund allocation:', error);
    res.status(500).json({ message: 'Failed to delete fund allocation' });
  }
});

// Update an allocation
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const storage = StorageFactory.storage;
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
router.patch('/:id/date', async (req: Request, res: Response) => {
  try {
    const storage = StorageFactory.storage;
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