import { Router, Request, Response } from 'express';
import { insertFundAllocationSchema } from '@shared/schema';
import { StorageFactory } from '../storage-factory';
import { z } from 'zod';

const router = Router();

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
    res.json(allocations);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch allocations' });
  }
});

// Get allocations for a deal
router.get('/deal/:dealId', async (req: Request, res: Response) => {
  try {
    const storage = StorageFactory.getStorage();
    const dealId = Number(req.params.dealId);
    const allocations = await storage.getAllocationsByDeal(dealId);
    res.json(allocations);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch allocations' });
  }
});

export default router;