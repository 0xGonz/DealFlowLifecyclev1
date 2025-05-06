import { Router, Request, Response } from 'express';
import { insertCapitalCallSchema, insertFundAllocationSchema } from '@shared/schema';
import { StorageFactory } from '../storage-factory';
import { z } from 'zod';

const router = Router();

// Helper function to update allocation status based on capital calls
async function updateAllocationStatusBasedOnCapitalCalls(allocationId: number): Promise<void> {
  try {
    const storage = StorageFactory.getStorage();
    
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
    }
  } catch (error) {
    console.error(`Error updating allocation status for allocation ${allocationId}:`, error);
  }
}

// Get all allocations
router.get('/', async (req: Request, res: Response) => {
  try {
    const storage = StorageFactory.getStorage();
    
    // Get all fund allocations from each fund
    const funds = await storage.getFunds();
    let allAllocations: Array<any> = [];
    
    for (const fund of funds) {
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
    const dealsMap = new Map(deals.map(deal => [deal.id, deal.name]));
    
    // Add deal names
    const allocationsWithDealNames = allAllocations.map(allocation => ({
      ...allocation,
      dealName: dealsMap.get(allocation.dealId) || 'Unknown Deal'
    }));
    
    res.json(allocationsWithDealNames);
  } catch (error) {
    console.error('Error fetching all allocations:', error);
    res.status(500).json({ message: 'Failed to fetch allocations' });
  }
});

// Fund allocations
router.post('/', async (req: Request, res: Response) => {
  try {
    const storage = StorageFactory.getStorage();
    
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
    
    // Update fund AUM and recalculate portfolio weights for all allocations
    const fundAllocations = await storage.getAllocationsByFund(fund.id);
    const validAllocations = fundAllocations.filter(alloc => validDealIds.includes(alloc.dealId));
    const totalAllocationAmount = validAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    
    // Update fund's total AUM
    await storage.updateFund(fund.id, { aum: totalAllocationAmount });
    
    // Update portfolio weights for all allocations in this fund
    if (totalAllocationAmount > 0) {
      for (const allocation of validAllocations) {
        // Calculate portfolio weight as percentage of total fund AUM
        const portfolioWeight = (allocation.amount / totalAllocationAmount) * 100;
        
        // Update portfolio weight
        await storage.updateFundAllocation(allocation.id, { portfolioWeight });
        
        // Check capital calls to update allocation status
        await updateAllocationStatusBasedOnCapitalCalls(allocation.id);
      }
    }
    
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
    const storage = StorageFactory.getStorage();
    const fundId = Number(req.params.fundId);
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
    const storage = StorageFactory.getStorage();
    const fundId = Number(req.params.fundId);
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
    const storage = StorageFactory.getStorage();
    const dealId = Number(req.params.dealId);
    
    // First check if deal exists
    const deal = await storage.getDeal(dealId);
    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }
    
    const allocations = await storage.getAllocationsByDeal(dealId);
    res.json(allocations);
  } catch (error) {
    console.error('Error fetching deal allocations:', error);
    res.status(500).json({ message: 'Failed to fetch allocations' });
  }
});

// Delete an allocation
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const storage = StorageFactory.getStorage();
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
    
    // If no allocations remain and deal is in 'invested' stage, we could optionally change its stage
    // but we'll leave it as 'invested' to maintain history of it being invested
    
    // Get all deals to validate allocations
    const deals = await storage.getDeals();
    const validDealIds = deals.map(deal => deal.id);
    
    // Update fund AUM and recalculate portfolio weights for all remaining allocations
    const fundAllocations = await storage.getAllocationsByFund(allocation.fundId);
    const validAllocations = fundAllocations.filter(alloc => validDealIds.includes(alloc.dealId));
    const totalAllocationAmount = validAllocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    
    // Update fund's total AUM
    await storage.updateFund(allocation.fundId, { aum: totalAllocationAmount });
    
    // Update portfolio weights for all allocations in this fund
    if (totalAllocationAmount > 0) {
      for (const alloc of validAllocations) {
        // Calculate portfolio weight as percentage of total fund AUM
        const portfolioWeight = (alloc.amount / totalAllocationAmount) * 100;
        
        // Update portfolio weight
        await storage.updateFundAllocation(alloc.id, { portfolioWeight });
        
        // Check capital calls to update allocation status
        await updateAllocationStatusBasedOnCapitalCalls(alloc.id);
      }
    }
    
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

export default router;