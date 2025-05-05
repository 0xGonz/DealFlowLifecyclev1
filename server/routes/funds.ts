import { Router, Request, Response } from "express";
import { StorageFactory } from "../storage-factory";
import { 
  insertFundSchema,
  insertFundAllocationSchema,
  DealStageLabels
} from "@shared/schema";
import { z } from "zod";

const router = Router();

// Get all funds
router.get('/', async (req: Request, res: Response) => {
  try {
    const storage = StorageFactory.getStorage();
    const funds = await storage.getFunds();
    
    // Get all deals to verify which allocations are valid
    const deals = await storage.getDeals();
    const validDealIds = deals.map(deal => deal.id);
    
    // For each fund, recalculate AUM based only on allocations to valid deals
    const fundsWithCorrectAum = await Promise.all(funds.map(async (fund) => {
      const allocations = await storage.getAllocationsByFund(fund.id);
      
      // Filter out allocations to non-existent deals
      const validAllocations = allocations.filter(allocation => validDealIds.includes(allocation.dealId));
      
      // Calculate actual AUM based on valid allocations
      const actualAum = validAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
      
      return {
        ...fund,
        aum: actualAum,
        calculatedAum: actualAum,
        allocationCount: validAllocations.length
      };
    }));
    
    res.json(fundsWithCorrectAum);
  } catch (error) {
    console.error('Error fetching funds:', error);
    res.status(500).json({ message: 'Failed to fetch funds' });
  }
});

// Get a specific fund by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const storage = StorageFactory.getStorage();
    const fund = await storage.getFund(Number(req.params.id));
    
    if (!fund) {
      return res.status(404).json({ message: 'Fund not found' });
    }
    
    const allocations = await storage.getAllocationsByFund(fund.id);
    
    // Get all deals in the system
    const allDeals = await storage.getDeals();
    const validDealIds = allDeals.map(deal => deal.id);
    
    // Get deal info for each allocation
    const dealIds = Array.from(new Set(allocations.map(a => a.dealId)));
    const deals = await Promise.all(dealIds.map(id => storage.getDeal(id)));
    
    // Filter allocations to include only those with valid deals
    const validAllocations = allocations.filter(allocation => validDealIds.includes(allocation.dealId));
    
    const allocationsWithDealInfo = validAllocations.map(allocation => {
      const deal = deals.find(d => d?.id === allocation.dealId);
      return {
        ...allocation,
        deal: deal ? {
          id: deal.id,
          name: deal.name,
          stage: deal.stage,
          stageLabel: DealStageLabels[deal.stage]
        } : null
      };
    }).filter(allocation => allocation.deal !== null); // Filter out allocations without deal info
    
    // Calculate actual AUM based on valid allocations
    const actualAum = validAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    
    res.json({
      ...fund,
      aum: actualAum, // Override the static AUM with calculated value
      calculatedAum: actualAum,
      allocations: allocationsWithDealInfo,
      invalidAllocationsCount: allocations.length - validAllocations.length // For debugging purposes
    });
  } catch (error) {
    console.error('Error fetching fund detail:', error);
    res.status(500).json({ message: 'Failed to fetch fund' });
  }
});

// Create a new fund
router.post('/', async (req: Request, res: Response) => {
  try {
    const storage = StorageFactory.getStorage();
    const fundData = insertFundSchema.parse(req.body);
    const newFund = await storage.createFund(fundData);
    res.status(201).json(newFund);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid fund data', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to create fund' });
  }
});

// Update a fund
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const storage = StorageFactory.getStorage();
    const fundId = Number(req.params.id);
    
    // Make sure fund exists
    const fund = await storage.getFund(fundId);
    if (!fund) {
      return res.status(404).json({ message: 'Fund not found' });
    }
    
    // Validate the partial update data
    const updateSchema = insertFundSchema.partial();
    const fundUpdate = updateSchema.parse(req.body);
    
    const updatedFund = await storage.updateFund(fundId, fundUpdate);
    res.json(updatedFund);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid fund data', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to update fund' });
  }
});

export default router;