import { Router, Request, Response } from 'express';
import { insertFundAllocationSchema } from '@shared/schema';
import { StorageFactory } from '../storage-factory';
import { z } from 'zod';

const router = Router();

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
    const allocationData = insertFundAllocationSchema.parse(req.body);
    
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
    
    // Update deal stage to "closing" if not already closed
    if (deal.stage !== 'closed' && deal.stage !== 'closing') {
      await storage.updateDeal(deal.id, { 
        stage: 'closing',
        createdBy: (req as any).user.id
      });
    }
    
    // Get all deals to validate allocations
    const allDeals = await storage.getDeals();
    const validDealIds = allDeals.map(deal => deal.id);
    
    // Update fund AUM based on valid allocations only
    const fundAllocations = await storage.getAllocationsByFund(fund.id);
    const validAllocations = fundAllocations.filter(alloc => validDealIds.includes(alloc.dealId));
    const totalAllocationAmount = validAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    await storage.updateFund(fund.id, { aum: totalAllocationAmount });
    
    res.status(201).json(newAllocation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid allocation data', errors: error.errors });
    }
    console.error('Error creating fund allocation:', error);
    res.status(500).json({ message: 'Failed to create fund allocation' });
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
    
    // Delete the allocation
    const result = await storage.deleteFundAllocation(allocationId);
    if (!result) {
      return res.status(404).json({ message: 'Allocation not found or could not be deleted' });
    }
    
    // Get all deals to validate allocations
    const deals = await storage.getDeals();
    const validDealIds = deals.map(deal => deal.id);
    
    // Update fund AUM based on remaining valid allocations
    const fundAllocations = await storage.getAllocationsByFund(allocation.fundId);
    const validAllocations = fundAllocations.filter(alloc => validDealIds.includes(alloc.dealId));
    const totalAllocationAmount = validAllocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    await storage.updateFund(allocation.fundId, { aum: totalAllocationAmount });
    
    res.status(200).json({ message: 'Allocation deleted successfully' });
  } catch (error) {
    console.error('Error deleting fund allocation:', error);
    res.status(500).json({ message: 'Failed to delete fund allocation' });
  }
});

export default router;