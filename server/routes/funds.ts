import { Router, Request, Response } from "express";
import { StorageFactory } from "../storage-factory";
import { 
  insertFundSchema,
  insertFundAllocationSchema,
  DealStageLabels
} from "@shared/schema";
import { z } from "zod";

const router = Router();
// Use the recommended getStorage method to obtain storage instance
const storage = StorageFactory.getStorage();

// Get all funds
router.get('/', async (req: Request, res: Response) => {
  try {
    const funds = await storage.getFunds();
    
    // Get all deals to verify which allocations are valid
    const deals = await storage.getDeals();
    const validDealIds = deals.map(deal => deal.id);
    
    // For each fund, recalculate Called Capital and portfolio weights based only on allocations to valid deals
    const fundsWithCorrectAum = await Promise.all(funds.map(async (fund) => {
      const allocations = await storage.getAllocationsByFund(fund.id);
      
      // Filter out allocations to non-existent deals
      const validAllocations = allocations.filter(allocation => validDealIds.includes(allocation.dealId));
      
      // Calculate called capital based on only funded allocations
      const calledCapital = validAllocations
        .filter(allocation => allocation.status === 'funded')
        .reduce((sum, allocation) => sum + allocation.amount, 0);
      
      // Calculate committed but not yet funded capital
      const committedCapital = validAllocations
        .filter(allocation => allocation.status === 'committed')
        .reduce((sum, allocation) => sum + allocation.amount, 0);
      
      // Total fund size is the sum of called + committed capital
      const totalFundSize = calledCapital + committedCapital;
      
      // Make sure we explicitly set the AUM to 0 when there are no valid allocations
      // This ensures we don't have funds with misleading AUM values
      return {
        ...fund,
        aum: calledCapital, // Update to use called capital instead of AUM
        calculatedAum: calledCapital,
        committedCapital: committedCapital,
        totalFundSize: totalFundSize,
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
    
    // Calculate called capital based on only funded allocations
    const calledCapital = validAllocations
      .filter(allocation => allocation.status === 'funded')
      .reduce((sum, allocation) => sum + allocation.amount, 0);
    
    // Calculate committed but not yet funded capital
    const committedCapital = validAllocations
      .filter(allocation => allocation.status === 'committed')
      .reduce((sum, allocation) => sum + allocation.amount, 0);
      
    // Total fund size is the sum of called + committed capital
    const totalFundSize = calledCapital + committedCapital;
    
    // Calculate portfolio weights for all allocations based on called capital
    let allocationsWithWeights = [];
    if (calledCapital > 0) {
      // Only calculate weights if there is called capital
      allocationsWithWeights = allocationsWithDealInfo.map(allocation => {
        // Only funded allocations contribute to portfolio weight
        const weight = allocation.status === 'funded' ? 
          (allocation.amount / calledCapital) * 100 : 0;
          
        return {
          ...allocation,
          portfolioWeight: parseFloat(weight.toFixed(2))
        };
      });
    } else {
      // For funds with no called capital, all weights should be zero
      allocationsWithWeights = allocationsWithDealInfo.map(allocation => ({
        ...allocation,
        portfolioWeight: 0
      }));
    }
    
    res.json({
      ...fund,
      // Always use dynamically calculated values based on actual allocations
      aum: calledCapital,
      calculatedAum: calledCapital,
      committedCapital,
      totalFundSize,
      allocations: allocationsWithWeights,
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

// Delete a fund
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const fundId = Number(req.params.id);
    
    // Make sure fund exists
    const fund = await storage.getFund(fundId);
    if (!fund) {
      return res.status(404).json({ message: 'Fund not found' });
    }
    
    // Check if fund has allocations
    const allocations = await storage.getAllocationsByFund(fundId);
    if (allocations.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete a fund with allocations. Reassign or delete allocations first.',
        allocationsCount: allocations.length
      });
    }
    
    // If no allocations, proceed with deletion
    await storage.deleteFund(fundId);
    res.status(200).json({ message: 'Fund deleted successfully' });
  } catch (error) {
    console.error('Error deleting fund:', error);
    res.status(500).json({ message: 'Failed to delete fund' });
  }
});

export default router;