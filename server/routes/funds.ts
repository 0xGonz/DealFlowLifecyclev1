import { Router, Request, Response } from "express";
import { storage } from "../storage";
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
    const funds = await storage.getFunds();
    res.json(funds);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch funds' });
  }
});

// Get a specific fund by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const fund = await storage.getFund(Number(req.params.id));
    
    if (!fund) {
      return res.status(404).json({ message: 'Fund not found' });
    }
    
    const allocations = await storage.getAllocationsByFund(fund.id);
    
    // Get deal info for each allocation
    const dealIds = [...new Set(allocations.map(a => a.dealId))];
    const deals = await Promise.all(dealIds.map(id => storage.getDeal(id)));
    
    const allocationsWithDealInfo = allocations.map(allocation => {
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
    });
    
    res.json({
      ...fund,
      allocations: allocationsWithDealInfo
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch fund' });
  }
});

// Create a new fund
router.post('/', async (req: Request, res: Response) => {
  try {
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